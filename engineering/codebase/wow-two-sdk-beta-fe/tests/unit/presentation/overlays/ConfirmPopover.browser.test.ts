import { afterEach, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h } from 'vue';
import { userEvent } from 'vitest/browser';
import { Button } from '@src/presentation/actions';
import { ConfirmPopover } from '@src/presentation/overlays';
import '@src/index.css';

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

function panel(): HTMLElement | null {
  return (
    [...document.querySelectorAll<HTMLElement>('[role=dialog]')].find((node) =>
      node.textContent?.includes('Delete this code?'),
    ) ?? null
  );
}

it('anchors above its trigger, focuses Cancel and returns focus to a keyboard trigger on Escape', async () => {
  wrapper = mount(ConfirmPopover, {
    props: { title: 'Delete this code?', description: 'Printed copies stop resolving.', tone: 'danger' },
    slots: { default: () => h(Button, { variant: 'soft', 'data-trigger': '' }, () => 'Delete…') },
    attachTo: document.body,
  });
  const host = document.createElement('div');
  host.style.paddingTop = '240px';
  document.body.prepend(host);
  const trigger = document.querySelector<HTMLElement>('[data-trigger]')!;
  // Open from the keyboard: WebKit never focuses a clicked button, so a click leaves nothing to return to.
  trigger.focus();
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => panel() !== null).toBe(true);
  await expect.poll(() => document.activeElement?.textContent?.trim()).toBe('Cancel');
  const triggerBox = trigger.getBoundingClientRect();
  await expect.poll(() => panel()!.getBoundingClientRect().bottom).toBeLessThanOrEqual(triggerBox.top);
  const panelBox = panel()!.getBoundingClientRect();
  expect(panelBox.right).toBeGreaterThan(triggerBox.left);
  expect(panelBox.left).toBeLessThan(triggerBox.right);
  await userEvent.keyboard('{Escape}');
  await expect.poll(() => panel()).toBeNull();
  expect(document.activeElement).toBe(trigger);
  expect(wrapper.emitted('cancel')).toHaveLength(1);
});
