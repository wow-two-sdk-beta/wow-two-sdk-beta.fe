import { afterEach, describe, expect, it, vi } from 'vitest';
import { h, nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import {
  AppShell,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
  AppShellSidebar,
  Navbar,
} from '@src/presentation/layout';
import { NavItem } from '@src/presentation/nav';

const wrappers: VueWrapper[] = [];
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));

function shell(props: Record<string, unknown>, children: () => unknown[]) {
  const wrapper = mount(AppShell, { props, slots: { default: children }, attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
}

/** The shell root is the first element; a dev-build leading comment may sit before it. */
function root(wrapper: VueWrapper): HTMLElement {
  return wrapper.element.nodeType === 1
    ? (wrapper.element as HTMLElement)
    : (wrapper.element.nextElementSibling as HTMLElement);
}

describe('app shell scrolling', () => {
  it('owns the viewport and scrolls only the main region by default', () => {
    const wrapper = shell({}, () => [
      h(AppShellHeader, null, () => 'Top'),
      h(AppShellMain, { class: 'main' }, () => h(AppShellContent, { class: 'content' }, () => 'Body')),
    ]);
    expect(root(wrapper).className).toContain('h-dvh');
    expect(root(wrapper).className).toContain('overflow-hidden');
    const main = wrapper.get('.main');
    expect(main.classes()).toEqual(expect.arrayContaining(['min-h-0', 'overflow-y-auto']));
    expect(wrapper.get('.content').classes()).not.toContain('overflow-y-auto');
  });

  it('scrolls the document when asked, as a page does', () => {
    const wrapper = shell({ scroll: 'document' }, () => [h(AppShellMain, { class: 'main' }, () => 'Body')]);
    expect(root(wrapper).className).toContain('min-h-svh');
    expect(root(wrapper).className).not.toContain('overflow-hidden');
    expect(wrapper.get('.main').classes()).not.toContain('overflow-y-auto');
  });

  it('reserves no sidebar column for a top-bar app', () => {
    const wrapper = shell({}, () => [h(AppShellHeader, null, () => 'Top'), h(AppShellMain, null, () => 'Body')]);
    expect(root(wrapper).style.gridTemplate).not.toContain('sidebar');
  });

  it('floors the content column at zero so wide content cannot widen the shell', () => {
    const wrapper = shell({}, () => [h(AppShellHeader, null, () => 'Top'), h(AppShellMain, null, () => 'Body')]);
    expect(root(wrapper).style.gridTemplate).toMatch(/minmax\(0(px)?, 1fr\)$/);
  });

  it('places a sidebar column when the children include one, or when told to', async () => {
    // Every breakpoint query answers "wide", so the sidebar sits in the grid instead of a drawer.
    const matchMedia = vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: true,
          media: query,
          onchange: null,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          addListener: () => undefined,
          removeListener: () => undefined,
          dispatchEvent: () => false,
        }) as MediaQueryList,
    );
    try {
      const withSidebar = shell({}, () => [
        h(AppShellHeader, null, () => 'Top'),
        h(AppShellSidebar, null, () => 'Nav'),
        h(AppShellMain, null, () => 'Body'),
      ]);
      const explicit = shell({ navigation: 'vertical' }, () => [h(AppShellMain, null, () => 'Body')]);
      const forcedTop = shell({ navigation: 'horizontal' }, () => [
        h(AppShellSidebar, null, () => 'Nav'),
        h(AppShellMain, null, () => 'Body'),
      ]);
      await nextTick();
      expect(root(withSidebar).style.gridTemplate).toContain('sidebar');
      expect(root(explicit).style.gridTemplate).toContain('sidebar');
      expect(root(forcedTop).style.gridTemplate).not.toContain('sidebar');
    } finally {
      matchMedia.mockRestore();
    }
  });

  it('lets the main region render outside a shell with document scrolling', () => {
    const wrapper = mount(AppShellMain, { attrs: { class: 'loose' }, slots: { default: () => 'Body' } });
    wrappers.push(wrapper);
    expect(wrapper.get('main').classes()).not.toContain('overflow-y-auto');
  });
});

describe('navbar orientations', () => {
  it('renders a full-width top bar whose items size to their labels', () => {
    const wrapper = mount(Navbar, {
      slots: { start: () => h(NavItem, { class: 'item', isActive: true }, () => 'Deployments') },
    });
    wrappers.push(wrapper);
    const bar = wrapper.get('header');
    expect(bar.classes()).toEqual(expect.arrayContaining(['w-full', 'border-b', 'bg-card']));
    expect(wrapper.get('.item').classes()).toEqual(expect.arrayContaining(['w-auto', 'whitespace-nowrap']));
    expect(wrapper.get('.item').classes()).not.toContain('w-full');
  });

  it('renders a full-height rail whose items fill the row', () => {
    const wrapper = mount(Navbar, {
      props: { orientation: 'vertical' },
      slots: {
        start: () => 'Brand',
        center: () => h(NavItem, { class: 'item' }, () => 'Servers'),
        end: () => 'Account',
      },
    });
    wrappers.push(wrapper);
    const bar = wrapper.get('header');
    expect(bar.classes()).toEqual(expect.arrayContaining(['h-full', 'flex-col', 'border-e']));
    expect(bar.classes()).not.toContain('h-14');
    expect(wrapper.get('.item').classes()).toContain('w-full');
    expect(bar.text()).toBe('BrandServersAccount');
  });

  it('paints the requested surface, and a tone still wins', () => {
    const glass = mount(Navbar, { props: { variant: 'glass' }, slots: { start: () => 'Brand' } });
    const bare = mount(Navbar, { props: { variant: 'transparent' }, slots: { start: () => 'Brand' } });
    wrappers.push(glass, bare);
    expect(glass.get('header').classes().join(' ')).toContain('supports-[backdrop-filter]:backdrop-blur-md');
    expect(bare.get('header').classes()).toContain('bg-transparent');
  });

  it('keeps a sidebar item full width outside any navbar', () => {
    const wrapper = mount(NavItem, { slots: { default: () => 'Secrets' } });
    wrappers.push(wrapper);
    expect(wrapper.get('a').classes()).toContain('w-full');
  });
});
