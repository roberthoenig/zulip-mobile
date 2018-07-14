/* @flow */
import { AsyncStorage, NativeModules } from 'react-native';
import { applyMiddleware, compose, createStore } from 'redux';
import { persistStore, autoRehydrate, createTransform } from 'redux-persist';

import config from '../config';
import rootReducer from './reducers';
import middleware from './middleware';

// AsyncStorage.clear(); // use to reset storage during development

// uncomment the following lines to integrate reactotron with redux
// const store = Reactotron.createStore(
//   rootReducer,
//   compose(autoRehydrate(), applyMiddleware(...middleware)),
// );

const store = compose(applyMiddleware(...middleware), autoRehydrate())(createStore)(rootReducer);

// const compressor = createTransform(
//   async state => {
//     const res = await NativeModules.TextCompressionModule(JSON.stringify(state));
//     return res;
//   },
//   state => {
//     if (typeof state !== 'string') {
//       if (NODE_ENV !== 'production') {
//         console.error('redux-persist-transform-compress: expected outbound state to be a string');
//       }
//       return state;
//     }

//     try {
//       return JSON.parse(LZ.decompressFromUTF16(state));
//     } catch (err) {
//       if (NODE_ENV !== 'production') {
//         console.error('redux-persist-transform-compress: error while decompressing state', err);
//       }
//       return null;
//     }
//   },
// );

class MyAsyncStorage {
  static async getItem(key: string, callback: ?(error: ?Error, result: ?string) => void) {
    let wrappedCallback = callback;
    if (typeof callback === 'function') {
      wrappedCallback = async function (error, result) {
        const decompressedResult = await NativeModules.TextCompressionModule.decompress(result);
        // console.log('key: ', key);
        // console.log('compressed length: ', result.length);
        // console.log('decompressed length: ', decompressedResult.length);
        // console.log(
        //   'compressed size percentage: ',
        //   result.length / decompressedResult.length * 100,
        //   '%',
        // );
        callback(error, decompressedResult);
      };
    }
    const compressedValue = await AsyncStorage.getItem(key, wrappedCallback);
    // const decompressedValue = await NativeModules.TextCompressionModule.decompress(compressedValue);
    // console.log(
    //   'getItem() compressedValue',
    //   compressedValue,
    //   'decompressed value:',
    //   decompressedValue,
    // );
    // return decompressedValue;
  }
  static async setItem(key: string, value: string, callback: ?(error: ?Error) => void) {
    const compressedValue = await NativeModules.TextCompressionModule.compress(value);
    // console.log('setItem() key', key, 'value', value, 'compressedValue', compressedValue);
    await AsyncStorage.setItem(key, compressedValue, callback);
  }
  static getAllKeys = AsyncStorage.getAllKeys;
  static clear = AsyncStorage.clear;
}

export const restore = (onFinished?: () => void) =>
  persistStore(
    store,
    {
      whitelist: [...config.storeKeys, ...config.cacheKeys],
      storage: MyAsyncStorage,
      // transforms: [compressor],
    },
    onFinished,
  );

export default store;
