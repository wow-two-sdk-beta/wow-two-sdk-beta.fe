import { afterEach, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { userEvent } from 'vitest/browser';
import { Button } from '@src/presentation/actions';
import { TypedConfirmModal } from '@src/presentation/overlays';
import '@src/index.css';

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

function dialog(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role=alertdialog]');
}

function confirmButton(): HTMLButtonElement {
  return [...dialog()!.querySelectorAll<HTMLButtonElement>('button')].find(
    (node) => node.textContent?.trim() === 'Revoke',
  )!;
}

it('takes the typed ID from the keyboard, confirms with Enter and returns focus to the trigger', async () => {
  const onConfirm = vi.fn(() => Promise.resolve());
  wrapper = mount(
    defineComponent({
      setup() {
        const open = ref(false);
        return () => [
          h(Button, { 'data-trigger': '', onClick: () => (open.value = true) }, () => 'Revoke key…'),
          h(TypedConfirmModal, {
            open: open.value,
            'onUpdate:open': (next: boolean) => (open.value = next),
            title: 'Revoke the deploy key?',
            description: 'Integrations using it stop at once.',
            expected: 'deploy-bot',
            confirmLabel: 'Revoke',
            onConfirm,
          }),
        ];
      },
    }),
    { attachTo: document.body },
  );
  const trigger = document.querySelector<HTMLElement>('[data-trigger]')!;
  // Open from the keyboard: WebKit never focuses a clicked button, so a click leaves nothing to return to.
  // Firefox in CI can drop the first key while another test frame holds focus, so press again until it opens.
  await expect
    .poll(async () => {
      if (dialog() === null) {
        trigger.focus();
        await userEvent.keyboard('{Enter}');
      }
      return dialog() !== null;
    })
    .toBe(true);
  const input = dialog()!.querySelector('input')!;
  await expect.poll(() => document.activeElement).toBe(input);

  await userEvent.keyboard('deploy-bo');
  await userEvent.keyboard('{Enter}');
  expect(onConfirm).not.toHaveBeenCalled();
  expect(confirmButton().disabled).toBe(true);

  await userEvent.keyboard('t');
  await expect.poll(() => confirmButton().disabled).toBe(false);
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => onConfirm.mock.calls.length).toBe(1);
  expect(onConfirm).toHaveBeenCalledWith('deploy-bot');
  await expect.poll(dialog).toBeNull();
  await expect.poll(() => document.activeElement).toBe(trigger);
});

it('shows the mismatch once the reader tabs away, beside the expected ID in code', async () => {
  wrapper = mount(TypedConfirmModal, {
    props: { title: 'Delete menu-qr?', expected: 'menu-qr', defaultOpen: true },
    attachTo: document.body,
  });
  await expect.poll(() => dialog()?.querySelector('input') ?? null).not.toBeNull();
  const field = dialog()!.querySelector('input')!;
  field.focus();
  await userEvent.keyboard('menu');
  await userEvent.keyboard('{Tab}');
  await expect.poll(() => field.getAttribute('aria-invalid')).toBe('true');
  const error = document.getElementById(field.getAttribute('aria-describedby')!.split(' ').at(-1)!);
  expect(error?.textContent).toContain('Type menu-qr exactly as shown.');
  const code = dialog()!.querySelector('label code')!;
  expect(code.textContent).toBe('menu-qr');
  expect(getComputedStyle(code).fontFamily).toMatch(/mono/i);
});

it('keeps focus in the field through a refused confirm and shows the refusal', async () => {
  const refusal = ref<string | undefined>(undefined);
  wrapper = mount(
    defineComponent({
      setup() {
        return () =>
          h(TypedConfirmModal, {
            title: 'Revoke the deploy key?',
            expected: 'deploy-bot',
            defaultOpen: true,
            error: refusal.value,
            onConfirm: () => new Promise((resolve) => setTimeout(() => resolve({ ok: false, failure: 'locked' }), 50)),
            onError: () => (refusal.value = 'The key is in use by a running deploy.'),
          });
      },
    }),
    { attachTo: document.body },
  );
  await expect.poll(() => dialog()?.querySelector('input') ?? null).not.toBeNull();
  const field = dialog()!.querySelector('input')!;
  field.focus();
  await userEvent.keyboard('deploy-bot');
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => dialog()!.querySelector('[role=alert]')?.textContent ?? '').toContain('in use');
  expect(document.activeElement).toBe(field);
  expect(field.readOnly).toBe(false);
  expect(field.value).toBe('deploy-bot');
});
