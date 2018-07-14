/* @flow */
import React from 'react';
import { NativeModules } from 'react-native';

import '../vendor/intl/intl';
import StoreProvider from './boot/StoreProvider';
import TranslationProvider from './boot/TranslationProvider';
import StylesProvider from './boot/StylesProvider';
import CompatibilityChecker from './boot/CompatibilityChecker';
import AppEventHandlers from './boot/AppEventHandlers';
import AppDataFetcher from './boot/AppDataFetcher';
import AppWithNavigation from './nav/AppWithNavigation';

require('./i18n/locale');
require('./sentry');

// $FlowFixMe
console.disableYellowBox = true; // eslint-disable-line

// async function measureCompression() {
//   try {
//     const text = 'MTMPmaOf0';
//     const compressedText = await NativeModules.TextCompressionModule.compress(text);
//     console.log('compressedText', compressedText);
//     const decompressedText = await NativeModules.TextCompressionModule.decompress(compressedText);
//     console.log('decompressedText', decompressedText);
//   } catch (e) {
//     console.error(e);
//   }
// }
// measureCompression();

export default () => (
  <CompatibilityChecker>
    <StoreProvider>
      <AppEventHandlers>
        <AppDataFetcher>
          <TranslationProvider>
            <StylesProvider>
              <AppWithNavigation />
            </StylesProvider>
          </TranslationProvider>
        </AppDataFetcher>
      </AppEventHandlers>
    </StoreProvider>
  </CompatibilityChecker>
);
