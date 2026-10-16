import { describe, expect, it } from 'vitest';
import { formatChordString, matchesChord, Modifier, parseChord } from '@src/foundation/shortcuts';

/*
 * Smoke depth, `unit` project (node). Only the pure chord model — `useHotkeys` binds it to the
 * DOM and belongs to the browser tier.
 *
 * `mod` is the whole reason this file exists: a consumer writes `mod+k` once and it has to
 * resolve to ⌘ on Apple and Ctrl elsewhere. The platform is passed explicitly on every
 * assertion, so the suite reads the same on any machine that runs it.
 */

const APPLE = { applePlatform: true };
const OTHER = { applePlatform: false };

describe('parseChord', () => {
  it('resolves `mod` per platform', () => {
    expect(parseChord('mod+k', APPLE)).toMatchObject({ key: 'k', meta: true, ctrl: false });
    expect(parseChord('mod+k', OTHER)).toMatchObject({ key: 'k', meta: false, ctrl: true });
  });

  it('reads every modifier token and canonicalizes the main key', () => {
    expect(parseChord('ctrl+alt+shift+K', OTHER)).toMatchObject({
      key: 'k',
      ctrl: true,
      alt: true,
      shift: true,
    });
  });

  it('rejects a chord with no non-modifier key', () => {
    expect(() => parseChord('ctrl+shift', OTHER)).toThrow();
  });

  it('exposes the platform-adaptive token by name', () => {
    expect(Modifier.Mod).toBe('mod');
  });
});

describe('matchesChord', () => {
  const chord = parseChord('mod+k', OTHER);

  it('matches an event carrying exactly the required modifiers', () => {
    expect(matchesChord({ key: 'k', ctrlKey: true, metaKey: false, shiftKey: false, altKey: false }, chord)).toBe(true);
  });

  it('rejects an event missing a required modifier', () => {
    expect(matchesChord({ key: 'k', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false }, chord)).toBe(
      false,
    );
  });

  /* An EXTRA modifier is a different chord — otherwise `Ctrl+Shift+K` would fire the `Ctrl+K`
     handler as well as its own. */
  it('rejects an event carrying an extra modifier', () => {
    expect(matchesChord({ key: 'k', ctrlKey: true, metaKey: false, shiftKey: true, altKey: false }, chord)).toBe(false);
  });
});

describe('formatChordString', () => {
  it('renders the symbol form on Apple and the word form elsewhere', () => {
    expect(formatChordString('mod+k', APPLE)).toBe('⌘K');
    expect(formatChordString('mod+k', OTHER)).toBe('Ctrl+K');
  });
});
