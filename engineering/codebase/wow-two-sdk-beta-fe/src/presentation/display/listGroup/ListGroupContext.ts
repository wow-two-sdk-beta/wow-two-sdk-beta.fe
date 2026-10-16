import { inject, type InjectionKey } from 'vue';
import type { ListGroupMarker } from './ListGroup.variants';

/** The marker preset a `ListGroup` root shares with its items. */
export interface ListGroupContextValue {
  /** The root's `marker` prop. Live getter — read it, don't destructure it. */
  readonly marker: ListGroupMarker;
}

export const ListGroupKey: InjectionKey<ListGroupContextValue> = Symbol('wow-two.list');

/**
 * Reads the surrounding `ListGroup`.
 *
 * Unlike the other compound families in this group this does **not** throw: a bare
 * `<li>` is documented as a valid child, so `ListGroupItem` has to stand alone. Outside a
 * `ListGroup` the marker reads as `none`, which is the root's own default.
 */
export function useListContext(): ListGroupContextValue {
  return inject(ListGroupKey, { marker: 'none' });
}
