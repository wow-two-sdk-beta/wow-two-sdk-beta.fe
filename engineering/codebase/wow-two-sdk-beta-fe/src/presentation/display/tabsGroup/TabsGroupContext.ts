import { inject, type InjectionKey } from 'vue';
import type { Orientation } from '../../../foundation/styles';

/** Defines when a TabsGroup tab activates on keyboard navigation. */
export const TabsGroupActivationMode = {
  /** Refers to activating a tab as soon as it is focused. */
  Automatic: 'automatic',
  /** Refers to requiring Enter/Space to activate a focused tab. */
  Manual: 'manual',
} as const;

export type TabsGroupActivationMode = (typeof TabsGroupActivationMode)[keyof typeof TabsGroupActivationMode];

/**
 * The seam between `TabsGroup` and its `TabsGroupList` / `TabsGroupTab` / `TabsGroupPanel` children.
 *
 * React attached these as `TabsGroup.List` / `.Tab` / `.Panel` statics over a
 * `createContext`. An SFC's generated default export cannot carry statics
 * cleanly, so they ship as sibling components and share state through
 * provide/inject instead.
 *
 * Every field but `setValue` is a live getter — read them, don't destructure.
 */
export interface TabsGroupContextValue {
  /** The active tab value. */
  readonly value: string;
  /** Selects a tab. */
  setValue: (value: string) => void;
  /** The layout axis of the tablist. */
  readonly orientation: Orientation;
  /** Whether focus alone activates a tab. */
  readonly activationMode: TabsGroupActivationMode;
  /** The id prefix shared by every tab / panel pair. */
  readonly baseId: string;
}

export const TabsGroupKey: InjectionKey<TabsGroupContextValue> = Symbol('wow-two.tabs');

export function useTabsContext(): TabsGroupContextValue {
  const context = inject(TabsGroupKey, null);
  if (!context) throw new Error('TabsGroup.* must be used inside <TabsGroup>');
  return context;
}
