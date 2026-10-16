import { inject, type InjectionKey } from 'vue';

/**
 * The seam between `TreeViewer` and its `TreeViewerGroup` / `TreeViewerItem` children.
 *
 * React attached those as `TreeViewer.Group` / `.Item` statics over a `createContext`.
 * An SFC's generated default export cannot carry statics cleanly, so they ship
 * as sibling components and share state through provide/inject instead.
 *
 * `selectedValue` and `expanded` are live getters — read them, don't destructure.
 */
export interface TreeViewerContextValue {
  /** The selected leaf value, or `null`. */
  readonly selectedValue: string | null;
  /** Selects a leaf. */
  setSelectedValue: (value: string) => void;
  /** The expanded branch values. */
  readonly expanded: ReadonlySet<string>;
  /** Flips one branch open/closed. */
  toggleExpanded: (value: string) => void;
}

export const TreeViewerKey: InjectionKey<TreeViewerContextValue> = Symbol('wow-two.tree');

export function useTreeContext(): TreeViewerContextValue {
  const context = inject(TreeViewerKey, null);
  if (!context) throw new Error('TreeViewer.* must be used inside <TreeViewer>');
  return context;
}

/** The nesting depth, 1-based — React's `TreeViewerLevelContext`, defaulted to the root level. */
export interface TreeViewerLevelValue {
  readonly level: number;
}

export const TreeViewerLevelKey: InjectionKey<TreeViewerLevelValue> = Symbol('wow-two.tree.level');

/** Returns the level holder rather than the number, so a nested provide stays live. */
export function useTreeLevel(): TreeViewerLevelValue {
  return inject(TreeViewerLevelKey, { level: 1 });
}
