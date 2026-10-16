import { afterEach, beforeEach, expect, it } from 'vitest';
import { getTheme, themeToCss } from '@src/foundation/themes';
import '@src/index.css';

// Forced colours replace fills with system colours by design; the declared tokens still resolve.
const isForcedColors = matchMedia('(forced-colors: active)').matches;

const theme = getTheme('platform')!;
let style: HTMLStyleElement;
let page: HTMLElement;
let surface: HTMLElement;

beforeEach(() => {
  style = document.createElement('style');
  style.textContent = themeToCss(theme);
  document.head.append(style);
  page = document.createElement('main');
  page.className = 'theme-platform surface-ambient bg-background text-foreground';
  surface = document.createElement('div');
  surface.className = 'bg-field border border-input text-primary';
  surface.textContent = 'Field';
  page.append(surface);
  document.body.append(page);
});

afterEach(() => {
  page.remove();
  style.remove();
});

const token = (name: string): string => getComputedStyle(page).getPropertyValue(`--color-${name}`).trim();

it('resolves the platform tokens in light mode and dark mode', () => {
  for (const mode of ['light', 'dark'] as const) {
    page.classList.toggle('dark', mode === 'dark');
    for (const name of ['background', 'foreground', 'card', 'field', 'muted', 'border', 'input', 'primary', 'ring']) {
      expect(token(name), `${mode} ${name}`).toBe(theme[mode][name as keyof typeof theme.light]);
    }
    expect(getComputedStyle(page).getPropertyValue('--theme-ambient')).toContain('radial-gradient(');
  }
});

it('takes the dark tokens from a dark ancestor', () => {
  const host = document.createElement('section');
  host.className = 'dark';
  host.append(page);
  document.body.append(host);
  try {
    expect(token('background')).toBe('#121917');
    expect(token('field')).toBe('#121917');
  } finally {
    host.remove();
  }
});

it.skipIf(isForcedColors)('paints the page, field and backdrop from the platform palette', () => {
  const paint = (): Record<string, string> => ({
    page: getComputedStyle(page).backgroundColor,
    text: getComputedStyle(page).color,
    field: getComputedStyle(surface).backgroundColor,
    edge: getComputedStyle(surface).borderTopColor,
    primary: getComputedStyle(surface).color,
  });
  expect(paint()).toEqual({
    page: 'rgb(244, 244, 239)',
    text: 'rgb(32, 45, 39)',
    field: 'rgb(255, 255, 255)',
    edge: 'rgb(117, 133, 121)',
    primary: 'rgb(40, 92, 75)',
  });
  expect(getComputedStyle(page).backgroundImage).toContain('radial-gradient(');

  page.classList.add('dark');
  expect(paint()).toEqual({
    page: 'rgb(18, 25, 23)',
    text: 'rgb(237, 241, 235)',
    field: 'rgb(18, 25, 23)',
    edge: 'rgb(123, 141, 127)',
    primary: 'rgb(166, 212, 189)',
  });
  expect(getComputedStyle(page).backgroundImage).toContain('radial-gradient(');
});
