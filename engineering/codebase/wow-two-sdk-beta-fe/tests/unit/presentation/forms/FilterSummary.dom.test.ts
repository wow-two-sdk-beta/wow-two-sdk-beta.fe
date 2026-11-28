import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { FilterSummary, FilterSummaryFiltersButton, type FilterSummaryProps } from '@src/presentation/forms';
import { Modal, ModalContent, ModalTrigger } from '@src/presentation/overlays';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
});

/** Vue drops an event stamped in the millisecond its listener attached (rules.md § Vue package 12). */
async function settle(): Promise<void> {
  const start = Date.now();
  while (Date.now() === start) await new Promise((resolve) => setTimeout(resolve, 1));
  await nextTick();
}

function render(props: Partial<FilterSummaryProps> = {}, attrs: Record<string, unknown> = {}): VueWrapper {
  const wrapper = mount(FilterSummary, {
    props: { matched: 12, total: 72, isFiltered: true, ...props },
    attrs,
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  return wrapper;
}

const filtersButton = (wrapper: VueWrapper) => wrapper.get('[data-filter-summary-filters]');
const clearButton = (wrapper: VueWrapper) => wrapper.get('[data-filter-summary-clear]');
const count = (wrapper: VueWrapper) => wrapper.get('[data-filter-summary-count]');

describe('FilterSummary', () => {
  it('lays out the filters button, the count and the clear button, left to right, in a labelled group', () => {
    const wrapper = render();
    const group = wrapper.get('[role="group"]');
    expect(group.attributes('aria-label')).toBe('Filter results');
    const order = [
      ...group.element.querySelectorAll(
        '[data-filter-summary-filters], [data-filter-summary-count], [data-filter-summary-clear]',
      ),
    ];
    expect(
      order.map((element) =>
        ['filterSummaryFilters', 'filterSummaryCount', 'filterSummaryClear'].find(
          (key) => key in (element as HTMLElement).dataset,
        ),
      ),
    ).toEqual(['filterSummaryFilters', 'filterSummaryCount', 'filterSummaryClear']);
    expect(filtersButton(wrapper).attributes('aria-label')).toBe('Filters');
    expect(clearButton(wrapper).attributes('aria-label')).toBe('Clear filters');
  });

  it('announces both count forms politely, the compact one hidden until a narrow container', () => {
    const wrapper = render({ matched: 1234, total: 10000 });
    const live = count(wrapper);
    expect(live.attributes('aria-live')).toBe('polite');
    expect(live.attributes('aria-atomic')).toBe('true');
    const [full, compact] = live.findAll(':scope > span > span');
    expect(full!.text()).toBe('1,234 out of 10,000');
    expect(compact!.text()).toBe('1,234 / 10,000');
    expect(full!.classes()).toContain('@max-[300px]:hidden');
    expect(compact!.classes()).toEqual(expect.arrayContaining(['hidden', '@max-[300px]:inline']));
    expect(live.classes()).toEqual(expect.arrayContaining(['text-sm', 'tabular-nums', 'whitespace-nowrap']));
  });

  it('disables clear without a filter and emits clear with one', async () => {
    const idle = render({ isFiltered: false });
    expect(clearButton(idle).attributes('disabled')).toBeDefined();
    await settle();
    await clearButton(idle).trigger('click');
    expect(idle.emitted('clear')).toBeUndefined();

    const filtered = render({ isFiltered: true });
    await settle();
    await clearButton(filtered).trigger('click');
    expect(filtered.emitted('clear')).toHaveLength(1);
  });

  it('emits open-filters from the default filters button', async () => {
    const wrapper = render();
    await settle();
    await filtersButton(wrapper).trigger('click');
    expect(wrapper.emitted('open-filters')).toHaveLength(1);
  });

  it('renders no filters button and no filters-trigger slot when hasFilters is false', () => {
    const wrapper = mount(
      {
        render: () =>
          h(
            FilterSummary,
            { matched: 3, total: 9, isFiltered: true, hasFilters: false },
            { 'filters-trigger': () => h('button', { 'data-app-trigger': '' }, 'Open') },
          ),
      },
      { attachTo: document.body },
    );
    wrappers.push(wrapper);
    expect(wrapper.find('[data-filter-summary-filters]').exists()).toBe(false);
    expect(wrapper.find('[data-app-trigger]').exists()).toBe(false);
    expect(wrapper.find('[data-filter-summary-count]').exists()).toBe(true);
    expect(wrapper.find('[data-filter-summary-clear]').exists()).toBe(true);
  });

  it('renders the actions slot between the count and the clear button, and nothing while it is empty', () => {
    const isOrHolds = (element: Element | null, selector: string) =>
      element !== null && (element.matches(selector) || element.querySelector(selector) !== null);
    const wrapper = mount(
      {
        render: () =>
          h(
            FilterSummary,
            { matched: 3, total: 9, isFiltered: true },
            { actions: () => h('button', { type: 'button', 'aria-label': 'Refresh posts', 'data-app-action': '' }) },
          ),
      },
      { attachTo: document.body },
    );
    wrappers.push(wrapper);
    const group = wrapper.get('[role="group"]');
    const order = [
      ...group.element.querySelectorAll(
        '[data-filter-summary-filters], [data-filter-summary-count], [data-app-action], [data-filter-summary-clear]',
      ),
    ].map((element) =>
      ['filterSummaryFilters', 'filterSummaryCount', 'appAction', 'filterSummaryClear'].find(
        (key) => key in (element as HTMLElement).dataset,
      ),
    );
    expect(order).toEqual(['filterSummaryFilters', 'filterSummaryCount', 'appAction', 'filterSummaryClear']);
    const action = count(wrapper).element.nextElementSibling;
    expect(isOrHolds(action, '[data-app-action]')).toBe(true);
    expect(isOrHolds(action!.nextElementSibling, '[data-filter-summary-clear]')).toBe(true);
    // An action sits 4px from clear, so the hit areas' width is capped and the two never share a tap.
    expect(group.classes()).toContain('[--coarse-hit-gap-x:6px]');

    const plain = render();
    const plainGroup = plain.get('[role="group"]');
    expect(isOrHolds(count(plain).element.nextElementSibling, '[data-filter-summary-clear]')).toBe(true);
    expect(plainGroup.element.childElementCount).toBe(group.element.childElementCount - 1);
    expect(plainGroup.classes()).not.toContain('[--coarse-hit-gap-x:6px]');
  });

  it('badges the filters button above 0 active filters and names the count', async () => {
    const wrapper = render({ activeFilterCount: 0 });
    expect(wrapper.find('[data-filter-summary-badge]').exists()).toBe(false);
    await wrapper.setProps({ activeFilterCount: 3 });
    const badge = wrapper.get('[data-filter-summary-badge]');
    expect(badge.text()).toBe('3');
    expect(badge.attributes('aria-hidden')).toBe('true');
    expect(badge.classes()).toContain('text-[10px]');
    expect(filtersButton(wrapper).attributes('aria-label')).toBe('Filters (3)');
    await wrapper.setProps({ activeFilterCount: 140 });
    expect(wrapper.get('[data-filter-summary-badge]').text()).toBe('99+');
  });

  it('keeps the count box and shows a quiet placeholder while counting', async () => {
    const wrapper = render({ isCounting: true });
    const live = count(wrapper);
    expect(live.attributes('aria-busy')).toBe('true');
    expect(live.get('span').classes()).toContain('invisible');
    expect(live.get('span').text()).toContain('12 out of 72');
    expect(wrapper.get('[data-filter-summary-placeholder]').attributes('aria-hidden')).toBe('true');
    await wrapper.setProps({ isCounting: false });
    expect(count(wrapper).attributes('aria-busy')).toBeUndefined();
    expect(wrapper.find('[data-filter-summary-placeholder]').exists()).toBe(false);
  });

  it('takes every word from labels and the group name from aria-label', () => {
    const wrapper = render(
      {
        labels: { clear: 'Reset', filters: 'More', match: '{matched} of {total}', compactMatch: '{matched}/{total}' },
        activeFilterCount: 1,
      },
      { 'aria-label': 'Event results', class: 'ms-auto' },
    );
    const group = wrapper.get('[role="group"]');
    expect(group.attributes('aria-label')).toBe('Event results');
    expect(group.classes()).toContain('ms-auto');
    expect(clearButton(wrapper).attributes('aria-label')).toBe('Reset');
    expect(filtersButton(wrapper).attributes('aria-label')).toBe('More (1)');
    expect(count(wrapper).text()).toContain('12 of 72');
    expect(count(wrapper).text()).toContain('12/72');
  });

  it('lets an app wrap the filters button in a ModalTrigger through the filters-trigger slot', async () => {
    const wrapper = mount(
      {
        render: () =>
          h(
            FilterSummary,
            { matched: 3, total: 9, isFiltered: true, activeFilterCount: 2 },
            {
              'filters-trigger': () =>
                h(Modal, null, () => [
                  h(ModalTrigger, { asChild: true }, () => h(FilterSummaryFiltersButton)),
                  h(ModalContent, null, () => 'Sheet'),
                ]),
            },
          ),
      },
      { attachTo: document.body },
    );
    wrappers.push(wrapper);
    const button = wrapper.get('[data-filter-summary-filters]');
    expect(button.element.tagName).toBe('BUTTON');
    expect(button.attributes('aria-haspopup')).toBe('dialog');
    expect(button.attributes('aria-label')).toBe('Filters (2)');
    await settle();
    await button.trigger('click');
    await nextTick();
    expect(button.attributes('aria-expanded')).toBe('true');
  });
});
