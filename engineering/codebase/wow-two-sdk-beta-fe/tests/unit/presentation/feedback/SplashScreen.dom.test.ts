import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { SplashScreen } from '@src/presentation/feedback';

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

function splash(props: Record<string, unknown>): VueWrapper {
  const wrapper = mount(SplashScreen, {
    props,
    slots: { logo: () => h('img', { alt: 'Product' }) },
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  return wrapper;
}

describe('SplashScreen', () => {
  it('centres the logo above a labelled progress bar that fills the page', async () => {
    splash({ value: 40 });
    await settle();
    const status = document.querySelector<HTMLElement>('[role=status]')!;
    const bar = status.querySelector<HTMLElement>('[role=progressbar]')!;
    expect(status.querySelector('img')?.getAttribute('alt')).toBe('Product');
    expect(status.className).toContain('min-h-dvh');
    expect(status.hasAttribute('tabindex')).toBe(false);
    expect(bar.getAttribute('aria-label')).toBe('Loading…');
    expect(bar.getAttribute('aria-valuenow')).toBe('40');
    expect(status.className).not.toContain('animate-');
  });

  it('goes indeterminate without a value', async () => {
    splash({});
    await settle();
    expect(document.querySelector('[role=progressbar]')?.hasAttribute('aria-valuenow')).toBe(false);
  });

  it('covers the viewport as an overlay, holds focus, then hands it back and unmounts', async () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    const wrapper = splash({ isOverlay: true, value: 90, label: 'Starting the app' });
    await settle();
    const status = document.querySelector<HTMLElement>('[role=status][tabindex="-1"]')!;
    expect(status.className).toContain('fixed');
    expect(document.activeElement).toBe(status);
    expect(status.querySelector('[role=progressbar]')?.getAttribute('aria-label')).toBe('Starting the app');
    await wrapper.setProps({ isOpen: false });
    await settle();
    expect(status.className).toContain('animate-(--animate-fade-out)');
    status.dispatchEvent(new Event('animationend'));
    await settle();
    expect(document.querySelector('[role=status]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
