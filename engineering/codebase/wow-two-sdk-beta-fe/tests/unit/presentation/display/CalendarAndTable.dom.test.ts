import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { Temporal } from 'temporal-polyfill';
import { ExactNumber } from '@src/foundation/numbers';
import DataTable from '@src/presentation/display/dataTable/DataTable.vue';
import EventCalendarViewer from '@src/presentation/display/eventCalendarViewer/EventCalendarViewer.vue';
import {
  calendarHour,
  intersectsCalendarDay,
  layoutCalendarEvents,
} from '@src/presentation/display/eventCalendarViewer/EventCalendarViewerLayout';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
});
const day = Temporal.PlainDate.from('2026-09-25');
const at = (text: string) => Temporal.ZonedDateTime.from(text + '[UTC]');
const event = (id: string, start: string, end: string) => ({ id, title: id, start: at(start), end: at(end) });

describe('calendar event projection', () => {
  it('renders default midnight boundaries and continued multi-day events', () => {
    const wrapper = mount(EventCalendarViewer, {
      props: {
        date: at('2026-09-25T12:00Z'),
        view: 'day',
        events: [event('Overnight', '2026-09-24T23:00Z', '2026-09-25T02:00Z')],
      },
    });
    wrappers.push(wrapper);
    expect(wrapper.text()).toContain('Overnight');
    expect(wrapper.findAll('button').some((button) => button.attributes('style')?.includes('height: 96px'))).toBe(true);
    expect(calendarHour(day, 24, 'UTC').toString()).toBe('2026-09-26T00:00:00+00:00[UTC]');
  });
  it('uses displayed-zone dates and excludes an event ending at day start', () => {
    const endsAtMidnight = event('Finished', '2026-09-24T12:00Z', '2026-09-25T00:00Z');
    expect(intersectsCalendarDay(endsAtMidnight, day, 'UTC')).toBe(false);
    const shifted = event('Shifted', '2026-09-24T20:00Z', '2026-09-24T22:00Z');
    expect(intersectsCalendarDay(shifted, day, 'Asia/Tashkent')).toBe(true);
    expect(intersectsCalendarDay(shifted, day, 'UTC')).toBe(false);
  });
  it('lays out overlapping groups side by side and restores width for later events', () => {
    const result = layoutCalendarEvents(
      [
        event('Long', '2026-09-25T09:00Z', '2026-09-25T12:00Z'),
        event('Short', '2026-09-25T10:00Z', '2026-09-25T11:00Z'),
        event('Later', '2026-09-25T13:00Z', '2026-09-25T14:00Z'),
      ],
      day,
      'UTC',
      [0, 24],
    );
    expect(result.map((item) => [item.event.id, item.column, item.columns])).toEqual([
      ['Long', 0, 2],
      ['Short', 1, 2],
      ['Later', 0, 1],
    ]);
  });
  it('preserves elapsed duration when a repeated hour reverses the local end clock', () => {
    const fold = {
      id: 'fold',
      title: 'Fold',
      start: Temporal.ZonedDateTime.from('2026-11-01T01:30-04:00[America/New_York]'),
      end: Temporal.ZonedDateTime.from('2026-11-01T01:15-05:00[America/New_York]'),
    };
    const items = layoutCalendarEvents(
      [fold, { ...fold, id: 'instant', end: fold.start }],
      Temporal.PlainDate.from('2026-11-01'),
      'America/New_York',
      [0, 24],
    );
    expect(items.find((item) => item.event.id === 'fold')).toMatchObject({ start: 90, end: 135 });
    expect(items.find((item) => item.event.id === 'instant')).toMatchObject({ start: 90, end: 105 });
  });
  it('clips events to the visible interval and handles malformed visual options', () => {
    const events = [
      event('Early', '2026-09-25T05:00Z', '2026-09-25T07:00Z'),
      event('Visible', '2026-09-25T07:00Z', '2026-09-25T10:00Z'),
    ];
    const clipped = layoutCalendarEvents(events, day, 'UTC', [8, 9]);
    expect(clipped.map((item) => [item.event.id, item.start, item.end])).toEqual([['Visible', 480, 540]]);
    expect(layoutCalendarEvents(events, day, 'UTC', [NaN, Infinity])).toHaveLength(2);
  });
});

describe('table sorting and interaction', () => {
  it('sorts signed precise decimals numerically without number conversion', () => {
    const data = ['-2', '-10', '9007199254740993.2', '9007199254740993.11'].map((text) => {
      const value = ExactNumber.parse(text);
      if (!value.ok) throw new Error('Invalid test value');
      return { text, value: value.value };
    });
    const wrapper = mount(DataTable, {
      props: {
        data,
        columns: [
          {
            key: 'n',
            header: 'Number',
            accessor: (row: unknown) => (row as (typeof data)[number]).value,
            cell: (row: unknown) => (row as (typeof data)[number]).text,
          },
        ],
        defaultSortBy: { columnKey: 'n', direction: 'asc' },
      },
    });
    wrappers.push(wrapper);
    expect(wrapper.findAll('tbody tr').map((row) => row.text())).toEqual([
      '-10',
      '-2',
      '9007199254740993.11',
      '9007199254740993.2',
    ]);
  });
  it('supports custom row comparison without an accessor', () => {
    const wrapper = mount(DataTable, {
      props: {
        data: ['aaa', 'b', 'cc'],
        columns: [
          {
            key: 'size',
            header: 'Size',
            compare: (a: unknown, b: unknown) => String(a).length - String(b).length,
            cell: (row: unknown) => row,
          },
        ],
        defaultSortBy: { columnKey: 'size', direction: 'asc' },
      },
    });
    wrappers.push(wrapper);
    expect(wrapper.findAll('tbody tr').map((row) => row.text())).toEqual(['b', 'cc', 'aaa']);
  });
  it('activates interactive rows with the keyboard', async () => {
    const activate = vi.fn();
    const wrapper = mount(DataTable, {
      props: {
        data: ['Ada'],
        columns: [{ key: 'name', header: 'Name', accessor: (row: unknown) => row }],
        onRowClick: activate,
      },
    });
    wrappers.push(wrapper);
    const row = wrapper.get('tbody tr');
    expect(row.attributes('tabindex')).toBe('0');
    await row.trigger('keydown', { key: 'Enter' });
    expect(activate).toHaveBeenCalledWith('Ada', 0);
  });
});

describe('consumer-colored calendar blocks', () => {
  function textOf(view: 'month' | 'day', color: string): string {
    const wrapper = mount(EventCalendarViewer, {
      props: {
        date: at('2026-09-25T12:00Z'),
        view,
        events: [{ ...event('Standup', '2026-09-25T09:00Z', '2026-09-25T09:30Z'), color }],
      },
    });
    wrappers.push(wrapper);
    const block = wrapper.findAll('button').find((button) => button.text().includes('Standup'));
    return (block?.element as HTMLElement | undefined)?.style.color ?? '';
  }

  /** Mean channel of a `#rrggbb` or `rgb()` color — engines differ in how they echo an inline hex back. */
  function lightness(color: string): number {
    const channels = color.startsWith('#')
      ? [1, 3, 5].map((start) => Number.parseInt(color.slice(start, start + 2), 16))
      : (color.match(/\d+/gu) ?? []).map(Number);
    const [r = 0, g = 0, b = 0] = channels;
    return (r + g + b) / 3;
  }

  it('puts light text on a dark event color and dark text on a light one', () => {
    for (const view of ['month', 'day'] as const) {
      expect(lightness(textOf(view, '#1e3a8a')), view).toBeGreaterThan(200);
      expect(lightness(textOf(view, '#fde68a')), view).toBeLessThan(60);
    }
  });

  it('leaves the inherited text alone for a color it cannot read', () => {
    expect(textOf('month', 'var(--brand)')).toBe('');
  });
});
