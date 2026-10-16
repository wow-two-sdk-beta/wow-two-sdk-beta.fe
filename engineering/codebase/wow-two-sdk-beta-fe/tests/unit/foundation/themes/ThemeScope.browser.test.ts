import { expect, it } from 'vitest';
import { getTheme, themeToCss } from '@src/foundation/themes';

it('applies dark tokens on a themed descendant and on the dark root itself', () => {
  const theme = getTheme('wow')!;
  const style = document.createElement('style');
  style.textContent = themeToCss(theme);
  document.head.append(style);
  const parent = document.createElement('section');
  parent.className = 'dark';
  const child = document.createElement('div');
  child.className = 'theme-wow';
  parent.append(child);
  document.body.append(parent);
  try {
    expect(getComputedStyle(child).getPropertyValue('--color-background').trim()).toBe(theme.dark.background);
    parent.className = '';
    expect(getComputedStyle(child).getPropertyValue('--color-background').trim()).toBe(theme.light.background);
    child.className = 'theme-wow dark';
    expect(getComputedStyle(child).getPropertyValue('--color-background').trim()).toBe(theme.dark.background);
  } finally {
    parent.remove();
    style.remove();
  }
});
