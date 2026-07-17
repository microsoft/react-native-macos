/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// [macOS
import type * as React from 'react';
import {
  VirtualizedList,
  type ListRenderItem,
  type VirtualizedListWithoutRenderItemProps,
  type ViewToken,
} from './Lists/VirtualizedList';
// macOS]

export * from './Lists/VirtualizedList';

// [macOS
export type ListViewToken<ItemT = any> = ViewToken<ItemT>;

export interface SectionBase<ItemT, SectionT = Record<string, unknown>> {
  data: ReadonlyArray<ItemT>;
  key?: string | undefined;
  renderItem?: SectionListRenderItem<ItemT, SectionT> | undefined;
  keyExtractor?: ((item: ItemT, index: number) => string) | undefined;
}

export type SectionData<
  ItemT,
  SectionT = Record<string, unknown>,
> = SectionBase<ItemT, SectionT> & SectionT;

export interface SectionListRenderItemInfo<
  ItemT,
  SectionT = Record<string, unknown>,
> {
  item: ItemT;
  index: number;
  section: SectionData<ItemT, SectionT>;
  separators: {
    highlight: () => void;
    unhighlight: () => void;
    updateProps: (select: 'leading' | 'trailing', newProps: unknown) => void;
  };
}

export type SectionListRenderItem<ItemT, SectionT = Record<string, unknown>> = (
  info: SectionListRenderItemInfo<ItemT, SectionT>,
) => React.ReactElement | null;

export type ScrollToLocationParamsType = {
  animated?: boolean | undefined;
  itemIndex: number;
  sectionIndex: number;
  viewOffset?: number | undefined;
  viewPosition?: number | undefined;
};

export interface VirtualizedSectionListProps<
  ItemT,
  SectionT = Record<string, unknown>,
> extends VirtualizedListWithoutRenderItemProps<ItemT> {
  sections: ReadonlyArray<SectionData<ItemT, SectionT>>;
  renderItem?: SectionListRenderItem<ItemT, SectionT> | undefined;
  renderSectionFooter?:
    | ((info: {
        section: SectionData<ItemT, SectionT>;
      }) => React.ReactElement | null)
    | undefined;
  renderSectionHeader?:
    | ((info: {
        section: SectionData<ItemT, SectionT>;
      }) => React.ReactElement | null)
    | undefined;
}

export class VirtualizedSectionList<
  ItemT,
  SectionT = Record<string, unknown>,
> extends React.Component<VirtualizedSectionListProps<ItemT, SectionT>> {
  scrollToLocation(params: ScrollToLocationParamsType): void;
}

declare const VirtualizedLists: {
  VirtualizedList: typeof VirtualizedList;
  VirtualizedSectionList: typeof VirtualizedSectionList;
};

export default VirtualizedLists;
// macOS]
