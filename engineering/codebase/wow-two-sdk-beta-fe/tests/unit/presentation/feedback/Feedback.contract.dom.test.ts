import { describe, expect, it } from 'vitest';
import { h, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { TourPopover, type TourPopoverStep } from '@src/presentation/overlays';

const steps: readonly TourPopoverStep[] = [{ target: '#tour-anchor', title: 'Step one', body: 'Here is the thing.' }];

/** The element a tour step points at — a step with no target in the document renders nothing. */
function withAnchor(run: () => Promise<void>): Promise<void> {
  const anchor = document.createElement('div');
  anchor.id = 'tour-anchor';
  document.body.appendChild(anchor);
  return run().finally(() => {
    anchor.remove();
  });
}

async function frame(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await nextTick();
}

describe('feedback — TourPopover open state', () => {
  /*
   * The exact bug the port shipped: `TourPopover.open` is an optional plain `boolean`, and Vue casts
   * an absent one to `false` unless the declaration owns an explicit `undefined` default. With
   * that default missing the tour read as controlled-and-closed no matter what, and could never
   * open. Passing NO `open` at all is the only shape that reproduces it — any test that hands
   * the component an open prop passes either way.
   */
  it('opens through defaultOpen with no open passed', async () => {
    await withAnchor(async () => {
      const wrapper = mount({
        render: () => h(TourPopover, { steps, defaultOpen: true }),
      });
      await nextTick();

      expect(document.body.textContent, 'TourPopover rendered nothing — open was cast to false').toContain('Step one');

      wrapper.unmount();
    });
  });

  it('stays closed when defaultOpen is not passed either', async () => {
    await withAnchor(async () => {
      const wrapper = mount({ render: () => h(TourPopover, { steps }) });
      await nextTick();

      expect(document.body.textContent).not.toContain('Step one');
      wrapper.unmount();
    });
  });

  it('honours the controlled open prop', async () => {
    await withAnchor(async () => {
      const wrapper = mount({ render: () => h(TourPopover, { steps, open: true }) });
      await nextTick();

      expect(document.body.textContent).toContain('Step one');
      wrapper.unmount();
    });
  });

  it('keeps a target-click task gated until the highlighted control is used', async () => {
    await withAnchor(async () => {
      const wrapper = mount({
        render: () =>
          h(TourPopover, {
            steps: [
              {
                target: '#tour-anchor',
                title: 'Step one',
                body: 'Here is the thing.',
                completeOn: 'target-click' as const,
                taskHint: 'Choose this control.',
              },
            ],
            defaultOpen: true,
          }),
      });
      await nextTick();
      await frame();

      const next = [...document.body.querySelectorAll('button')].find(
        (button) => button.textContent?.trim() === 'Done',
      );
      expect(next?.disabled).toBe(true);

      document.querySelector<HTMLElement>('#tour-anchor')?.click();
      await nextTick();
      expect(next?.disabled).toBe(false);
      wrapper.unmount();
    });
  });

  it('finds a task target that mounts after the tour opens', async () => {
    const wrapper = mount({
      render: () =>
        h(TourPopover, {
          steps: [{ target: '#late-target', title: 'Delayed', completeOn: 'target-click' as const }],
          defaultOpen: true,
        }),
    });
    await frame();
    const target = document.createElement('button');
    target.id = 'late-target';
    document.body.appendChild(target);
    await frame();
    await frame();

    expect(document.body.textContent).toContain('Delayed');
    target.click();
    await nextTick();
    const done = [...document.body.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Done');
    expect(done?.disabled).toBe(false);

    target.remove();
    wrapper.unmount();
  });

  it('clamps its tooltip inside a 320px viewport', async () => {
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 640 });
    await withAnchor(async () => {
      const anchor = document.querySelector<HTMLElement>('#tour-anchor');
      anchor!.getBoundingClientRect = () =>
        ({
          top: 100,
          left: 290,
          right: 310,
          bottom: 120,
          width: 20,
          height: 20,
          x: 290,
          y: 100,
          toJSON: () => ({}),
        }) as DOMRect;
      const wrapper = mount({ render: () => h(TourPopover, { steps, defaultOpen: true }) });
      await frame();

      const panel = document.querySelector<HTMLElement>('[data-tour-popover]');
      expect(Number.parseFloat(panel?.style.left ?? '')).toBe(20);
      wrapper.unmount();
    });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalHeight });
  });

  it('moves focus through a task and restores it when closing without an animation event', async () => {
    const opener = document.createElement('button');
    opener.textContent = 'Open guide';
    document.body.appendChild(opener);
    opener.focus();
    await withAnchor(async () => {
      const anchor = document.querySelector<HTMLElement>('#tour-anchor')!;
      anchor.tabIndex = 0;
      const open = ref(true);
      const wrapper = mount({
        render: () =>
          h(TourPopover, {
            steps: [{ target: '#tour-anchor', title: 'Task', completeOn: 'target-click' as const }],
            open: open.value,
            'onUpdate:open': (value: boolean) => (open.value = value),
          }),
      });
      await frame();
      expect(document.activeElement).toBe(anchor);

      anchor.click();
      await nextTick();
      const done = [...document.body.querySelectorAll('button')].find(
        (button) => button.textContent?.trim() === 'Done',
      );
      expect(document.activeElement).toBe(done);
      done?.click();
      await nextTick();
      await nextTick();
      expect(document.activeElement).toBe(opener);
      await new Promise((resolve) => setTimeout(resolve, 260));
      expect(document.querySelector('[data-tour-popover]')).toBeNull();
      wrapper.unmount();
    });
    opener.remove();
  });
});
