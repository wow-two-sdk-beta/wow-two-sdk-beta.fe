import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, type Component, type VNode } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { DataRegion } from '@src/presentation/feedback/dataRegion';
import { MeterBar, useSkeletonItems } from '@src/presentation/feedback';
import {
  Avatar,
  Badge,
  DataTable,
  DescriptionGroup,
  ListGroup,
  ListGroupItem,
  Sparkline,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@src/presentation/display';

const wrappers: VueWrapper[] = [];
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));

function inRegion(content: () => VNode | VNode[]): VueWrapper {
  const wrapper = mount(DataRegion, { props: { isFirstLoad: true }, slots: { default: content } });
  wrappers.push(wrapper);
  return wrapper;
}

describe('metric components mask values and keep their size', () => {
  it('draws a stat card label, value, trend and helper as bars', () => {
    const wrapper = mount(StatCard, {
      props: { label: 'Uptime', value: '', trend: { value: 2.5 }, helper: 'Last 30 days', isSkeleton: true },
    });
    wrappers.push(wrapper);
    expect(wrapper.attributes('aria-busy')).toBe('true');
    expect(wrapper.attributes()).toHaveProperty('inert');
    const bars = wrapper.findAll('[data-skeleton-line]');
    expect(bars).toHaveLength(4);
    expect((wrapper.get('h3 [data-skeleton-line]').element as HTMLElement).style.paddingInlineEnd).toBe('4ch');
  });

  it('pulses a meter track with no fill inside a first load', () => {
    const wrapper = inRegion(() => h(MeterBar, { class: 'meter', value: 40, label: 'Disk' }));
    const meter = wrapper.get('.meter');
    expect(meter.attributes('aria-busy')).toBe('true');
    expect(meter.classes()).toEqual(expect.arrayContaining(['rounded-full', 'bg-muted', 'motion-safe:animate-pulse']));
    expect(meter.element.children).toHaveLength(0);
  });

  it('draws a sparkline as one placeholder of its size', () => {
    const wrapper = inRegion(() => h(Sparkline, { class: 'spark', data: [1, 3, 2, 5], width: 96, height: 24 }));
    const spark = wrapper.get('.spark');
    expect(spark.attributes('aria-hidden')).toBe('true');
    expect(spark.attributes('width')).toBe('96');
    expect(spark.classes()).toContain('bg-muted');
    expect(spark.element.children).toHaveLength(0);
  });
});

describe('collections keep their rows', () => {
  it('masks description terms and values, and lets a value component draw itself', () => {
    const wrapper = inRegion(() =>
      h(
        DescriptionGroup,
        {
          items: [
            { label: 'Host', value: '' },
            { label: 'Status', value: 'online' },
          ],
        },
        { value: ({ index }: { index: number }) => (index === 1 ? h(Badge, { class: 'status' }, () => 'Online') : '') },
      ),
    );
    expect(wrapper.findAll('dt [data-skeleton-line]')).toHaveLength(2);
    expect(wrapper.find('dd:first-of-type [data-skeleton-line]').exists()).toBe(true);
    expect(wrapper.get('.status').attributes('data-skeleton')).toBe('true');
    expect(wrapper.get('.status').element.closest('[data-skeleton-line]')).toBeNull();
  });

  it('renders the real table layout over placeholder rows', () => {
    const Rows = defineComponent({
      setup() {
        const rows = useSkeletonItems<{ id: string; name: string }>(undefined, 3);
        return () =>
          h(Table, null, () =>
            h(TableBody, null, () =>
              rows.value.map((row, index) =>
                h(TableRow, { key: row?.id ?? index }, () => [
                  h(TableCell, { class: 'name' }, () => row?.name),
                  h(TableCell, { class: 'state' }, () => h(Badge, () => 'Online')),
                ]),
              ),
            ),
          );
      },
    });
    const wrapper = inRegion(() => h(Rows));
    expect(wrapper.findAll('tbody tr')).toHaveLength(3);
    const empty = wrapper.get('.name [data-skeleton-line]').element as HTMLElement;
    expect(empty.style.paddingInlineEnd).toBe('8em');
    expect(wrapper.find('.state [data-skeleton-line]').exists()).toBe(false);
    expect(wrapper.get('.state span').attributes('data-skeleton')).toBe('true');
  });

  it('draws data table placeholder rows in a first load and keeps the heading', () => {
    const wrapper = inRegion(() =>
      h(DataTable as Component, {
        columns: [{ key: 'name', header: 'Name', accessor: (row: { name: string }) => row.name }],
        data: [{ name: 'web-01' }],
        skeletonRows: 4,
      }),
    );
    expect(wrapper.findAll('[data-skeleton-row]')).toHaveLength(4);
    expect(wrapper.get('thead').text()).toBe('Name');
    expect(wrapper.text()).not.toContain('web-01');
    expect(wrapper.get('table').attributes('aria-busy')).toBe('true');
  });

  it('keeps list rows, hides check markers and lets an avatar draw its own disc', () => {
    const wrapper = mount(ListGroup, {
      props: { marker: 'check', isSkeleton: true },
      slots: {
        default: () => [
          h(
            ListGroupItem,
            { class: 'row' },
            { default: () => 'Ada Lovelace', leading: () => h(Avatar, { name: 'Ada' }) },
          ),
        ],
      },
    });
    wrappers.push(wrapper);
    expect(wrapper.attributes('aria-busy')).toBe('true');
    const row = wrapper.get('.row');
    expect(row.attributes('data-skeleton')).toBe('true');
    expect(row.get('[data-skeleton-line]').text()).toBe('Ada Lovelace');
    expect(row.get('span[aria-hidden="true"]').classes()).toContain('invisible');
    expect(row.get('[data-loading]').classes()).toContain('rounded-full');
  });
});
