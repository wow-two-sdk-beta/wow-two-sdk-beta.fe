import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { LoadingOverlay } from '@src/presentation/feedback';

const wrappers: VueWrapper[] = [];
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'checkVisibility').mockReturnValue(true);
});
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function settle(): Promise<void> {
  for (let tick = 0; tick < 4; tick += 1) await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 60));
}

function trigger(): HTMLButtonElement {
  const button = document.createElement('button');
  button.textContent = 'Save';
  document.body.append(button);
  button.focus();
  return button;
}

describe('LoadingOverlay', () => {
  it('holds keyboard focus while it covers the page, then hands it back', async () => {
    const save = trigger();
    const wrapper = mount(LoadingOverlay, { props: { isOpen: true, label: 'Saving…' }, attachTo: document.body });
    wrappers.push(wrapper);
    await settle();
    const status = document.querySelector<HTMLElement>('[role=status][tabindex="-1"]')!;
    expect(status.textContent).toContain('Saving…');
    expect(document.activeElement).toBe(status);
    status.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    await settle();
    expect(document.activeElement).not.toBe(save);
    await wrapper.setProps({ isOpen: false });
    await settle();
    status.dispatchEvent(new Event('animationend'));
    await settle();
    expect(document.activeElement).toBe(save);
  });

  it('leaves focus alone when it only covers a region', async () => {
    const save = trigger();
    const wrapper = mount(LoadingOverlay, { props: { isOpen: true, isInline: true }, attachTo: document.body });
    wrappers.push(wrapper);
    await settle();
    expect(document.activeElement).toBe(save);
    expect(document.querySelector('[role=status]')?.hasAttribute('tabindex')).toBe(false);
  });
});
