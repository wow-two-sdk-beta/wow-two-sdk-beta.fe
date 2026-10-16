import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { LocaleProvider } from '@src/foundation/i18n';
import { BottomNavMenu, BottomNavMenuItem } from '@src/presentation/nav';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});

function mountBar(props: Record<string, unknown> = {}, attrs: Record<string, unknown> = {}): VueWrapper {
  const wrapper = mount(BottomNavMenu, {
    props,
    attrs,
    slots: {
      default: () => [
        h(BottomNavMenuItem, { href: '/home', isActive: true }, { default: () => 'Home', icon: () => h('svg') }),
        h(BottomNavMenuItem, { href: '/inbox' }, { default: () => 'Inbox', badge: () => h('b', '3') }),
        h(BottomNavMenuItem, { asChild: true }, () => h('a', { href: '/me', 'data-router': '' }, 'Me')),
      ],
    },
  });
  wrappers.push(wrapper);
  return wrapper;
}

describe('BottomNavMenu', () => {
  it('names the landmark, lists destinations and marks the current place', () => {
    const wrapper = mountBar();
    const nav = wrapper.get('nav');
    expect(nav.attributes('aria-label')).toBe('Primary');
    expect(nav.classes()).toEqual(expect.arrayContaining(['fixed', 'bottom-0']));
    const links = wrapper.findAll('li > a');
    expect(links.map((link) => link.attributes('href'))).toEqual(['/home', '/inbox', '/me']);
    expect(links[0]!.attributes('aria-current')).toBe('page');
    expect(links[1]!.attributes('aria-current')).toBeUndefined();
    expect(links[1]!.text()).toContain('3');
  });

  it('merges onto a slotted router link and stays in flow on request', () => {
    const wrapper = mountBar({ isFixed: false }, { 'aria-label': 'Sections' });
    const routed = wrapper.get('[data-router]');
    expect(routed.classes()).toContain('flex-col');
    expect(wrapper.get('nav').attributes('aria-label')).toBe('Sections');
    expect(wrapper.get('nav').classes()).not.toContain('fixed');
  });

  it('localizes the default landmark name', () => {
    const wrapper = mount(
      defineComponent({
        render: () =>
          h(LocaleProvider, { messages: { 'BottomNavMenu.label': 'Hauptmenü' } }, () =>
            h(BottomNavMenu, null, () => h(BottomNavMenuItem, { href: '/' }, () => 'Start')),
          ),
      }),
    );
    wrappers.push(wrapper);
    expect(wrapper.get('nav').attributes('aria-label')).toBe('Hauptmenü');
  });
});
