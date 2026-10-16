import { inject, nextTick, onBeforeUnmount, onMounted, provide, shallowRef, type InjectionKey, type Ref } from 'vue';

interface FormResetScope {
  form(): HTMLFormElement | null;
}
const FormResetKey: InjectionKey<FormResetScope> = Symbol('presentation.formReset');

/** Routes one reset through the outer value owner; nested controls only reconcile their DOM. */
export function useNativeFormReset(
  element: Readonly<Ref<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>>,
  reset: () => void,
  restore: () => void = () => {},
): Readonly<Ref<number>> {
  const parent = inject(FormResetKey, null);
  const revision = shallowRef(0);
  const scope: FormResetScope = {
    form: () => {
      return element.value?.form ?? null;
    },
  };
  provide(FormResetKey, scope);
  let document: Document | undefined;
  function onReset(event: Event): void {
    const form = scope.form();
    if (!form || event.target !== form) return;
    const active = document?.activeElement as HTMLElement | null;
    const root = element.value?.parentElement;
    const hadFocus = Boolean(root && active && root.contains(active));
    const focusAttributes = ['type', 'name', 'role', 'aria-label'] as const;
    const matchingControls = (container: Element): Element[] =>
      active
        ? [container, ...container.querySelectorAll(active.tagName)].filter(
            (node) =>
              node.tagName === active.tagName &&
              focusAttributes.every((key) => node.getAttribute(key) === active.getAttribute(key)),
          )
        : [];
    const ordinal = root && active ? matchingControls(root).indexOf(active) : -1;
    queueMicrotask(() => {
      if (event.defaultPrevented || !element.value || scope.form() !== form) return;
      if (parent?.form() !== form) {
        reset();
        revision.value += 1;
      }
      void nextTick(() => {
        if (!element.value || scope.form() !== form) return;
        restore();
        if (!active || active.isConnected || !hadFocus) return;
        const currentRoot = element.value.parentElement;
        const candidates = currentRoot ? matchingControls(currentRoot) : [];
        const target =
          (active.id ? candidates.find((node) => node.id === active.id) : undefined) ?? candidates[ordinal];
        const elementType = target?.ownerDocument.defaultView?.HTMLElement;
        if (elementType && target instanceof elementType) {
          target.focus({ preventScroll: true });
        }
      });
    });
  }
  onMounted(() => {
    document = element.value?.ownerDocument;
    document?.addEventListener('reset', onReset, true);
  });
  onBeforeUnmount(() => document?.removeEventListener('reset', onReset, true));
  return revision;
}
