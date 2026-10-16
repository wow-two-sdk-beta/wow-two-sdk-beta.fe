import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { LocaleProvider } from '@src/foundation/i18n';
import { ConfirmPopover } from '@src/presentation/overlays';

const wrappers: VueWrapper[] = [];
const track = <T extends VueWrapper>(wrapper: T): T => {
  wrappers.push(wrapper);
  return wrapper;
};

beforeEach(() => {
  // happy-dom lays nothing out, so FocusScope would treat the buttons as hidden and focus nothing.
  vi.spyOn(HTMLElement.prototype, 'checkVisibility').mockReturnValue(true);
});

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

/**
 * Settles the Portal teleport and mount focus, then lets the clock advance: Vue's event invoker skips
 * an event stamped in the millisecond its listener was attached.
 */
async function settle(): Promise<void> {
  for (let tick = 0; tick < 4; tick += 1) await nextTick();
  const mountedAt = Date.now();
  while (Date.now() === mountedAt) await Promise.resolve();
}

function panel(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role=dialog]');
}

function button(text: string): HTMLButtonElement {
  const found = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (node) => node.textContent?.trim() === text,
  );
  if (!found) throw new Error(`No button labelled ${text}`);
  return found;
}

function mountConfirm(props: Record<string, unknown> = {}): VueWrapper {
  return track(
    mount(ConfirmPopover, {
      props: { title: 'Delete this code?', description: 'Scans stop working.', ...props },
      slots: { default: () => h('button', { type: 'button', 'data-trigger': '' }, 'Delete') },
      attachTo: document.body,
    }),
  );
}

async function open(wrapper: VueWrapper): Promise<void> {
  await wrapper.get('[data-trigger]').trigger('click');
  await settle();
}

describe('ConfirmPopover', () => {
  it('opens from its trigger, names the panel and focuses the safe choice', async () => {
    const wrapper = mountConfirm({ tone: 'danger', confirmLabel: 'Delete code' });
    const trigger = wrapper.get('[data-trigger]');
    expect(trigger.attributes('aria-haspopup')).toBe('dialog');
    await open(wrapper);
    const dialog = panel()!;
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe('Delete this code?');
    expect(document.getElementById(dialog.getAttribute('aria-describedby')!)?.textContent?.trim()).toBe(
      'Scans stop working.',
    );
    expect(document.activeElement).toBe(button('Cancel'));
    expect(wrapper.emitted('update:open')).toEqual([[true]]);
  });

  it('reports a cancel for the Cancel button and for Escape', async () => {
    const wrapper = mountConfirm();
    await open(wrapper);
    button('Cancel').click();
    await settle();
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false]);
    await open(wrapper);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await settle();
    expect(wrapper.emitted('cancel')).toHaveLength(2);
  });

  it('runs a synchronous confirm once and closes without a cancel', async () => {
    const onConfirm = vi.fn();
    const wrapper = mountConfirm({ onConfirm });
    await open(wrapper);
    button('Confirm').click();
    await settle();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false]);
    expect(wrapper.emitted('cancel')).toBeUndefined();
  });

  it('stays open and busy while a confirm promise runs, then closes when it resolves', async () => {
    let resolve!: () => void;
    const onConfirm = vi.fn(() => new Promise<void>((accept) => (resolve = accept)));
    const wrapper = mountConfirm({ onConfirm });
    await open(wrapper);
    button('Confirm').click();
    await settle();
    expect(panel()?.getAttribute('aria-busy')).toBe('true');
    expect(button('Cancel').disabled || button('Cancel').getAttribute('aria-disabled') === 'true').toBe(true);
    button('Confirm').click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await settle();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([true]);
    resolve();
    await settle();
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false]);
    expect(wrapper.emitted('cancel')).toBeUndefined();
  });

  it('stays open and reports the error when a confirm promise rejects', async () => {
    const failure = new Error('network');
    const wrapper = mountConfirm({ onConfirm: () => Promise.reject(failure) });
    await open(wrapper);
    button('Confirm').click();
    await settle();
    expect(wrapper.emitted('error')).toEqual([[failure]]);
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([true]);
    expect(panel()?.getAttribute('aria-busy')).toBeNull();
  });

  it('does not open while disabled and only requests an open while controlled', async () => {
    const disabled = mountConfirm({ isDisabled: true });
    await disabled.get('[data-trigger]').trigger('click');
    await settle();
    expect(panel()).toBeNull();
    expect(disabled.emitted('update:open')).toBeUndefined();
    disabled.unmount();
    const controlled = mountConfirm({ open: false });
    await controlled.get('[data-trigger]').trigger('click');
    await settle();
    expect(controlled.emitted('update:open')).toEqual([[true]]);
    expect(panel()).toBeNull();
  });

  it('localizes its default button text', async () => {
    track(
      mount(
        defineComponent({
          render: () =>
            h(
              LocaleProvider,
              { messages: { 'ConfirmPopover.confirmLabel': 'Ja', 'ConfirmPopover.cancelLabel': 'Nein' } },
              () =>
                h(ConfirmPopover, { title: 'Sicher?', defaultOpen: true }, () =>
                  h('button', { type: 'button' }, 'Löschen'),
                ),
            ),
        }),
        { attachTo: document.body },
      ),
    );
    await settle();
    expect(button('Ja')).toBeTruthy();
    expect(button('Nein')).toBeTruthy();
  });
});
