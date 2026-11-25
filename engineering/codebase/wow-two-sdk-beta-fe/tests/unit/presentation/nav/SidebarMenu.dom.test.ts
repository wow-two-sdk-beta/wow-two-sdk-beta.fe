import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { LocaleProvider } from '@src/foundation/i18n';
import { SidebarMenu, SidebarMenuGroup, SidebarMenuItem, SidebarMenuSection } from '@src/presentation/nav';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  vi.useRealTimers();
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
        h(SidebarMenuItem, { asChild: true, tooltip: 'Settings' }, () =>
          h('a', { href: '/settings', 'data-router': '' }, 'Settings'),
        ),
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
    expect(list.element.closest('[inert]')).not.toBeNull();
    expect(list.attributes('aria-label')).toBe('Projects');
    await toggle.trigger('click');
    expect(toggle.attributes('aria-expanded')).toBe('true');
    expect(list.element.closest('[inert]')).toBeNull();
    expect(wrapper.findComponent(SidebarMenuGroup).emitted('update:open')).toEqual([[true]]);
  });

  it('keeps a controlled group where its owner leaves it', async () => {
    const wrapper = mountSidebar({}, { open: true });
    const toggle = wrapper.get('button[aria-expanded]');
    await toggle.trigger('click');
    expect(wrapper.findComponent(SidebarMenuGroup).emitted('update:open')).toEqual([[false]]);
    expect(toggle.attributes('aria-expanded')).toBe('true');
  });

  it('keeps the labels mounted in the rail and hides its extra controls from assistive technology', async () => {
    const wrapper = mountSidebar({ isCollapsed: true });
    expect(wrapper.get('nav').attributes('data-collapsed')).toBe('');
    const inbox = wrapper.get('a[href="/inbox"]');
    expect(inbox.get('[data-sidebar-menu-label]').text()).toBe('Inbox');
    expect(inbox.get('[inert]').text()).toBe('4');
    const railToggle = wrapper.get('button[aria-expanded]');
    expect(railToggle.text()).toBe('Projects');
    expect(railToggle.get('svg').classes()).toContain('opacity-0');
    await railToggle.trigger('click');
    expect(railToggle.attributes('aria-expanded')).toBe('false');
    expect(wrapper.get(`#${railToggle.attributes('aria-controls')}`).element.closest('[inert]')).not.toBeNull();
    const sectionLabelId = wrapper.get('ul[aria-labelledby]').attributes('aria-labelledby');
    expect(wrapper.get(`#${sectionLabelId}`).classes()).toContain('opacity-0');
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

  it('shows a destination tooltip on focus only in the collapsed rail', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const wrapper = mountSidebar();
    const settings = wrapper.get('[data-router]');
    await settings.trigger('focus');
    await vi.advanceTimersByTimeAsync(350);
    expect(document.querySelector('[role=tooltip]')).toBeNull();

    await settings.trigger('blur');
    await wrapper.setProps({ isCollapsed: true });
    await settings.trigger('focus');
    await vi.advanceTimersByTimeAsync(350);
    const tooltip = document.querySelector('[role=tooltip]');
    expect(tooltip?.textContent?.trim()).toBe('Settings');
    expect(settings.attributes('aria-describedby')).toBe(tooltip?.id);
  });
});
