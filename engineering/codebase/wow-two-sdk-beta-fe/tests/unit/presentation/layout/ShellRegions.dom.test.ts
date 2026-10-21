import { afterEach, describe, expect, it } from 'vitest';
import { h, nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { AppShell, AppShellContent, AppShellHeader, AppShellMain, AppShellSidebar } from '@src/presentation/layout';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  document.body.innerHTML = '';
});

async function shell(header: Record<string, unknown>, content: Record<string, unknown>): Promise<void> {
  wrappers.push(
    mount(AppShell, {
      slots: {
        default: () => [
          h(AppShellHeader, header, () => 'Brand'),
          h(AppShellMain, null, () => h(AppShellContent, { 'data-content': '', ...content }, () => h('p', 'Page'))),
        ],
      },
      attachTo: document.body,
    }),
  );
  await nextTick();
}

const header = (): HTMLElement => document.querySelector('header[role=banner]')!;
const content = (): HTMLElement => document.querySelector('[data-content]')!;

describe('app shell header', () => {
  it('keeps the fixed 3.5rem solid bar by default', async () => {
    await shell({}, {});
    expect(header().className).toContain('h-14');
    expect(header().className).toContain('bg-card');
  });

  it('grows with wrapped content at auto height', async () => {
    await shell({ height: 'auto' }, {});
    expect(header().className).toContain('min-h-14');
    expect(header().className).toContain('flex-wrap');
    expect(header().className).not.toMatch(/(^|\s)h-14(\s|$)/);
  });

  it('paints the chrome glass material, edge and shadow as glass', async () => {
    await shell({ variant: 'glass' }, {});
    expect(header().classList).toContain('surface-glass');
    expect(header().classList).toContain('border-glass-edge');
    expect(header().classList).toContain('shadow-(--glass-shadow)');
    expect(header().classList).not.toContain('border-border');
    expect(header().classList).not.toContain('bg-card');
  });
});

describe('app shell sidebar', () => {
  async function sidebar(props: Record<string, unknown>): Promise<HTMLElement> {
    wrappers.push(
      mount(AppShell, {
        props: { sidebarBreakpoint: 'sm' },
        slots: {
          default: () => [h(AppShellSidebar, props, () => 'Nav'), h(AppShellMain, null, () => h('p', 'Page'))],
        },
        attachTo: document.body,
      }),
    );
    await nextTick();
    return document.querySelector<HTMLElement>('aside')!;
  }

  it('keeps the solid card rail by default', async () => {
    const rail = await sidebar({});
    expect(rail.classList).toContain('bg-card');
    expect(rail.classList).toContain('border-border');
  });

  it('paints the sidebar glass material and edge as glass', async () => {
    const rail = await sidebar({ variant: 'glass' });
    expect(rail.classList).toContain('surface-glass-side');
    expect(rail.classList).toContain('border-glass-edge');
    expect(rail.classList).not.toContain('bg-card');
  });

  it('paints no surface when transparent', async () => {
    const rail = await sidebar({ variant: 'transparent' });
    expect(rail.classList).toContain('bg-transparent');
  });
});

describe('app shell content', () => {
  it('pads 1.5rem and renders no container by default', async () => {
    await shell({}, {});
    expect(content().className).toContain('p-6');
    expect(content().querySelector('[data-content-container]')).toBeNull();
  });

  it('applies a gutter step', async () => {
    await shell({}, { gutter: 'none' });
    expect(content().className).toContain('p-0');
  });

  it('centers the content in a stepped or measured container', async () => {
    await shell({}, { maxWidth: 'xl' });
    const stepped = content().querySelector<HTMLElement>('[data-content-container]')!;
    expect(stepped.className).toContain('max-w-screen-xl');
    expect(stepped.className).toContain('mx-auto');
    wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
    await shell({}, { maxWidth: 1600 });
    expect(content().querySelector<HTMLElement>('[data-content-container]')!.style.maxWidth).toBe('1600px');
  });
});
