import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h } from 'vue';
import { Temporal } from 'temporal-polyfill';
import { LocaleProvider } from '@src/foundation/i18n';
import EventCalendarViewer from '@src/presentation/display/eventCalendarViewer/EventCalendarViewer.vue';
import { formatDay } from '@src/presentation/display/eventCalendarViewer/EventCalendarViewerDates';
import type { EventCalendarViewerEvent } from '@src/presentation/display/eventCalendarViewer/EventCalendarViewerTypes';

const RealDateTimeFormat = Intl.DateTimeFormat;

type Render = (instant: number) => string;

/** Answers `Intl.DateTimeFormat` with `render` for the locales it names; every other call reaches the runtime. */
function stubRuntime(render: (locale: string, options: Intl.DateTimeFormatOptions) => Render | undefined) {
  return vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function (
    locale?: string | string[],
    options?: Intl.DateTimeFormatOptions,
  ) {
    const real = new RealDateTimeFormat(locale, options);
    const custom = typeof locale === 'string' ? render(locale, options ?? {}) : undefined;
    return custom ? Object.defineProperty(real, 'format', { value: custom }) : real;
  } as never);
}

/*
 * What Chrome's ICU answers for Uzbek, which it carries no data for: the root "M11" for a month and English for a
 * weekday, in the pattern the fields are written in (weekday, month, day, year).
 */
const chromeUzbek = (locale: string, options: Intl.DateTimeFormatOptions): Render | undefined => {
  if (!locale.startsWith('uz')) return undefined;
  return (instant) => {
    const date = new Date(instant);
    const parts: Array<string | number> = [];
    if (options.weekday !== undefined) {
      parts.push(new RealDateTimeFormat('en', { weekday: options.weekday, timeZone: 'UTC' }).format(instant));
    }
    if (options.month !== undefined) parts.push(`M${date.getUTCMonth() + 1}`);
    if (options.day !== undefined) parts.push(date.getUTCDate());
    if (options.year !== undefined) parts.push(date.getUTCFullYear());
    return parts.length > 0 ? parts.join(' ') : new RealDateTimeFormat('en', options).format(instant);
  };
};

/* The date-name probe caches per locale, so each test names a locale of its own. */
let counter = 0;
const own = (tag: string): string => `${tag}-x-t${(counter += 1)}`;

const wrappers: Array<VueWrapper> = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  vi.restoreAllMocks();
});

const at = (text: string): Temporal.ZonedDateTime => Temporal.ZonedDateTime.from(text + '[UTC]');
const event = (id: string, start: string, end: string): EventCalendarViewerEvent => ({
  id,
  title: id,
  start: at(start),
  end: at(end),
});

/** A Friday: its week runs Sunday 15 to Saturday 21 November 2026. */
const focus = at('2026-11-20T12:00Z');

function mountIn(locale: string, props: Record<string, unknown>): VueWrapper {
  const wrapper = mount(LocaleProvider, {
    props: { locale },
    slots: { default: () => h(EventCalendarViewer, { events: [], date: focus, ...props }) },
  });
  wrappers.push(wrapper);
  return wrapper;
}

const title = (wrapper: VueWrapper): string => wrapper.get('h3').text();

/** The weekday header cells of the month grid, as read. */
const monthHeaders = (wrapper: VueWrapper): Array<string> => wrapper.findAll('.uppercase').map((cell) => cell.text());

/** The runtime's own long date, for the locales it has data for. */
const intl = (locale: string, options: Intl.DateTimeFormatOptions, day = '2026-11-20'): string =>
  new RealDateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`));

describe('EventCalendarViewer date names where the runtime has no Uzbek data', () => {
  it('reads the month title as the month name and year', () => {
    stubRuntime(chromeUzbek);
    expect(title(mountIn(own('uz'), { view: 'month' }))).toBe('noyabr 2026');
    expect(title(mountIn(own('uz-Cyrl'), { view: 'month' }))).toBe('ноябр 2026');
  });

  it('starts the month weekday headers on Yakshanba or Dushanba by weekStart', () => {
    stubRuntime(chromeUzbek);
    const sunday = mountIn(own('uz'), { view: 'month', weekStart: 0 });
    expect(monthHeaders(sunday)).toEqual(['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh']);
    const monday = mountIn(own('uz'), { view: 'month', weekStart: 1 });
    expect(monthHeaders(monday)).toEqual(['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya']);
    expect(monday.text()).not.toMatch(/\b(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\b/);
  });

  it('names the year view months and weekday initials', () => {
    stubRuntime(chromeUzbek);
    const wrapper = mountIn(own('uz'), { view: 'year', weekStart: 1 });
    const sections = wrapper.findAll('section[role="group"]');
    expect(sections[0]!.get('button').text()).toBe('yanvar');
    expect(sections[0]!.attributes('aria-label')).toBe('yanvar 2026');
    expect(sections[10]!.get('button').text()).toBe('noyabr');
    expect(sections.map((section) => section.get('button').text())).toEqual([
      'yanvar',
      'fevral',
      'mart',
      'aprel',
      'may',
      'iyun',
      'iyul',
      'avgust',
      'sentabr',
      'oktabr',
      'noyabr',
      'dekabr',
    ]);
    const initials = sections[0]!
      .findAll('span[aria-hidden="true"]')
      .slice(0, 7)
      .map((cell) => cell.text());
    expect(initials).toEqual(['D', 'S', 'C', 'P', 'J', 'S', 'Y']);
  });

  it('names a year view day by its weekday, month and date', () => {
    stubRuntime(chromeUzbek);
    const wrapper = mountIn(own('uz'), {
      view: 'year',
      events: [event('Concert', '2026-11-20T18:00Z', '2026-11-20T19:00Z')],
    });
    expect(wrapper.find('[aria-label="juma noyabr 20 2026, 1 event"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="shanba noyabr 21 2026"]').exists()).toBe(true);
  });

  it('writes the week title with month names in the locale pattern', () => {
    stubRuntime(chromeUzbek);
    expect(title(mountIn(own('uz'), { view: 'week' }))).toBe('noy 15 – noy 21 2026');
  });

  it('writes the day title with the weekday and month names', () => {
    stubRuntime(chromeUzbek);
    expect(title(mountIn(own('uz'), { view: 'day' }))).toBe('juma noyabr 20 2026');
  });

  it('writes the time grid column header with the weekday name', () => {
    stubRuntime(chromeUzbek);
    const wrapper = mountIn(own('uz'), { view: 'day' });
    expect(wrapper.text()).toContain('Ju 20');
    expect(wrapper.text()).not.toContain('Fri');
  });

  it('writes the agenda title and group headings with the SDK names', () => {
    stubRuntime(chromeUzbek);
    const wrapper = mountIn(own('uz'), {
      view: 'agenda',
      events: [event('Concert', '2026-11-20T18:00Z', '2026-11-20T19:00Z')],
    });
    expect(title(wrapper)).toBe('Upcoming from noy 20');
    expect(wrapper.text()).toContain('juma noy 20');
  });

  it('names a month bar by its date range', () => {
    stubRuntime(chromeUzbek);
    const wrapper = mountIn(own('uz'), {
      view: 'month',
      events: [event('Expo', '2026-11-09T10:00Z', '2026-11-24T10:00Z')],
    });
    expect(wrapper.find('[data-event-bar]').attributes('aria-label')).toBe('Expo, noy 9 2026 – noy 24 2026');
  });

  it('leaves the year title and the numbers to Intl', () => {
    stubRuntime(chromeUzbek);
    const wrapper = mountIn(own('uz'), { view: 'year' });
    expect(title(wrapper)).toBe('2026');
    expect(wrapper.findAll('section[role="group"]')).toHaveLength(12);
  });

  it('follows a locale change from Uzbek to English without a stale name', async () => {
    stubRuntime(chromeUzbek);
    const wrapper = mountIn(own('uz'), { view: 'month' });
    expect(title(wrapper)).toBe('noyabr 2026');
    await wrapper.setProps({ locale: 'en' });
    expect(title(wrapper)).toBe('November 2026');
  });
});

describe('EventCalendarViewer date names where the runtime has the data', () => {
  it('leaves English as Intl writes it', () => {
    expect(title(mountIn('en', { view: 'month' }))).toBe('November 2026');
    expect(title(mountIn('en', { view: 'week' }))).toBe('Nov 15 – Nov 21, 2026');
    expect(title(mountIn('en', { view: 'day' }))).toBe('Friday, November 20, 2026');
    expect(title(mountIn('en', { view: 'agenda' }))).toBe('Upcoming from Nov 20');
    expect(title(mountIn('en', { view: 'year' }))).toBe('2026');
    expect(monthHeaders(mountIn('en', { view: 'month', weekStart: 0 }))).toEqual([
      'Sun',
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
    ]);
    expect(monthHeaders(mountIn('en', { view: 'month', weekStart: 1 }))[0]).toBe('Mon');
    const year = mountIn('en', { view: 'year' });
    expect(year.findAll('section[role="group"]')[0]!.get('button').text()).toBe('January');
    expect(year.find('[aria-label="Friday, November 20, 2026"]').exists()).toBe(true);
    expect(mountIn('en', { view: 'day' }).text()).toContain(intl('en', { weekday: 'short', day: 'numeric' }));
  });

  it('leaves Russian as Intl writes it, genitive months included', () => {
    expect(title(mountIn('ru', { view: 'month' }))).toBe(intl('ru', { month: 'long', year: 'numeric' }));
    expect(title(mountIn('ru', { view: 'month' }))).toBe('ноябрь 2026 г.');
    expect(title(mountIn('ru', { view: 'day' }))).toBe(
      intl('ru', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    );
    expect(title(mountIn('ru', { view: 'day' }))).toContain('ноября');
    expect(title(mountIn('ru', { view: 'week' }))).toBe(
      `${intl('ru', { month: 'short', day: 'numeric' }, '2026-11-15')} – ${intl('ru', { month: 'short', day: 'numeric', year: 'numeric' }, '2026-11-21')}`,
    );
    expect(monthHeaders(mountIn('ru', { view: 'month', weekStart: 1 }))[0]).toBe(
      intl('ru', { weekday: 'short' }, '2026-11-16'),
    );
    const year = mountIn('ru', { view: 'year' });
    expect(year.findAll('section[role="group"]')[10]!.get('button').text()).toBe('ноябрь');
    expect(year.findAll('section[role="group"]')[10]!.attributes('aria-label')).toBe('ноябрь 2026 г.');
  });

  it('keeps the Uzbek names of a runtime that has the data', () => {
    const title2026 = title(mountIn('uz', { view: 'month' }));
    expect(title2026.toLowerCase()).toMatch(/^noyabr,? 2026$/);
    expect(monthHeaders(mountIn('uz', { view: 'month', weekStart: 1 }))[0]!.toLowerCase()).toMatch(/^du/);
  });
});

describe('formatDay', () => {
  const day = Temporal.PlainDate.from('2026-11-20');

  it('matches Intl for a locale the runtime has data for', () => {
    for (const locale of ['en', 'en-GB', 'ru', 'de-DE', 'fr']) {
      for (const options of [
        { month: 'short', day: 'numeric' },
        { weekday: 'short', day: 'numeric' },
        { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
        { year: 'numeric', month: 'short', day: 'numeric' },
        { month: 'narrow', day: 'numeric' },
      ] as const) {
        expect(formatDay(day, locale, options), `${locale} ${JSON.stringify(options)}`).toBe(
          day.toLocaleString(locale, options),
        );
      }
    }
  });

  it('swaps only the words the runtime lacks, and keeps the numbers and the order', () => {
    stubRuntime(chromeUzbek);
    const locale = own('uz');
    expect(formatDay(day, locale, { weekday: 'short', day: 'numeric' })).toBe('Ju 20');
    expect(formatDay(day, locale, { month: 'long', day: 'numeric', year: 'numeric' })).toBe('noyabr 20 2026');
    expect(formatDay(day, locale, { day: 'numeric', year: 'numeric' })).toBe('20 2026');
  });
});
