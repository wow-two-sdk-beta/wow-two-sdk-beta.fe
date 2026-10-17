import {
  defineComponent,
  h,
  inject,
  onErrorCaptured,
  onMounted,
  provide,
  shallowRef,
  Teleport,
  type InjectionKey,
} from 'vue';

const OptionCollectionKey: InjectionKey<boolean> = Symbol('presentation.optionCollection');

/** Reports whether an option renders inside a closed picker's collection: it registers and renders nothing. */
export function useOptionCollection(): boolean {
  return inject(OptionCollectionKey, false);
}

/**
 * Mounts a closed picker's option slot into a detached element, so each option registers its label before
 * the first open. The panel unmounts its rows while closed, which left the trigger with the raw key.
 *
 * Client-only: the server render and the hydration pass render nothing here. The collection is best-effort,
 * so an option subtree that cannot render outside its panel stops the collection instead of the page.
 */
export const OptionCollection = defineComponent({
  name: 'OptionCollection',
  props: {
    /** Renders the slot into the detached element while true; the picker passes its closed state. */
    isActive: { type: Boolean, required: true },
  },
  setup(props, { slots }) {
    provide(OptionCollectionKey, true);

    const host = shallowRef<HTMLElement | null>(null);
    const hasFailed = shallowRef(false);

    onMounted(() => {
      host.value = document.createElement('div');
    });

    onErrorCaptured(() => {
      hasFailed.value = true;
      return false;
    });

    return () =>
      host.value && props.isActive && !hasFailed.value
        ? h(Teleport, { to: host.value }, slots.default?.() ?? [])
        : null;
  },
});
