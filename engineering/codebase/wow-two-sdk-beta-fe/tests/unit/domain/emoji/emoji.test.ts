import { describe, expect, it } from 'vitest';
import { EmojiCatalog, EmojiCategory } from '@src/domain/emoji';

/*
 * Smoke depth, `unit` project (node). The catalog is static data plus two lookups; the ranking
 * rule is the only behaviour, so that is what is asserted — a label-prefix hit outranks a
 * tag-only hit, which is the difference between typing "sm" and getting "smile" versus getting
 * whatever happens to carry `smile` as a tag.
 */

describe('the catalog', () => {
  it('ships entries, each with a glyph, label, tags, and category', () => {
    expect(EmojiCatalog.all.length).toBeGreaterThan(0);

    for (const entry of EmojiCatalog.all) {
      expect(entry.glyph, `${entry.label} has no glyph`).toBeTruthy();
      expect(entry.label).toBeTruthy();
      expect(Array.isArray(entry.tags)).toBe(true);
    }
  });

  it('lowercases every tag, so the search never has to', () => {
    for (const entry of EmojiCatalog.all) {
      for (const tag of entry.tags) {
        expect(tag, `${entry.label} carries an uppercase tag`).toBe(tag.toLowerCase());
      }
    }
  });
});

describe('byCategory', () => {
  it('returns only entries in that category, preserving display order', () => {
    const smileys = EmojiCatalog.byCategory(EmojiCategory.SmileysPeople);

    expect(smileys.length).toBeGreaterThan(0);
    for (const entry of smileys) {
      expect(entry.category).toBe(EmojiCategory.SmileysPeople);
    }
  });
});

describe('search', () => {
  it('returns the whole catalog for a blank keyword', () => {
    expect(EmojiCatalog.search('   ')).toEqual(EmojiCatalog.all);
  });

  it('matches case-insensitively', () => {
    const lower = EmojiCatalog.search('smile');
    expect(lower.length).toBeGreaterThan(0);
    expect(EmojiCatalog.search('SMILE')).toEqual(lower);
  });

  it('ranks a label hit ahead of a tag-only hit', () => {
    const results = EmojiCatalog.search('smile');
    const firstLabelHit = results.findIndex((entry) => entry.label.toLowerCase().includes('smile'));
    const firstTagOnlyHit = results.findIndex((entry) => !entry.label.toLowerCase().includes('smile'));

    expect(firstLabelHit).toBe(0);
    if (firstTagOnlyHit !== -1) expect(firstLabelHit).toBeLessThan(firstTagOnlyHit);
  });

  it('returns nothing for a keyword no entry carries', () => {
    expect(EmojiCatalog.search('zzzzzznotanemoji')).toHaveLength(0);
  });
});
