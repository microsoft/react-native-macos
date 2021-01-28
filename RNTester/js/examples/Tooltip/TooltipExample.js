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
const {Button, Image, Slider, Text, View} = require('react-native');
const image = {
  uri: 'https://www.facebook.com/favicon.ico',
};

function SliderExample(props: React.ElementConfig<typeof Slider>) {
  const [value, setValue] = React.useState(0);

  return (
    <View>
      <Text>{value.toFixed(3)}</Text>
      <Slider {...props} onValueChange={newValue => setValue(newValue)} tooltip={value.toFixed(3)}/>
    </View>
  );
}

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
  {
    title: 'View',
    description: ('Background color view to showcase tooltip.': string),
    render: function(): React.Node {
      return <View style={{backgroundColor: '#3CE8DA', padding: 10}} tooltip={"Turquoise"}/>;
    },
  },
  {
    title: 'Slider',
    description: ('Tooltip displays the current value.': string),
    render(): React.Element<any> {
      return <SliderExample />;
    },
  },
];