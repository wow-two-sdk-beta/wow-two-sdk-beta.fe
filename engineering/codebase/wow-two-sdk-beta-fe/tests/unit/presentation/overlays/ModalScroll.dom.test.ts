import { afterEach, describe, expect, it } from 'vitest';
import { h, nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalTitle } from '@src/presentation/overlays';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  document.body.innerHTML = '';
});

describe('modal height', () => {
  it('caps the panel at the viewport and scrolls only its body', async () => {
    const wrapper = mount(Modal, {
      props: { open: true },
      slots: {
        default: () =>
          h(ModalContent, null, () => [
            h(ModalHeader, null, () => h(ModalTitle, null, () => 'Deploy a release')),
            h(ModalBody, { class: 'body' }, () => 'Long content'),
            h(ModalFooter, { class: 'footer' }, () => 'Actions'),
          ]),
      },
      attachTo: document.body,
    });
    wrappers.push(wrapper);
    await nextTick();
    const panel = document.querySelector('.ui-modal-content')!;
    expect(panel.className).toContain('max-h-[calc(100dvh-2rem)]');
    expect(panel.className).toContain('flex-col');
    const body = document.querySelector('.body')!;
    expect(body.className).toContain('min-h-0');
    expect(body.className).toContain('overflow-y-auto');
    expect(document.querySelector('.footer')!.className).toContain('shrink-0');
  });
});
