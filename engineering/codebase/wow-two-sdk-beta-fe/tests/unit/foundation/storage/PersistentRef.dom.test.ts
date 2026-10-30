import { afterEach, describe, expect, it } from 'vitest';
import { effectScope } from 'vue';
import { createPersistentRef, localStorageStorageBroker, memoryStorageBroker } from '@src/foundation/storage';

/* `dom` project (happy-dom): the shared ref over the real `localStorage` and the window `storage` event. */

afterEach(() => {
  window.localStorage.clear();
});

const isBoolean = (stored: unknown): boolean | undefined => (typeof stored === 'boolean' ? stored : undefined);

/** Writes `value` as another tab would and dispatches the event this tab receives. */
function writeFromAnotherTab(key: string, value: string | null): void {
  if (value === null) window.localStorage.removeItem(key);
  else window.localStorage.setItem(key, value);
  window.dispatchEvent(new StorageEvent('storage', { key, newValue: value, storageArea: window.localStorage }));
}

describe('createPersistentRef over localStorage', () => {
  it('reads and writes JSON under the bare key', () => {
    window.localStorage.setItem('app.sidebar', 'true');
    const sidebar = createPersistentRef('app.sidebar', false, { decode: isBoolean });

    expect(sidebar.value).toBe(true);
    sidebar.value = false;
    expect(window.localStorage.getItem('app.sidebar')).toBe('false');
  });

  it('reads a raw non-JSON string as initial', () => {
    window.localStorage.setItem('app.view', 'rows');

    expect(createPersistentRef('app.view', 'cards').value).toBe('cards');
  });

  it('adopts a decoded write from another tab and returns to initial on removal', () => {
    const scope = effectScope();
    const view = scope.run(() =>
      createPersistentRef<'cards' | 'rows'>('app.view', 'cards', {
        decode: (stored) => (stored === 'cards' || stored === 'rows' ? stored : undefined),
      }),
    )!;

    writeFromAnotherTab('app.view', '"rows"');
    expect(view.value).toBe('rows');

    writeFromAnotherTab('app.view', '"tiles"');
    expect(view.value).toBe('cards');

    writeFromAnotherTab('app.view', '"rows"');
    writeFromAnotherTab('app.view', null);
    expect(view.value).toBe('cards');
    scope.stop();
  });

  it('ignores other keys and session storage, and returns to initial when storage is cleared', () => {
    const scope = effectScope();
    const sidebar = scope.run(() => createPersistentRef('app.sidebar', false, { decode: isBoolean }))!;
    sidebar.value = true;

    writeFromAnotherTab('app.other', 'false');
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'app.sidebar', newValue: null, storageArea: window.sessionStorage }),
    );
    expect(sidebar.value).toBe(true);

    window.localStorage.clear();
    window.dispatchEvent(new StorageEvent('storage', { key: null, storageArea: window.localStorage }));
    expect(sidebar.value).toBe(false);
    scope.stop();
  });

  it('stays put when tab sync is off, when the scope stopped, or over another broker', () => {
    const scope = effectScope();
    const unsynced = createPersistentRef('app.a', false, { decode: isBoolean, syncTabs: false });
    const scoped = scope.run(() => createPersistentRef('app.b', false, { decode: isBoolean }))!;
    const memory = createPersistentRef('app.c', false, { decode: isBoolean, broker: memoryStorageBroker() });
    scope.stop();

    writeFromAnotherTab('app.a', 'true');
    writeFromAnotherTab('app.b', 'true');
    writeFromAnotherTab('app.c', 'true');

    expect(unsynced.value).toBe(false);
    expect(scoped.value).toBe(false);
    expect(memory.value).toBe(false);
    expect(localStorageStorageBroker.read('app.b')).toBe(true);
  });
});
