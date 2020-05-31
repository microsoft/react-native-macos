/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

// TODO(macOS ISS#2323203)

/* $FlowFixMe allow macOS to share iOS file */
const RNTesterListIOS = require('./RNTesterList.ios.js');

const AlertMacOSExample = {
  key: 'AlertMacOSExample',
  module: require('../examples/Alert/AlertMacOSExample'),
};

const DatePickerMacOSExample = {
  key: 'DatePickerMacOSExample',
  module: require('../examples/DatePicker/DatePickerMacOSExample'),
};

const Modules = RNTesterListIOS.Modules;

[AlertMacOSExample, DatePickerMacOSExample].forEach(Example => {
  Modules[Example.key] = Example.module;
});

const RNTesterList = {
  APIExamples: [
    ...RNTesterListIOS.APIExamples.filter(
      ex =>
        !ex.key.includes('IOS') &&
        ex.key !== 'OrientationChangeExample' &&
        ex.key !== 'TVEventHandlerExample' &&
        ex.key !== 'VibrationExample',
    ),
    AlertMacOSExample,
  ],
  ComponentExamples: [
    ...RNTesterListIOS.ComponentExamples.filter(
      ex =>
        !ex.key.includes('IOS') &&
        ex.key !== 'InputAccessoryViewExample' &&
        ex.key !== 'KeyboardAvoidingViewExample' &&
        ex.key !== 'StatusBarExample',
    ),
    DatePickerMacOSExample,
  ],
  Modules,
};

module.exports = RNTesterList;
