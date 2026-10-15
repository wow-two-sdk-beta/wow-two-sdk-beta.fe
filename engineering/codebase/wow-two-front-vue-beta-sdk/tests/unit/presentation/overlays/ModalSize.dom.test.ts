import { afterEach, describe, expect, it } from 'vitest';
import { h, nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { AlertModal, AlertModalContent, Modal, ModalContent, ModalSize } from '@src/presentation/overlays';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  document.body.innerHTML = '';
});

async function panelClass(contentProps: Record<string, unknown>): Promise<string> {
  const wrapper = mount(Modal, {
    props: { open: true },
    slots: { default: () => h(ModalContent, contentProps, () => 'Body') },
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  await nextTick();
  return document.querySelector('.ui-modal-content')!.className;
}

describe('modal size', () => {
  it('defaults to the 32rem step', async () => {
    expect(await panelClass({})).toContain('max-w-lg');
  });

  it.each([
    [ModalSize.Sm, 'max-w-sm'],
    [ModalSize.Md, 'max-w-lg'],
    [ModalSize.Lg, 'max-w-2xl'],
    [ModalSize.Xl, 'max-w-4xl'],
    [ModalSize.Full, 'max-w-none'],
  ])('maps %s to %s', async (size, expected) => {
    const className = await panelClass({ size });
    expect(className).toContain(expected);
    expect(className.match(/\bmax-w-\S+/g)).toHaveLength(1);
  });

  it('lets a max-w class override the step', async () => {
    const className = await panelClass({ size: 'sm', class: 'max-w-3xl' });
    expect(className).toContain('max-w-3xl');
    expect(className).not.toContain('max-w-sm');
  });

  it('forwards the step through AlertModalContent', async () => {
    const wrapper = mount(AlertModal, {
      props: { open: true },
      slots: { default: () => h(AlertModalContent, { size: 'xl' }, () => 'Body') },
      attachTo: document.body,
    });
    wrappers.push(wrapper);
    await nextTick();
    expect(document.querySelector('.ui-modal-content')!.className).toContain('max-w-4xl');
  });
});
