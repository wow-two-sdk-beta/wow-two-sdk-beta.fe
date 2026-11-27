import { flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { LoadMoreState } from '@src/foundation/virtualization';
import { nativeTab } from '../../../BrowserKeyboard';
import { ariaViolations } from '../../../support/AriaValidity';
import { frames, mountLoadMore, row } from '../../../support/LoadMoreHarness';
import '@src/index.css';

/* 30-item pages of 40 px rows in a 300 px scroller; `LoadMoreButton` follows it, `NewItemsButton` sits inside. */

const mounted: Array<{ unmount(): void }> = [];
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

async function harness(options: Parameters<typeof mountLoadMore>[0] = {}) {
  const view = mountLoadMore({ withButtons: true, isWindowed: false, ...options });
  mounted.push(view.wrapper);
  await flushPromises();
  await frames();
  return {
    ...view,
    button: () => view.wrapper.find('[data-load-more] button'),
    link: (index: number) => view.item(index).element.querySelector('a')!,
  };
}

describe('LoadMoreButton', () => {
  it('works by keyboard alone: Tab to Show more, Enter focuses item 31, and the button leaves at the end', async () => {
    const view = await harness({ total: 60 });
    view.link(29).focus({ preventScroll: true });
    await nativeTab();
    expect(document.activeElement).toBe(view.button().element);
    await userEvent.keyboard('{Enter}');
    await flushPromises();
    await frames();
    expect(document.activeElement).toBe(view.link(30));
    for (let step = 0; step < 5; step++) {
      await nativeTab();
      expect(document.activeElement).not.toBe(document.body);
      expect(view.list().contains(document.activeElement)).toBe(true);
    }
    expect(view.loader().state.value).toBe(LoadMoreState.End);
    expect(view.button().exists()).toBe(false);
  });

  it('reveals the hidden button on focus in automatic mode, and Enter loads and focuses the first new item', async () => {
    const view = await harness({ total: 90 });
    await view.loader().showMore();
    await frames();
    expect(view.loader().state.value).toBe(LoadMoreState.Automatic);
    const shown = () => view.button().element.parentElement!.getBoundingClientRect().width > 1;
    expect(shown()).toBe(false);
    view.link(59).focus({ preventScroll: true });
    await nativeTab();
    expect(document.activeElement).toBe(view.button().element);
    expect(shown()).toBe(true);
    await userEvent.keyboard('{Enter}');
    await flushPromises();
    await frames();
    expect(document.activeElement).toBe(view.link(60));
    expect(view.button().exists()).toBe(false);
  });

  it('moves focus to the first new item without a visible ring after a pointer press', async () => {
    const view = await harness({ total: 90 });
    await userEvent.click(view.button().element);
    await flushPromises();
    await frames();
    expect(document.activeElement).toBe(view.link(30));
    expect(view.link(30).matches(':focus-visible')).toBe(false);
  });

  it('keeps one polite status line, marks the list busy and hides the fade', async () => {
    const view = await harness({ total: 90, holds: true });
    expect(document.querySelectorAll('[role="status"]')).toHaveLength(1);
    const status = view.wrapper.get('[role="status"]');
    expect(status.attributes('aria-live')).toBe('polite');
    expect(status.text()).toBe('');
    expect(view.wrapper.find('[data-load-more] [aria-hidden="true"]').exists()).toBe(true);
    expect(await ariaViolations(view.wrapper.element)).toEqual([]);

    const pressing = view.loader().showMore();
    await frames();
    expect(view.list().getAttribute('aria-busy')).toBe('true');
    view.release();
    await pressing;
    await frames();
    expect(view.list().getAttribute('aria-busy')).toBeNull();
    expect(status.text()).toBe('30 more loaded, 60 of 90');
    expect(await ariaViolations(view.wrapper.element)).toEqual([]);

    const last = view.loader().showMore();
    await frames();
    view.release();
    await last;
    await frames();
    expect(status.text()).toBe('All 90 loaded');
  });
});

describe('NewItemsButton', () => {
  it('appears while live items wait, and activation scrolls up, merges and focuses', async () => {
    const view = await harness();
    await view.scrollTo(600);
    expect(view.wrapper.find('[data-new-items]').exists()).toBe(false);
    view.loader().insertAtStart([row(-1)]);
    await frames();
    const pill = view.wrapper.get('[data-new-items]');
    expect(pill.text()).toBe('1 new');
    await userEvent.click(pill.element);
    await flushPromises();
    await frames(6);
    expect(view.loader().items.value[0]!.id).toBe(-1);
    expect(view.wrapper.find('[data-new-items]').exists()).toBe(false);
    expect(document.activeElement).toBe(view.link(0));
  });
});
