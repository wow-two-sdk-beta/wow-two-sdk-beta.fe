import { describe, expect, it } from 'vitest';
import { h, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertModal,
  AlertModalAction,
  AlertModalCancel,
  AlertModalContent,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Drawer,
  DrawerContent,
  DrawerTrigger,
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@src/presentation/overlays';

const BODY_MARKER = 'data-overlay-body';

/** Whether the overlay's portalled content is in the document. */
function contentIsOpen(): boolean {
  return document.body.querySelector(`[${BODY_MARKER}]`) !== null;
}

describe('overlays — open state', () => {
  /*
   * The port's `boolean` cast bug, as a standing guard.
   *
   * Vue coerces an absent optional `boolean` prop to `false` unless the declaration owns an
   * explicit `undefined` default. A root that lost that default reads as controlled-and-closed
   * the moment nothing is passed, and `TourPopover.open` shipped exactly that way — the component
   * could never open. Passing NO open prop at all is the only shape that catches it.
   */
  it.each([
    ['Modal', Modal, ModalContent],
    ['Drawer', Drawer, DrawerContent],
    ['Popover', Popover, PopoverContent],
  ] as const)('%s opens through its uncontrolled path with no open prop passed', async (_name, Root, Content) => {
    const wrapper = mount({
      render: () => h(Root, { defaultOpen: true }, () => h(Content, null, () => h('p', { [BODY_MARKER]: '' }))),
    });
    await nextTick();

    expect(contentIsOpen()).toBe(true);
    wrapper.unmount();
  });

  /*
   * `v-model:open` round-trip. Writes by clicking the trigger, which routes through
   * `update:open`; reads back by letting the parent's ref flow into the `open` prop and
   * asserting the content appeared. A root that emits but ignores the prop coming back passes
   * an emit-only assertion and then refuses every programmatic close a real app does.
   */
  it.each([
    ['Modal', Modal, ModalTrigger, ModalContent],
    ['Drawer', Drawer, DrawerTrigger, DrawerContent],
    ['Popover', Popover, PopoverTrigger, PopoverContent],
  ] as const)('%s round-trips v-model:open', async (name, Root, Trigger, Content) => {
    const open = ref(false);
    const wrapper = mount({
      render: () =>
        h(
          Root,
          {
            open: open.value,
            'onUpdate:open': (next: boolean) => {
              open.value = next;
            },
          },
          () => [h(Trigger, null, () => 'open it'), h(Content, null, () => h('p', { [BODY_MARKER]: '' }))],
        ),
    });
    await nextTick();
    expect(contentIsOpen(), `${name} rendered its content while closed`).toBe(false);

    await wrapper.find('button').trigger('click');
    await nextTick();

    expect(open.value, `${name} did not write through update:open`).toBe(true);
    expect(contentIsOpen(), `${name} did not read the modelled open state back`).toBe(true);

    wrapper.unmount();
  });
});

describe('overlays — a11y', () => {
  it.each([
    ['Modal', Modal, ModalContent],
    ['Drawer', Drawer, DrawerContent],
  ] as const)('%s content is a modal dialog', async (name, Root, Content) => {
    const wrapper = mount({
      render: () => h(Root, { defaultOpen: true }, () => h(Content, null, () => h('p', { [BODY_MARKER]: '' }))),
    });
    await nextTick();

    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog, `${name} rendered no role="dialog"`).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal'), `${name} is not aria-modal`).toBe('true');

    wrapper.unmount();
  });

  it('marks the modal layer and blurred backdrop for component-only styling', async () => {
    const wrapper = mount({
      render: () =>
        h(Modal, { defaultOpen: true }, () =>
          h(ModalContent, { isBlurred: true }, () => h('p', { [BODY_MARKER]: '' })),
        ),
    });
    await nextTick();

    expect(document.body.querySelector('.ui-modal-layer')).not.toBeNull();
    expect(document.body.querySelector('.ui-modal-content')).not.toBeNull();
    expect(document.body.querySelector('.ui-backdrop-overlay-blurred')).not.toBeNull();

    wrapper.unmount();
  });
});

describe('AlertModal actions', () => {
  it('keeps the default backdrop when no backdrop prop is passed', async () => {
    const wrapper = mount({
      render: () => h(AlertModal, { defaultOpen: true }, () => h(AlertModalContent, null, () => 'Discard draft?')),
    });
    await nextTick();

    expect(document.body.querySelector('.ui-backdrop-overlay')).not.toBeNull();

    wrapper.unmount();
  });

  it('renders footer actions without close-glyph positioning', async () => {
    const wrapper = mount({
      render: () =>
        h(AlertModal, { defaultOpen: true }, () =>
          h(AlertModalContent, null, () => [
            h(AlertModalCancel, null, () => 'Keep editing'),
            h(AlertModalAction, null, () => 'Discard'),
          ]),
        ),
    });
    await nextTick();

    for (const button of document.body.querySelectorAll('button')) {
      expect(button.classList).not.toContain('absolute');
      expect(button.classList).not.toContain('right-4');
      expect(button.classList).not.toContain('top-4');
    }

    wrapper.unmount();
  });
});

describe('overlays — focus scope nesting', () => {
  /*
   * Popover-inside-Modal was runaway recursion before the scope stack landed: neither is
   * DOM-nested (both portal to body), so each trapped scope read focus in the other as an
   * escape and pulled it back, and `.focus()` dispatches `focusin` synchronously — the two
   * recursed until the stack blew. Mounting the pair at all is the regression guard.
   */
  it('mounts a Popover inside an open Modal without recursing', async () => {
    const wrapper = mount({
      render: () =>
        h(Modal, { defaultOpen: true }, () =>
          h(ModalContent, null, () =>
            h(Popover, { defaultOpen: true }, () => [
              h(PopoverTrigger, null, () => 'more'),
              h(PopoverContent, null, () => h('p', { [BODY_MARKER]: '' })),
            ]),
          ),
        ),
    });
    await nextTick();

    expect(contentIsOpen()).toBe(true);
    wrapper.unmount();
  });
});

describe('overlays — deprecated aliases', () => {
  /*
   * `Dialog*` / `AlertDialog*` are kept for one release as aliases of `Modal*` / `AlertModal*`.
   * Identity IS the whole contract, so it is asserted here rather than by re-mounting the same
   * SFCs in the sweep — and asserting it by identity is strictly stronger, since a mount would
   * still pass if someone quietly forked the alias into a second component.
   *
   * Every alias the barrel exports is listed. When the deprecation window closes, this block and
   * the aliases go together.
   */
  it.each([
    ['Dialog', Dialog, Modal],
    ['DialogTrigger', DialogTrigger, ModalTrigger],
    ['DialogContent', DialogContent, ModalContent],
    ['DialogHeader', DialogHeader, ModalHeader],
    ['DialogTitle', DialogTitle, ModalTitle],
    ['DialogDescription', DialogDescription, ModalDescription],
    ['DialogBody', DialogBody, ModalBody],
    ['DialogFooter', DialogFooter, ModalFooter],
    ['DialogClose', DialogClose, ModalClose],
    ['AlertDialog', AlertDialog, AlertModal],
    ['AlertDialogContent', AlertDialogContent, AlertModalContent],
    ['AlertDialogAction', AlertDialogAction, AlertModalAction],
    ['AlertDialogCancel', AlertDialogCancel, AlertModalCancel],
  ] as const)('%s is the same component it aliases', (_name, alias, target) => {
    expect(alias).toBe(target);
  });
});
