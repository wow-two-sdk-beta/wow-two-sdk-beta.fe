import { afterEach, describe, expect, it } from 'vitest';
import { focusTarget } from '@src/foundation/dom';
import { nativeTab } from '../../../BrowserKeyboard';
import '@src/index.css';

/*
 * The ring a reader saw around a whole hosted page after a reload: the route announcer focuses the page's `main`, and
 * the browser's own `:focus-visible` outline drew around it. A programmatic focus target draws none; a control keeps
 * its keyboard focus ring.
 */

afterEach(() => {
  document.body.innerHTML = '';
});

describe('programmatic focus target', () => {
  it('draws no focus ring on a focused page main, keyboard modality included', async () => {
    const button = document.createElement('button');
    button.textContent = 'Before';
    const main = document.createElement('main');
    main.textContent = 'Page';
    document.body.append(button, main);

    // A keyboard interaction first: script focus after it takes the keyboard modality, where the browser's own
    // `:focus-visible` outline would draw (`auto` in Chromium without the base rule).
    await nativeTab();
    expect(focusTarget(main)).toBe(true);

    expect(getComputedStyle(main).outlineStyle).toBe('none');
  });

  it('keeps the keyboard focus ring of a control', async () => {
    const button = document.createElement('button');
    button.textContent = 'Control';
    document.body.append(button);

    await nativeTab();
    expect(document.activeElement).toBe(button);
    expect(getComputedStyle(button).outlineStyle).not.toBe('none');
  });
});
