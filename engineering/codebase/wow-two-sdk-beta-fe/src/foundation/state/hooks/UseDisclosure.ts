import { ref, toValue, type MaybeRefOrGetter, type Ref } from 'vue';

export interface DisclosureControls {
  /** The open flag. Writable — `isOpen.value = true` is equivalent to `open()`. */
  isOpen: Ref<boolean>;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setOpen: (next: boolean) => void;
}

/**
 * Minimal open/close state. The standard backbone for Modal, Drawer, Popover,
 * Menu, Accordion, etc. Use `useControlled` underneath when the consumer may
 * also pass a controlled `open` prop.
 *
 * `initial` is read once, at setup — pass a getter only if the source is not
 * yet resolved at call time; later changes to it do not reopen the disclosure.
 */
export function useDisclosure(initial: MaybeRefOrGetter<boolean> = false): DisclosureControls {
  const isOpen = ref(toValue(initial));
  const open = (): void => {
    isOpen.value = true;
  };
  const close = (): void => {
    isOpen.value = false;
  };
  const toggle = (): void => {
    isOpen.value = !isOpen.value;
  };
  const setOpen = (next: boolean): void => {
    isOpen.value = next;
  };
  return { isOpen, open, close, toggle, setOpen };
}
