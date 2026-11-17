import { onMounted, onScopeDispose, shallowRef, type ShallowRef } from 'vue';

import type { ToastEntry } from './ToastEntry';
import { toastHost } from './ToastHostStore';

/** Manages a mirror of the store's live toasts while the calling component is mounted; a server render sees none. */
export function useToastEntries(): Readonly<ShallowRef<ReadonlyArray<ToastEntry>>> {
  const entries = shallowRef<ReadonlyArray<ToastEntry>>([]);
  let unsubscribe: (() => void) | undefined;
  onMounted(() => {
    unsubscribe = toastHost.subscribe((next) => {
      entries.value = next;
    });
  });
  onScopeDispose(() => unsubscribe?.());
  return entries;
}
