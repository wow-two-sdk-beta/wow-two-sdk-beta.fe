import { defineComponent, inject, provide, shallowRef, type Component, type InjectionKey } from 'vue';

export interface CollectionContextValue<T> {
  /** The registered items, in registration order. A live getter — read it, never destructure it. */
  readonly items: ReadonlyArray<T>;
  register: (item: T) => void;
  unregister: (item: T) => void;
}

/**
 * Factory for a typed children-registry context. Compound components
 * (Menu, Tabs, Listbox) use this so the parent can iterate ordered children
 * without prop-drilling.
 *
 * The registration model is unchanged from React — items call `register()` on
 * mount and `unregister()` on unmount. That already matched what Vue needs:
 * slots are functions, so there is no children array to walk.
 *
 * `Context` becomes `injectionKey` — Vue's `provide`/`inject` are keyed by
 * symbol rather than by a context object.
 */
export function createCollection<T>(): {
  Provider: Component;
  useCollection: () => CollectionContextValue<T>;
  injectionKey: InjectionKey<CollectionContextValue<T>>;
} {
  const injectionKey: InjectionKey<CollectionContextValue<T>> = Symbol('wow-two.collection');

  const Provider = defineComponent({
    name: 'CollectionProvider',
    setup(_props, { slots }) {
      const items = shallowRef<ReadonlyArray<T>>([]);

      // Replaced wholesale rather than mutated: a `shallowRef` only notifies on
      // identity change, which is also what kept React's `useState` updates cheap.
      const register = (item: T): void => {
        if (!items.value.includes(item)) items.value = [...items.value, item];
      };
      const unregister = (item: T): void => {
        items.value = items.value.filter((existing) => existing !== item);
      };

      // A getter rather than `reactive()` — it keeps `T` intact (reactive would
      // deep-unwrap it) while still tracking as a dependency on read.
      const context: CollectionContextValue<T> = {
        get items() {
          return items.value;
        },
        register,
        unregister,
      };
      provide(injectionKey, context);

      return () => slots.default?.() ?? null;
    },
  });

  function useCollection(): CollectionContextValue<T> {
    const context = inject(injectionKey, null);
    if (!context) {
      throw new Error('useCollection must be used inside its Provider');
    }
    return context;
  }

  return { Provider, useCollection, injectionKey };
}
