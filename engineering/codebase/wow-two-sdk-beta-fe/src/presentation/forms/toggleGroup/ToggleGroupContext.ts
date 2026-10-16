import type { InjectionKey } from 'vue';
import type { ToggleItemRole } from './ToggleGroup.variants';

/**
 * The seam between `ToggleGroup` and its `ToggleInput` children.
 *
 * The React original reached into its children with `Children.map` +
 * `cloneElement`, injecting `isPressed` / `onPressedChange` (and the tablist
 * roles) onto each one. Vue has no equivalent — a parent cannot rewrite a
 * child's props — so the same coordination runs through provide/inject: the
 * group publishes the selection, each item reads its own slice off its `value`.
 *
 * Semantics are preserved exactly: an item with no `value` is inert, an item
 * with an explicit `isPressed` prop still wins over the group, and the item's
 * own `pressed-change` fires before the group's toggle.
 */
export interface ToggleGroupContextValue {
  /** True while the item carrying `value` is active. Always false for a valueless item. */
  isPressed: (value: string | undefined) => boolean;

  /** Flips the item carrying `value` — clears in single mode, adds / removes in multi. */
  toggle: (value: string | undefined) => void;

  /** The ARIA role wiring the group applies to each item. Live getter — read it, don't destructure it. */
  readonly itemRole: ToggleItemRole;
}

export const ToggleGroupKey: InjectionKey<ToggleGroupContextValue> = Symbol('wow-two.toggleButtonGroup');
