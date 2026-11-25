import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import { Heart, Star } from 'lucide-vue-next';
import { LocaleProvider } from '@src/foundation/i18n';
import { ChipSelect, type ChipSelectOption } from '@src/presentation/forms';

type Value = string | ReadonlyArray<string> | null;

const wrappers: VueWrapper[] = [];
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'checkVisibility').mockReturnValue(true);
});
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  resizeCallbacks.length = 0;
});

async function settle(): Promise<void> {
  for (let tick = 0; tick < 4; tick += 1) await nextTick();
  const at = Date.now();
  while (Date.now() === at) await Promise.resolve();
}

/** Icons, an empty option, an option with no icon, one with no count, and one with a hint. */
const formatOptions = (): ChipSelectOption[] => [
  {
    value: 'conference',
    label: 'Conference',
    count: 9,
    icon: Star,
    hint: { description: 'Talks and panels over one or more days.' },
  },
  { value: 'fair', label: 'Fair', count: 0, icon: Heart },
  { value: 'expo', label: 'Expo', count: 3, icon: Star },
  { value: 'forum', label: 'Forum', count: 5 },
  { value: 'online', label: 'Online', icon: Heart },
];

const stageOptions = (): ChipSelectOption[] => [
  { value: 'open', label: 'Open', count: 5, icon: Star },
  { value: 'closed', label: 'Closed', count: 0 },
];

interface Harness {
  readonly wrapper: VueWrapper;
  readonly value: Ref<Value>;
}

/** Mounts a multiple select of the format options behind real `v-model` state, as a consumer binds it. */
function mountSelect(initial: Value = [], props: Readonly<Record<string, unknown>> = {}): Harness {
  const value = ref<Value>(initial);
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(ChipSelect, {
          options: formatOptions(),
          isMultiple: true,
          label: 'Format',
          modelValue: value.value,
          'onUpdate:modelValue': (next: Value) => (value.value = next),
          ...props,
        }),
    }),
    { attachTo: document.body },
  );
  wrappers.push(wrapper);
  return { wrapper, value };
}

/** Mounts a single select of the stage options. */
function mountSingle(initial: Value = null, props: Readonly<Record<string, unknown>> = {}): Harness {
  return mountSelect(initial, { options: stageOptions(), isMultiple: false, label: 'Stage', ...props });
}

function fieldOf(wrapper: VueWrapper): HTMLElement {
  return wrapper.get<HTMLElement>('[data-chip-select]').element;
}

/** The chips a field shows, `+N` included — never the off-screen row that measures them. */
function chipsOf(field: HTMLElement): HTMLElement[] {
  return [
    ...field.querySelectorAll<HTMLElement>(
      '[data-chip-select-chips] > [data-chip-select-chip], [data-chip-select-chips] > [data-chip-select-more]',
    ),
  ];
}

function chipNames(field: HTMLElement): Array<string | null> {
  return chipsOf(field).map((chip) =>
    chip.hasAttribute('data-chip-select-more')
      ? chip.textContent!.trim()
      : chip.getAttribute('aria-label') || chip.textContent!.trim(),
  );
}

function listbox(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role=listbox]');
}

function rows(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[role=option]')];
}

function row(label: string): HTMLElement {
  return rows().find((node) => node.textContent?.trim().startsWith(label))!;
}

function rowLabels(): Array<string | null> {
  return rows().map((node) => node.querySelector('.truncate')!.textContent);
}

/** Clicks the field as a pointer does, which reports a click count, unlike a keyboard activation or `click()`. */
async function openField(field: HTMLElement): Promise<void> {
  field.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
  await settle();
}

/** Waits out the panel's exit, which the presence layer unmounts a frame or two after it closes. */
async function panelClosed(): Promise<void> {
  await vi.waitFor(() => expect(listbox()).toBeNull());
}

function press(target: Element, name: string): Promise<void> {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
  return settle();
}

describe('ChipSelect field', () => {
  it('renders one combobox button, never pills', () => {
    const { wrapper } = mountSelect();
    const field = fieldOf(wrapper);
    expect(field.tagName).toBe('BUTTON');
    expect(field.getAttribute('role')).toBe('combobox');
    expect(field.getAttribute('aria-haspopup')).toBe('listbox');
    expect(field.getAttribute('aria-expanded')).toBe('false');
    expect(wrapper.find('[aria-pressed]').exists()).toBe(false);
    expect(wrapper.findAll('button')).toHaveLength(1);
  });

  it('shows the placeholder until something is chosen, and the label when there is no placeholder', async () => {
    const { wrapper, value } = mountSelect([], { placeholder: 'Any format' });
    expect(fieldOf(wrapper).querySelector('[data-chip-select-placeholder]')!.textContent!.trim()).toBe('Any format');
    expect(chipsOf(fieldOf(wrapper))).toHaveLength(0);

    await openField(fieldOf(wrapper));
    row('Conference').click();
    await settle();
    expect(value.value).toEqual(['conference']);
    expect(fieldOf(wrapper).querySelector('[data-chip-select-placeholder]')).toBeNull();
    expect(chipsOf(fieldOf(wrapper))).toHaveLength(1);

    const { wrapper: labelled } = mountSelect([]);
    expect(labelled.get('[data-chip-select-placeholder]').text()).toBe('Format');
  });

  it('names each icon-only chip and gives a chip without a hint a native title', () => {
    const { wrapper } = mountSelect(['expo', 'conference']);
    const chips = chipsOf(fieldOf(wrapper));
    expect(chips.map((chip) => chip.getAttribute('aria-label'))).toEqual(['Conference', 'Expo']);
    expect(chips.map((chip) => chip.getAttribute('title'))).toEqual([null, 'Expo']);
    for (const chip of chips) {
      expect(chip.getAttribute('role')).toBe('img');
      expect(chip.querySelector('svg')).not.toBeNull();
      expect(chip.textContent!.trim()).toBe('');
    }
  });

  it('shows the label as text on the chip of an option with no icon', () => {
    const { wrapper } = mountSelect(['forum']);
    const [chip] = chipsOf(fieldOf(wrapper));
    expect(chip!.textContent!.trim()).toBe('Forum');
    expect(chip!.getAttribute('title')).toBe('Forum');
    expect(chip!.querySelector('svg')).toBeNull();
  });

  it('mutes the chip of a chosen option whose count is 0, and no other', () => {
    const { wrapper } = mountSelect(['conference', 'fair', 'forum']);
    const chips = chipsOf(fieldOf(wrapper));
    expect(chips.map((chip) => chip.hasAttribute('data-empty'))).toEqual([false, true, false]);
    expect(chips[1]!.classList.contains('data-[empty]:opacity-60')).toBe(true);
  });

  it('names the field by its label and a summary of what is chosen', async () => {
    const { wrapper, value } = mountSelect();
    expect(fieldOf(wrapper).getAttribute('aria-label')).toBe('Format: Any');
    value.value = ['conference'];
    await settle();
    expect(fieldOf(wrapper).getAttribute('aria-label')).toBe('Format: Conference');
    value.value = ['conference', 'expo'];
    await settle();
    expect(fieldOf(wrapper).getAttribute('aria-label')).toBe('Format: Conference and Expo');
    value.value = ['conference', 'fair', 'expo', 'forum'];
    await settle();
    expect(fieldOf(wrapper).getAttribute('aria-label')).toBe('Format: 4 selected');
  });

  it('names the field from the placeholder without a label, and from the choice alone without either', () => {
    expect(
      fieldOf(mountSelect(['expo'], { label: undefined, placeholder: 'Kind' }).wrapper).getAttribute('aria-label'),
    ).toBe('Kind: Expo');
    expect(fieldOf(mountSelect(['expo'], { label: undefined }).wrapper).getAttribute('aria-label')).toBe('Expo');
  });

  it('writes the selected-count and Any texts from the props, or from the locale when omitted', async () => {
    const { wrapper } = mountSelect(['conference', 'fair', 'expo', 'forum'], { selectedLabel: '{count} chosen' });
    expect(fieldOf(wrapper).getAttribute('aria-label')).toBe('Format: 4 chosen');
    wrapper.unmount();
    wrappers.pop();
    document.body.innerHTML = '';

    const localized = mount(
      defineComponent({
        render: () =>
          h(LocaleProvider, { messages: { 'ChipSelect.anyLabel': 'Hammasi' } }, () =>
            h(ChipSelect, { options: stageOptions(), label: 'Stage' }),
          ),
      }),
      { attachTo: document.body },
    );
    wrappers.push(localized);
    expect(fieldOf(localized).getAttribute('aria-label')).toBe('Stage: Hammasi');
  });

  it('lets class and attributes reach the field button, and disables it', async () => {
    const { wrapper } = mountSelect([], { class: 'w-40', 'data-probe': 'x', isDisabled: true });
    const field = fieldOf(wrapper);
    expect(field.classList.contains('w-40')).toBe(true);
    expect(field.classList.contains('w-72')).toBe(false);
    expect(field.getAttribute('data-probe')).toBe('x');
    expect(field.hasAttribute('disabled')).toBe(true);
    await openField(field);
    expect(listbox()).toBeNull();
  });
});

/** The `ResizeObserver` callbacks the last mount registered, so a test can resize the field and report it. */
const resizeCallbacks: Array<(entries: ResizeObserverEntry[]) => void> = [];

/**
 * Lays the field out without a layout engine: the chip strip is `strip.value` px wide and every chip of the off-screen
 * measuring row `chip` px wide, with no gap.
 */
function stubLayout(strip: { value: number }, chip = 28): void {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: (entries: ResizeObserverEntry[]) => void) {
        resizeCallbacks.push(callback);
      }
      observe(): void {}
      disconnect(): void {}
    },
  );
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const width = this.hasAttribute('data-chip-select-chips')
      ? strip.value
      : this.parentElement?.hasAttribute('data-chip-select-probe')
        ? chip
        : 0;
    return { width, height: 0, top: 0, left: 0, right: width, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  });
}

function resize(): Promise<void> {
  for (const callback of resizeCallbacks) callback([{} as ResizeObserverEntry]);
  return settle();
}

describe('ChipSelect overflow', () => {
  const everyKind = ['conference', 'fair', 'expo', 'forum', 'online'];

  it('replaces the chips that do not fit with one +N chip named by how many are hidden', async () => {
    stubLayout({ value: 100 });
    const { wrapper } = mountSelect(everyKind);
    await settle();
    const chips = chipsOf(fieldOf(wrapper));
    expect(chipNames(fieldOf(wrapper))).toEqual(['Conference', 'Fair', '+3']);
    const more = chips.at(-1)!;
    expect(more.hasAttribute('data-chip-select-more')).toBe(true);
    expect(more.getAttribute('aria-label')).toBe('3 more selected');
    expect(more.getAttribute('role')).toBe('img');
  });

  it('shows every chip and no +N while the field is wide enough', async () => {
    stubLayout({ value: 400 });
    const { wrapper } = mountSelect(everyKind);
    await settle();
    const chips = chipsOf(fieldOf(wrapper));
    expect(chips).toHaveLength(5);
    expect(chips.some((chip) => chip.hasAttribute('data-chip-select-more'))).toBe(false);
  });

  it('shows every chip when nothing can be measured, as on the server', async () => {
    const { wrapper } = mountSelect(everyKind);
    await settle();
    expect(chipsOf(fieldOf(wrapper))).toHaveLength(5);
  });

  it('follows the field as it resizes, with no fixed count', async () => {
    const strip = { value: 400 };
    stubLayout(strip);
    const { wrapper } = mountSelect(everyKind);
    await settle();
    expect(chipsOf(fieldOf(wrapper))).toHaveLength(5);

    strip.value = 100;
    await resize();
    expect(chipsOf(fieldOf(wrapper))).toHaveLength(3);

    strip.value = 64;
    await resize();
    expect(chipNames(fieldOf(wrapper))).toEqual(['Conference', '+4']);

    strip.value = 20;
    await resize();
    expect(chipNames(fieldOf(wrapper))).toEqual(['+5']);
    expect(chipsOf(fieldOf(wrapper))[0]!.getAttribute('aria-label')).toBe('5 more selected');

    strip.value = 400;
    await resize();
    expect(chipsOf(fieldOf(wrapper))).toHaveLength(5);
  });

  it('measures again when the selection changes', async () => {
    stubLayout({ value: 100 });
    const { wrapper, value } = mountSelect(['conference', 'fair']);
    await settle();
    expect(chipsOf(fieldOf(wrapper))).toHaveLength(2);

    value.value = ['conference', 'fair', 'expo', 'forum'];
    await settle();
    expect(chipNames(fieldOf(wrapper))).toEqual(['Conference', 'Fair', '+2']);
  });

  it('names the +N chip from moreLabel, or from the locale when the prop is omitted', async () => {
    stubLayout({ value: 100 });
    const { wrapper } = mountSelect(everyKind, { moreLabel: '{count} more' });
    await settle();
    expect(chipsOf(fieldOf(wrapper)).at(-1)!.getAttribute('aria-label')).toBe('3 more');
    wrapper.unmount();
    wrappers.pop();
    document.body.innerHTML = '';

    const localized = mount(
      defineComponent({
        render: () =>
          h(LocaleProvider, { messages: { 'ChipSelect.moreLabel': '{count} ta yana' } }, () =>
            h(ChipSelect, { options: formatOptions(), isMultiple: true, modelValue: everyKind }),
          ),
      }),
      { attachTo: document.body },
    );
    wrappers.push(localized);
    await settle();
    expect(chipsOf(fieldOf(localized)).at(-1)!.getAttribute('aria-label')).toBe('3 ta yana');
  });
});

describe('ChipSelect panel', () => {
  it('opens a listbox of every option in order, with its icon, label and count', async () => {
    const { wrapper } = mountSelect();
    expect(listbox()).toBeNull();
    await openField(fieldOf(wrapper));
    expect(fieldOf(wrapper).getAttribute('aria-expanded')).toBe('true');
    expect(fieldOf(wrapper).getAttribute('aria-controls')).toBe(listbox()!.id);
    expect(listbox()!.getAttribute('aria-label')).toBe('Format');

    expect(listbox()!.getAttribute('aria-multiselectable')).toBe('true');
    expect(rows().map((node) => node.getAttribute('role'))).toEqual(Array(5).fill('option'));
    expect(rowLabels()).toEqual(['Conference', 'Fair', 'Expo', 'Forum', 'Online']);
    const counts = rows().map((node) => node.querySelector('[data-chip-select-count]')?.textContent?.trim() ?? null);
    expect(counts).toEqual(['9', '0', '3', '5', null]);
    expect(rows().map((node) => node.querySelector('svg:not([data-chip-select-check])') !== null)).toEqual([
      true,
      true,
      true,
      false,
      true,
    ]);
    const count = rows()[0]!.querySelector('[data-chip-select-count]')!;
    expect(count.classList.contains('tabular-nums')).toBe(true);
    expect(count.classList.contains('text-muted-foreground')).toBe(true);
  });

  it('formats a count in the reader locale', async () => {
    const { wrapper } = mountSelect([], { options: [{ value: 'a', label: 'A', count: 12000 }] });
    await openField(fieldOf(wrapper));
    expect(row('A').querySelector('[data-chip-select-count]')!.textContent!.trim()).toBe('12,000');
  });

  it('marks a chosen option aria-selected with a check mark', async () => {
    const { wrapper } = mountSelect(['expo']);
    await openField(fieldOf(wrapper));
    expect(rows().map((node) => node.getAttribute('aria-selected'))).toEqual([
      'false',
      'false',
      'true',
      'false',
      'false',
    ]);
    expect(rows().map((node) => node.querySelector('[data-chip-select-check]') !== null)).toEqual([
      false,
      false,
      true,
      false,
      false,
    ]);
  });

  it('mutes an unchosen option whose count is exactly 0 with data-empty, and keeps it selectable', async () => {
    const { wrapper, value } = mountSelect();
    await openField(fieldOf(wrapper));
    expect(rows().map((node) => node.hasAttribute('data-empty'))).toEqual([false, true, false, false, false]);
    expect(row('Fair').classList.contains('data-[empty]:opacity-60')).toBe(true);
    expect(row('Fair').getAttribute('aria-disabled')).toBeNull();

    row('Fair').click();
    await settle();
    expect(value.value).toEqual(['fair']);
    expect(row('Fair').hasAttribute('data-empty')).toBe(false);
    expect(row('Fair').getAttribute('aria-selected')).toBe('true');
  });

  it('toggles a multiple-select option per click, keeps the panel open and writes a string array', async () => {
    const { wrapper, value } = mountSelect();
    await openField(fieldOf(wrapper));
    row('Conference').click();
    await settle();
    row('Expo').click();
    await settle();
    expect(listbox()).not.toBeNull();
    expect(value.value).toEqual(['conference', 'expo']);
    expect(chipNames(fieldOf(wrapper))).toEqual(['Conference', 'Expo']);

    row('Conference').click();
    await settle();
    expect(value.value).toEqual(['expo']);
    row('Expo').click();
    await settle();
    expect(value.value).toEqual([]);
    expect(listbox()).not.toBeNull();
  });

  it('picks one value of a single select, writes a string and closes, with an Any row that clears it', async () => {
    const { wrapper, value } = mountSingle();
    await openField(fieldOf(wrapper));
    expect(listbox()!.hasAttribute('aria-multiselectable')).toBe(false);
    expect(rowLabels()).toEqual(['Any', 'Open', 'Closed']);
    expect(row('Any').getAttribute('aria-selected')).toBe('true');

    row('Open').click();
    await settle();
    expect(value.value).toBe('open');
    await panelClosed();
    expect(fieldOf(wrapper).getAttribute('aria-expanded')).toBe('false');
    expect(chipNames(fieldOf(wrapper))).toEqual(['Open']);

    await openField(fieldOf(wrapper));
    expect(row('Open').getAttribute('aria-selected')).toBe('true');
    expect(row('Any').getAttribute('aria-selected')).toBe('false');
    row('Closed').click();
    await settle();
    expect(value.value).toBe('closed');
    expect(chipsOf(fieldOf(wrapper))[0]!.textContent!.trim()).toBe('Closed');

    await openField(fieldOf(wrapper));
    row('Any').click();
    await settle();
    expect(value.value).toBeNull();
    await panelClosed();
    expect(chipsOf(fieldOf(wrapper))).toHaveLength(0);
  });

  it('closes a single panel on a click of the chosen row and keeps the choice', async () => {
    const { wrapper, value } = mountSingle('open');
    await openField(fieldOf(wrapper));
    row('Open').click();
    await settle();
    await panelClosed();
    expect(value.value).toBe('open');
  });

  it('owns its choice when uncontrolled, starting from defaultValue', async () => {
    const wrapper = mount(ChipSelect, {
      props: { options: formatOptions(), isMultiple: true, label: 'Format', defaultValue: ['expo'] },
      attachTo: document.body,
    });
    wrappers.push(wrapper);
    expect(chipNames(fieldOf(wrapper))).toEqual(['Expo']);
    await openField(fieldOf(wrapper));
    row('Fair').click();
    await settle();
    expect(chipNames(fieldOf(wrapper))).toEqual(['Fair', 'Expo']);
    expect(wrapper.emitted('update:modelValue')).toEqual([[['expo', 'fair']]]);
  });
});

describe('ChipSelect keyboard', () => {
  it('opens on the arrow keys and moves focus into the listbox', async () => {
    const { wrapper } = mountSelect();
    fieldOf(wrapper).focus();
    await press(fieldOf(wrapper), 'ArrowDown');
    expect(listbox()).not.toBeNull();
    expect(fieldOf(wrapper).getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(listbox());
  });

  it('moves the active option with the arrow keys, Home and End', async () => {
    const { wrapper } = mountSelect();
    await openField(fieldOf(wrapper));
    const list = listbox()!;
    const active = () => rows().findIndex((node) => node.id === list.getAttribute('aria-activedescendant'));
    expect(active()).toBe(0);
    await press(list, 'ArrowDown');
    expect(active()).toBe(1);
    await press(list, 'ArrowDown');
    expect(active()).toBe(2);
    await press(list, 'ArrowUp');
    expect(active()).toBe(1);
    await press(list, 'End');
    expect(active()).toBe(4);
    await press(list, 'Home');
    expect(active()).toBe(0);
  });

  it('toggles the active option with Enter and Space and keeps a multiple panel open', async () => {
    const { wrapper, value } = mountSelect();
    await openField(fieldOf(wrapper));
    const list = listbox()!;
    await press(list, 'Enter');
    expect(value.value).toEqual(['conference']);
    await press(list, 'ArrowDown');
    await press(list, ' ');
    expect(value.value).toEqual(['conference', 'fair']);
    await press(list, ' ');
    expect(value.value).toEqual(['conference']);
    expect(listbox()).not.toBeNull();
  });

  it('picks with Enter in a single panel and closes it', async () => {
    const { wrapper, value } = mountSingle();
    await openField(fieldOf(wrapper));
    await press(listbox()!, 'ArrowDown');
    await press(listbox()!, 'Enter');
    expect(value.value).toBe('open');
    await panelClosed();

    await openField(fieldOf(wrapper));
    await press(listbox()!, 'Enter');
    expect(value.value).toBe('open');
    await panelClosed();
  });

  it('closes on Escape and returns focus to the field', async () => {
    const { wrapper } = mountSelect();
    fieldOf(wrapper).focus();
    await openField(fieldOf(wrapper));
    expect(document.activeElement).toBe(listbox());
    await press(listbox()!, 'Escape');
    await panelClosed();
    expect(document.activeElement).toBe(fieldOf(wrapper));
  });

  it('keeps focus inside the panel while it is open, as a modal popover does', async () => {
    const { wrapper } = mountSelect();
    await openField(fieldOf(wrapper));
    expect(document.querySelector('[data-chip-select-panel]')!.getAttribute('aria-modal')).toBe('true');
    expect(fieldOf(wrapper).closest('[inert]')).not.toBeNull();

    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    listbox()!.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(listbox());
  });
});

function hintCard(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role=tooltip] [data-chip-select-hint]');
}

describe('ChipSelect option hints', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  async function openPanel(wrapper: VueWrapper): Promise<void> {
    await openField(fieldOf(wrapper));
    await vi.advanceTimersByTimeAsync(0);
  }

  it('opens the option hint card on hover after hintOpenDelay', async () => {
    const { wrapper } = mountSelect([], { hintOpenDelay: 200 });
    await openPanel(wrapper);
    const conference = row('Conference');
    conference.dispatchEvent(new PointerEvent('pointerenter'));
    await vi.advanceTimersByTimeAsync(199);
    expect(document.querySelector('[role=tooltip]')).toBeNull();
    await vi.advanceTimersByTimeAsync(1);

    const card = hintCard()!;
    expect(card).not.toBeNull();
    expect(card.querySelector('[data-chip-select-hint-label]')!.textContent).toBe('Conference');
    expect(card.querySelector('[data-chip-select-hint-description]')!.textContent).toBe(
      'Talks and panels over one or more days.',
    );
    expect(card.querySelector('[data-chip-select-hint-count]')!.textContent!.trim()).toBe('9');
    expect(card.querySelector('[data-chip-select-hint-icon]')).not.toBeNull();
    expect(conference.getAttribute('aria-describedby')).toBe(document.querySelector('[role=tooltip]')!.id);

    conference.dispatchEvent(new PointerEvent('pointerleave'));
    await vi.advanceTimersByTimeAsync(200);
    expect(document.querySelector('[role=tooltip]')).toBeNull();
  });

  it('shows the image instead of the icon, with its alt text, and leaves the count line out without a count', async () => {
    const options: ChipSelectOption[] = [
      {
        value: 'fair',
        label: 'Fair',
        count: 0,
        icon: Heart,
        hint: { description: 'Stalls.', imageSrc: '/fair.png', imageAlt: 'A fair stall' },
      },
      { value: 'forum', label: 'Forum', hint: { description: 'Open discussions.' } },
    ];
    const { wrapper } = mountSelect([], { options, hintOpenDelay: 0 });
    await openPanel(wrapper);
    row('Fair').dispatchEvent(new PointerEvent('pointerenter'));
    await vi.advanceTimersByTimeAsync(0);
    const image = hintCard()!.querySelector('img')!;
    expect(image.getAttribute('src')).toBe('/fair.png');
    expect(image.getAttribute('alt')).toBe('A fair stall');
    expect(hintCard()!.querySelector('[data-chip-select-hint-icon]')).toBeNull();
    expect(hintCard()!.querySelector('[data-chip-select-hint-count]')!.textContent!.trim()).toBe('0');

    row('Fair').dispatchEvent(new PointerEvent('pointerleave'));
    await vi.advanceTimersByTimeAsync(0);
    row('Forum').dispatchEvent(new PointerEvent('pointerenter'));
    await vi.advanceTimersByTimeAsync(0);
    expect(hintCard()!.querySelector('[data-chip-select-hint-count]')).toBeNull();
  });

  it('opens the card of the option the keyboard moves to, and closes it when the keyboard moves on', async () => {
    const { wrapper } = mountSelect([], { hintOpenDelay: 100 });
    fieldOf(wrapper).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    await vi.advanceTimersByTimeAsync(0);
    await settle();
    // The first option is active when the panel opens by keyboard, and it has a hint.
    await vi.advanceTimersByTimeAsync(100);
    expect(hintCard()).not.toBeNull();
    expect(hintCard()!.querySelector('[data-chip-select-hint-label]')!.textContent).toBe('Conference');

    listbox()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    await vi.advanceTimersByTimeAsync(0);
    await settle();
    await vi.advanceTimersByTimeAsync(200);
    expect(document.querySelector('[role=tooltip]')).toBeNull();
    await vi.advanceTimersByTimeAsync(5000);
    expect(document.querySelector('[role=tooltip]')).toBeNull();
  });

  it('gives an option without a hint no tooltip and no extra DOM', async () => {
    const { wrapper } = mountSelect([], { hintOpenDelay: 0 });
    await openPanel(wrapper);
    const expo = row('Expo');
    expo.dispatchEvent(new PointerEvent('pointerenter'));
    await vi.advanceTimersByTimeAsync(5000);
    expect(document.querySelector('[role=tooltip]')).toBeNull();
    expect(expo.getAttribute('aria-describedby')).toBeNull();
    expect(expo.parentElement).toBe(listbox());
  });

  it('opens at the tooltip default of 350 ms and writes the count line from hintCountLabel', async () => {
    const { wrapper } = mountSelect([], { hintCountLabel: '{count} shows' });
    await openPanel(wrapper);
    row('Conference').dispatchEvent(new PointerEvent('pointerenter'));
    await vi.advanceTimersByTimeAsync(349);
    expect(document.querySelector('[role=tooltip]')).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    expect(hintCard()!.querySelector('[data-chip-select-hint-count]')!.textContent!.trim()).toBe('9 shows');
    expect(document.querySelector<HTMLElement>('[role=tooltip]')!.style.transition).toBe('opacity 200ms ease-out');
  });

  it('fades the card over hintFadeDuration, keeping it mounted while it fades out', async () => {
    const { wrapper } = mountSelect([], { hintOpenDelay: 0, hintFadeDuration: 250 });
    await openPanel(wrapper);
    const conference = row('Conference');
    conference.dispatchEvent(new PointerEvent('pointerenter'));
    await vi.advanceTimersByTimeAsync(0);
    const body = document.querySelector<HTMLElement>('[role=tooltip]')!;
    expect(body.style.transition).toBe('opacity 250ms ease-out');

    conference.dispatchEvent(new PointerEvent('pointerleave'));
    await vi.advanceTimersByTimeAsync(100);
    expect(document.querySelector('[role=tooltip]')).toBe(body);
    await vi.advanceTimersByTimeAsync(200);
    expect(document.querySelector('[role=tooltip]')).toBeNull();
  });

  it('opens the selected chip’s hint after the delay and dismisses it when the panel opens', async () => {
    const { wrapper } = mountSelect(['conference'], { hintOpenDelay: 200 });
    const field = fieldOf(wrapper);
    field.dispatchEvent(new PointerEvent('pointerenter'));
    field.dispatchEvent(new FocusEvent('focus'));
    await vi.advanceTimersByTimeAsync(200);
    expect(hintCard()).toBeNull();

    const [chip] = chipsOf(field);
    chip!.dispatchEvent(new PointerEvent('pointerenter'));
    await vi.advanceTimersByTimeAsync(199);
    expect(hintCard()).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    expect(hintCard()!.querySelector('[data-chip-select-hint-label]')!.textContent).toBe('Conference');

    await openPanel(wrapper);
    expect(listbox()).not.toBeNull();
    await vi.advanceTimersByTimeAsync(200);
    expect(hintCard()).toBeNull();
  });

  it('lets a parent replace just the chip hint while the row uses the default card', async () => {
    const wrapper = mount(ChipSelect, {
      attachTo: document.body,
      props: {
        options: formatOptions(),
        defaultValue: ['conference'],
        isMultiple: true,
        hintOpenDelay: 0,
      },
      slots: {
        hint: ({ option, surface }: { option: ChipSelectOption; surface: 'chip' | 'row' }) =>
          surface === 'chip' ? h('span', `${option.label} chip hint`) : [],
      },
    });
    wrappers.push(wrapper);
    await settle();

    const [chip] = chipsOf(fieldOf(wrapper));
    chip!.dispatchEvent(new PointerEvent('pointerenter'));
    await vi.advanceTimersByTimeAsync(0);
    expect(document.querySelector('[role=tooltip]')?.textContent).toBe('Conference chip hint');

    await openPanel(wrapper);
    row('Conference').dispatchEvent(new PointerEvent('pointerenter'));
    await vi.advanceTimersByTimeAsync(0);
    expect(hintCard()?.querySelector('[data-chip-select-hint-description]')?.textContent).toBe(
      'Talks and panels over one or more days.',
    );
  });
});
