import { afterEach, describe, it } from 'vitest';
import { h, type Component } from 'vue';
import type { VueWrapper } from '@vue/test-utils';
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
  TableHead,
  TableHeaderCell,
  TableRow,
  type DataTableColumn,
} from '@src/presentation/display';
import { MeterBar } from '@src/presentation/feedback';
import { expectRegionShapeParity } from '../../../support/SkeletonParity';
import '@src/index.css';

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

interface Host {
  readonly id: string;
  readonly name: string;
  readonly region: string;
  readonly uptime: number;
}

const hosts: ReadonlyArray<Host> = [
  { id: 'a', name: 'web-01', region: 'Europe', uptime: 99.9 },
  { id: 'b', name: 'web-02', region: 'North America', uptime: 98.1 },
  { id: 'c', name: 'db-01', region: 'Europe', uptime: 99.99 },
];

const columns: ReadonlyArray<DataTableColumn<Host>> = [
  { key: 'name', header: 'Host', accessor: (row) => row.name },
  { key: 'region', header: 'Region', accessor: (row) => row.region },
  { key: 'uptime', header: 'Uptime', accessor: (row) => `${row.uptime}%`, align: 'right' },
];

describe('metrics keep their loaded box as skeletons', () => {
  it('keeps a stat card, a labelled meter and a sparkline', async () => {
    wrapper = await expectRegionShapeParity(
      () => [
        h(StatCard, {
          class: 'stat',
          label: 'Uptime',
          value: '99.9%',
          trend: { value: 0.4, label: 'vs last week' },
          helper: 'Across every region',
        }),
        h(MeterBar, { class: 'meter', value: 62, label: 'Disk', isLabelVisible: true, valueLabel: '62 of 100 GB' }),
        h(Sparkline, { class: 'spark', data: [3, 5, 4, 8, 6], width: 120, height: 32 }),
      ],
      ['.stat', '.meter', '.spark'],
    );
  });
});

describe('collections keep their rows as skeletons', () => {
  it('keeps a description group', async () => {
    wrapper = await expectRegionShapeParity(
      () =>
        h(DescriptionGroup, {
          class: 'details',
          items: [
            { label: 'Host', value: 'web-01' },
            { label: 'Region', value: 'Europe' },
          ],
        }),
      ['.details', '.details dd'],
    );
  });

  it('keeps data table rows, a selection column and the expand control', async () => {
    wrapper = await expectRegionShapeParity(
      () =>
        h(
          DataTable as Component,
          {
            class: 'hosts',
            columns,
            data: hosts,
            rowKey: (row: Host) => row.id,
            selectionMode: 'multiple',
            skeletonRows: hosts.length,
          },
          { expanded: () => 'Details' },
        ),
      ['.hosts', '.hosts tbody tr:first-child', '.hosts tbody tr:first-child td:nth-child(2)'],
      'w-[40rem]',
    );
  });

  it('keeps raw table rows whose cells draw their own content', async () => {
    wrapper = await expectRegionShapeParity(
      () =>
        h(Table, { class: 'raw' }, () => [
          h(TableHead, null, () =>
            h(TableRow, null, () => ['Host', 'State'].map((name) => h(TableHeaderCell, () => name))),
          ),
          h(TableBody, null, () =>
            hosts.map((host) =>
              h(TableRow, { key: host.id, class: 'raw-row' }, () => [
                h(TableCell, () => host.name),
                h(TableCell, () => h(Badge, { variant: 'success' }, () => 'Online')),
              ]),
            ),
          ),
        ]),
      ['.raw', '.raw-row'],
      'w-[40rem]',
    );
  });

  it('keeps list rows with their avatars', async () => {
    wrapper = await expectRegionShapeParity(
      () =>
        h(ListGroup, { class: 'list' }, () =>
          hosts.map((host) =>
            h(
              ListGroupItem,
              { key: host.id, class: 'list-row' },
              { default: () => host.name, leading: () => h(Avatar, { name: host.name, size: 'sm' }) },
            ),
          ),
        ),
      ['.list', '.list-row'],
    );
  });
});
