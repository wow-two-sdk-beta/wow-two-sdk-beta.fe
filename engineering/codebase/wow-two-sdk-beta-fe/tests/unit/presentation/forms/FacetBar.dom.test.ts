import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import { Star } from 'lucide-vue-next';
import { LocaleProvider } from '@src/foundation/i18n';
import { FacetBar, type FacetDefinition, type FacetSelection } from '@src/presentation/forms';

const wrappers: VueWrapper[] = [];
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'checkVisibility').mockReturnValue(true);
});
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function settle(): Promise<void> {
  for (let tick = 0; tick < 4; tick += 1) await nextTick();
  const at = Date.now();
  while (Date.now() === at) await Promise.resolve();
}

const stageCounts = ref({ open: 5, closed: 2 });

/** Two inline facets (one single, one multi), two popover facets (one of each), and a toggle of each placement. */
const facets = (): FacetDefinition[] => [
  {
    key: 'stage',
    label: 'Stage',
    kind: 'single',
    placement: 'inline',
    options: [
      { value: 'open', label: 'Open', count: stageCounts.value.open, icon: Star },
      { value: 'closed', label: 'Closed', count: stageCounts.value.closed },
    ],
  },
  {
    key: 'scope',
    label: 'Scope',
    kind: 'multi',
    placement: 'inline',
    options: [
      { value: 'uz', label: 'Uzbekistan', count: 40 },
      { value: 'kz', label: 'Kazakhstan', count: 12 },
    ],
  },
  {
    key: 'kind',
    label: 'Format',
    kind: 'single',
    placement: 'popover',
    options: [
      { value: 'conference', label: 'Conference', count: 9 },
      { value: 'fair', label: 'Fair', count: 3 },
    ],
  },
  {
    key: 'city',
    label: 'City',
    kind: 'multi',
    placement: 'popover',
    options: [
      { value: 'tashkent', label: 'Tashkent', count: 20 },
      { value: 'samarkand', label: 'Samarkand', count: 6 },
    ],
  },
  { key: 'priority', label: 'High priority', kind: 'toggle', placement: 'inline', count: 4, icon: Star },
  { key: 'skipped', label: 'Show skipped, rejected', kind: 'toggle', placement: 'popover', count: 7 },
];

interface Harness {
  readonly wrapper: VueWrapper;
  readonly selection: Ref<FacetSelection>;
  readonly search: Ref<string>;
  readonly matched: Ref<number | undefined>;
  readonly cleared: { count: number };
}

interface BarOptions {
  /** The facets to mount instead of the default set. */
  readonly facets?: ReadonlyArray<FacetDefinition>;

  /** Extra props, such as the hint delay and fade. */
  readonly props?: Readonly<Record<string, unknown>>;
}

/** Mounts the bar behind real `v-model` state, as a consumer binds it. */
function mountBar(initial: FacetSelection = {}, options: BarOptions = {}): Harness {
  const selection = ref<FacetSelection>(initial);
  const search = ref('');
  const matched = ref<number | undefined>(12);
  const cleared = { count: 0 };
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          FacetBar,
          {
            facets: options.facets ?? facets(),
            modelValue: selection.value,
            'onUpdate:modelValue': (next: FacetSelection) => (selection.value = next),
            search: search.value,
            'onUpdate:search': (next: string) => (search.value = next),
            matchCount: matched.value,
            totalCount: 72,
            onClear: () => (cleared.count += 1),
            ...options.props,
          },
          { trailing: () => h('button', { type: 'button', 'data-add': '' }, 'Add') },
        ),
    }),
    { attachTo: document.body },
  );
  wrappers.push(wrapper);
  return { wrapper, selection, search, matched, cleared };
}

function chipRemovers(wrapper: VueWrapper): string[] {
  return wrapper.findAll('[data-facet-chips] button').map((button) => button.attributes('aria-label') ?? '');
}

async function openFilters(wrapper: VueWrapper): Promise<void> {
  await wrapper
    .findAll('button')
    .find((button) => button.text().startsWith('Filters'))!
    .trigger('click');
  await settle();
}

async function pickOption(label: string): Promise<void> {
  const option = [...document.querySelectorAll<HTMLElement>('[role=option]')].find((node) =>
    node.textContent?.includes(label),
  );
  option!.click();
  await settle();
}

describe('FacetBar inline facets', () => {
  it('renders a count after each chip label and updates it when the counts change', async () => {
    const { wrapper } = mountBar();
    const open = wrapper.get('[aria-label="Stage"] button');
    expect(open.attributes('aria-label')).toBe('Open 5');
    expect(open.get('[data-toggle-count]').text()).toBe('5');
    expect(open.find('svg').exists()).toBe(true);

    stageCounts.value = { open: 6, closed: 2 };
    await settle();
    const updated = wrapper.get('[aria-label="Stage"] button');
    expect(updated.get('[data-toggle-count]').text()).toBe('6');
    expect(updated.attributes('aria-label')).toBe('Open 6');
    stageCounts.value = { open: 5, closed: 2 };
  });

  it('stores a single facet as one value and a multi facet as a list, keyed by facet', async () => {
    const { wrapper, selection } = mountBar();
    await wrapper.get('[aria-label="Stage"] button').trigger('click');
    expect(selection.value).toEqual({ stage: 'open' });
    const [uz, kz] = wrapper.findAll('[aria-label="Scope"] button');
    await uz!.trigger('click');
    await kz!.trigger('click');
    expect(selection.value).toEqual({ stage: 'open', scope: ['uz', 'kz'] });
  });

  it('drops a facet key once its last value is unchosen', async () => {
    const { wrapper, selection } = mountBar({ stage: 'open', scope: ['uz'] });
    await wrapper.get('[aria-label="Stage"] button').trigger('click');
    expect(selection.value).toEqual({ scope: ['uz'] });
    await wrapper.get('[aria-label="Scope"] button').trigger('click');
    expect(selection.value).toEqual({});
  });
});

describe('FacetBar toggle facets', () => {
  it('renders an inline toggle as one pressable chip with its label and count, never a select', async () => {
    const { wrapper } = mountBar();
    const chip = wrapper.get('[data-facet-toggle]');
    expect(chip.element.tagName).toBe('BUTTON');
    expect(chip.attributes('aria-pressed')).toBe('false');
    expect(chip.attributes('aria-label')).toBe('High priority 4');
    expect(chip.get('[data-toggle-count]').text()).toBe('4');
    expect(chip.find('svg').exists()).toBe(true);
    expect(wrapper.find('[aria-label="High priority"][role=group]').exists()).toBe(false);
    expect(wrapper.find('select, [role=combobox]').exists()).toBe(false);
  });

  it('stores true when an inline toggle is pressed and drops the key when it is released', async () => {
    const { wrapper, selection } = mountBar();
    await wrapper.get('[data-facet-toggle]').trigger('click');
    expect(selection.value).toEqual({ priority: true });
    expect(wrapper.get('[data-facet-toggle]').attributes('aria-pressed')).toBe('true');
    expect(wrapper.find('[data-facet-chips]').exists()).toBe(false);
    expect(wrapper.find('[data-facet-clear-all]').exists()).toBe(true);

    await wrapper.get('[data-facet-toggle]').trigger('click');
    expect(selection.value).toEqual({});
    expect(wrapper.get('[data-facet-toggle]').attributes('aria-pressed')).toBe('false');
    expect(wrapper.find('[data-facet-clear-all]').exists()).toBe(false);
  });

  it('shows a pressed inline toggle from a bound selection', () => {
    const { wrapper } = mountBar({ priority: true, stage: 'open' });
    expect(wrapper.get('[data-facet-toggle]').attributes('aria-pressed')).toBe('true');
  });

  it('renders a popover toggle as a switch row, not a select, and turns it into a removable chip', async () => {
    const { wrapper, selection } = mountBar();
    await openFilters(wrapper);
    const row = document.querySelector<HTMLElement>('[data-facet-toggle-row]')!;
    expect(row.textContent).toContain('Show skipped, rejected');
    expect(row.querySelector('[data-facet-option-count]')!.textContent).toBe('7');
    const switchInput = row.querySelector<HTMLInputElement>('input[role=switch]')!;
    expect(switchInput.getAttribute('aria-label')).toBe('Show skipped, rejected');
    expect(switchInput.checked).toBe(false);
    expect(row.querySelector('[role=combobox], select, button')).toBeNull();
    // The two choice facets keep their select triggers.
    expect(document.querySelector('button[aria-label="Format"]')).not.toBeNull();

    switchInput.click();
    await settle();
    expect(selection.value).toEqual({ skipped: true });
    expect(chipRemovers(wrapper)).toEqual(['Remove Show skipped, rejected']);
    expect(wrapper.get('[data-facet-chips]').text()).toBe('Show skipped, rejected');
    expect(wrapper.get('[data-facet-filters-count]').text()).toBe('1');
    expect(document.querySelector<HTMLInputElement>('input[role=switch]')!.checked).toBe(true);

    await wrapper.get('[data-facet-chips] button').trigger('click');
    expect(selection.value).toEqual({});
    expect(wrapper.find('[data-facet-chips]').exists()).toBe(false);
    expect(wrapper.find('[data-facet-filters-count]').exists()).toBe(false);
    expect(document.querySelector<HTMLInputElement>('input[role=switch]')!.checked).toBe(false);
  });

  it('turns a popover toggle off through its switch and counts it with the other popover chips', async () => {
    const { wrapper, selection } = mountBar({ skipped: true, city: ['tashkent'] });
    expect(chipRemovers(wrapper)).toEqual(['Remove City: Tashkent', 'Remove Show skipped, rejected']);
    expect(wrapper.get('[data-facet-filters-count]').text()).toBe('2');

    await openFilters(wrapper);
    document.querySelector<HTMLInputElement>('input[role=switch]')!.click();
    await settle();
    expect(selection.value).toEqual({ city: ['tashkent'] });
    expect(chipRemovers(wrapper)).toEqual(['Remove City: Tashkent']);
  });

  it('clears toggles along with every other choice', async () => {
    const { wrapper, selection } = mountBar({ priority: true, skipped: true });
    await wrapper.get('[data-facet-clear-all]').trigger('click');
    expect(selection.value).toEqual({});
    expect(wrapper.get('[data-facet-toggle]').attributes('aria-pressed')).toBe('false');
  });
});

describe('FacetBar popover facets', () => {
  it('turns a popover choice into a removable chip, and removing the chip clears the choice', async () => {
    const { wrapper, selection } = mountBar();
    expect(chipRemovers(wrapper)).toEqual([]);

    await openFilters(wrapper);
    document.querySelector<HTMLElement>('button[aria-label="Format"]')!.click();
    await settle();
    await pickOption('Conference');

    expect(selection.value).toEqual({ kind: 'conference' });
    expect(wrapper.get('[data-facet-chips]').text()).toContain('Format: Conference');
    expect(chipRemovers(wrapper)).toEqual(['Remove Format: Conference']);
    expect(wrapper.get('[data-facet-filters-count]').text()).toBe('1');

    await wrapper.get('[data-facet-chips] button').trigger('click');
    expect(selection.value).toEqual({});
    expect(wrapper.find('[data-facet-chips]').exists()).toBe(false);
    expect(wrapper.find('[data-facet-filters-count]').exists()).toBe(false);
  });

  it('shows one chip per value of a multi popover facet and removes them one at a time', async () => {
    const { wrapper, selection } = mountBar({ city: ['tashkent', 'samarkand'] });
    expect(chipRemovers(wrapper)).toEqual(['Remove City: Tashkent', 'Remove City: Samarkand']);

    await wrapper.findAll('[data-facet-chips] button')[0]!.trigger('click');
    expect(selection.value).toEqual({ city: ['samarkand'] });
    expect(chipRemovers(wrapper)).toEqual(['Remove City: Samarkand']);
  });

  it('adds a value to a multi popover facet through its picker', async () => {
    const { wrapper, selection } = mountBar();
    await openFilters(wrapper);
    document.querySelector<HTMLElement>('button[aria-label="City"]')!.click();
    await settle();
    await pickOption('Samarkand');
    expect(selection.value).toEqual({ city: ['samarkand'] });
    expect(chipRemovers(wrapper)).toEqual(['Remove City: Samarkand']);
  });
});

describe('FacetBar match count', () => {
  it('reads "12 of 72" in a polite live region and updates in place', async () => {
    const { wrapper, matched } = mountBar();
    const region = wrapper.get('[data-facet-match]');
    expect(region.attributes('aria-live')).toBe('polite');
    expect(region.attributes('aria-atomic')).toBe('true');
    expect(region.text()).toBe('12 of 72');

    matched.value = 1;
    await nextTick();
    expect(wrapper.get('[data-facet-match]').element).toBe(region.element);
    expect(region.text()).toBe('1 of 72');
  });

  it('keeps the live region mounted, empty, while no count is given', async () => {
    const { wrapper, matched } = mountBar();
    matched.value = undefined;
    await nextTick();
    const region = wrapper.get('[data-facet-match]');
    expect(region.attributes('aria-live')).toBe('polite');
    expect(region.text()).toBe('');
  });
});

describe('FacetBar search and clear all', () => {
  it('binds the search text and clears every choice with the search', async () => {
    const { wrapper, selection, search, cleared } = mountBar();
    expect(wrapper.find('[data-facet-clear-all]').exists()).toBe(false);

    const input = wrapper.get('input[type=search]');
    expect(input.attributes('aria-label')).toBe('Search');
    await input.setValue('tashkent');
    expect(search.value).toBe('tashkent');

    await wrapper.get('[aria-label="Stage"] button').trigger('click');
    expect(selection.value).toEqual({ stage: 'open' });

    await wrapper.get('[data-facet-clear-all]').trigger('click');
    expect(selection.value).toEqual({});
    expect(search.value).toBe('');
    expect(cleared.count).toBe(1);
    expect(wrapper.find('[data-facet-clear-all]').exists()).toBe(false);
  });

  it('shows the trailing slot after the facets', () => {
    const { wrapper } = mountBar();
    expect(wrapper.get('[data-add]').text()).toBe('Add');
  });
});

/** An inline `single` facet of hinted and unhinted options, an empty one among them, and an inline `multi` facet. */
const hintedFacets = (): FacetDefinition[] => [
  {
    key: 'format',
    label: 'Format',
    kind: 'single',
    placement: 'inline',
    options: [
      {
        value: 'conference',
        label: 'Conference',
        count: 9,
        icon: Star,
        hint: { description: 'Talks and panels over one or more days.' },
      },
      {
        value: 'fair',
        label: 'Fair',
        count: 0,
        hint: { description: 'Stalls where makers sell to visitors.', imageSrc: '/fair.png', imageAlt: 'A fair stall' },
      },
      { value: 'expo', label: 'Expo', count: 3 },
      { value: 'online', label: 'Online', count: 0 },
      { value: 'other', label: 'Other' },
      { value: 'forum', label: 'Forum', hint: { description: 'Open discussions with no ticket.' } },
    ],
  },
  {
    key: 'city',
    label: 'City',
    kind: 'multi',
    placement: 'inline',
    options: [
      { value: 'tashkent', label: 'Tashkent', count: 0 },
      { value: 'samarkand', label: 'Samarkand', count: 4 },
    ],
  },
];

function pill(wrapper: VueWrapper, group: string, name: string): ReturnType<VueWrapper['get']> {
  return wrapper.get(`[aria-label="${group}"] button[aria-label^="${name}"]`);
}

function hintCard(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role=tooltip] [data-facet-hint]');
}

describe('FacetBar option hints', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens a mini card with the icon, label, description and count line after the open delay', async () => {
    const { wrapper } = mountBar({}, { facets: hintedFacets(), props: { hintOpenDelay: 200 } });
    const conference = pill(wrapper, 'Format', 'Conference');

    await conference.trigger('pointerenter');
    await vi.advanceTimersByTimeAsync(199);
    expect(document.querySelector('[role=tooltip]')).toBeNull();
    await vi.advanceTimersByTimeAsync(1);

    const card = hintCard()!;
    expect(card).not.toBeNull();
    expect(card.querySelector('[data-facet-hint-label]')!.textContent).toBe('Conference');
    expect(card.querySelector('[data-facet-hint-description]')!.textContent).toBe(
      'Talks and panels over one or more days.',
    );
    expect(card.querySelector('[data-facet-hint-count]')!.textContent!.trim()).toBe('9 events');
    expect(card.querySelector('[data-facet-hint-icon]')).not.toBeNull();
    expect(card.querySelector('img')).toBeNull();
    expect(conference.attributes('aria-describedby')).toBe(document.querySelector('[role=tooltip]')!.id);

    await conference.trigger('pointerleave');
    await vi.advanceTimersByTimeAsync(0);
    expect(document.querySelector('[role=tooltip]')).toBeNull();
  });

  it('shows the image instead of the icon, with its alt text, and the count of an empty option', async () => {
    const { wrapper } = mountBar({}, { facets: hintedFacets(), props: { hintOpenDelay: 0 } });
    await pill(wrapper, 'Format', 'Fair').trigger('pointerenter');
    await vi.advanceTimersByTimeAsync(0);

    const card = hintCard()!;
    const image = card.querySelector('img')!;
    expect(image.getAttribute('src')).toBe('/fair.png');
    expect(image.getAttribute('alt')).toBe('A fair stall');
    expect(card.querySelector('[data-facet-hint-icon]')).toBeNull();
    expect(card.querySelector('[data-facet-hint-count]')!.textContent!.trim()).toBe('0 events');
  });

  it('leaves the count line out when the option has no count', async () => {
    const { wrapper } = mountBar({}, { facets: hintedFacets(), props: { hintOpenDelay: 0 } });
    await pill(wrapper, 'Format', 'Forum').trigger('pointerenter');
    await vi.advanceTimersByTimeAsync(0);
    expect(hintCard()!.querySelector('[data-facet-hint-description]')!.textContent).toBe(
      'Open discussions with no ticket.',
    );
    expect(hintCard()!.querySelector('[data-facet-hint-count]')).toBeNull();
  });

  it('writes the count line from hintCountLabel, or from the locale when the prop is omitted', async () => {
    const { wrapper } = mountBar(
      {},
      { facets: hintedFacets(), props: { hintOpenDelay: 0, hintCountLabel: '{count} shows' } },
    );
    await pill(wrapper, 'Format', 'Conference').trigger('pointerenter');
    await vi.advanceTimersByTimeAsync(0);
    expect(hintCard()!.querySelector('[data-facet-hint-count]')!.textContent!.trim()).toBe('9 shows');
    wrapper.unmount();
    wrappers.pop();
    document.body.innerHTML = '';

    const localized = mount(
      defineComponent({
        render: () =>
          h(LocaleProvider, { messages: { 'FacetBar.hintCountLabel': '{count} ta tadbir' } }, () =>
            h(FacetBar, { facets: hintedFacets(), hintOpenDelay: 0 }),
          ),
      }),
      { attachTo: document.body },
    );
    wrappers.push(localized);
    await pill(localized, 'Format', 'Conference').trigger('pointerenter');
    await vi.advanceTimersByTimeAsync(0);
    expect(hintCard()!.querySelector('[data-facet-hint-count]')!.textContent!.trim()).toBe('9 ta tadbir');
  });

  it('gives an option without a hint no tooltip and no extra DOM', async () => {
    const { wrapper } = mountBar({}, { facets: hintedFacets(), props: { hintOpenDelay: 0 } });
    const expo = pill(wrapper, 'Format', 'Expo');
    await expo.trigger('pointerenter');
    await expo.trigger('focus');
    await vi.advanceTimersByTimeAsync(5000);
    expect(document.querySelector('[role=tooltip]')).toBeNull();
    expect(expo.attributes('aria-describedby')).toBeUndefined();

    // The whole second facet has no hints: its group holds only each chip's button and form-reset anchor, then its own.
    const group = wrapper.get('[aria-label="City"]').element;
    expect([...group.children].map((child) => child.tagName)).toEqual(['BUTTON', 'INPUT', 'BUTTON', 'INPUT', 'INPUT']);
    expect(document.querySelector('[data-portal-name]')).toBeNull();
  });

  it('opens by keyboard focus and closes on blur', async () => {
    const { wrapper } = mountBar({}, { facets: hintedFacets(), props: { hintOpenDelay: 100 } });
    const conference = pill(wrapper, 'Format', 'Conference');
    await conference.trigger('focus');
    await vi.advanceTimersByTimeAsync(100);
    expect(hintCard()).not.toBeNull();

    await conference.trigger('blur');
    await vi.advanceTimersByTimeAsync(0);
    expect(document.querySelector('[role=tooltip]')).toBeNull();
  });

  it('never blocks the tap that toggles the pill, before or after the card opens', async () => {
    const { wrapper, selection } = mountBar({}, { facets: hintedFacets(), props: { hintOpenDelay: 100 } });
    const conference = pill(wrapper, 'Format', 'Conference');

    // A touch tap: the pointer enters, the finger lifts and the pointer leaves before the card opens.
    await conference.trigger('pointerenter');
    await conference.trigger('pointerdown');
    await conference.trigger('click');
    await conference.trigger('pointerleave');
    await vi.advanceTimersByTimeAsync(500);
    expect(selection.value).toEqual({ format: 'conference' });
    expect(conference.attributes('aria-pressed')).toBe('true');
    expect(document.querySelector('[role=tooltip]')).toBeNull();

    // A tap on a pill whose card is open still toggles it.
    const forum = pill(wrapper, 'Format', 'Forum');
    await forum.trigger('focus');
    await vi.advanceTimersByTimeAsync(100);
    expect(hintCard()).not.toBeNull();
    await forum.trigger('click');
    expect(selection.value).toEqual({ format: 'forum' });
  });

  it('opens at the tooltip default of 700 ms without hintOpenDelay and shows no fade without hintFadeDuration', async () => {
    const { wrapper } = mountBar({}, { facets: hintedFacets() });
    const conference = pill(wrapper, 'Format', 'Conference');
    await conference.trigger('pointerenter');
    await vi.advanceTimersByTimeAsync(699);
    expect(document.querySelector('[role=tooltip]')).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    const body = document.querySelector<HTMLElement>('[role=tooltip]')!;
    expect(body).not.toBeNull();
    expect(body.hasAttribute('style')).toBe(false);

    await conference.trigger('pointerleave');
    await vi.advanceTimersByTimeAsync(0);
    expect(document.querySelector('[role=tooltip]')).toBeNull();
  });

  it('forwards hintOpenDelay to the tooltip', async () => {
    const { wrapper } = mountBar({}, { facets: hintedFacets(), props: { hintOpenDelay: 5000 } });
    await pill(wrapper, 'Format', 'Conference').trigger('pointerenter');
    await vi.advanceTimersByTimeAsync(4999);
    expect(document.querySelector('[role=tooltip]')).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    expect(hintCard()).not.toBeNull();
  });

  it('forwards hintFadeDuration to the tooltip, which keeps the card mounted while it fades out', async () => {
    const { wrapper } = mountBar({}, { facets: hintedFacets(), props: { hintOpenDelay: 0, hintFadeDuration: 250 } });
    const conference = pill(wrapper, 'Format', 'Conference');
    await conference.trigger('pointerenter');
    await vi.advanceTimersByTimeAsync(0);
    const body = document.querySelector<HTMLElement>('[role=tooltip]')!;
    expect(body.style.transition).toBe('opacity 250ms ease-out');
    expect(body.style.opacity).toBe('1');

    await conference.trigger('pointerleave');
    await vi.advanceTimersByTimeAsync(100);
    expect(document.querySelector('[role=tooltip]')).toBe(body);
    expect(body.style.opacity).toBe('0');
    await vi.advanceTimersByTimeAsync(200);
    expect(document.querySelector('[role=tooltip]')).toBeNull();
  });
});

describe('FacetBar empty chips', () => {
  it('mutes an unchosen chip whose count is exactly 0, in single and multi facets', () => {
    const { wrapper } = mountBar({}, { facets: hintedFacets() });
    expect(pill(wrapper, 'Format', 'Fair').attributes('data-empty')).toBeDefined();
    expect(pill(wrapper, 'Format', 'Online').attributes('data-empty')).toBeDefined();
    expect(pill(wrapper, 'City', 'Tashkent').attributes('data-empty')).toBeDefined();
    expect(pill(wrapper, 'Format', 'Fair').classes()).toEqual(
      expect.arrayContaining(['data-[empty]:text-muted-foreground', 'data-[empty]:opacity-60']),
    );
  });

  it('never mutes a chip with a positive count or no count', () => {
    const { wrapper } = mountBar({}, { facets: hintedFacets() });
    expect(pill(wrapper, 'Format', 'Conference').attributes('data-empty')).toBeUndefined();
    expect(pill(wrapper, 'Format', 'Expo').attributes('data-empty')).toBeUndefined();
    expect(pill(wrapper, 'Format', 'Other').attributes('data-empty')).toBeUndefined();
    expect(pill(wrapper, 'City', 'Samarkand').attributes('data-empty')).toBeUndefined();
  });

  it('keeps an empty chip pressable, and keeps its chosen style once chosen', async () => {
    const { wrapper, selection } = mountBar({}, { facets: hintedFacets() });
    await pill(wrapper, 'Format', 'Fair').trigger('click');
    expect(selection.value).toEqual({ format: 'fair' });
    expect(pill(wrapper, 'Format', 'Fair').attributes('aria-pressed')).toBe('true');
    expect(pill(wrapper, 'Format', 'Fair').attributes('data-empty')).toBeUndefined();

    await pill(wrapper, 'City', 'Tashkent').trigger('click');
    expect(selection.value).toEqual({ format: 'fair', city: ['tashkent'] });
    expect(pill(wrapper, 'City', 'Tashkent').attributes('data-empty')).toBeUndefined();

    // Releasing a chip mutes it again.
    await pill(wrapper, 'Format', 'Fair').trigger('click');
    expect(selection.value).toEqual({ city: ['tashkent'] });
    expect(pill(wrapper, 'Format', 'Fair').attributes('data-empty')).toBeDefined();
  });

  it('shows a chosen empty chip from a bound selection in its chosen style', () => {
    const { wrapper } = mountBar({ format: 'online', city: ['tashkent'] }, { facets: hintedFacets() });
    expect(pill(wrapper, 'Format', 'Online').attributes('data-empty')).toBeUndefined();
    expect(pill(wrapper, 'City', 'Tashkent').attributes('data-empty')).toBeUndefined();
  });
});
