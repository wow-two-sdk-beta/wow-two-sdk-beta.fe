import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { page } from 'vitest/browser';
import { Temporal } from 'temporal-polyfill';
import EventCalendarViewer from '@src/presentation/display/eventCalendarViewer/EventCalendarViewer.vue';
import type { EventCalendarViewerEvent } from '@src/presentation/display/eventCalendarViewer/EventCalendarViewerTypes';
import '@src/index.css';

const Phone = { width: 390, height: 800 } as const;
const Desktop = { width: 1440, height: 900 } as const;

const at = (text: string): Temporal.ZonedDateTime => Temporal.ZonedDateTime.from(text + '[UTC]');
const event = (id: string, start: string, end: string, color?: string): EventCalendarViewerEvent => ({
  id,
  title: id,
  start: at(start),
  end: at(end),
  ...(color ? { color } : {}),
});

/** A Friday: its week runs Sunday 20 to Saturday 26 September 2026. */
const focus = at('2026-09-25T12:00Z');

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

function mountViewer(props: Record<string, unknown> = {}): VueWrapper {
  wrapper = mount(EventCalendarViewer, {
    props: { events: [], date: focus, ...props },
    attachTo: document.body,
  });
  return wrapper;
}

/*
 * Read from `document.documentElement`, not the mounted root: the component is attached directly to
 * `document.body` with nothing else constraining its width, so the only way a layout bug can force the PAGE
 * itself to scroll sideways — the defect these fixes guard against — is some descendant rendering wider than
 * the viewport. Checking the component root's own `scrollWidth` instead would also fail an intentionally
 * scrollable inner region (none remain below `sm` after these fixes, but the distinction is the point).
 */
function hasHorizontalOverflow(): boolean {
  return document.documentElement.scrollWidth > window.innerWidth;
}

describe('EventCalendarViewer on a phone (390×800)', () => {
  beforeAll(async () => {
    await page.viewport(Phone.width, Phone.height);
  });
  afterAll(async () => {
    await page.viewport(Desktop.width, Desktop.height);
  });

  const events = [
    event('Standup', '2026-09-25T09:00Z', '2026-09-25T09:30Z'),
    event('Trip', '2026-09-23T00:00Z', '2026-09-27T00:00Z'),
    event('Sync', '2026-09-25T13:00Z', '2026-09-25T13:00Z'),
  ];

  for (const view of ['day', 'week', 'month', 'year', 'agenda'] as const) {
    it(`never forces the page to scroll sideways in the ${view} view`, async () => {
      mountViewer({ view, events });
      await expect.poll(() => document.querySelector('h3') !== null).toBe(true);
      await expect.poll(() => hasHorizontalOverflow()).toBe(false);
    });
  }

  it('lays out the toolbar as two rows: every control at least 40px tall and never clipped', async () => {
    mountViewer({ view: 'month', events });
    await expect.poll(() => document.querySelectorAll('[aria-label="View"] button').length).toBe(5);
    const rootRect = wrapper!.element.getBoundingClientRect();
    const todayButton = Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'Today')!;
    const switcherButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[aria-label="View"] button'));
    for (const button of [todayButton, ...switcherButtons]) {
      const rect = button.getBoundingClientRect();
      expect(rect.height).toBeGreaterThanOrEqual(40);
      expect(rect.width).toBeGreaterThan(0);
      expect(rect.top).toBeGreaterThanOrEqual(rootRect.top - 1);
      expect(rect.bottom).toBeLessThanOrEqual(rootRect.bottom + 1);
      expect(rect.right).toBeLessThanOrEqual(rootRect.right + 1);
    }
    // Row 2 (the switcher) sits below row 1 (Today/Prev/Next/title) on a phone-width toolbar.
    const group = document.querySelector('[aria-label="View"]')!;
    expect(group.getBoundingClientRect().top).toBeGreaterThan(todayButton.getBoundingClientRect().bottom - 1);
  });

  it('keeps the title on one line for the day, week and agenda views', async () => {
    for (const view of ['day', 'week', 'agenda'] as const) {
      mountViewer({ view, events });
      await expect.poll(() => document.querySelector('h3') !== null).toBe(true);
      const h3 = document.querySelector('h3')!;
      const style = getComputedStyle(h3);
      expect(style.whiteSpace).toBe('nowrap');
      expect(style.textOverflow).toBe('ellipsis');
      expect(h3.getBoundingClientRect().height).toBeLessThanOrEqual(28);
      wrapper?.unmount();
      wrapper = null;
      document.body.innerHTML = '';
    }
  });

  it('renders the week view as a day list, never a 7-column time grid', async () => {
    mountViewer({ view: 'week', events });
    await expect.poll(() => document.querySelector('[data-time-grid-daylist]') !== null).toBe(true);
    expect(document.querySelector('[data-time-grid]')).toBeNull();
  });

  it('keeps the day view as a time grid, never the day list', async () => {
    mountViewer({ view: 'day', events });
    await expect.poll(() => document.querySelector('[data-time-grid]') !== null).toBe(true);
    expect(document.querySelector('[data-time-grid-daylist]')).toBeNull();
  });

  it('keeps all-day and timed day-view chips at least 28px tall (row #6)', async () => {
    const allDay = { ...event('Holiday', '2026-09-25T00:00Z', '2026-09-26T00:00Z'), isAllDay: true };
    mountViewer({ view: 'day', events: [...events, allDay] });
    await expect.poll(() => document.querySelector('[data-all-day-cell] button') !== null).toBe(true);
    const chips = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-all-day-cell] button'));
    expect(chips.length).toBeGreaterThan(0);
    for (const chip of chips) expect(chip.getBoundingClientRect().height).toBeGreaterThanOrEqual(28);
    const timed = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-time-grid] button')).find((b) =>
      b.textContent?.includes('Standup'),
    )!;
    expect(timed.getBoundingClientRect().height).toBeGreaterThanOrEqual(28);
  });

  it('draws a zero-length day-view event with no clipping at 390px (row #10)', async () => {
    mountViewer({ view: 'day', events: [event('Ping', '2026-09-25T10:00Z', '2026-09-25T10:00Z')] });
    await expect
      .poll(() =>
        Array.from(document.querySelectorAll<HTMLButtonElement>('[data-time-grid] button')).find((b) =>
          b.textContent?.includes('Ping'),
        ),
      )
      .not.toBeUndefined();
    const chip = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-time-grid] button')).find((b) =>
      b.textContent?.includes('Ping'),
    )!;
    expect(chip.scrollHeight).toBeLessThanOrEqual(chip.clientHeight);
  });

  it('makes the whole month-view day cell the tap target, at least 40px high, and tapping it selects the day', async () => {
    mountViewer({ view: 'month', events });
    await expect.poll(() => document.querySelector('button[aria-label^="Sep 25"]') !== null).toBe(true);
    const dayButton = document.querySelector<HTMLButtonElement>('button[aria-label^="Sep 25"]')!;
    expect(dayButton.getBoundingClientRect().height).toBeGreaterThanOrEqual(40);
    dayButton.click();
    await expect.poll(() => document.querySelector('[data-month-day-panel]') !== null).toBe(true);
  });

  it('makes year-view month buttons at least 40px high', async () => {
    mountViewer({ view: 'year' });
    await expect.poll(() => document.querySelector('section[role="group"] button') !== null).toBe(true);
    const monthButton = Array.from(document.querySelectorAll<HTMLButtonElement>('section[role="group"] button')).find(
      (b) => b.textContent === 'September',
    )!;
    expect(monthButton.getBoundingClientRect().height).toBeGreaterThanOrEqual(40);
  });
});

describe('EventCalendarViewer all-day strip and zero-length events (1440×900)', () => {
  beforeAll(async () => {
    await page.viewport(Desktop.width, Desktop.height);
  });

  it('grows the all-day strip to 3 rows of chips and summarizes the rest as "+N more"', async () => {
    // The week view's 7 narrow columns, not the day view's one wide one, are what force chips to wrap.
    const chips = Array.from({ length: 12 }, (_, i) => ({
      ...event(`AllDay${i}`, '2026-09-23T00:00Z', '2026-09-24T00:00Z', '#336699'),
      isAllDay: true,
    }));
    mountViewer({ view: 'week', events: chips });
    await expect.poll(() => document.querySelector('[data-allday-more]') !== null).toBe(true);
    const more = document.querySelector('[data-allday-more]')!;
    expect(more.textContent).toMatch(/\+\d+ more/);
    const container = more.parentElement!;
    const rowTops = new Set(
      Array.from(container.children)
        .filter((child) => !child.hasAttribute('data-allday-more'))
        .map((child) => Math.round((child as HTMLElement).offsetTop)),
    );
    expect(rowTops.size).toBeGreaterThan(1);
    expect(rowTops.size).toBeLessThanOrEqual(3);
  });

  it('keeps the now-line inside the hour grid only, never drawn across the all-day strip', async () => {
    // Not pinned to UTC: `isToday` compares against the system zone's `today()`, so the probe must match it.
    const now = Temporal.Now.zonedDateTimeISO();
    mountViewer({ view: 'day', date: now });
    await expect.poll(() => document.querySelector('[data-now-line]') !== null).toBe(true);
    const nowLine = document.querySelector('[data-now-line]')!;
    const allDayCell = document.querySelector('[data-all-day-cell]')!;
    expect(nowLine.getBoundingClientRect().top).toBeGreaterThanOrEqual(allDayCell.getBoundingClientRect().bottom - 1);
  });

  it('draws a zero-length event at the 30-minute minimum height, with only its start time', async () => {
    mountViewer({ view: 'day', events: [event('Ping', '2026-09-25T10:00Z', '2026-09-25T10:00Z')] });
    await expect
      .poll(() =>
        Array.from(document.querySelectorAll<HTMLButtonElement>('[data-time-grid] button')).find((b) =>
          b.textContent?.includes('Ping'),
        ),
      )
      .not.toBeUndefined();
    const chip = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-time-grid] button')).find((b) =>
      b.textContent?.includes('Ping'),
    )!;
    // HourPx(48) * 30 minutes / 60 = 24px.
    expect(Math.round(chip.getBoundingClientRect().height)).toBe(24);
    const timeMatches = chip.textContent?.match(/\d{1,2}:\d{2}/g) ?? [];
    expect(timeMatches).toHaveLength(1);
  });
});
