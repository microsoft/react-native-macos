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

const APIExamples = [
  ...RNTesterListIOS.APIExamples.filter(
    ex =>
      !ex.key.includes('IOS') &&
      ex.key !== 'OrientationChangeExample' &&
      ex.key !== 'TVEventHandlerExample' &&
      ex.key !== 'VibrationExample',
  ),
  {
    key: 'AlertMacOSExample',
    module: require('../examples/Alert/AlertMacOSExample'),
  },
];

const ComponentExamples = [
  ...RNTesterListIOS.ComponentExamples.filter(
    ex =>
      !ex.key.includes('IOS') &&
      ex.key !== 'InputAccessoryViewExample' &&
      ex.key !== 'KeyboardAvoidingViewExample' &&
      ex.key !== 'StatusBarExample',
  ),
  {
    key: 'DatePickerMacOSExample',
    module: require('../examples/DatePicker/DatePickerMacOSExample'),
  },
];

const Modules = {};

APIExamples.concat(ComponentExamples).forEach(Example => {
  Modules[Example.key] = Example.module;
});

const RNTesterList = {
  APIExamples,
  ComponentExamples,
  Modules,
};

module.exports = RNTesterList;
