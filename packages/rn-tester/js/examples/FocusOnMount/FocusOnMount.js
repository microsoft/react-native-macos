/**
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

// [macOS]
'use strict';

const React = require('react');
const ReactNative = require('react-native');
const {Button, findNodeHandle, UIManager} = ReactNative;

class FocusOnMountExample extends React.Component<{}> {
  ref: any = React.createRef();

  componentDidMount() {
    if (this.ref.current) {
      const commands = UIManager.getViewManagerConfig('RCTView').Commands;
      if ('focus' in commands) {
        UIManager.dispatchViewManagerCommand(
          // $FlowFixMe[incompatible-call]
          findNodeHandle(this.ref.current),
          UIManager.getViewManagerConfig('RCTView').Commands.focus,
          undefined,
        );
      }
    }
  }

  render(): React.Node {
    return (
      <Button
        ref={this.ref}
        title="This button will be focsued on mount"
        onPress={() => {}}
      />
    );
  }
}

exports.title = 'Focus On Mount';
exports.description = 'Example for focusing a component on mount';
exports.examples = [
  {
    title: 'FocusOnMountExample',
    render: function (): React.Node {
      return <FocusOnMountExample />;
    },
  },
];
