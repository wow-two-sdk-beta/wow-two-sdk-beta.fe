import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { LocaleProvider } from '@src/foundation/i18n';
import { ResultExtensions } from '@src/foundation/results';
import { TypedConfirmModal } from '@src/presentation/overlays';

const wrappers: VueWrapper[] = [];
const track = <T extends VueWrapper>(wrapper: T): T => {
  wrappers.push(wrapper);
  return wrapper;
};

beforeEach(() => {
  // happy-dom lays nothing out, so FocusScope would treat every control as hidden and focus nothing.
  vi.spyOn(HTMLElement.prototype, 'checkVisibility').mockReturnValue(true);
});

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

/**
 * Settles the Portal teleport and mount focus, then lets the clock advance: Vue's event invoker skips an event
 * stamped in the millisecond its listener was attached.
 */
async function settle(): Promise<void> {
  for (let tick = 0; tick < 4; tick += 1) await nextTick();
  const mountedAt = Date.now();
  while (Date.now() === mountedAt) await Promise.resolve();
}

function dialog(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role=alertdialog]');
}

function field(): HTMLInputElement {
  return dialog()!.querySelector<HTMLInputElement>('input')!;
}

function button(text: string): HTMLButtonElement {
  const found = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (node) => node.textContent?.trim() === text,
  );
  if (!found) throw new Error(`No button labelled ${text}`);
  return found;
}

async function type(text: string): Promise<void> {
  const input = field();
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await settle();
}

async function submit(): Promise<void> {
  field().form!.requestSubmit();
  await settle();
}

function render(props: Record<string, unknown> = {}, slots: Record<string, () => unknown> = {}): VueWrapper {
  return track(
    mount(TypedConfirmModal, {
      props: {
        title: 'Reconcile prod-local?',
        description: 'Marks the rollout interrupted.',
        expected: 'prod-local',
        defaultOpen: true,
        ...props,
      },
      slots,
      attachTo: document.body,
    }),
  );
}

describe('TypedConfirmModal', () => {
  it('opens as a named, described alert dialog with focus in the typed field', async () => {
    render({}, { default: () => h('p', 'Stopped rollout: v1.4.2') });
    await settle();
    const panel = dialog()!;
    expect(document.getElementById(panel.getAttribute('aria-labelledby')!)?.textContent).toBe('Reconcile prod-local?');
    expect(document.getElementById(panel.getAttribute('aria-describedby')!)?.textContent?.trim()).toBe(
      'Marks the rollout interrupted.',
    );
    expect(panel.textContent).toContain('Stopped rollout: v1.4.2');
    expect(document.activeElement).toBe(field());
    expect(button('Confirm').disabled).toBe(true);
    expect(button('Confirm').className).toMatch(/destructive|danger/);
  });

  it('enables the action only on the exact text and hands the typed text to onConfirm', async () => {
    const onConfirm = vi.fn();
    const wrapper = render({ onConfirm });
    await settle();
    await type('prod-loca');
    await submit();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(button('Confirm').disabled).toBe(true);
    await type('prod-local');
    expect(button('Confirm').disabled).toBe(false);
    await submit();
    expect(onConfirm).toHaveBeenCalledWith('prod-local');
    await expect.poll(dialog).toBeNull();
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
    expect(wrapper.emitted('cancel')).toBeUndefined();
  });

  it('stays busy while the promise runs, then closes on success', async () => {
    let resolve!: () => void;
    const onConfirm = vi.fn(() => new Promise<void>((done) => (resolve = done)));
    render({ onConfirm });
    await settle();
    await type('prod-local');
    await submit();
    expect(dialog()!.getAttribute('aria-busy')).toBe('true');
    expect(field().readOnly).toBe(true);
    expect(button('Cancel').disabled).toBe(true);
    await submit();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    resolve();
    await settle();
    await expect.poll(dialog).toBeNull();
  });

  it('stays open and reports the failure of a rejected promise or a failed Result', async () => {
    const failure = { type: 'conflict', message: 'The target is locked.' };
    const onConfirm = vi
      .fn()
      .mockResolvedValueOnce(ResultExtensions.fail(failure))
      .mockRejectedValueOnce(new Error('offline'))
      .mockImplementationOnce(() => {
        throw new Error('bug');
      });
    const wrapper = render({ onConfirm });
    await settle();
    await type('prod-local');
    for (let round = 0; round < 3; round += 1) await submit();
    expect(dialog()).not.toBeNull();
    expect(wrapper.emitted('error')).toEqual([[failure], [new Error('offline')], [new Error('bug')]]);
    expect(field().value).toBe('prod-local');
    expect(field().readOnly).toBe(false);
  });

  it('shows the refusal the caller passes back', async () => {
    const wrapper = render();
    await settle();
    await wrapper.setProps({ error: 'Deployment refused: the target is locked.' });
    await settle();
    expect(dialog()!.querySelector('[role=alert]')?.textContent).toContain('Deployment refused: the target is locked.');
  });

  it('reports a cancel for Cancel and for Escape, and clears the text on the next open', async () => {
    const wrapper = render({ open: true, defaultOpen: undefined });
    await settle();
    await type('prod-local');
    button('Cancel').click();
    await settle();
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
    await wrapper.setProps({ open: false });
    await settle();
    await wrapper.setProps({ open: true });
    await settle();
    expect(field().value).toBe('');
    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle();
    expect(wrapper.emitted('cancel')).toHaveLength(2);
  });

  it('clears the text when the target changes', async () => {
    const wrapper = render();
    await settle();
    await type('prod-local');
    await wrapper.setProps({ expected: 'prod-eu' });
    await settle();
    expect(field().value).toBe('');
    expect(dialog()!.querySelector('code')?.textContent).toBe('prod-eu');
  });

  it('takes localized button text', async () => {
    track(
      mount(
        defineComponent({
          render: () =>
            h(
              LocaleProvider,
              {
                messages: { 'TypedConfirmModal.confirmLabel': 'Löschen', 'TypedConfirmModal.cancelLabel': 'Abbrechen' },
              },
              () => h(TypedConfirmModal, { title: 'Sicher?', expected: 'menu', defaultOpen: true }),
            ),
        }),
        { attachTo: document.body },
      ),
    );
    await settle();
    expect(button('Löschen')).toBeTruthy();
    expect(button('Abbrechen')).toBeTruthy();
  });

  it('confirms without a typed field when no text is expected, and hands onConfirm an empty string', async () => {
    const onConfirm = vi.fn();
    const wrapper = render({ expected: undefined, onConfirm });
    await settle();
    expect(dialog()!.querySelector('input')).toBeNull();
    expect(button('Confirm').disabled).toBe(false);
    button('Confirm').click();
    await settle();
    expect(onConfirm).toHaveBeenCalledWith('');
    await expect.poll(dialog).toBeNull();
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });

  it('keeps an untyped confirm open on failure', async () => {
    const onConfirm = vi.fn().mockRejectedValueOnce(new Error('refused'));
    const wrapper = render({ expected: undefined, onConfirm });
    await settle();
    button('Confirm').click();
    await settle();
    expect(dialog()).not.toBeNull();
    expect(wrapper.emitted('error')).toEqual([[new Error('refused')]]);
  });

  it('holds Confirm while canConfirm is false, whatever was typed', async () => {
    const onConfirm = vi.fn();
    const wrapper = render({ canConfirm: false, onConfirm });
    await settle();
    await type('prod-local');
    expect(button('Confirm').disabled).toBe(true);
    await submit();
    expect(onConfirm).not.toHaveBeenCalled();
    await wrapper.setProps({ canConfirm: true });
    await settle();
    expect(button('Confirm').disabled).toBe(false);
    await wrapper.setProps({ expected: undefined, canConfirm: false });
    await settle();
    expect(button('Confirm').disabled).toBe(true);
  });

  it('puts the confirm-icon slot before the confirm text', async () => {
    render({ expected: undefined }, { 'confirm-icon': () => h('svg', { 'data-icon': 'stop' }) });
    await settle();
    expect(button('Confirm').querySelector('[data-icon=stop]')).not.toBeNull();
  });
});
