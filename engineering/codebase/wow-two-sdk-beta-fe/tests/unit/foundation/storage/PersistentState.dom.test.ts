import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { localStorageStorageBroker, memoryStorageBroker, usePersistentState } from '@src/foundation/storage';

afterEach(() => {
  window.localStorage.clear();
});

describe('persistent state key ownership', () => {
  it('resets synchronously when a new key has no saved value', () => {
    const key = ref('alice');
    const broker = memoryStorageBroker();
    broker.write('alice', 'private draft');
    let state!: ReturnType<typeof usePersistentState<string>>;
    const wrapper = mount(
      defineComponent({
        setup() {
          state = usePersistentState(key, 'empty', { broker });
          return () => null;
        },
      }),
    );
    expect(state.value.value).toBe('private draft');
    key.value = 'bob';
    expect(state.value.value).toBe('empty');
    state.setValue((value) => `${value}!`);
    expect(broker.read('bob')).toBe('empty!');
    wrapper.unmount();
  });

  it('handles cross-tab clear without treating session storage as local storage', () => {
    localStorageStorageBroker.write('draft', 'saved');
    let state!: ReturnType<typeof usePersistentState<string>>;
    const wrapper = mount(
      defineComponent({
        setup() {
          state = usePersistentState('draft', 'empty');
          return () => null;
        },
      }),
    );
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'draft', newValue: null, storageArea: window.sessionStorage }),
    );
    expect(state.value.value).toBe('saved');
    window.localStorage.clear();
    window.dispatchEvent(new StorageEvent('storage', { key: null, storageArea: window.localStorage }));
    expect(state.value.value).toBe('empty');
    wrapper.unmount();
  });
});
