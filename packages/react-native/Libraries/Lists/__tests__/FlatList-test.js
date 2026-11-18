/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

'use strict';

const {create} = require('../../../jest/renderer');
const ScrollView = require('../../Components/ScrollView/ScrollView').default;
const FlatList = require('../FlatList').default;
const React = require('react');
const {createRef} = require('react');
const {act} = require('react-test-renderer');

function createKeyEvent(key: string, altKey: boolean = false) {
  let defaultPrevented = false;
  return {
    defaultPrevented,
    isDefaultPrevented: () => defaultPrevented,
    nativeEvent: {altKey, key},
    preventDefault: () => {
      defaultPrevented = true;
    },
  };
}

describe('FlatList', () => {
  it('renders simple list', async () => {
    const component = await create(
      <FlatList
        data={[{key: 'i1'}, {key: 'i2'}, {key: 'i3'}]}
        renderItem={({item}) => <item value={item.key} />}
      />,
    );
    expect(component).toMatchSnapshot();
  });
  it('renders simple list (multiple columns)', async () => {
    const component = await create(
      <FlatList
        data={[{key: 'i1'}, {key: 'i2'}, {key: 'i3'}]}
        renderItem={({item}) => <item value={item.key} />}
        numColumns={2}
      />,
    );
    expect(component).toMatchSnapshot();
  });
  it('renders simple list using ListItemComponent', async () => {
    function ListItemComponent({item}: $ReadOnly<{item: {key: string}}>) {
      return <item value={item.key} />;
    }
    const component = await create(
      <FlatList
        data={[{key: 'i1'}, {key: 'i2'}, {key: 'i3'}]}
        ListItemComponent={ListItemComponent}
      />,
    );
    expect(component).toMatchSnapshot();
  });
  it('renders simple list using ListItemComponent (multiple columns)', async () => {
    function ListItemComponent({item}: $ReadOnly<{item: {key: string}}>) {
      return <item value={item.key} />;
    }
    const component = await create(
      <FlatList
        data={[{key: 'i1'}, {key: 'i2'}, {key: 'i3'}]}
        ListItemComponent={ListItemComponent}
        numColumns={2}
      />,
    );
    expect(component).toMatchSnapshot();
  });

  it('owns keyboard row selection state', async () => {
    const listRef = createRef<React.ElementRef<typeof FlatList>>();
    const onSelectionChanged = jest.fn();
    const onSelectionEntered = jest.fn();
    const component = await create(
      <FlatList
        data={[{key: 'i1'}, {key: 'i2'}, {key: 'i3'}]}
        enableSelectionOnKeyPress={true}
        initialSelectedIndex={0}
        onSelectionChanged={onSelectionChanged}
        onSelectionEntered={onSelectionEntered}
        ref={listRef}
        renderItem={({isSelected, item}) => (
          <item isSelected={isSelected} value={item.key} />
        )}
      />,
    );

    expect(
      component.root.findAllByType('item').map(item => item.props.isSelected),
    ).toEqual([true, false, false]);

    const scrollView = component.root.findByType(ScrollView);
    expect(scrollView.props.keyDownEvents).toContainEqual({key: 'Enter'});

    await act(async () => {
      scrollView.props.onKeyDown(createKeyEvent('ArrowDown'));
    });

    expect(
      component.root.findAllByType('item').map(item => item.props.isSelected),
    ).toEqual([false, true, false]);
    expect(onSelectionChanged).toHaveBeenCalledWith({
      item: {key: 'i2'},
      newSelection: 1,
      previousSelection: 0,
    });

    await act(async () => {
      scrollView.props.onKeyDown(createKeyEvent('ArrowDown', true));
    });
    expect(
      component.root.findAllByType('item').map(item => item.props.isSelected),
    ).toEqual([false, false, true]);
    expect(onSelectionChanged).toHaveBeenLastCalledWith({
      item: {key: 'i3'},
      newSelection: 2,
      previousSelection: 1,
    });

    scrollView.props.onKeyDown(createKeyEvent('Enter'));
    expect(onSelectionEntered).toHaveBeenCalledWith({key: 'i3'});

    await act(async () => {
      listRef.current?.selectRowAtIndex(0);
    });
    expect(onSelectionChanged).toHaveBeenLastCalledWith({
      item: {key: 'i1'},
      newSelection: 0,
      previousSelection: 2,
    });
  });

  it('lets consumers prevent keyboard selection', async () => {
    const onKeyDown = jest.fn(event => event.preventDefault());
    const onSelectionChanged = jest.fn();
    const component = await create(
      <FlatList
        data={[{key: 'i1'}, {key: 'i2'}]}
        enableSelectionOnKeyPress={true}
        initialSelectedIndex={0}
        onKeyDown={onKeyDown}
        onSelectionChanged={onSelectionChanged}
        renderItem={({item}) => <item value={item.key} />}
      />,
    );

    component.root
      .findByType(ScrollView)
      .props.onKeyDown(createKeyEvent('ArrowDown'));

    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(onSelectionChanged).not.toHaveBeenCalled();
  });

  it('rejects selecting a row outside the data', async () => {
    const listRef = createRef<React.ElementRef<typeof FlatList>>();
    await create(
      <FlatList
        data={[{key: 'i1'}]}
        ref={listRef}
        renderItem={({item}) => <item value={item.key} />}
      />,
    );

    expect(() => listRef.current?.selectRowAtIndex(1)).toThrow(
      'selectRowAtIndex out of range',
    );
  });

  it('keeps visible selections still and preserves scroll failure handling', async () => {
    const listRef = createRef<React.ElementRef<typeof FlatList>>();
    const onScrollToIndexFailed = jest.fn();
    await create(
      <FlatList
        data={[{key: 'i1'}, {key: 'i2'}, {key: 'i3'}]}
        getItemLayout={(_, index) => ({
          index,
          length: 10,
          offset: index * 10,
        })}
        onScrollToIndexFailed={onScrollToIndexFailed}
        ref={listRef}
        renderItem={({item}) => <item value={item.key} />}
      />,
    );
    const list = listRef.current;
    if (list == null) {
      throw new Error('FlatList ref was not set');
    }
    // $FlowFixMe[prop-missing] Verify selection scrolling on the owned list.
    const virtualizedList = list._listRef;
    if (virtualizedList == null) {
      throw new Error('VirtualizedList ref was not set');
    }
    const scrollToOffset = jest.spyOn(virtualizedList, 'scrollToOffset');

    await act(async () => {
      virtualizedList._onLayout({
        nativeEvent: {layout: {height: 100, width: 100}, zoomScale: 1},
      });
      virtualizedList._onContentSizeChange(100, 30);
      list.selectRowAtIndex(1);
    });

    expect(scrollToOffset).not.toHaveBeenCalled();
    expect(virtualizedList.props.onScrollToIndexFailed).toBe(
      onScrollToIndexFailed,
    );
  });
  it('renders empty list', async () => {
    const component = await create(
      <FlatList data={[]} renderItem={({item}) => <item value={item.key} />} />,
    );
    expect(component).toMatchSnapshot();
  });
  it('renders null list', async () => {
    const component = await create(
      <FlatList
        data={undefined}
        renderItem={({item}) => <item value={item.key} />}
      />,
    );
    expect(component).toMatchSnapshot();
  });
  it('renders all the bells and whistles', async () => {
    const component = await create(
      <FlatList
        ItemSeparatorComponent={() => <separator />}
        ListEmptyComponent={() => <empty />}
        ListFooterComponent={() => <footer />}
        ListHeaderComponent={() => <header />}
        data={new Array<void>(5).fill().map((_, ii) => ({id: String(ii)}))}
        keyExtractor={(item, index) => item.id}
        // $FlowFixMe[incompatible-type]
        getItemLayout={({index}: $FlowFixMe) => ({
          length: 50,
          offset: index * 50,
        })}
        numColumns={2}
        refreshing={false}
        onRefresh={jest.fn()}
        renderItem={({item}) => <item value={item.id} />}
      />,
    );
    expect(component).toMatchSnapshot();
  });
  it('getNativeScrollRef for case where it returns a native view', async () => {
    jest.resetModules();
    jest.unmock('../../Components/ScrollView/ScrollView');

    const listRef = createRef<React.ElementRef<typeof FlatList>>();

    await create(
      <FlatList
        data={[{key: 'outer0'}, {key: 'outer1'}]}
        renderItem={outerInfo => (
          <FlatList
            data={[
              {key: outerInfo.item.key + ':inner0'},
              {key: outerInfo.item.key + ':inner1'},
            ]}
            renderItem={innerInfo => {
              return <item title={innerInfo.item.key} />;
            }}
            ref={listRef}
          />
        )}
      />,
    );

    const scrollRef = listRef.current?.getNativeScrollRef();

    // This is checking if the ref acts like a host component. If we had an
    // `isHostComponent(ref)` method, that would be preferred.
    // $FlowFixMe[method-unbinding]
    expect(scrollRef?.measure).toBeInstanceOf(jest.fn().constructor);
    // $FlowFixMe[method-unbinding]
    expect(scrollRef?.measureLayout).toBeInstanceOf(jest.fn().constructor);
    // $FlowFixMe[method-unbinding]
    expect(scrollRef?.measureInWindow).toBeInstanceOf(jest.fn().constructor);
  });

  it('getNativeScrollRef for case where it returns a native scroll view', async () => {
    jest.resetModules();
    jest.unmock('../../Components/ScrollView/ScrollView');

    function ListItemComponent({item}: $ReadOnly<{item: {key: string}}>) {
      return <item value={item.key} />;
    }
    const listRef = createRef<React.ElementRef<typeof FlatList>>();

    await create(
      <FlatList
        data={[{key: 'i4'}, {key: 'i2'}, {key: 'i3'}]}
        ListItemComponent={ListItemComponent}
        numColumns={2}
        ref={listRef}
      />,
    );

    const scrollRef = listRef.current?.getNativeScrollRef();

    // This is checking if the ref acts like a host component. If we had an
    // `isHostComponent(ref)` method, that would be preferred.
    // $FlowFixMe[method-unbinding]
    expect(scrollRef?.measure).toBeInstanceOf(jest.fn().constructor);
    // $FlowFixMe[method-unbinding]
    expect(scrollRef?.measureLayout).toBeInstanceOf(jest.fn().constructor);
    // $FlowFixMe[method-unbinding]
    expect(scrollRef?.measureInWindow).toBeInstanceOf(jest.fn().constructor);
  });

  it('calls renderItem for all data items', async () => {
    const data = [
      {key: 'i1'},
      null,
      undefined,
      {key: 'i2'},
      null,
      undefined,
      {key: 'i3'},
    ];

    const renderItemInOneColumn = jest.fn();
    await create(<FlatList data={data} renderItem={renderItemInOneColumn} />);

    expect(renderItemInOneColumn).toHaveBeenCalledTimes(7);

    const renderItemInThreeColumns = jest.fn();

    await create(
      <FlatList
        data={data}
        renderItem={renderItemInThreeColumns}
        numColumns={3}
      />,
    );

    expect(renderItemInThreeColumns).toHaveBeenCalledTimes(7);
  });
  it('renders array-like data', async () => {
    const arrayLike = {
      length: 3,
      0: {key: 'i1'},
      1: {key: 'i2'},
      2: {key: 'i3'},
    };

    const component = await create(
      <FlatList
        // $FlowFixMe[incompatible-type]
        data={arrayLike}
        renderItem={({item}) => <item value={item.key} />}
      />,
    );
    expect(component).toMatchSnapshot();
  });
  it('ignores invalid data', async () => {
    const component = await create(
      <FlatList
        // $FlowExpectedError[incompatible-type]
        data={123456}
        // $FlowFixMe[missing-local-annot]
        renderItem={({item}) => <item value={item.key} />}
      />,
    );
    expect(component).toMatchSnapshot();
  });
});
