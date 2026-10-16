import { mount } from '@vue/test-utils';
import { h } from 'vue';
import { describe, expect, it } from 'vitest';
import { AppShell, AppShellHeader, Navbar } from '@src/presentation/layout';

describe('Navbar inner container', () => {
  it('forwards native attributes and lets consumer spacing win', () => {
    const wrapper = mount(Navbar, {
      props: {
        containerAttrs: { id: 'nav-content', class: 'px-5', 'data-shell': 'primary' },
        containerClass: 'px-6',
      },
      slots: { default: 'Navigation' },
    });
    const container = wrapper.get('#nav-content');
    expect(container.attributes('data-shell')).toBe('primary');
    expect(container.classes()).toContain('px-6');
    expect(container.classes()).not.toContain('px-4');
    expect(container.classes()).not.toContain('px-5');
  });
});

describe('Navbar element', () => {
  function inShellHeader(navbarProps: Record<string, unknown> = {}) {
    return mount(AppShell, {
      slots: {
        default: () =>
          h(AppShellHeader, null, () => h(Navbar, { class: 'bar', ...navbarProps }, { start: () => 'Brand' })),
      },
    });
  }

  it('renders a header band on its own', () => {
    const wrapper = mount(Navbar, { slots: { start: () => 'Brand' } });
    expect(wrapper.element.tagName).toBe('HEADER');
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['h-14', 'border-b', 'bg-card']));
  });

  it('renders a plain row inside the shell header, leaving the band chrome to it', () => {
    const wrapper = inShellHeader();
    expect(wrapper.findAll('header')).toHaveLength(1);
    const bar = wrapper.get('.bar');
    expect(bar.element.tagName).toBe('DIV');
    expect(bar.classes()).toEqual(expect.arrayContaining(['flex-1', 'min-w-0', 'self-stretch', 'h-auto']));
    expect(bar.classes()).not.toContain('border-b');
    expect(bar.classes()).not.toContain('bg-card');
    expect(bar.classes()).not.toContain('h-14');
  });

  it('keeps chrome the props ask for inside the shell header', () => {
    const bar = inShellHeader({ hasBorder: true, variant: 'solid', height: 'sm' }).get('.bar');
    expect(bar.classes()).toEqual(expect.arrayContaining(['border-b', 'bg-card', 'h-12']));
  });

  it('takes an explicit element either way', () => {
    expect(mount(Navbar, { props: { as: 'div' } }).element.tagName).toBe('DIV');
    expect(inShellHeader({ as: 'header' }).get('.bar').element.tagName).toBe('HEADER');
  });
});
