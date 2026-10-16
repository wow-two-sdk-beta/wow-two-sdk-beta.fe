import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, watchEffect } from 'vue';
import { useGroupNavigation } from '../../../apps/playground/src/navigation';
import { diagnostics, record } from '../../../apps/playground/src/diagnostics';

const themeApi = vi.hoisted(() => ({
  getTheme: vi.fn((id: string) => ({ id })),
  themeToCss: vi.fn((theme: { id: string }) => `.theme-${theme.id}{color:red}`),
}));
vi.mock('@wow-two-beta/ui-vue/foundation/themes', () => ({
  ThemeCatalog: [
    { id: 'smart-qr', name: 'Smart QR', status: 'validated' },
    { id: 'wow', name: 'WoW', status: 'candidate' },
  ],
  ...themeApi,
}));

const cleanup: (() => void)[] = [];
afterEach(() => {
  cleanup
    .splice(0)
    .reverse()
    .forEach((dispose) => dispose());
  history.replaceState(null, '', '/');
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('playground navigation', () => {
  it('preserves other URL state, uses history, and follows popstate until disposed', () => {
    history.replaceState(null, '', '/gallery?g=unknown&debug=1#sample');
    const scope = effectScope();
    cleanup.push(() => scope.stop());
    const nav = scope.run(() => useGroupNavigation(['layout', 'forms'], 'layout'))!;
    expect(nav.active.value).toBe('layout');
    expect(nav.hrefFor('forms')).toBe('/gallery?g=forms&debug=1#sample');
    const push = vi.spyOn(history, 'pushState');
    const event = new MouseEvent('click', { cancelable: true });
    nav.navigate(event, 'forms');
    expect(event.defaultPrevented).toBe(true);
    expect(nav.active.value).toBe('forms');
    expect(location.search).toBe('?g=forms&debug=1');
    nav.navigate(new MouseEvent('click', { cancelable: true }), 'forms');
    expect(push).toHaveBeenCalledTimes(1);
    history.replaceState(null, '', '?g=layout');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(nav.active.value).toBe('layout');
    scope.stop();
    history.replaceState(null, '', '?g=forms');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(nav.active.value).toBe('layout');
  });

  it('leaves modified and auxiliary clicks to the browser', () => {
    const scope = effectScope();
    cleanup.push(() => scope.stop());
    const nav = scope.run(() => useGroupNavigation(['layout', 'forms'], 'layout'))!;
    for (const options of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
      const event = new MouseEvent('click', { ...options, cancelable: true });
      nav.navigate(event, 'forms');
      expect(event.defaultPrevented).toBe(false);
    }
    expect(nav.active.value).toBe('layout');
  });
});

describe('playground diagnostics', () => {
  it('updates displayed repeat counts reactively and avoids delimiter collisions', async () => {
    const scope = effectScope();
    cleanup.push(() => scope.stop());
    record('error', 'repeated', 'Test');
    let rendered = 0;
    scope.run(() =>
      watchEffect(() => {
        rendered = diagnostics.find((item) => item.message === 'repeated')!.count;
      }),
    );
    record('error', 'repeated', 'Test');
    await nextTick();
    expect(rendered).toBe(2);
    record('warn', 'b::c', 'a');
    record('warn', 'c', 'a::b');
    expect(diagnostics.filter((item) => item.kind === 'warn')).toHaveLength(2);
  });
});

describe('playground themes', () => {
  it('renders only the selected theme and does not regenerate it for dark toggles', async () => {
    localStorage.setItem('pg:theme', 'removed-theme');
    const theme = await import('../../../apps/playground/src/theme');
    expect(theme.themeId.value).toBe('smart-qr');
    themeApi.getTheme.mockClear();
    cleanup.push(theme.installThemesCss());
    expect(themeApi.getTheme.mock.calls).toEqual([['smart-qr']]);
    expect(document.documentElement.classList.contains('theme-smart-qr')).toBe(true);
    theme.isDark.value = !theme.isDark.value;
    expect(themeApi.getTheme).toHaveBeenCalledTimes(1);
    theme.themeId.value = 'wow';
    expect(themeApi.getTheme.mock.calls).toEqual([['smart-qr'], ['wow']]);
    expect(document.querySelector('#wow-two-themes')?.textContent).toBe('.theme-wow{color:red}');
    expect(document.documentElement.classList.contains('theme-smart-qr')).toBe(false);
    expect(localStorage.getItem('pg:theme')).toBe('wow');
  });

  it('continues theme changes when browser storage denies access', async () => {
    const theme = await import('../../../apps/playground/src/theme');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Denied', 'SecurityError');
    });
    const dispose = theme.installThemesCss();
    cleanup.push(dispose);
    theme.themeId.value = 'smart-qr';
    expect(document.documentElement.classList.contains('theme-smart-qr')).toBe(true);
    dispose();
    themeApi.getTheme.mockClear();
    theme.themeId.value = 'wow';
    expect(themeApi.getTheme).not.toHaveBeenCalled();
    expect(document.querySelector('#wow-two-themes')).toBeNull();
  });
});
