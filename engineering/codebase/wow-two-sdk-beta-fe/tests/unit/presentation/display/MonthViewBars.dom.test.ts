import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h } from 'vue';
import { Temporal } from 'temporal-polyfill';
import { LocaleProvider } from '@src/foundation/i18n';
import MonthView from '@src/presentation/display/eventCalendarViewer/MonthView.vue';
import EventCalendarViewer from '@src/presentation/display/eventCalendarViewer/EventCalendarViewer.vue';
import type { EventCalendarViewerEvent } from '@src/presentation/display/eventCalendarViewer/EventCalendarViewerTypes';

const wrappers: Array<VueWrapper> = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});

const at = (text: string): Temporal.ZonedDateTime => Temporal.ZonedDateTime.from(text + '[UTC]');
const event = (id: string, start: string, end: string, extra: Partial<EventCalendarViewerEvent> = {}) => ({
  id,
  title: id,
  start: at(start),
  end: at(end),
  ...extra,
});

/*
 * September 2026 on a Sunday-first grid: Sun 30 Aug opens the first row, so the rows run
 * 30 Aug-5 Sep, 6-12, 13-19, 20-26, 27 Sep-3 Oct and 4-10 Oct. 1 September is a Tuesday.
 */
function mountMonth(
  events: ReadonlyArray<EventCalendarViewerEvent>,
  options: { focusDay?: string; weekStart?: 0 | 1 } = {},
): VueWrapper {
  const wrapper = mount(MonthView, {
    props: {
      focusDay: Temporal.PlainDate.from(options.focusDay ?? '2026-09-15'),
      timeZone: 'UTC',
      events,
      weekStart: options.weekStart ?? 0,
    },
  });
  wrappers.push(wrapper);
  return wrapper;
}

function bars(wrapper: VueWrapper) {
  return wrapper.findAll('[data-event-bar]');
}

/** What a bar reports about its place: 1-based start column, span, lane, and whether each end is the event's own. */
function placement(bar: ReturnType<typeof bars>[number]) {
  return {
    column: Number(bar.attributes('data-bar-column')),
    span: Number(bar.attributes('data-bar-span')),
    lane: Number(bar.attributes('data-bar-lane')),
    isStart: bar.attributes('data-bar-start') !== undefined,
    isEnd: bar.attributes('data-bar-end') !== undefined,
  };
}

function dayColumn(wrapper: VueWrapper, day: string) {
  return wrapper.get(`[data-day="${day}"]`);
}

describe('MonthView multi-day bars', () => {
  it('draws a three-week event as one bar per row it touches, with each row spanning its own days', () => {
    // Wed 9 Sep to Thu 24 Sep: the second row from Wednesday, the third whole, the fourth to Thursday.
    const wrapper = mountMonth([event('Expo', '2026-09-09T10:00Z', '2026-09-24T10:00Z')]);
    const found = bars(wrapper);
    expect(found).toHaveLength(3);
    expect(found.map(placement)).toEqual([
      { column: 4, span: 4, lane: 0, isStart: true, isEnd: false },
      { column: 1, span: 7, lane: 0, isStart: false, isEnd: false },
      { column: 1, span: 5, lane: 0, isStart: false, isEnd: true },
    ]);
  });

  it('draws one continuous element per row, so the title shows once per segment and is the button text', () => {
    const wrapper = mountMonth([event('Expo', '2026-09-09T10:00Z', '2026-09-24T10:00Z')]);
    expect(bars(wrapper).map((bar) => bar.text())).toEqual(['Expo', 'Expo', 'Expo']);
    // Not a chip per day: the nine-day tail the old grid drew is gone.
    expect(wrapper.findAll('button').filter((button) => button.text() === 'Expo')).toHaveLength(3);
  });

  it('rounds only the event first day and last day, and squares the edges that run past the row', () => {
    const wrapper = mountMonth([event('Expo', '2026-09-09T10:00Z', '2026-09-24T10:00Z')]);
    const [first, middle, last] = bars(wrapper).map((bar) => bar.classes());
    expect(first).toContain('rounded-s-sm');
    expect(first).toContain('rounded-e-none');
    expect(first).not.toContain('rounded-e-sm');
    expect(middle).toContain('rounded-s-none');
    expect(middle).toContain('rounded-e-none');
    expect(last).toContain('rounded-s-none');
    expect(last).toContain('rounded-e-sm');
  });

  it('places each bar by grid column and row', () => {
    const wrapper = mountMonth([event('Expo', '2026-09-09T10:00Z', '2026-09-24T10:00Z')]);
    const [first] = bars(wrapper);
    expect(first!.attributes('style')).toContain('grid-column: 4 / span 4');
    expect(first!.attributes('style')).toContain('grid-row: 2');
  });

  it('names each bar segment by its title and the whole date range of the event', () => {
    const wrapper = mountMonth([event('Expo', '2026-09-09T10:00Z', '2026-09-24T10:00Z')]);
    for (const bar of bars(wrapper)) expect(bar.attributes('aria-label')).toBe('Expo, Sep 9, 2026 – Sep 24, 2026');
  });

  it('ends an event that stops at midnight on the day before, and keeps one that starts at midnight', () => {
    // Mon 14 Sep 00:00 to Thu 17 Sep 00:00 covers Monday through Wednesday.
    const wrapper = mountMonth([event('Retreat', '2026-09-14T00:00Z', '2026-09-17T00:00Z')]);
    expect(bars(wrapper).map(placement)).toEqual([{ column: 2, span: 3, lane: 0, isStart: true, isEnd: true }]);
    expect(bars(wrapper)[0]!.attributes('aria-label')).toBe('Retreat, Sep 14, 2026 – Sep 16, 2026');
  });

  it('starts the row on Monday when weekStart is 1', () => {
    // With Monday first the Monday 14 September is column 1 of its row.
    const wrapper = mountMonth([event('Retreat', '2026-09-14T09:00Z', '2026-09-16T09:00Z')], { weekStart: 1 });
    expect(bars(wrapper).map(placement)).toEqual([{ column: 1, span: 3, lane: 0, isStart: true, isEnd: true }]);
  });

  it('clips an event that began before the grid and one that runs past it', () => {
    const wrapper = mountMonth([event('Season', '2026-06-01T09:00Z', '2027-02-06T09:00Z')]);
    const found = bars(wrapper);
    expect(found).toHaveLength(6);
    expect(found.map(placement).map((p) => [p.column, p.span, p.isStart, p.isEnd])).toEqual(
      Array.from({ length: 6 }, () => [1, 7, false, false]),
    );
  });

  it('shows nothing for an event outside the visible grid or with a reversed interval', () => {
    const wrapper = mountMonth([
      event('Spring', '2026-04-01T09:00Z', '2026-04-20T09:00Z'),
      event('Backwards', '2026-09-20T09:00Z', '2026-09-10T09:00Z'),
    ]);
    expect(bars(wrapper)).toHaveLength(0);
    expect(wrapper.text()).not.toContain('Spring');
    expect(wrapper.text()).not.toContain('Backwards');
  });

  it('draws a long exhibition across a month as a bar in every row of the grid', () => {
    // October 2026: 1 Oct is a Thursday, so the first row opens on Sunday 27 September. 1 Oct to 1 Dec, end exclusive.
    const wrapper = mountMonth([event('Exhibition', '2026-10-01T00:00Z', '2026-12-01T00:00Z')], {
      focusDay: '2026-10-10',
    });
    expect(bars(wrapper).map((bar) => [placement(bar).column, placement(bar).span])).toEqual([
      [5, 3],
      [1, 7],
      [1, 7],
      [1, 7],
      [1, 7],
      [1, 7],
    ]);
  });

  it('takes two lanes for overlapping events and reuses a lane that has been freed', () => {
    const wrapper = mountMonth([
      event('A', '2026-09-14T09:00Z', '2026-09-17T12:00Z'), // Mon-Thu
      event('B', '2026-09-16T09:00Z', '2026-09-18T12:00Z'), // Wed-Fri, overlaps A
      event('C', '2026-09-18T09:00Z', '2026-09-19T12:00Z'), // Fri-Sat, overlaps B, follows A
    ]);
    const lanes = Object.fromEntries(bars(wrapper).map((bar) => [bar.text(), placement(bar).lane]));
    expect(lanes).toEqual({ A: 0, B: 1, C: 0 });
  });

  it('puts a longer event ahead of a shorter one that starts the same day', () => {
    const wrapper = mountMonth([
      event('Short', '2026-09-14T09:00Z', '2026-09-15T12:00Z'),
      event('Long', '2026-09-14T09:00Z', '2026-09-18T12:00Z'),
    ]);
    const lanes = Object.fromEntries(bars(wrapper).map((bar) => [bar.text(), placement(bar).lane]));
    expect(lanes).toEqual({ Long: 0, Short: 1 });
  });

  it('never overlaps two bars in one lane of one row', () => {
    // A deterministic spread of spans: starts every 2 days, lengths cycling 2 to 9 days.
    const events = Array.from({ length: 16 }, (_, index) => {
      const start = Temporal.PlainDate.from('2026-08-30').add({ days: index * 2 });
      const end = start.add({ days: 1 + ((index * 5) % 8) });
      return event(`E${index}`, `${start}T09:00Z`, `${end}T10:00Z`);
    });
    const wrapper = mountMonth(events);
    const byRow = new Map<Element | null, Array<ReturnType<typeof bars>[number]>>();
    for (const bar of bars(wrapper)) {
      const row = bar.element.parentElement;
      byRow.set(row, [...(byRow.get(row) ?? []), bar]);
    }
    expect(byRow.size).toBeGreaterThan(1);
    for (const segments of byRow.values()) {
      const taken = new Set<string>();
      for (const bar of segments) {
        const { column, span, lane } = placement(bar);
        for (let day = column; day < column + span; day++) {
          const slot = `${lane}:${day}`;
          expect(taken.has(slot), `${bar.text()} overlaps in lane ${lane}, column ${day}`).toBe(false);
          taken.add(slot);
        }
      }
    }
  });

  it('keeps every segment of an event in the order the lanes were first handed out', () => {
    const wrapper = mountMonth([
      event('Fair', '2026-09-08T09:00Z', '2026-09-22T09:00Z'),
      event('Camp', '2026-09-09T09:00Z', '2026-09-22T09:00Z'),
    ]);
    const lanes = bars(wrapper).map((bar) => `${bar.text()}${placement(bar).lane}`);
    expect(lanes).toEqual(['Fair0', 'Camp1', 'Fair0', 'Camp1', 'Fair0', 'Camp1']);
  });

  it('reports a click on a bar as an event click, and not as a slot click', async () => {
    const expo = event('Expo', '2026-09-09T10:00Z', '2026-09-24T10:00Z');
    const wrapper = mountMonth([expo]);
    await bars(wrapper)[1]!.trigger('click');
    expect(wrapper.emitted('event-click')).toEqual([[expo]]);
    expect(wrapper.emitted('slot-click')).toBeUndefined();
  });

  it('keeps each bar a focusable button', () => {
    const wrapper = mountMonth([event('Expo', '2026-09-09T10:00Z', '2026-09-24T10:00Z')]);
    for (const bar of bars(wrapper)) {
      expect(bar.element.tagName).toBe('BUTTON');
      expect(bar.attributes('type')).toBe('button');
      expect(bar.attributes('tabindex')).toBeUndefined();
    }
  });

  it('colors a bar with its event color and a readable text color', () => {
    const wrapper = mountMonth([event('Expo', '2026-09-09T10:00Z', '2026-09-12T10:00Z', { color: '#1e3a8a' })]);
    const style = (bars(wrapper)[0]!.element as HTMLElement).style;
    expect(bars(wrapper)[0]!.attributes('style')).toMatch(/1e3a8a|30, 58, 138/i);
    // A dark fill takes the light text pole.
    expect(style.color).not.toBe('');
    expect(bars(wrapper)[0]!.classes()).not.toContain('bg-primary-soft');
  });

  it('gives a bar without a color the theme soft tokens', () => {
    const wrapper = mountMonth([event('Expo', '2026-09-09T10:00Z', '2026-09-12T10:00Z')]);
    expect(bars(wrapper)[0]!.classes()).toContain('bg-primary-soft');
  });

  it('formats the range in the active locale and takes its wording from the provider messages', () => {
    const range = (locale: string, day: string): string =>
      new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
        new Date(`${day}T00:00:00Z`),
      );
    const wrapper = mount(LocaleProvider, {
      props: { locale: 'de-DE', messages: { 'MonthView.eventRange': '{title} von {start} bis {end}' } },
      slots: {
        default: () =>
          h(MonthView, {
            focusDay: Temporal.PlainDate.from('2026-09-15'),
            timeZone: 'UTC',
            events: [event('Expo', '2026-09-09T10:00Z', '2026-09-24T10:00Z')],
            weekStart: 0,
          }),
      },
    });
    wrappers.push(wrapper);
    expect(bars(wrapper)[0]!.attributes('aria-label')).toBe(
      `Expo von ${range('de-DE', '2026-09-09')} bis ${range('de-DE', '2026-09-24')}`,
    );
  });
});

describe('MonthView single-day events beside bars', () => {
  it('still draws a single-day event as a chip in its day, never as a bar', () => {
    const wrapper = mountMonth([event('Standup', '2026-09-16T09:00Z', '2026-09-16T09:30Z')]);
    expect(bars(wrapper)).toHaveLength(0);
    const chips = dayColumn(wrapper, '2026-09-16').findAll('button');
    expect(chips.map((chip) => chip.text())).toEqual(['Standup']);
    expect(chips[0]!.attributes('aria-label')).toBe('Standup at 09:00 AM');
  });

  it('treats an event that ends at the next midnight as a single day', () => {
    const wrapper = mountMonth([event('Open day', '2026-09-16T00:00Z', '2026-09-17T00:00Z', { isAllDay: true })]);
    expect(bars(wrapper)).toHaveLength(0);
    expect(dayColumn(wrapper, '2026-09-16').text()).toContain('Open day');
    expect(dayColumn(wrapper, '2026-09-17').text()).not.toContain('Open day');
  });

  it('draws a zero-duration event as a chip on its day', () => {
    const wrapper = mountMonth([event('Deadline', '2026-09-16T12:00Z', '2026-09-16T12:00Z')]);
    expect(bars(wrapper)).toHaveLength(0);
    expect(dayColumn(wrapper, '2026-09-16').text()).toContain('Deadline');
  });

  it('puts the chips under the bar lanes of the same row', () => {
    const wrapper = mountMonth([
      event('A', '2026-09-14T09:00Z', '2026-09-17T12:00Z'),
      event('B', '2026-09-16T09:00Z', '2026-09-18T12:00Z'),
      event('Standup', '2026-09-16T09:00Z', '2026-09-16T09:30Z'),
    ]);
    // Row grid: dates in row 1, lanes in rows 2 and 3, chips in row 4.
    expect(bars(wrapper).map((bar) => bar.attributes('style'))).toEqual([
      expect.stringContaining('grid-row: 2'),
      expect.stringContaining('grid-row: 3'),
    ]);
    expect(dayColumn(wrapper, '2026-09-16').attributes('style')).toContain('grid-row: 4');
    const dates = wrapper.findAll('button').filter((button) => button.text() === '16');
    expect(dates[0]!.attributes('style')).toContain('grid-row: 1');
  });

  it('keeps a week with no bars at one row of chips under the dates', () => {
    const wrapper = mountMonth([event('Standup', '2026-09-16T09:00Z', '2026-09-16T09:30Z')]);
    expect(dayColumn(wrapper, '2026-09-16').attributes('style')).toContain('grid-row: 2');
  });

  it('keeps the date button a slot click', async () => {
    const wrapper = mountMonth([event('Expo', '2026-09-09T10:00Z', '2026-09-24T10:00Z')]);
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '16')!
      .trigger('click');
    expect(String(wrapper.emitted('slot-click')![0]![0])).toBe('2026-09-16');
  });

  it('fits two single-day events under two long exhibitions without an overflow link', () => {
    // The Ocharo case: two exhibitions cover every day, and a day with two events still shows both.
    const wrapper = mountMonth(
      [
        event('Exhibition', '2026-10-01T00:00Z', '2026-12-01T00:00Z'),
        event('Winter show', '2026-10-06T00:00Z', '2027-02-06T00:00Z'),
        event('Talk', '2026-10-14T18:00Z', '2026-10-14T19:00Z'),
        event('Concert', '2026-10-14T20:00Z', '2026-10-14T21:00Z'),
      ],
      { focusDay: '2026-10-10' },
    );
    const day = dayColumn(wrapper, '2026-10-14');
    expect(day.findAll('button').map((chip) => chip.text())).toEqual(['Talk', 'Concert']);
    expect(day.text()).not.toContain('more');
    expect(wrapper.text()).not.toContain('more');
  });
});

describe('MonthView overflow', () => {
  it('counts the single-day events that do not fit under the bars', () => {
    // Two lanes leave two chip slots; the third event of the day overflows.
    const wrapper = mountMonth([
      event('A', '2026-09-14T09:00Z', '2026-09-18T12:00Z'),
      event('B', '2026-09-14T09:00Z', '2026-09-18T12:00Z'),
      event('S1', '2026-09-16T08:00Z', '2026-09-16T08:30Z'),
      event('S2', '2026-09-16T09:00Z', '2026-09-16T09:30Z'),
      event('S3', '2026-09-16T10:00Z', '2026-09-16T10:30Z'),
    ]);
    const day = dayColumn(wrapper, '2026-09-16');
    expect(day.findAll('button:not([aria-haspopup="dialog"])').map((chip) => chip.text())).toEqual(['S1', 'S2']);
    expect(day.text()).toContain('+1 more');
    // Other days of that row have room: the lanes are the same, but no extra events.
    expect(dayColumn(wrapper, '2026-09-15').text()).not.toContain('more');
  });

  it('counts the bars that need a lane past the limit, with the day own events', () => {
    // Five overlapping events: four lanes fit, so the fifth bar and every chip fall into "+N more".
    const long = ['A', 'B', 'C', 'D', 'E'].map((id) => event(id, '2026-09-14T09:00Z', '2026-09-18T12:00Z'));
    const wrapper = mountMonth([...long, event('Standup', '2026-09-16T09:00Z', '2026-09-16T09:30Z')]);
    expect(
      bars(wrapper)
        .map((bar) => bar.text())
        .sort(),
    ).toEqual(['A', 'B', 'C', 'D']);
    expect(Math.max(...bars(wrapper).map((bar) => placement(bar).lane))).toBe(3);
    const middle = dayColumn(wrapper, '2026-09-16');
    expect(middle.findAll('button:not([aria-haspopup="dialog"])')).toHaveLength(0);
    expect(middle.text()).toContain('+2 more');
    expect(dayColumn(wrapper, '2026-09-14').text()).toContain('+1 more');
    expect(dayColumn(wrapper, '2026-09-19').text()).not.toContain('more');
  });

  it('counts a hidden bar only on the days that bar covers', () => {
    const wrapper = mountMonth([
      event('A', '2026-09-14T09:00Z', '2026-09-18T12:00Z'),
      event('B', '2026-09-14T09:00Z', '2026-09-18T12:00Z'),
      event('C', '2026-09-14T09:00Z', '2026-09-18T12:00Z'),
      event('D', '2026-09-14T09:00Z', '2026-09-18T12:00Z'),
      event('E', '2026-09-15T09:00Z', '2026-09-16T12:00Z'),
    ]);
    expect(dayColumn(wrapper, '2026-09-14').text()).not.toContain('more');
    expect(dayColumn(wrapper, '2026-09-15').text()).toContain('+1 more');
    expect(dayColumn(wrapper, '2026-09-16').text()).toContain('+1 more');
    expect(dayColumn(wrapper, '2026-09-17').text()).not.toContain('more');
  });

  it('keeps the old count for a week with no bars: four chips fit and the rest overflow', () => {
    const singles = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map((id, index) =>
      event(id, `2026-09-16T0${index + 1}:00Z`, `2026-09-16T0${index + 1}:30Z`),
    );
    const wrapper = mountMonth(singles);
    const day = dayColumn(wrapper, '2026-09-16');
    expect(day.findAll('button:not([aria-haspopup="dialog"])').map((chip) => chip.text())).toEqual([
      'S1',
      'S2',
      'S3',
      'S4',
    ]);
    expect(day.text()).toContain('+2 more');
  });

  it('takes the overflow label from the locale provider messages', () => {
    const wrapper = mount(LocaleProvider, {
      props: { messages: { 'MonthView.more': '{count} weitere' } },
      slots: {
        default: () =>
          h(MonthView, {
            focusDay: Temporal.PlainDate.from('2026-09-15'),
            timeZone: 'UTC',
            events: ['S1', 'S2', 'S3', 'S4', 'S5'].map((id, index) =>
              event(id, `2026-09-16T0${index + 1}:00Z`, `2026-09-16T0${index + 1}:30Z`),
            ),
            weekStart: 0,
          }),
      },
    });
    wrappers.push(wrapper);
    expect(dayColumn(wrapper, '2026-09-16').text()).toContain('1 weitere');
  });
});

describe('EventCalendarViewer month view with bars', () => {
  it('renders a multi-day event as bars through the viewer and reports a click on one', async () => {
    const expo = event('Expo', '2026-09-09T10:00Z', '2026-09-24T10:00Z');
    const wrapper = mount(EventCalendarViewer, {
      props: { events: [expo], date: at('2026-09-15T12:00Z'), view: 'month' },
    });
    wrappers.push(wrapper);
    expect(wrapper.findAll('[data-event-bar]')).toHaveLength(3);
    await wrapper.findAll('[data-event-bar]')[0]!.trigger('click');
    expect(wrapper.emitted('event-click')).toEqual([[expo]]);
  });
});
