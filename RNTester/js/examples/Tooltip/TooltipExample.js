/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

'use strict';

const React = require('react');
const {Button, Image, Text} = require('react-native');
const image = {
  uri: 'https://www.facebook.com/favicon.ico',
};

exports.displayName = 'TooltipExample';
exports.framework = 'React';
exports.title = 'Tooltip';
exports.description = 'Examples that showcase tooltip in various components.';

exports.examples = [
  {
    title: 'Button',
    description: ('Simple button to showcase tooltip.': string),
    render: function(): React.Node {
      return (
          <Button
            title="Hover me"
            tooltip={"Button tooltip"}
          />
      );
    },
  },
  {
    title: 'Text',
    description: ('Simple text string to showcase tooltip.': string),
    render: function(): React.Node {
      return (
        <Text tooltip={"Text tooltip"}>
          Simple text string to showcase tooltip.
        </Text>
      );
    },
  },
  {
    title: 'Image',
    description: ('Image to showcase tooltip.': string),
    render: function(): React.Node {
      return <Image source={image} style={{width:38, height: 38}} tooltip={"Facebook logo"}/>;
    },
  },
];