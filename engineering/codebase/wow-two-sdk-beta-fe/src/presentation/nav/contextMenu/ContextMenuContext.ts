import { inject, type InjectionKey, type ShallowRef } from 'vue';

/** The value shared with `ContextMenuTrigger` / `ContextMenuContent`. */
export interface ContextMenuContextValue {
  open: ShallowRef<boolean>;
  setOpen: (open: boolean) => void;

  /** The zero-size virtual element the menu anchors to, positioned at the gesture's coordinates. */
  anchor: ShallowRef<HTMLElement | null>;
  setAnchor: (el: HTMLElement | null) => void;

  triggerEl: ShallowRef<HTMLElement | null>;

  /**
   * Element to hand focus back to on close — captured before the open gesture
   * moves focus. A plain mutable box, not a ref: it is a one-shot signal
   * between handlers, never rendered.
   */
  restoreFocus: { current: HTMLElement | null };
}

export const contextMenuContextKey: InjectionKey<ContextMenuContextValue> = Symbol('wow-two.contextMenu');

export function useContextMenuContext(): ContextMenuContextValue {
  const context = inject(contextMenuContextKey, null);
  if (!context) throw new Error('ContextMenu.* must be used inside <ContextMenu>');
  return context;
}
