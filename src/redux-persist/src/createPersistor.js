import stringify from 'json-stringify-safe';

import { KEY_PREFIX, REHYDRATE } from './constants';
import createAsyncLocalStorage from './defaults/asyncLocalStorage';
import purgeStoredState from './purgeStoredState';
import { logErrorRemotely } from '../../utils/logging';

function warnIfSetError(key) {
  return function setError(err) {
    if (err && process.env.NODE_ENV !== 'production') {
      logErrorRemotely(new Error(`Error storing data for key: ${key}, ${err}`));
    }
  };
}

function defaultSerializer(data) {
  return stringify(data, null, null, (k, v) => {
    if (process.env.NODE_ENV !== 'production') {
      return null;
    }
    throw new Error(`
      redux-persist: cannot process cyclical state.
      Consider changing your state structure to have no cycles.
      Alternatively blacklist the corresponding reducer key.
      Cycle encountered at key "${k}" with value "${v}".
    `);
  });
}

function defaultDeserializer(serial) {
  return JSON.parse(serial);
}

function rehydrateAction(data) {
  return {
    type: REHYDRATE,
    payload: data,
  };
}

function defaultStateIterator(collection, callback) {
  return Object.keys(collection).forEach(key => callback(collection[key], key));
}

function defaultStateGetter(state, key) {
  return state[key];
}

function defaultStateSetter(state, key, value) {
  state[key] = value;
  return state;
}

export default function createPersistor(store, config) {
  // defaults
  const serializer = config.serialize === false ? data => data : defaultSerializer;
  const deserializer = config.serialize === false ? data => data : defaultDeserializer;
  const blacklist = config.blacklist || [];
  const whitelist = config.whitelist || false;
  const transforms = config.transforms || [];
  const debounce = config.debounce || false;
  const keyPrefix = config.keyPrefix !== undefined ? config.keyPrefix : KEY_PREFIX;

  // pluggable state shape (e.g. immutablejs. External dependencies may rely
  // on these properties, so we shouldn't remove the underscore.
  /* eslint-disable no-underscore-dangle */
  const stateInit = config._stateInit || {};
  const stateIterator = config._stateIterator || defaultStateIterator;
  const stateGetter = config._stateGetter || defaultStateGetter;
  const stateSetter = config._stateSetter || defaultStateSetter;
  /* eslint-enable no-underscore-dangle */

  // storage with keys -> getAllKeys for localForage support
  const storage = config.storage || createAsyncLocalStorage('local');
  if (storage.keys && !storage.getAllKeys) {
    storage.getAllKeys = storage.keys;
  }

  // initialize stateful values
  let lastState = stateInit;
  let paused = false;
  const storesToProcess = [];
  let timeIterator = null;

  function passWhitelistBlacklist(key) {
    if (whitelist && whitelist.indexOf(key) === -1) {
      return false;
    }
    if (blacklist.indexOf(key) !== -1) {
      return false;
    }
    return true;
  }

  function adhocRehydrate(incoming, options = {}) {
    let state = {};
    if (options.serial) {
      stateIterator(incoming, (subState, key) => {
        try {
          const data = deserializer(subState);
          const value = transforms.reduceRight(
            (interState, transformer) => transformer.out(interState, key),
            data,
          );
          state = stateSetter(state, key, value);
        } catch (err) {
          if (process.env.NODE_ENV !== 'production') {
            logErrorRemotely(
              new Error(`Error rehydrating data for key "${key}" ${subState} ${err}`),
            );
          }
        }
      });
    } else {
      state = incoming;
    }

    store.dispatch(rehydrateAction(state));
    return state;
  }

  function createStorageKey(key) {
    return `${keyPrefix}${key}`;
  }

  store.subscribe(() => {
    if (paused) {
      return;
    }

    const state = store.getState();

    stateIterator(state, (subState, key) => {
      if (!passWhitelistBlacklist(key)) {
        return;
      }
      if (stateGetter(lastState, key) === stateGetter(state, key)) {
        return;
      }
      if (storesToProcess.indexOf(key) !== -1) {
        return;
      }
      storesToProcess.push(key);
    });

    const len = storesToProcess.length;

    // time iterator (read: debounce)
    if (timeIterator === null) {
      timeIterator = setInterval(() => {
        if ((paused && len === storesToProcess.length) || storesToProcess.length === 0) {
          clearInterval(timeIterator);
          timeIterator = null;
          return;
        }

        const key = storesToProcess.shift();
        const storageKey = createStorageKey(key);
        const endState = transforms.reduce(
          (subState, transformer) => transformer.in(subState, key),
          stateGetter(store.getState(), key),
        );
        if (typeof endState !== 'undefined') {
          storage.setItem(storageKey, serializer(endState), warnIfSetError(key));
        }
      }, debounce);
    }

    lastState = state;
  });

  // return `persistor`
  return {
    rehydrate: adhocRehydrate,
    pause: () => {
      paused = true;
    },
    resume: () => {
      paused = false;
    },
    purge: keys => purgeStoredState({ storage, keyPrefix }, keys),
  };
}
