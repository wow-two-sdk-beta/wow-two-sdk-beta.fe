import { mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import { userEvent } from 'vitest/browser';
import CopyButton from '@src/presentation/actions/copyButton/CopyButton.vue';
import '@src/index.css';

const Text = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAItest wheelhouse';

/** How long a settled state may take to appear after a real click; a loaded run of all engines is slow. */
const SettleTimeoutMs = 5000;

let wrapper: VueWrapper | undefined;
let restores: Array<() => void> = [];

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  for (const restore of restores.reverse()) restore();
  restores = [];
  vi.restoreAllMocks();
});

/** Mounts a `CopyButton` in the document, so a real pointer click reaches it. */
function mountButton(props: Record<string, unknown> = {}): VueWrapper {
  wrapper = mount(CopyButton, {
    attachTo: document.body,
    props: { text: Text, 'aria-label': 'Copy key', copiedAriaLabel: 'Key copied', resetAfter: 0, ...props },
  });
  return wrapper;
}

/** Replaces `navigator.clipboard` for the test; deleting the own property restores the engine's getter. */
function stubClipboard(value: unknown): void {
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true });
  restores.push(() => {
    delete (navigator as unknown as Record<string, unknown>).clipboard;
  });
}

/** Records what each `copy` event would put on the clipboard: the selection of the focused textarea. */
function captureCopies(): string[] {
  const copies: string[] = [];
  const listener = (): void => {
    const active = document.activeElement;
    if (active instanceof HTMLTextAreaElement)
      copies.push(active.value.slice(active.selectionStart, active.selectionEnd));
  };
  document.addEventListener('copy', listener);
  restores.push(() => document.removeEventListener('copy', listener));
  return copies;
}

/** The button element and a click on it that goes through the browser's real input pipeline. */
async function click(target: VueWrapper): Promise<HTMLButtonElement> {
  const button = target.get('button').element;
  await userEvent.click(button);
  return button;
}

describe('CopyButton in a real browser', () => {
  it('shows the copied state after a real click, whatever path the engine takes', async () => {
    const button = await click(mountButton());
    await vi.waitFor(() => expect(button.getAttribute('data-copied')).toBe('true'), { timeout: SettleTimeoutMs });
    expect(button.getAttribute('aria-label')).toBe('Key copied');
    expect(button.hasAttribute('data-error')).toBe(false);
  });

  it('copies through the Clipboard API when it accepts the write', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard({ writeText });
    const button = await click(mountButton());
    await vi.waitFor(() => expect(button.getAttribute('data-copied')).toBe('true'), { timeout: SettleTimeoutMs });
    expect(writeText).toHaveBeenCalledExactlyOnceWith(Text);
  });

  it('falls back to a selected hidden textarea when the Clipboard API is missing', async () => {
    stubClipboard(undefined);
    const copies = captureCopies();
    const button = await click(mountButton());
    await vi.waitFor(() => expect(button.getAttribute('data-copied')).toBe('true'), { timeout: SettleTimeoutMs });
    expect(copies).toEqual([Text]);
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('falls back when the Clipboard API refuses the write', async () => {
    const writeText = vi.fn().mockRejectedValue(new DOMException('Write permission denied.', 'NotAllowedError'));
    stubClipboard({ writeText });
    const copies = captureCopies();
    const button = await click(mountButton());
    await vi.waitFor(() => expect(button.getAttribute('data-copied')).toBe('true'), { timeout: SettleTimeoutMs });
    expect(writeText).toHaveBeenCalledOnce();
    expect(copies).toEqual([Text]);
    expect(button.hasAttribute('data-error')).toBe(false);
  });

  it('copies from inside a dialog whose focus trap pulls focus back from outside', async () => {
    stubClipboard(undefined);
    const copies = captureCopies();
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.append(dialog);
    restores.push(() => dialog.remove());
    wrapper = mount(CopyButton, {
      attachTo: dialog,
      props: { text: Text, 'aria-label': 'Copy key', resetAfter: 0 },
    });
    const trap = (event: FocusEvent): void => {
      if (event.target instanceof Node && !dialog.contains(event.target)) wrapper?.get('button').element.focus();
    };
    document.addEventListener('focusin', trap);
    restores.push(() => document.removeEventListener('focusin', trap));
    const button = await click(wrapper);
    await vi.waitFor(() => expect(button.getAttribute('data-copied')).toBe('true'), { timeout: SettleTimeoutMs });
    expect(copies).toEqual([Text]);
    expect(dialog.querySelector('textarea')).toBeNull();
  });

  it('shows the failure state, announces it and emits when every path refuses', async () => {
    stubClipboard(undefined);
    vi.spyOn(document, 'execCommand').mockReturnValue(false);
    const target = mountButton({ failedAriaLabel: 'Copy failed' });
    const button = await click(target);
    await vi.waitFor(() => expect(button.getAttribute('data-error')).toBe('true'), { timeout: SettleTimeoutMs });
    expect(button.getAttribute('aria-label')).toBe('Copy failed');
    expect(button.hasAttribute('data-copied')).toBe(false);
    expect(target.emitted('error')).toHaveLength(1);
  });

  it('hands the copied and error state to a custom slot', async () => {
    stubClipboard(undefined);
    vi.spyOn(document, 'execCommand').mockReturnValue(false);
    wrapper = mount(CopyButton, {
      attachTo: document.body,
      props: { text: Text, 'aria-label': 'Copy key', resetAfter: 0 },
      slots: {
        default: ({ copied, error }: { copied: boolean; error: Error | null }) =>
          h('span', error ? 'failed' : copied ? 'done' : 'copy'),
      },
    });
    const button = await click(wrapper);
    await vi.waitFor(() => expect(button.textContent).toBe('failed'), { timeout: SettleTimeoutMs });
  });
});
