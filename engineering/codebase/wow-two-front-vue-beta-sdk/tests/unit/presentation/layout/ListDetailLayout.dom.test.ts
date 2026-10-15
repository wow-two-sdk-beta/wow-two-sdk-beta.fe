import { afterEach, describe, expect, it } from 'vitest';
import { h } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { Breakpoint, ListDetailLayout } from '@src/presentation/layout';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
});

function render(props: Record<string, unknown>, slots: Record<string, unknown> = {}): VueWrapper {
  const wrapper = mount(ListDetailLayout, {
    props,
    slots: { list: () => h('ul', { class: 'items' }), detail: () => h('h2', null, 'Detail'), ...slots },
  });
  wrappers.push(wrapper);
  return wrapper;
}

const pane = (wrapper: VueWrapper, name: string): string =>
  wrapper.get(`[data-list-detail-pane="${name}"]`).element.className;

describe('ListDetailLayout', () => {
  it('shows the list alone below lg until a detail opens', () => {
    const wrapper = render({});
    expect(wrapper.attributes('data-view')).toBe('list');
    expect(wrapper.classes()).toContain('lg:grid-cols-[var(--ui-list-detail-list-width)_minmax(0,1fr)]');
    expect(pane(wrapper, 'list')).not.toContain('max-lg:hidden');
    expect(pane(wrapper, 'detail')).toContain('max-lg:hidden');
  });

  it('swaps to the detail alone once it opens', () => {
    const wrapper = render({ isDetailOpen: true });
    expect(wrapper.attributes('data-view')).toBe('detail');
    expect(pane(wrapper, 'list')).toContain('max-lg:hidden');
    expect(pane(wrapper, 'detail')).not.toContain('max-lg:hidden');
  });

  it.each(Object.values(Breakpoint))('moves every responsive class to the %s breakpoint', (breakpoint) => {
    const wrapper = render({ isDetailOpen: true, breakpoint });
    expect(wrapper.classes()).toContain(`${breakpoint}:grid-cols-[var(--ui-list-detail-list-width)_minmax(0,1fr)]`);
    expect(pane(wrapper, 'list')).toContain(`max-${breakpoint}:hidden`);
    expect(wrapper.get('[data-list-detail-back]').element.parentElement!.className).toContain(`${breakpoint}:hidden`);
  });

  it('sizes the list column from listWidth and keeps a caller style', () => {
    const wrapper = mount(ListDetailLayout, { props: { listWidth: '24rem' }, attrs: { style: 'color: red' } });
    wrappers.push(wrapper);
    const element = wrapper.element as HTMLElement;
    expect(element.style.getPropertyValue('--ui-list-detail-list-width')).toBe('24rem');
    expect(element.style.color).toBe('red');
  });

  it('asks the consumer to go back from the default control', async () => {
    const wrapper = render({ isDetailOpen: true, backLabel: 'All products' });
    const control = wrapper.get('[data-list-detail-back]');
    expect(control.text()).toBe('All products');
    expect(control.attributes('type')).toBe('button');
    await control.trigger('click');
    expect(wrapper.emitted('back')).toHaveLength(1);
  });

  it('labels the default control from the locale', () => {
    expect(render({}).get('[data-list-detail-back]').text()).toBe('Back');
  });

  it('lets a back slot replace the control and still go back', async () => {
    const wrapper = render(
      { isDetailOpen: true },
      {
        back: ({ back, label }: { back: () => void; label: string }) =>
          h('a', { href: '#', class: 'custom', onClick: back }, label),
      },
    );
    expect(wrapper.find('[data-list-detail-back]').exists()).toBe(false);
    await wrapper.get('.custom').trigger('click');
    expect(wrapper.emitted('back')).toHaveLength(1);
  });

  it('merges a caller class onto the grid', () => {
    const wrapper = mount(ListDetailLayout, { attrs: { class: 'gap-5' } });
    wrappers.push(wrapper);
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['grid', 'gap-5']));
  });
});
