import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, type Component, type VNode } from 'vue';
import { page } from 'vitest/browser';
import { reachOf } from '../../../support/TouchReach';
import { Calendar } from 'lucide-vue-next';
import { Tag } from '@src/presentation/display/tag';
import {
  CheckboxField,
  CheckboxInput,
  ChipSelect,
  ComboboxPicker,
  ComboboxPickerContent,
  ComboboxPickerInput,
  ComboboxPickerItem,
  MultiSelectPicker,
  MultiSelectPickerContent,
  MultiSelectPickerItem,
  MultiSelectPickerTrigger,
  PasswordInput,
  PhoneInput,
  PinInput,
  RadioField,
  RadioGroup,
  RadioInput,
  SearchInput,
  SegmentedPicker,
  SelectPicker,
  SelectPickerContent,
  SelectPickerItem,
  SelectPickerTrigger,
  SelectPickerValue,
  SwitchField,
  SwitchInput,
  TextAreaInput,
  TextInput,
  ToggleGroup,
  ToggleGroupItem,
} from '@src/presentation/forms';
import { canEmulateCoarsePointer, useCoarsePointer, useFinePointer } from '../../../support/CoarsePointer';
import '@src/index.css';

/**
 * Touch targets of the form controls: a finger needs a 44 x 44px hit area on a phone or tablet, the fine-pointer look
 * stays as it was. Each case mounts one standalone control and measures the element a tap lands on.
 */

let wrapper: VueWrapper | null = null;

beforeAll(async () => {
  await page.viewport(320, 640);
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

afterAll(async () => {
  await page.viewport(414, 896);
});

/** One control in a 288px frame, as a phone column holds it. */
function mountControl(render: () => VNode): void {
  wrapper = mount(
    { render: () => h('div', { style: 'width: 288px; padding: 32px 8px' }, render()) },
    { attachTo: document.body },
  );
}

const query = <T extends HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;

/** The tap target's box. An open panel zooms in as it opens, so its rows are read by layout size, not bounding box. */
function box(element: HTMLElement, byLayout = false): { width: number; height: number } {
  if (byLayout) return { width: element.offsetWidth, height: element.offsetHeight };
  const rect = element.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

const trigger = (props: Record<string, unknown> = {}, open = false): VNode =>
  h(SelectPicker as Component, { defaultValue: 'a', isClearable: true, defaultOpen: open }, () => [
    h(SelectPickerTrigger, { 'aria-label': 'Sort', ...props }, () => h(SelectPickerValue)),
    h(SelectPickerContent, null, () => [
      h(SelectPickerItem, { itemKey: 'a', value: 'a', label: 'Newest' }),
      h(SelectPickerItem, { itemKey: 'b', value: 'b', label: 'Oldest' }),
    ]),
  ]);

const multiTrigger = (open = false): VNode =>
  h(MultiSelectPicker, { defaultValue: ['a'], defaultOpen: open }, () => [
    h(MultiSelectPickerTrigger, { 'aria-label': 'Kinds' }),
    h(MultiSelectPickerContent, null, () => [
      h(MultiSelectPickerItem, { value: 'a', label: 'Alpha' }, () => 'Alpha'),
      h(MultiSelectPickerItem, { value: 'b', label: 'Beta' }, () => 'Beta'),
    ]),
  ]);

/** A control, the selector of the element a tap lands on, and whether it is read by layout size. */
interface TapCase {
  readonly name: string;
  readonly render: () => VNode;
  readonly selector: string;
  readonly byLayout?: boolean;
  /** The element is smaller than its hit area, which an invisible extension supplies: read it by tapping around it. */
  readonly byPoint?: boolean;
  /** The text input's height under a fine pointer — the look this change must leave alone. */
  readonly fineHeight?: number;
}

const Cases: ReadonlyArray<TapCase> = [
  {
    name: 'TextInput md',
    render: () => h(TextInput, { 'aria-label': 'Search posts' }),
    selector: 'input',
    fineHeight: 40,
  },
  {
    name: 'TextInput sm',
    render: () => h(TextInput, { size: 'sm', 'aria-label': 'Search' }),
    selector: 'input',
    fineHeight: 32,
  },
  { name: 'TextAreaInput md', render: () => h(TextAreaInput, { 'aria-label': 'Note' }), selector: 'textarea' },
  {
    name: 'SearchInput md',
    render: () => h(SearchInput, { 'aria-label': 'Search posts' }),
    selector: 'input',
    fineHeight: 40,
  },
  {
    name: 'SearchInput clear button',
    render: () => h(SearchInput, { defaultValue: 'abc', 'aria-label': 'Search posts' }),
    selector: 'button',
    byPoint: true,
    fineHeight: 32,
  },
  {
    name: 'PasswordInput md',
    render: () => h(PasswordInput, { 'aria-label': 'Password' }),
    selector: 'input',
    fineHeight: 40,
  },
  {
    name: 'PasswordInput reveal button',
    render: () => h(PasswordInput, { 'aria-label': 'Password' }),
    selector: 'button',
    byPoint: true,
    fineHeight: 32,
  },
  {
    name: 'SelectPickerTrigger md',
    render: () => trigger(),
    selector: 'button[aria-haspopup=listbox]',
    fineHeight: 40,
  },
  {
    name: 'SelectPickerTrigger sm',
    render: () => trigger({ size: 'sm' }),
    selector: 'button[aria-haspopup=listbox]',
    fineHeight: 32,
  },
  {
    name: 'SelectPickerTrigger clear button',
    render: () => trigger(),
    selector: 'button:not([aria-haspopup])',
    byPoint: true,
    fineHeight: 24,
  },
  {
    name: 'MultiSelectPickerTrigger md',
    render: () => multiTrigger(),
    selector: 'button[aria-haspopup]',
    fineHeight: 40,
  },
  {
    name: 'ComboboxPickerInput md',
    render: () =>
      h(ComboboxPicker, null, () => [
        h(ComboboxPickerInput, { 'aria-label': 'Country' }),
        h(ComboboxPickerContent, null, () => h(ComboboxPickerItem, { value: 'a', label: 'Alpha' }, () => 'Alpha')),
      ]),
    selector: 'input[role=combobox]',
    fineHeight: 40,
  },
  {
    name: 'ChipSelect trigger',
    render: () =>
      h(ChipSelect, {
        label: 'Kind',
        options: [
          { value: 'a', label: 'Conference', icon: Calendar },
          { value: 'b', label: 'Workshop' },
        ],
      }),
    selector: 'button',
    fineHeight: 36,
  },
  {
    name: 'ToggleGroup item (default)',
    render: () =>
      h(ToggleGroup as Component, {
        'aria-label': 'View',
        defaultValue: 'a',
        options: [
          { value: 'a', label: 'Day' },
          { value: 'b', label: 'Week' },
        ],
      }),
    selector: 'button',
    fineHeight: 40,
  },
  {
    name: 'ToggleGroup item (segmented)',
    render: () =>
      h(SegmentedPicker as Component, {
        'aria-label': 'View',
        defaultValue: 'a',
        options: [
          { value: 'a', label: 'Day' },
          { value: 'b', label: 'Week' },
        ],
      }),
    selector: 'button',
  },
  {
    name: 'ToggleGroup item (pill, sm)',
    render: () =>
      h(ToggleGroup as Component, { 'aria-label': 'View', variant: 'pill', defaultValue: 'a' }, () => [
        h(ToggleGroupItem, { value: 'a', label: 'Day', size: 'sm' }),
        h(ToggleGroupItem, { value: 'b', label: 'Week', size: 'sm' }),
      ]),
    selector: 'button',
  },
  { name: 'CheckboxInput md (bare)', render: () => h(CheckboxInput, { 'aria-label': 'Agree' }), selector: 'input' },
  { name: 'CheckboxField md (label)', render: () => h(CheckboxField, { label: 'Agree' }), selector: 'label' },
  {
    name: 'RadioInput md (bare)',
    render: () => h(RadioGroup, { legend: 'Pick' }, () => h(RadioInput, { value: 'a', 'aria-label': 'A' })),
    selector: 'input',
  },
  {
    name: 'RadioField md (label)',
    render: () => h(RadioGroup, { legend: 'Pick' }, () => h(RadioField, { value: 'a', label: 'A' })),
    selector: 'label',
  },
  { name: 'SwitchInput md (bare)', render: () => h(SwitchInput, { 'aria-label': 'Notify' }), selector: 'input' },
  { name: 'SwitchField md (label)', render: () => h(SwitchField, { label: 'Notify' }), selector: 'label' },
  {
    name: 'Tag close button',
    render: () => h(Tag, { onClose: () => undefined }, () => 'Draft'),
    selector: 'button',
    byPoint: true,
  },
  {
    name: 'PinInput sm cell',
    render: () => h(PinInput, { length: 4, size: 'sm', 'aria-label': 'Code' }),
    selector: 'input',
    fineHeight: 36,
  },
  {
    name: 'PinInput md cell',
    render: () => h(PinInput, { length: 4, 'aria-label': 'Code' }),
    selector: 'input',
    fineHeight: 44,
  },
  {
    name: 'PhoneInput md',
    render: () => h(PhoneInput, { countries: ['UZ', 'KZ'], 'data-probe': 'phone' }),
    selector: '[data-probe=phone]',
    fineHeight: 40,
  },
  { name: 'SelectPickerItem row', render: () => trigger({}, true), selector: '[role=option]', byLayout: true },
  { name: 'MultiSelectPickerItem row', render: () => multiTrigger(true), selector: '[role=option]', byLayout: true },
  {
    name: 'ComboboxPickerItem row',
    render: () =>
      h(ComboboxPicker, { defaultOpen: true }, () => [
        h(ComboboxPickerInput, { 'aria-label': 'Country' }),
        h(ComboboxPickerContent, null, () => h(ComboboxPickerItem, { value: 'a', label: 'Alpha' }, () => 'Alpha')),
      ]),
    selector: '[role=option]',
    byLayout: true,
  },
];

/** The corners and the centre of the 44px square centred on `element`, where a tap should still land on it. */
function tapsLandOn(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  return [
    [0, 0],
    [-21, -21],
    [21, -21],
    [-21, 21],
    [21, 21],
  ].every(([dx, dy]) => element.contains(document.elementFromPoint(x + dx!, y + dy!)));
}

describe('form controls under a fine pointer', () => {
  it.each(Cases.filter((entry) => entry.fineHeight !== undefined))(
    'keeps $name at its own height',
    ({ render, selector, fineHeight }) => {
      mountControl(render);
      expect(Math.round(box(query(selector)).height)).toBe(fineHeight);
    },
  );

  it('keeps the tap area of a tag close button at its 16px box', () => {
    mountControl(() => h(Tag, { onClose: () => undefined }, () => 'Draft'));
    expect(tapsLandOn(query('button'))).toBe(false);
  });
});

describe.skipIf(!canEmulateCoarsePointer)('form controls under a coarse pointer', () => {
  beforeEach(async () => {
    await useCoarsePointer();
    expect(matchMedia('(pointer: coarse)').matches).toBe(true);
  });
  afterEach(async () => {
    await useFinePointer();
  });

  it.each(Cases)('gives $name a 44 x 44px hit area', async ({ render, selector, byLayout, byPoint }) => {
    mountControl(render);
    await expect.poll(() => document.querySelector(selector)).not.toBeNull();
    const element = query(selector);
    const size = box(element, byLayout);
    if (byPoint) {
      expect(tapsLandOn(element)).toBe(true);
      return;
    }
    /* A field shows its 44px; a button, a pill or a choice row reaches it through an invisible hit area. */
    const reach = reachOf(element);
    expect(Math.max(size.height, reach.height)).toBeGreaterThanOrEqual(43.5);
    expect(Math.max(size.width, reach.width)).toBeGreaterThanOrEqual(43.5);
  });

  it('keeps the select clear button clear of the value text and the chevron', () => {
    mountControl(() =>
      h(SelectPicker as Component, { defaultValue: 'a', isClearable: true }, () => [
        h(SelectPickerTrigger, { 'aria-label': 'Sort' }, () => h(SelectPickerValue)),
        h(SelectPickerContent, null, () =>
          h(SelectPickerItem, { itemKey: 'a', value: 'a', label: 'A very long label that cannot fit in the trigger' }),
        ),
      ]),
    );
    const field = query('button[aria-haspopup=listbox]').getBoundingClientRect();
    const clear = query('button:not([aria-haspopup])').getBoundingClientRect();
    const chevron = query('button[aria-haspopup=listbox] svg').getBoundingClientRect();
    const value = query('button[aria-haspopup=listbox] > span').getBoundingClientRect();
    expect(clear.height).toBeLessThanOrEqual(field.height);
    expect(clear.right).toBeLessThanOrEqual(chevron.left);
    expect(value.right).toBeLessThanOrEqual(clear.left);
  });

  it('keeps the typed text of a search field clear of its clear button', () => {
    mountControl(() => h(SearchInput, { defaultValue: 'abc', 'aria-label': 'Search posts' }));
    const field = query('input').getBoundingClientRect();
    const clear = query('button').getBoundingClientRect();
    const padding = parseFloat(getComputedStyle(query('input')).paddingRight);
    expect(field.right - padding).toBeLessThanOrEqual(clear.left);
    expect(clear.height).toBeLessThanOrEqual(field.height);
  });

  it('keeps the dense xs step of a search field at its own height', () => {
    mountControl(() => h(SearchInput, { size: 'xs', defaultValue: 'abc', 'aria-label': 'Search posts' }));
    expect(Math.round(query('input').getBoundingClientRect().height)).toBe(28);
    expect(Math.round(query('button').getBoundingClientRect().height)).toBe(32);
  });
});
