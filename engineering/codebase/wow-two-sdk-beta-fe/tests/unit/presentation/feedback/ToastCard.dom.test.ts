import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { h } from 'vue';
import { Severity } from '@src/foundation/styles';
import Toast from '@src/presentation/feedback/toast/Toast.vue';
import { ToastSurface } from '@src/presentation/feedback/toast';
import ToastSimple from '@src/presentation/feedback/toastSimple/ToastSimple.vue';
import { toastHost, type ToastOptions } from '@src/presentation/feedback/toastHost';
import { attach, host, overflowButton, resetToasts, settle, stack } from './ToastHarness';

/* The toast card's look: its surface, its severity glyph, copy that arrives late, and the published stylesheet. */

afterEach(resetToasts);

const card = (props: Record<string, unknown> = {}) =>
  attach(Toast, { props: { title: 'Saved', ...props } }).get('[role="status"]');

const classesOf = (element: { classes: () => string[] }) => element.classes().join(' ');

describe('toast surface', () => {
  it('paints the menu glass, edge hairline and shadow only for the glass surface', () => {
    const glass = card({ surface: ToastSurface.Glass });
    expect(glass.attributes('data-toast-surface')).toBe('glass');
    const classes = classesOf(glass);
    expect(classes).toContain('data-[toast-surface=glass]:surface-glass-menu');
    expect(classes).toContain('data-[toast-surface=glass]:border-glass-edge');
    expect(classes).toContain('--glass-menu-shadow');
    expect(classes).toContain('inset_0_1px_0_var(--glass-highlight');
  });

  it('keeps the solid card exactly as it was, by default and when named', () => {
    const plain = card();
    const solid = card({ surface: ToastSurface.Solid });
    for (const element of [plain, solid]) {
      expect(element.attributes('data-toast-surface')).toBeUndefined();
      expect(classesOf(element)).not.toContain('glass');
      expect(classesOf(element)).toContain('bg-popover');
    }
    expect(solid.classes()).toEqual(plain.classes());
  });

  it('keeps a severity border on glass so the accent reads, and the hairline only for neutral cards', () => {
    const danger = card({ surface: ToastSurface.Glass, severity: Severity.Danger });
    expect(classesOf(danger)).toContain('border-destructive/40');
    expect(classesOf(danger)).not.toContain('border-glass-edge');

    const neutral = card({ surface: ToastSurface.Glass, severity: Severity.Neutral });
    expect(classesOf(neutral)).toContain('data-[toast-surface=glass]:border-glass-edge');
  });

  it('merges a consumer class and leaves the toast’s own text contrast token in place', () => {
    const glass = card({ surface: ToastSurface.Glass, class: 'w-80' });
    expect(glass.classes()).toContain('w-80');
    expect(glass.classes()).toContain('text-popover-foreground');
  });

  it('gives each hosted card its own surface, else the host’s, else solid, and glazes the overflow control', async () => {
    const wrapper = host({ surface: ToastSurface.Glass, max: 2 });
    toastHost.toast({ title: 'Host glass' });
    toastHost.toast({ title: 'Own solid', surface: ToastSurface.Solid });
    toastHost.toast({ title: 'Queued' });
    await settle();
    expect(wrapper.findAllComponents(Toast).map((item) => item.props('surface'))).toEqual(['glass', 'solid']);
    expect(overflowButton()!.getAttribute('data-toast-surface')).toBe('glass');
    expect(overflowButton()!.className).toContain('data-[toast-surface=glass]:surface-glass-menu');

    await wrapper.setProps({ surface: undefined });
    await settle();
    expect(wrapper.findAllComponents(Toast)[0]!.props('surface')).toBe('solid');
    expect(overflowButton()!.hasAttribute('data-toast-surface')).toBe(false);
  });

  it('sizes a hosted card from --toast-width', async () => {
    host();
    toastHost.toast({ title: 'Saved' });
    await settle();
    expect(stack().querySelector('[data-toast-id]')!.className).toContain('w-(--toast-width,20rem)');
  });
});

describe('toast severity glyphs', () => {
  const glyphs = () => [...document.querySelectorAll('[data-toast-icon]')];

  it('gives every intent its own glyph and leaves neutral bare', async () => {
    host();
    for (const severity of ['info', 'success', 'warning', 'danger', 'neutral'] as const) {
      toastHost.toast({ title: severity, severity });
    }
    await settle();
    const icons = glyphs();
    expect(icons).toHaveLength(4);
    expect(new Set(icons.map((icon) => icon.querySelector('svg')!.innerHTML)).size).toBe(4);
    expect(icons[3]!.querySelector('svg')!.getAttribute('class')).toContain('text-destructive-soft-foreground');
  });

  it.each<{ name: string; props: Record<string, unknown>; toasts: Partial<ToastOptions>[]; shown: string[] }>([
    {
      name: 'yields to a custom icon and switches off per toast',
      props: {},
      toasts: [
        { title: 'Custom', severity: 'info', icon: '🚀' },
        { title: 'Bare', severity: 'info', showSeverityIcon: false },
      ],
      shown: ['🚀'],
    },
    {
      name: 'switches off for a whole host, which a toast can still override',
      props: { showSeverityIcon: false },
      toasts: [
        { title: 'Host off', severity: 'warning' },
        { title: 'Toast on', severity: 'warning', showSeverityIcon: true },
      ],
      shown: ['glyph'],
    },
  ])('$name', async ({ props, toasts, shown }) => {
    host(props);
    for (const options of toasts) toastHost.toast(options);
    await settle();
    expect(glyphs().map((icon) => (icon.querySelector('svg') ? 'glyph' : icon.textContent?.trim()))).toEqual(shown);
  });
});

describe('toast content', () => {
  it('renders a description, an action and a glyph that arrive after the first render', async () => {
    host();
    const id = toastHost.toast({ title: 'Deploying' });
    await settle();
    toastHost.update(id, {
      title: 'Deploy failed',
      severity: 'danger',
      description: 'The health check timed out.',
      action: h('button', { type: 'button' }, 'Retry'),
    });
    await settle();
    expect(stack().textContent).toContain('The health check timed out.');
    expect(stack().textContent).toContain('Retry');
    expect(document.querySelectorAll('[data-toast-icon]')).toHaveLength(1);
  });
});

describe('component-only toast stylesheet', () => {
  // Vitest stubs stylesheet imports, so the published file is read from disk.
  const stylesheet = readFileSync(resolve(process.cwd(), 'src/presentation/feedback/toastHost/styles.css'), 'utf8');

  it('lists every class the toast card renders for each severity', () => {
    const listed = new Set(stylesheet.match(/@source inline\('([^']*)'\)/)?.[1]?.split(/\s+/) ?? []);
    for (const severity of ['neutral', 'info', 'success', 'warning', 'danger'] as const) {
      const rendered = attach(ToastSimple, { props: { severity } }).element.className.split(/\s+/).filter(Boolean);
      expect(rendered.length).toBeGreaterThan(0);
      for (const className of rendered) expect(listed, `${severity}: ${className}`).toContain(className);
    }
  });
});
