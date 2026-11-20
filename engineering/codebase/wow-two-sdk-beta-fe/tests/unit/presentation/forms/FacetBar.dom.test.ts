import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import { Star } from 'lucide-vue-next';
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

/** Two inline facets (one single, one multi) and two popover facets (one of each). */
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
];

interface Harness {
  readonly wrapper: VueWrapper;
  readonly selection: Ref<FacetSelection>;
  readonly search: Ref<string>;
  readonly matched: Ref<number | undefined>;
  readonly cleared: { count: number };
}

/** Mounts the bar behind real `v-model` state, as a consumer binds it. */
function mountBar(initial: FacetSelection = {}): Harness {
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
            facets: facets(),
            modelValue: selection.value,
            'onUpdate:modelValue': (next: FacetSelection) => (selection.value = next),
            search: search.value,
            'onUpdate:search': (next: string) => (search.value = next),
            matchCount: matched.value,
            totalCount: 72,
            onClear: () => (cleared.count += 1),
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
