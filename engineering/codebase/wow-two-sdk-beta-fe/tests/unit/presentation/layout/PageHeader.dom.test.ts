import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { PageHeader, PageHeaderActions } from '@src/presentation/layout';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  document.body.innerHTML = '';
});

const Page = defineComponent({
  setup: () => () =>
    h('section', { 'data-page': '' }, [h(PageHeaderActions, null, () => h('button', { type: 'button' }, 'New'))]),
});

describe('page header', () => {
  it('renders the title as the page heading and the description under it', () => {
    const wrapper = mount(PageHeader, { props: { title: 'Deployments', description: 'Newest first.' } });
    wrappers.push(wrapper);
    expect(wrapper.get('h1').text()).toBe('Deployments');
    expect(wrapper.text()).toContain('Newest first.');
  });

  it('receives the actions a sibling page contributes, after its own', async () => {
    const isPageShown = ref(true);
    const wrapper = mount(
      {
        render: () => [
          h(PageHeader, { title: 'Deployments' }, { actions: () => h('a', { href: '#' }, 'Docs') }),
          isPageShown.value ? h(Page) : null,
        ],
      },
      { attachTo: document.body },
    );
    wrappers.push(wrapper);
    await nextTick();
    await nextTick();
    const outlet = document.querySelector('[data-page-header-actions]')!;
    expect(outlet.querySelector('button')?.textContent).toBe('New');
    expect(document.querySelector('[data-page] button')).toBeNull();
    expect(outlet.previousElementSibling?.textContent).toBe('Docs');

    isPageShown.value = false;
    await nextTick();
    expect(outlet.querySelector('button')).toBeNull();
  });

  it('renders the actions in place without a header', async () => {
    const wrapper = mount(Page, { attachTo: document.body });
    wrappers.push(wrapper);
    await nextTick();
    expect(document.querySelector('[data-page] button')?.textContent).toBe('New');
  });
});
