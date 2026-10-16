import { inject, type InjectionKey } from 'vue';

/** The open / disabled state a `CollapsibleGroup` root shares with its trigger and content. */
export interface CollapsibleGroupContextValue {
  /** The open state. Live getter — read it, don't destructure it. */
  readonly open: boolean;

  /** Sets the open state (and fires the root's `open-change`). */
  setOpen: (open: boolean) => void;

  /** The id the content pane carries and the trigger points at through `aria-controls`. */
  contentId: string;

  /** The id the trigger carries and the content pane points at through `aria-labelledby`. */
  triggerId: string;

  /** The disabled state. Live getter. */
  readonly disabled: boolean;
}

export const CollapsibleGroupKey: InjectionKey<CollapsibleGroupContextValue> = Symbol('wow-two.collapsible');

/** Reads the surrounding `CollapsibleGroup`. Throws outside one — the parts are not standalone. */
export function useCollapsibleContext(): CollapsibleGroupContextValue {
  const context = inject(CollapsibleGroupKey, null);
  if (!context) throw new Error('CollapsibleGroup.* must be used inside <CollapsibleGroup>');
  return context;
}
