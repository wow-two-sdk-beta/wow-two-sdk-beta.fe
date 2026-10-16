import { toValue, watchPostEffect, type MaybeRefOrGetter } from 'vue';

interface ScrollLock {
  count: number;
  body: HTMLElement;
  overflow: string;
  paddingRight: string;
}
const Locks = new WeakMap<Document, ScrollLock>();

/**
 * Prevent body scroll while a document has active owners, compensating for its scrollbar.
 * The final owner restores the captured body styles. An optional document supports portals into frames.
 */
export function useScrollLock(
  enabled: MaybeRefOrGetter<boolean> = true,
  target: MaybeRefOrGetter<Document | null | undefined> = () => (typeof document === 'undefined' ? null : document),
): void {
  watchPostEffect((onCleanup) => {
    const owner = toValue(target);
    if (!toValue(enabled) || !owner?.body || !owner.defaultView) return;
    let lock = Locks.get(owner);
    if (!lock) {
      const body = owner.body;
      const view = owner.defaultView;
      lock = { count: 0, body, overflow: body.style.overflow, paddingRight: body.style.paddingRight };
      Locks.set(owner, lock);
      const scrollbarWidth = Math.max(0, view.innerWidth - owner.documentElement.clientWidth);
      body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        const padding = Number.parseFloat(view.getComputedStyle(body).paddingRight) || 0;
        body.style.paddingRight = `${padding + scrollbarWidth}px`;
      }
    }
    lock.count += 1;
    const lease = lock;
    onCleanup(() => {
      lease.count -= 1;
      if (lease.count !== 0) return;
      lease.body.style.overflow = lease.overflow;
      lease.body.style.paddingRight = lease.paddingRight;
      Locks.delete(owner);
    });
  });
}
