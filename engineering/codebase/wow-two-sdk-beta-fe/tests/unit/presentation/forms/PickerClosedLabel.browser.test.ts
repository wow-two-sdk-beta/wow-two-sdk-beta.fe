import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Component, type Ref } from 'vue';
import { userEvent } from 'vitest/browser';
import {
  ListboxPickerGroup,
  MultiSelectPicker,
  MultiSelectPickerContent,
  MultiSelectPickerItem,
  MultiSelectPickerTrigger,
  SelectPicker,
  SelectPickerContent,
  SelectPickerItem,
  SelectPickerTrigger,
  SelectPickerValue,
  type SelectPickerOption,
} from '@src/presentation/forms';
import '@src/index.css';

/*
 * A closed picker unmounts its panel rows, so the trigger used to show the raw key (`ovh-control`) until
 * the first open registered the labels. Every case reads the trigger with the panel never opened.
 */

const Servers = [
  { slug: 'ovh-control', name: 'OVH control plane' },
  { slug: 'hetzner-edge', name: 'Hetzner edge' },
];

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

function mountInBody(render: () => unknown): void {
  wrapper = mount(defineComponent({ setup: () => render as () => ReturnType<typeof h> }), { attachTo: document.body });
}

function selectTrigger(): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>('button[aria-haspopup=listbox]')!;
}

function serverItems(servers: ReadonlyArray<{ slug: string; name: string }>) {
  return servers.map((server) => h(SelectPickerItem, { key: server.slug, itemKey: server.slug, label: server.name }));
}

function selectWithItems(value: Ref<string | null>, servers: Ref<ReadonlyArray<{ slug: string; name: string }>>) {
  return () =>
    h(
      SelectPicker as Component,
      { modelValue: value.value, 'onUpdate:modelValue': (next: string | null) => (value.value = next) },
      () => [
        h(SelectPickerTrigger, { 'aria-label': 'Server' }, () => h(SelectPickerValue, { placeholder: 'Choose' })),
        h(SelectPickerContent, null, () => serverItems(servers.value)),
      ],
    );
}

describe('SelectPicker closed trigger', () => {
  it('labels a slotted option before any open', async () => {
    mountInBody(selectWithItems(ref('ovh-control'), ref(Servers)));
    await nextTick();

    expect(document.querySelector('[role=listbox]')).toBeNull();
    expect(selectTrigger().textContent).toContain('OVH control plane');
    expect(selectTrigger().textContent).not.toContain('ovh-control');
  });

  it('labels options nested in a group', async () => {
    mountInBody(() =>
      h(SelectPicker as Component, { defaultValue: 'hetzner-edge' }, () => [
        h(SelectPickerTrigger, { 'aria-label': 'Server' }),
        h(SelectPickerContent, null, () => h(ListboxPickerGroup, { label: 'Hosts' }, () => serverItems(Servers))),
      ]),
    );
    await nextTick();

    expect(selectTrigger().textContent).toContain('Hetzner edge');
  });

  it('follows a value changed from outside while closed', async () => {
    const value = ref<string | null>('ovh-control');
    mountInBody(selectWithItems(value, ref(Servers)));
    await nextTick();

    value.value = 'hetzner-edge';
    await nextTick();
    expect(selectTrigger().textContent).toContain('Hetzner edge');

    value.value = null;
    await nextTick();
    expect(selectTrigger().textContent).toContain('Choose');
  });

  it('labels the selection once options load asynchronously', async () => {
    const servers = ref<ReadonlyArray<{ slug: string; name: string }>>([]);
    mountInBody(selectWithItems(ref('ovh-control'), servers));
    await nextTick();

    servers.value = Servers;
    await nextTick();
    expect(selectTrigger().textContent).toContain('OVH control plane');
  });

  it('resolves object keys through keyEquals for a fresh outside value', async () => {
    type Key = { readonly id: number };
    const value = ref<Key | null>({ id: 2 });
    mountInBody(() =>
      h(SelectPicker as Component, { modelValue: value.value, keyEquals: (a: Key, b: Key) => a.id === b.id }, () => [
        h(SelectPickerTrigger, { 'aria-label': 'Server' }),
        h(SelectPickerContent, null, () => [
          h(SelectPickerItem, { itemKey: { id: 1 }, label: 'First' }),
          h(SelectPickerItem, { itemKey: { id: 2 }, label: 'Second' }),
        ]),
      ]),
    );
    await nextTick();
    expect(selectTrigger().textContent).toContain('Second');

    value.value = { id: 1 };
    await nextTick();
    expect(selectTrigger().textContent).toContain('First');
  });

  it('labels from the options prop and from getOptionLabel', async () => {
    const options: SelectPickerOption<string>[] = Servers.map((s) => ({
      itemKey: s.slug,
      value: s.slug,
      label: s.name,
    }));
    mountInBody(() =>
      h('div', [
        h(SelectPicker as Component, { defaultValue: 'hetzner-edge', options }, () => [
          h(SelectPickerTrigger, { 'aria-label': 'Seeded' }),
          h(SelectPickerContent, null, () => serverItems(Servers)),
        ]),
        h(SelectPicker as Component, { defaultValue: 'retired', getOptionLabel: () => 'Retired host' }, () => [
          h(SelectPickerTrigger, { 'aria-label': 'Resolved' }),
          h(SelectPickerContent, null, () => serverItems(Servers)),
        ]),
      ]),
    );
    await nextTick();

    const [seeded, resolved] = document.querySelectorAll<HTMLButtonElement>('button[aria-haspopup=listbox]');
    expect(seeded!.textContent).toContain('Hetzner edge');
    expect(resolved!.textContent).toContain('Retired host');
  });

  it('lists each option once after opening, and keeps the label after closing', async () => {
    mountInBody(selectWithItems(ref('ovh-control'), ref(Servers)));
    await nextTick();

    await userEvent.click(selectTrigger());
    await expect.poll(() => document.querySelectorAll('[role=option]').length).toBe(2);

    await userEvent.keyboard('{Escape}');
    await expect.poll(() => document.querySelector('[role=listbox]')).toBeNull();
    expect(selectTrigger().textContent).toContain('OVH control plane');
  });

  it('keeps the page rendering when slot content cannot mount outside the panel', async () => {
    const PanelOnly = defineComponent({
      setup() {
        throw new Error('needs the open panel');
      },
    });
    mountInBody(() =>
      h(SelectPicker as Component, { defaultValue: 'ovh-control' }, () => [
        h(SelectPickerTrigger, { 'aria-label': 'Server' }),
        h(SelectPickerContent, null, () => [h(PanelOnly), ...serverItems(Servers)]),
      ]),
    );
    await nextTick();

    expect(selectTrigger()).not.toBeNull();
    expect(selectTrigger().textContent).toMatch(/OVH control plane|ovh-control/);
  });

  it('types to select on a never-opened trigger', async () => {
    const value = ref<string | null>(null);
    mountInBody(selectWithItems(value, ref(Servers)));
    await nextTick();

    selectTrigger().focus();
    await userEvent.keyboard('h');
    await expect.poll(() => value.value).toBe('hetzner-edge');
    expect(selectTrigger().textContent).toContain('Hetzner edge');
  });
});

describe('MultiSelectPicker closed trigger', () => {
  const Rows = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
    { value: 'c', label: 'Gamma' },
  ];

  function multi(values: Ref<string[]>, rows: Ref<ReadonlyArray<{ value: string; label: string }>>) {
    return () =>
      h(MultiSelectPicker, { modelValue: values.value }, () => [
        h(MultiSelectPickerTrigger, { 'aria-label': 'Letters' }),
        h(MultiSelectPickerContent, null, () =>
          rows.value.map((row) =>
            h(MultiSelectPickerItem, { key: row.value, value: row.value, label: row.label }, () => row.label),
          ),
        ),
      ]);
  }

  function chips(): string[] {
    return [...document.querySelectorAll('button span.bg-muted')].map((chip) => chip.textContent!.trim());
  }

  it('labels preselected rows before any open', async () => {
    mountInBody(multi(ref(['a', 'b']), ref(Rows)));
    await nextTick();

    expect(document.querySelector('[role=listbox]')).toBeNull();
    expect(chips()).toEqual(['Alpha', 'Beta']);
  });

  it('follows outside value changes and async rows', async () => {
    const values = ref(['c']);
    const rows = ref<ReadonlyArray<{ value: string; label: string }>>([]);
    mountInBody(multi(values, rows));
    await nextTick();

    rows.value = Rows;
    await nextTick();
    expect(chips()).toEqual(['Gamma']);

    values.value = ['b', 'c'];
    await nextTick();
    expect(chips()).toEqual(['Beta', 'Gamma']);
  });
});
