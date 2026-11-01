import { afterEach, describe, expect, it, vi } from 'vitest';
import { FocusTargetAttribute, focusTarget } from '@src/foundation/dom';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('focusTarget', () => {
  it('makes a non-control focusable by script only, marks it and focuses it without scrolling', () => {
    const main = document.createElement('main');
    document.body.append(main);
    const focus = vi.spyOn(main, 'focus');

    expect(focusTarget(main)).toBe(true);
    expect(main.getAttribute('tabindex')).toBe('-1');
    expect(main.hasAttribute(FocusTargetAttribute)).toBe(true);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(document.activeElement).toBe(main);
  });

  it('keeps a tabindex the element already has', () => {
    const region = document.createElement('section');
    region.tabIndex = 0;
    document.body.append(region);

    focusTarget(region);
    expect(region.getAttribute('tabindex')).toBe('0');
    expect(region.hasAttribute(FocusTargetAttribute)).toBe(true);
  });

  it('reports a detached element that could not take focus', () => {
    expect(focusTarget(document.createElement('main'))).toBe(false);
  });
});
