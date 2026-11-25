import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { h } from 'vue';
import { Temporal } from 'temporal-polyfill';
import { LocaleProvider } from '@src/foundation/i18n';
import EventCalendarViewer from '@src/presentation/display/eventCalendarViewer/EventCalendarViewer.vue';
import {
  EventCalendarViewerView,
  EventCalendarViewerViews,
  offeredViews,
  type EventCalendarViewerEvent,
} from '@src/presentation/display/eventCalendarViewer/EventCalendarViewerTypes';

const wrappers: Array<VueWrapper> = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  vi.useRealTimers();
});

const at = (text: string): Temporal.ZonedDateTime => Temporal.ZonedDateTime.from(text + '[UTC]');
const event = (id: string, start: string, end: string, color?: string): EventCalendarViewerEvent => ({
  id,
  title: id,
  start: at(start),
  end: at(end),
  ...(color ? { color } : {}),
});

/** A Friday: the week runs Sunday 20 September to Saturday 26 September. */
const focus = at('2026-09-25T12:00Z');

function mountViewer(props: Record<string, unknown> = {}): VueWrapper {
  const wrapper = mount(EventCalendarViewer, { props: { events: [], date: focus, ...props } });
  wrappers.push(wrapper);
  return wrapper;
}

function switcherLabels(wrapper: VueWrapper): Array<string> {
  return wrapper
    .get('[aria-label="View"]')
    .findAll('button')
    .map((button) => button.text());
}

function pressedLabel(wrapper: VueWrapper): string | undefined {
  return wrapper
    .get('[aria-label="View"]')
    .findAll('button')
    .find((button) => button.attributes('aria-pressed') === 'true')
    ?.text();
}

function title(wrapper: VueWrapper): string {
  return wrapper.get('h3').text();
}

/** The twelve mini months of the year view. */
function monthSections(wrapper: VueWrapper) {
  return wrapper.findAll('section[role="group"]');
}

function emittedDates(wrapper: VueWrapper, name: string): Array<string> {
  return (wrapper.emitted(name) ?? []).map(([value]) => String((value as Temporal.ZonedDateTime).toPlainDate()));
}

describe('EventCalendarViewer Today action', () => {
  const anchor = Temporal.ZonedDateTime.from('2026-12-01T08:00:00+05:00[Asia/Tashkent]');

  function todayButton(wrapper: VueWrapper) {
    return wrapper.findAll('button').find((button) => button.text() === 'Today')!;
  }

  it('disables Today in the current period in the display zone', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-30T20:00:00Z'));
    const yesterday = anchor.subtract({ days: 1 });
    const cases = [
      ['day', anchor, true],
      ['day', yesterday, false],
      ['week', yesterday, true],
      ['week', yesterday.subtract({ weeks: 1 }), false],
      ['month', anchor.add({ days: 7 }), true],
      ['month', yesterday, false],
      ['year', yesterday, true],
      ['year', anchor.subtract({ years: 1 }), false],
      ['agenda', anchor, true],
      ['agenda', yesterday, false],
    ] as const;
    const wrapper = mountViewer({ view: 'day', date: anchor, weekStart: 1 });
    for (const [view, date, disabled] of cases) {
      await wrapper.setProps({ view, date });
      expect(todayButton(wrapper).element.disabled, `${view} ${date.toPlainDate()}`).toBe(disabled);
    }
  });

  it('enables Today again at midnight in the display zone', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(new Date('2026-12-01T18:59:59Z'));
    const wrapper = mountViewer({ view: 'day', date: anchor });
    const button = todayButton(wrapper);
    expect(button.element.disabled).toBe(true);

    await vi.advanceTimersByTimeAsync(1000);
    expect(button.element.disabled).toBe(false);
    await button.trigger('click');
    expect(emittedDates(wrapper, 'update:date')).toEqual(['2026-12-02']);
  });
});

describe('EventCalendarViewer year view', () => {
  it('renders twelve mini months in calendar order with every day of the year', () => {
    const wrapper = mountViewer({ view: 'year' });
    const sections = monthSections(wrapper);
    expect(sections).toHaveLength(12);
    expect(sections[0]!.attributes('aria-label')).toBe('January 2026');
    expect(sections[11]!.attributes('aria-label')).toBe('December 2026');
    expect(sections.map((section) => section.get('button').text())).toEqual([
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ]);
    // 365 day buttons, each reachable by its full date.
    expect(wrapper.findAll('section button[aria-label]')).toHaveLength(365);
    expect(wrapper.find('[aria-label="Friday, September 25, 2026"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="Thursday, December 31, 2026"]').exists()).toBe(true);
  });

  it('shows the year as the title and moves a year per Prev and Next', async () => {
    const wrapper = mountViewer({ view: 'year' });
    expect(title(wrapper)).toBe('2026');
    await wrapper.get('[aria-label="Next"]').trigger('click');
    await wrapper.get('[aria-label="Previous"]').trigger('click');
    expect(emittedDates(wrapper, 'update:date')).toEqual(['2027-09-25', '2025-09-25']);
  });

  it('returns to today from another year', async () => {
    const wrapper = mountViewer({ view: 'year', date: at('2031-02-03T08:00Z') });
    const before = Temporal.Now.plainDateISO('UTC');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Today')!
      .trigger('click');
    const after = Temporal.Now.plainDateISO('UTC');
    const [moved] = emittedDates(wrapper, 'update:date');
    expect([before.toString(), after.toString()]).toContain(moved);
  });

  it('follows the date through the year in uncontrolled mode', async () => {
    const wrapper = mountViewer({ date: undefined, defaultDate: focus, defaultView: 'year' });
    await wrapper.get('[aria-label="Next"]').trigger('click');
    expect(title(wrapper)).toBe('2027');
    expect(monthSections(wrapper)[0]!.attributes('aria-label')).toBe('January 2027');
  });

  it('marks every day a multi-day event spans, and only those', () => {
    const wrapper = mountViewer({
      view: 'year',
      events: [event('Retreat', '2026-03-05T20:00Z', '2026-03-06T04:00Z')],
    });
    expect(wrapper.find('[aria-label="Thursday, March 5, 2026, 1 event"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="Friday, March 6, 2026, 1 event"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="Wednesday, March 4, 2026"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="Saturday, March 7, 2026"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-event-count]')).toHaveLength(2);
    expect(wrapper.get('[aria-label="Thursday, March 5, 2026, 1 event"]').attributes('title')).toBe('1 event');
  });

  it('keeps the exclusive end: an event ending at midnight leaves the next day unmarked', () => {
    const wrapper = mountViewer({
      view: 'year',
      events: [event('Overnight', '2026-03-05T22:00Z', '2026-03-06T00:00Z')],
    });
    expect(wrapper.findAll('[data-event-count]')).toHaveLength(1);
    expect(wrapper.find('[aria-label="Thursday, March 5, 2026, 1 event"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="Friday, March 6, 2026"]').exists()).toBe(true);
  });

  it('counts each event once per month and names the count of events on a day', () => {
    const wrapper = mountViewer({
      view: 'year',
      events: [
        event('Spans', '2026-03-05T09:00Z', '2026-03-08T09:00Z'),
        event('Standup', '2026-03-05T10:00Z', '2026-03-05T10:30Z'),
        event('Review', '2026-03-20T10:00Z', '2026-03-20T11:00Z'),
        event('Other month', '2026-05-02T10:00Z', '2026-05-02T11:00Z'),
      ],
    });
    const march = wrapper.get('section[aria-label="March 2026"]');
    expect(march.get('[role="img"]').attributes('aria-label')).toBe('3 events');
    expect(march.get('[role="img"]').text()).toBe('3');
    expect(march.get('[aria-label="Thursday, March 5, 2026, 2 events"]').attributes('title')).toBe('2 events');
    expect(wrapper.get('section[aria-label="May 2026"] [role="img"]').attributes('aria-label')).toBe('1 event');
    expect(wrapper.get('section[aria-label="April 2026"]').find('[role="img"]').exists()).toBe(false);
  });

  it('clips an event that crosses the year edges to the displayed year', () => {
    const wrapper = mountViewer({
      view: 'year',
      events: [
        event('Winter break', '2025-12-30T10:00Z', '2026-01-02T10:00Z'),
        event('New year', '2026-12-31T10:00Z', '2027-01-02T10:00Z'),
        event('Elsewhere', '2024-06-01T10:00Z', '2024-06-02T10:00Z'),
      ],
    });
    const january = wrapper.get('section[aria-label="January 2026"]');
    expect(january.findAll('[data-event-count]').map((day) => day.text())).toEqual(['1', '2']);
    expect(january.get('[role="img"]').attributes('aria-label')).toBe('1 event');
    const december = wrapper.get('section[aria-label="December 2026"]');
    expect(december.findAll('[data-event-count]').map((day) => day.text())).toEqual(['31']);
    expect(wrapper.findAll('[data-event-count]')).toHaveLength(3);
  });

  it('tints a day with the first event color, or the primary token when it has none', () => {
    const wrapper = mountViewer({
      view: 'year',
      events: [
        event('Colored', '2026-03-05T09:00Z', '2026-03-05T10:00Z', '#e11d48'),
        event('Plain', '2026-03-05T11:00Z', '2026-03-05T12:00Z'),
        event('Themed', '2026-03-06T09:00Z', '2026-03-06T10:00Z'),
      ],
    });
    const colored = wrapper.get('[aria-label="Thursday, March 5, 2026, 2 events"]');
    const tint = (day: Pick<DOMWrapper<Element>, 'classes'>): boolean =>
      day.classes().some((name) => name.includes('color-mix'));
    expect(colored.attributes('style') ?? '').toContain('--year-day-tint: #e11d48');
    expect(tint(colored)).toBe(true);
    const themed = wrapper.get('[aria-label="Friday, March 6, 2026, 1 event"]');
    expect(themed.attributes('style') ?? '').not.toContain('--year-day-tint');
    expect(tint(themed)).toBe(true);
    expect(tint(wrapper.get('[aria-label="Saturday, March 7, 2026"]'))).toBe(false);
  });

  it('rings today only', () => {
    const wrapper = mountViewer({ view: 'year', date: Temporal.Now.zonedDateTimeISO() });
    const today = wrapper.findAll('[data-today]');
    expect(today).toHaveLength(1);
    expect(today[0]!.classes()).toContain('ring-primary');
    expect(today[0]!.attributes('aria-current')).toBe('date');
    expect(wrapper.findAll('[aria-current]')).toHaveLength(1);
  });

  it('shows no today ring in a year that is not the current one', () => {
    const wrapper = mountViewer({ view: 'year', date: at('1999-06-15T12:00Z') });
    expect(wrapper.findAll('[data-today]')).toHaveLength(0);
  });

  it('opens the month view on a clicked month', async () => {
    const wrapper = mountViewer({ view: 'year' });
    await wrapper.get('section[aria-label="March 2026"] button').trigger('click');
    expect(wrapper.emitted('update:view')).toEqual([['month']]);
    expect(emittedDates(wrapper, 'update:date')).toEqual(['2026-03-01']);
  });

  it('switches an uncontrolled viewer to the clicked month', async () => {
    const wrapper = mountViewer({ date: undefined, defaultDate: focus, defaultView: 'year' });
    await wrapper.get('section[aria-label="March 2026"] button').trigger('click');
    expect(title(wrapper)).toBe('March 2026');
    expect(pressedLabel(wrapper)).toBe('month');
    expect(monthSections(wrapper)).toHaveLength(0);
  });

  it('opens the day view on a clicked day and reports the slot click', async () => {
    const wrapper = mountViewer({
      view: 'year',
      events: [event('Standup', '2026-03-05T09:00Z', '2026-03-05T10:00Z')],
    });
    await wrapper.get('[aria-label="Thursday, March 5, 2026, 1 event"]').trigger('click');
    expect(wrapper.emitted('update:view')).toEqual([['day']]);
    expect(emittedDates(wrapper, 'update:date')).toEqual(['2026-03-05']);
    const slots = wrapper.emitted('slot-click') ?? [];
    expect(slots).toHaveLength(1);
    expect(String(slots[0]![0])).toBe('2026-03-05');
  });

  it('switches an uncontrolled viewer to the clicked day', async () => {
    const wrapper = mountViewer({ date: undefined, defaultDate: focus, defaultView: 'year' });
    await wrapper.get('[aria-label="Saturday, March 7, 2026"]').trigger('click');
    expect(title(wrapper)).toBe('Saturday, March 7, 2026');
    expect(pressedLabel(wrapper)).toBe('day');
  });

  it('keeps the time of day of the focused instant when it opens a day', async () => {
    const wrapper = mountViewer({ view: 'year' });
    await wrapper.get('[aria-label="Saturday, March 7, 2026"]').trigger('click');
    const [moved] = wrapper.emitted('update:date')![0] as [Temporal.ZonedDateTime];
    expect(moved.toString()).toBe('2026-03-07T12:00:00+00:00[UTC]');
  });

  it('honors weekStart in the weekday initials', () => {
    const sunday = mountViewer({ view: 'year', weekStart: 0 });
    const monday = mountViewer({ view: 'year', weekStart: 1 });
    const initials = (wrapper: VueWrapper): string =>
      wrapper
        .get('section')
        .findAll('span[aria-hidden="true"]')
        .slice(0, 7)
        .map((cell) => cell.text())
        .join('');
    expect(initials(sunday)).toBe('SMTWTFS');
    expect(initials(monday)).toBe('MTWTFSS');
  });

  it('offsets the first day by weekStart', () => {
    // 1 January 2026 is a Thursday: four blank cells after a Sunday start, three after a Monday start.
    const leading = (weekStart: 0 | 1): number => {
      const wrapper = mountViewer({ view: 'year', weekStart });
      const cells = wrapper.get('section').get('.grid.grid-cols-7').element.children;
      return Array.from(cells)
        .slice(7)
        .findIndex((cell) => cell.tagName === 'BUTTON');
    };
    expect(leading(0)).toBe(4);
    expect(leading(1)).toBe(3);
  });

  it('formats month names, day names and the title in the active locale', () => {
    const wrapper = mount(LocaleProvider, {
      props: { locale: 'de-DE' },
      slots: { default: () => h(EventCalendarViewer, { events: [], date: focus, view: 'year' }) },
    });
    wrappers.push(wrapper);
    expect(wrapper.get('section[aria-label="März 2026"] button').text()).toBe('März');
    expect(wrapper.find('[aria-label="Freitag, 25. September 2026"]').exists()).toBe(true);
  });

  it('formats the year title as a locale number', () => {
    const wrapper = mount(LocaleProvider, {
      props: { locale: 'ar-EG' },
      slots: { default: () => h(EventCalendarViewer, { events: [], date: focus, view: 'year' }) },
    });
    wrappers.push(wrapper);
    const expected = new Intl.DateTimeFormat('ar-EG', { year: 'numeric', timeZone: 'UTC' }).format(
      new Date(focus.epochMilliseconds),
    );
    expect(title(wrapper)).toBe(expected);
    expect(title(wrapper)).not.toContain('2026');
  });

  it('takes the count messages from the locale provider', () => {
    const wrapper = mount(LocaleProvider, {
      props: { messages: { 'YearView.events': '{count} Termine', 'YearView.eventsOne': '{count} Termin' } },
      slots: {
        default: () =>
          h(EventCalendarViewer, {
            events: [
              event('A', '2026-03-05T09:00Z', '2026-03-05T10:00Z'),
              event('B', '2026-03-05T11:00Z', '2026-03-05T12:00Z'),
              event('C', '2026-03-06T11:00Z', '2026-03-06T12:00Z'),
            ],
            date: focus,
            view: 'year',
          }),
      },
    });
    wrappers.push(wrapper);
    expect(wrapper.find('[aria-label="Thursday, March 5, 2026, 2 Termine"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="Friday, March 6, 2026, 1 Termin"]').exists()).toBe(true);
    expect(wrapper.get('section[aria-label="March 2026"] [role="img"]').attributes('aria-label')).toBe('3 Termine');
  });
});

describe('EventCalendarViewer views prop', () => {
  it('offers every view in the canonical order by default', () => {
    const wrapper = mountViewer();
    expect(switcherLabels(wrapper)).toEqual(['day', 'week', 'month', 'year', 'agenda']);
    expect(EventCalendarViewerViews).toEqual(['day', 'week', 'month', 'year', 'agenda']);
    expect(pressedLabel(wrapper)).toBe('month');
  });

  it('lists only the offered views, in canonical order whatever order was passed', () => {
    const wrapper = mountViewer({ views: ['agenda', 'month', 'day'] });
    expect(switcherLabels(wrapper)).toEqual(['day', 'month', 'agenda']);
  });

  it('ignores a repeated or unknown view and offers every view for an empty list', () => {
    expect(offeredViews(['month', 'month', 'day'])).toEqual(['day', 'month']);
    expect(offeredViews([])).toEqual(EventCalendarViewerViews);
    expect(offeredViews(['nope' as EventCalendarViewerView])).toEqual(EventCalendarViewerViews);
    expect(switcherLabels(mountViewer({ views: [] }))).toEqual(['day', 'week', 'month', 'year', 'agenda']);
  });

  it('shows the first offered view when the controlled view is not offered', () => {
    const wrapper = mountViewer({ view: 'agenda', views: ['year', 'month'] });
    expect(switcherLabels(wrapper)).toEqual(['month', 'year']);
    expect(pressedLabel(wrapper)).toBe('month');
    expect(title(wrapper)).toBe('September 2026');
    // The reader changed nothing, so no view change is reported.
    expect(wrapper.emitted('update:view')).toBeUndefined();
  });

  it('shows the first offered view when the default view is not offered', () => {
    const wrapper = mountViewer({ views: ['week', 'day'] });
    expect(pressedLabel(wrapper)).toBe('day');
    expect(title(wrapper)).toBe('Friday, September 25, 2026');
  });

  it('navigates by the shown view when the current view is not offered', async () => {
    const wrapper = mountViewer({ view: 'agenda', views: ['year', 'month'] });
    await wrapper.get('[aria-label="Next"]').trigger('click');
    expect(emittedDates(wrapper, 'update:date')).toEqual(['2026-10-25']);
  });

  it('hides the switcher when one view is offered, and renders that view', () => {
    const wrapper = mountViewer({ views: ['year'] });
    expect(wrapper.find('[aria-label="View"]').exists()).toBe(false);
    expect(title(wrapper)).toBe('2026');
    expect(monthSections(wrapper)).toHaveLength(12);
  });

  it('keeps a two-view switcher and switches between them', async () => {
    const wrapper = mountViewer({ date: undefined, defaultDate: focus, views: ['month', 'year'] });
    expect(pressedLabel(wrapper)).toBe('month');
    const year = wrapper
      .get('[aria-label="View"]')
      .findAll('button')
      .find((button) => button.text() === 'year')!;
    await year.trigger('click');
    expect(pressedLabel(wrapper)).toBe('year');
    expect(monthSections(wrapper)).toHaveLength(12);

    await year.trigger('click');
    expect(pressedLabel(wrapper)).toBe('year');
    expect(wrapper.emitted('update:view')).toEqual([['year']]);
  });

  it('reports the switcher choice through update:view', async () => {
    const wrapper = mountViewer({ view: 'month' });
    await wrapper
      .get('[aria-label="View"]')
      .findAll('button')
      .find((button) => button.text() === 'year')!
      .trigger('click');
    expect(wrapper.emitted('update:view')).toEqual([['year']]);
  });

  it('moves the date without entering a target view the consumer did not offer', async () => {
    const wrapper = mountViewer({ view: 'year', views: ['year', 'agenda'] });
    await wrapper.get('[aria-label="Saturday, March 7, 2026"]').trigger('click');
    await wrapper.get('section[aria-label="May 2026"] button').trigger('click');
    expect(wrapper.emitted('update:view')).toBeUndefined();
    expect(emittedDates(wrapper, 'update:date')).toEqual(['2026-03-07', '2026-05-01']);
    expect(String(wrapper.emitted('slot-click')![0]![0])).toBe('2026-03-07');
  });
});

describe('EventCalendarViewer existing views', () => {
  const events = [event('Standup', '2026-09-25T09:00Z', '2026-09-25T09:30Z')];

  it('opens on the month view by default', () => {
    const wrapper = mountViewer({ events });
    expect(pressedLabel(wrapper)).toBe('month');
    expect(title(wrapper)).toBe('September 2026');
    expect(wrapper.text()).toContain('Standup');
    expect(wrapper.findAll('section[role="group"]')).toHaveLength(0);
  });

  it('renders the week view and moves a week per step', async () => {
    const wrapper = mountViewer({ events, view: 'week' });
    expect(title(wrapper)).toBe('Sep 20 – Sep 26, 2026');
    expect(wrapper.text()).toContain('Standup');
    await wrapper.get('[aria-label="Previous"]').trigger('click');
    await wrapper.get('[aria-label="Next"]').trigger('click');
    expect(emittedDates(wrapper, 'update:date')).toEqual(['2026-09-18', '2026-10-02']);
  });

  it('renders the day view and moves a day per step', async () => {
    const wrapper = mountViewer({ events, view: 'day' });
    expect(title(wrapper)).toBe('Friday, September 25, 2026');
    expect(wrapper.text()).toContain('Standup');
    await wrapper.get('[aria-label="Previous"]').trigger('click');
    await wrapper.get('[aria-label="Next"]').trigger('click');
    expect(emittedDates(wrapper, 'update:date')).toEqual(['2026-09-24', '2026-09-26']);
  });

  it('renders the month view and moves a month per step', async () => {
    const wrapper = mountViewer({ events, view: 'month' });
    await wrapper.get('[aria-label="Previous"]').trigger('click');
    await wrapper.get('[aria-label="Next"]').trigger('click');
    expect(emittedDates(wrapper, 'update:date')).toEqual(['2026-08-25', '2026-10-25']);
  });

  it('renders the agenda view and moves a day per step', async () => {
    const wrapper = mountViewer({ events, view: 'agenda' });
    expect(title(wrapper)).toBe('Upcoming from Sep 25');
    expect(wrapper.text()).toContain('Standup');
    await wrapper.get('[aria-label="Next"]').trigger('click');
    expect(emittedDates(wrapper, 'update:date')).toEqual(['2026-09-26']);
  });

  it('switches between every view through the switcher', async () => {
    const wrapper = mountViewer({ date: undefined, defaultDate: focus, events });
    for (const label of ['day', 'week', 'month', 'year', 'agenda']) {
      await wrapper
        .get('[aria-label="View"]')
        .findAll('button')
        .find((button) => button.text() === label)!
        .trigger('click');
      expect(pressedLabel(wrapper)).toBe(label);
    }
    expect(wrapper.text()).toContain('Standup');
  });

  it('still reports month slot clicks and event clicks', async () => {
    const wrapper = mountViewer({ events, view: 'month' });
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '25')!
      .trigger('click');
    expect(String(wrapper.emitted('slot-click')![0]![0])).toBe('2026-09-25');
    await wrapper.get('[aria-label^="Standup at"]').trigger('click');
    expect((wrapper.emitted('event-click')![0]![0] as EventCalendarViewerEvent).id).toBe('Standup');
  });
});
