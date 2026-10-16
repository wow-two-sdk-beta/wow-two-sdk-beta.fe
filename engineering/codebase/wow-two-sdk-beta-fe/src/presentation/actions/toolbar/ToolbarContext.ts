import { inject, type InjectionKey } from 'vue';
import type { Orientation } from '../../../foundation/styles';

export interface ToolbarContextValue {
  /** The toolbar's layout axis. Live getter — read it, don't destructure it. */
  readonly orientation: Orientation;
}

export const ToolbarKey: InjectionKey<ToolbarContextValue> = Symbol('wow-two.toolbar');

/** Reads the surrounding `Toolbar`. Throws outside one — the parts are not standalone. */
export function useToolbarContext(): ToolbarContextValue {
  const context = inject(ToolbarKey, null);
  if (!context) throw new Error('Toolbar.* must be used inside <Toolbar>');
  return context;
}
