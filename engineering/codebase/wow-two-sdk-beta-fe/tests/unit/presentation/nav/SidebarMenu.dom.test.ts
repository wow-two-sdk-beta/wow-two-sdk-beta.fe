import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { LocaleProvider } from '@src/foundation/i18n';
import { SidebarMenu, SidebarMenuGroup, SidebarMenuItem, SidebarMenuSection } from '@src/presentation/nav';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});

/** A sidebar with a section, a collapsible group and a router-link item. */
function mountSidebar(props: Record<string, unknown> = {}, groupProps: Record<string, unknown> = {}): VueWrapper {
  const wrapper = mount(SidebarMenu, {
    props,
    slots: {
      default: () => [
        h(SidebarMenuSection, { label: 'Workspace' }, () => [
          h(
            SidebarMenuItem,
            { href: '/inbox', isActive: true },
            { default: () => 'Inbox', icon: () => h('svg'), trailing: () => h('b', '4') },
          ),
          h(SidebarMenuGroup, { label: 'Projects', ...groupProps }, () => [
            h(SidebarMenuItem, { href: '/projects/atlas' }, () => 'Atlas'),
          ]),
        ]),
        h(SidebarMenuItem, { asChild: true }, () => h('a', { href: '/settings', 'data-router': '' }, 'Settings')),
      ],
    },
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  return wrapper;
}

describe('SidebarMenu', () => {
  it('names the landmark and labels its sections, marking the current place', () => {
    const wrapper = mountSidebar();
    expect(wrapper.get('nav').attributes('aria-label')).toBe('Sidebar');
    const sectionList = wrapper.get('ul[aria-labelledby]');
    expect(wrapper.get(`#${sectionList.attributes('aria-labelledby')}`).text()).toBe('Workspace');
    const inbox = wrapper.get('a[href="/inbox"]');
    expect(inbox.attributes('aria-current')).toBe('page');
    expect(inbox.text()).toBe('Inbox4');
    expect(wrapper.get('[data-router]').classes()).toContain('h-9');
  });

  it('discloses a group from its toggle and reports the change', async () => {
    const wrapper = mountSidebar();
    const toggle = wrapper.get('button[aria-expanded]');
    const list = wrapper.get(`#${toggle.attributes('aria-controls')}`);
    expect(toggle.attributes('aria-expanded')).toBe('false');
    expect((list.element as HTMLElement).style.display).toBe('none');
    expect(list.attributes('aria-label')).toBe('Projects');
    await toggle.trigger('click');
    expect(toggle.attributes('aria-expanded')).toBe('true');
    expect((list.element as HTMLElement).style.display).toBe('');
    expect(wrapper.findComponent(SidebarMenuGroup).emitted('update:open')).toEqual([[true]]);
  });

  it('keeps a controlled group where its owner leaves it', async () => {
    const wrapper = mountSidebar({}, { open: true });
    const toggle = wrapper.get('button[aria-expanded]');
    await toggle.trigger('click');
    expect(wrapper.findComponent(SidebarMenuGroup).emitted('update:open')).toEqual([[false]]);
    expect(toggle.attributes('aria-expanded')).toBe('true');
  });

  it('turns labels into assistive-only text in the rail and drops trailing counts', async () => {
    const wrapper = mountSidebar({ isCollapsed: true });
    expect(wrapper.get('nav').attributes('data-collapsed')).toBe('');
    const inbox = wrapper.get('a[href="/inbox"]');
    expect(inbox.get('span.sr-only').text()).toBe('Inbox');
    expect(inbox.text()).toBe('Inbox');
    expect(wrapper.get('button[aria-expanded] span.sr-only').text()).toBe('Projects');
    expect(wrapper.get('button[aria-expanded]').find('svg').exists()).toBe(false);
    const railToggle = wrapper.get('button[aria-expanded]');
    await railToggle.trigger('click');
    expect(railToggle.attributes('aria-expanded')).toBe('false');
    expect((wrapper.get(`#${railToggle.attributes('aria-controls')}`).element as HTMLElement).style.display).toBe(
      'none',
    );
    const sectionLabelId = wrapper.get('ul[aria-labelledby]').attributes('aria-labelledby');
    expect(wrapper.get(`#${sectionLabelId}`).classes()).toContain('sr-only');
  });

  it('localizes the default landmark name', () => {
    const wrapper = mount(
      defineComponent({
        render: () =>
          h(LocaleProvider, { messages: { 'SidebarMenu.label': 'Seitenleiste' } }, () =>
            h(SidebarMenu, null, () => h(SidebarMenuItem, { href: '/' }, () => 'Start')),
          ),
      }),
    );
    wrappers.push(wrapper);
    expect(wrapper.get('nav').attributes('aria-label')).toBe('Seitenleiste');
  });
});
