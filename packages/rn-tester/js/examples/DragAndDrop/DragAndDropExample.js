/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

'use strict';

// [macOS

import type {PasteEvent} from 'react-native/Libraries/Components/TextInput/TextInput';

import ExampleTextInput from '../TextInput/ExampleTextInput';
import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';

const styles = StyleSheet.create({
  multiline: {
    height: 50,
  },
});


function DragDropView(): React.Node {
  // $FlowFixMe[missing-empty-array-annot]
  const [log, setLog] = React.useState([]);
  const appendLog = (line: string) => {
    const limit = 3;
    let newLog = log.slice(0, limit - 1);
    newLog.unshift(line);
    setLog(newLog);
  };
  const [imageUri, setImageUri] = React.useState(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg==',
  );
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);

  return (
    <>
      <View
        draggedTypes={['fileUrl', 'image']}
        onDragEnter={e => {
          appendLog('onDragEnter');
          setIsDraggingOver(true);
        }}
        onDragLeave={e => {
          appendLog('onDragLeave');
          setIsDraggingOver(false);
        }}
        onDrop={e => {
          appendLog('onDrop');
          setIsDraggingOver(false);
          if (e.nativeEvent.dataTransfer.files && e.nativeEvent.dataTransfer.files[0]) {
            setImageUri(e.nativeEvent.dataTransfer.files[0].uri);
          }
        }}
        style={{
          height: 150,
          backgroundColor: isDraggingOver ? '#e3f2fd' : '#f0f0f0',
          borderWidth: 2,
          borderColor: isDraggingOver ? '#2196f3' : '#0066cc',
          borderStyle: 'dashed',
          borderRadius: 8,
          justifyContent: 'center',
          alignItems: 'center',
          marginVertical: 10,
        }}>
        <Text style={{color: isDraggingOver ? '#1976d2' : '#666', fontSize: 14}}>
          {isDraggingOver ? 'Release to drop' : 'Drop an image or file here'}
        </Text>
      </View>
      <View style={{flexDirection: 'row', gap: 10, alignItems: 'flex-start'}}>
        <View style={{flex: 1}}>
          <Text style={{fontWeight: 'bold', marginBottom: 4}}>Event Log:</Text>
          <Text style={{height: 90}}>{log.join('\n')}</Text>
        </View>
        <View style={{flex: 1}}>
          <Text style={{fontWeight: 'bold', marginBottom: 4}}>Dropped Image:</Text>
          <Image
            source={{uri: imageUri}}
            style={{
              width: 128,
              height: 128,
              borderWidth: 1,
              borderColor: '#ccc',
            }}
          />
        </View>
      </View>
    </>
  );
}

function OnDragEnterOnDragLeaveOnDrop(): React.Node {
  // $FlowFixMe[missing-empty-array-annot]
  const [log, setLog] = React.useState([]);
  const appendLog = (line: string) => {
    const limit = 6;
    let newLog = log.slice(0, limit - 1);
    newLog.unshift(line);
    setLog(newLog);
  };
  return (
    <>
      <ExampleTextInput
        multiline={false}
        draggedTypes={'fileUrl'}
        onDragEnter={e => appendLog('SinglelineEnter')}
        onDragLeave={e => appendLog('SinglelineLeave')}
        onDrop={e => appendLog('SinglelineDrop')}
        style={styles.multiline}
        placeholder="SINGLE LINE with onDragEnter|Leave() and onDrop()"
      />
      <ExampleTextInput
        multiline={true}
        draggedTypes={'fileUrl'}
        onDragEnter={e => appendLog('MultilineEnter')}
        onDragLeave={e => appendLog('MultilineLeave')}
        onDrop={e => appendLog('MultilineDrop')}
        style={styles.multiline}
        placeholder="MULTI LINE with onDragEnter|Leave() and onDrop()"
      />
      <Text style={{height: 120}}>{log.join('\n')}</Text>
      <ExampleTextInput
        multiline={false}
        style={styles.multiline}
        placeholder="SINGLE LINE w/o onDragEnter|Leave() and onDrop()"
      />
      <ExampleTextInput
        multiline={true}
        style={styles.multiline}
        placeholder="MULTI LINE w/o onDragEnter|Leave() and onDrop()"
      />
    </>
  );
}

function OnPaste(): React.Node {
  // $FlowFixMe[missing-empty-array-annot]
  const [log, setLog] = React.useState([]);
  const appendLog = (line: string) => {
    const limit = 3;
    let newLog = log.slice(0, limit - 1);
    newLog.unshift(line);
    setLog(newLog);
  };
  const [imageUri, setImageUri] = React.useState(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg==',
  );
  return (
    <>
      <ExampleTextInput
        multiline={true}
        style={styles.multiline}
        onPaste={(e: PasteEvent) => {
          appendLog(JSON.stringify(e.nativeEvent.dataTransfer.types));
          setImageUri(e.nativeEvent.dataTransfer.files[0].uri);
        }}
        pastedTypes={['string']}
        placeholder="MULTI LINE with onPaste() text from clipboard"
      />
      <ExampleTextInput
        multiline={true}
        style={styles.multiline}
        onPaste={(e: PasteEvent) => {
          appendLog(JSON.stringify(e.nativeEvent.dataTransfer.types));
          setImageUri(e.nativeEvent.dataTransfer.files[0].uri);
        }}
        pastedTypes={['fileUrl', 'image', 'string']}
        placeholder="MULTI LINE with onPaste() for PNG/TIFF images from clipboard or fileUrl (via Finder) and text from clipboard"
      />
      <Text style={{height: 30}}>{log.join('\n')}</Text>
      <Image
        source={{uri: imageUri}}
        style={{
          width: 128,
          height: 128,
          margin: 4,
          borderWidth: 1,
          borderColor: 'white',
        }}
      />
    </>
  );
}

exports.title = 'Drag and Drop Events';
exports.category = 'UI';
exports.description = 'Demonstrates onDragEnter, onDragLeave, onDrop, and onPaste event handling in TextInput.';
exports.examples = [
  {
    title: 'Drag and Drop (View)',
    render: function (): React.Node {
      return <DragDropView />;
    },
  },
  {
    title: 'Drag and Drop (TextInput)',
    render: function (): React.Node {
      return <OnDragEnterOnDragLeaveOnDrop />;
    },
  },
  {
    title: 'onPaste (MultiLineTextInput)',
    render: function (): React.Node {
      return <OnPaste />;
    },
  },
];

// macOS]
