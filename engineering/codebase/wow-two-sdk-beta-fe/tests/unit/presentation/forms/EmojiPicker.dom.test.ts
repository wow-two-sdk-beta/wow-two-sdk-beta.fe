import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { EmojiPicker } from '@src/presentation/forms';
import { memoryStorageBroker } from '@src/foundation/storage';
import type { EmojiCatalogEntry } from '@src/domain/emoji';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
});

async function settle(): Promise<void> {
  for (let tick = 0; tick < 3; tick += 1) await nextTick();
  const at = Date.now();
  while (Date.now() === at) await Promise.resolve();
}

function mountPicker(props: Record<string, unknown> = {}): VueWrapper {
  const wrapper = mount(EmojiPicker, {
    props: { storage: memoryStorageBroker(), ...props },
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  return wrapper;
}

function tiles(wrapper: VueWrapper): HTMLButtonElement[] {
  return [...(wrapper.element as HTMLElement).querySelectorAll<HTMLButtonElement>('[role=option]')];
}

async function search(wrapper: VueWrapper, text: string): Promise<void> {
  const input = wrapper.get<HTMLInputElement>('input:not([type=hidden])').element;
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await settle();
}

function lastPick(wrapper: VueWrapper): EmojiCatalogEntry | null | undefined {
  return wrapper.emitted('update:modelValue')?.at(-1)?.[0] as EmojiCatalogEntry | null | undefined;
}

describe('EmojiPicker', () => {
  it('opens on the empty recents bucket, or on the first category when asked', () => {
    expect(mountPicker().text()).toContain('Your picks show up here.');
    document.body.innerHTML = '';
    expect(tiles(mountPicker({ showFirstCategoryWhenRecentsEmpty: true })).length).toBeGreaterThan(20);
  });

  it('searches across categories, hides the category nav meanwhile and says when nothing matches', async () => {
    const wrapper = mountPicker({ showFirstCategoryWhenRecentsEmpty: true });
    const categories = wrapper.find('[aria-label="Emoji categories"]');
    expect(categories.exists()).toBe(true);
    await search(wrapper, 'heart');
    expect(wrapper.find('[aria-label="Emoji categories"]').exists()).toBe(false);
    const results = tiles(wrapper);
    const catalogPage = tiles(mountPicker({ showFirstCategoryWhenRecentsEmpty: true })).length;
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThan(catalogPage);
    expect(results.some((tile) => /heart/i.test(tile.getAttribute('aria-label') ?? ''))).toBe(true);
    await search(wrapper, 'zzzz-no-emoji');
    expect(wrapper.text()).toContain('No matches.');
    await search(wrapper, '');
    expect(wrapper.find('[aria-label="Emoji categories"]').exists()).toBe(true);
  });

  it('reports a pick, remembers it in recents and clears with None', async () => {
    const storage = memoryStorageBroker();
    const wrapper = mountPicker({ storage, showFirstCategoryWhenRecentsEmpty: true });
    const [first] = tiles(wrapper);
    first!.click();
    await settle();
    const picked = lastPick(wrapper)!;
    expect(picked.glyph).toBe(first!.textContent?.trim());

    await wrapper.setProps({ modelValue: picked });
    expect(tiles(wrapper)[0]!.getAttribute('aria-selected')).toBe('true');
    const none = wrapper.findAll('button').find((node) => node.text() === 'None')!;
    expect(none.attributes('aria-pressed')).toBe('false');
    await none.trigger('click');
    expect(lastPick(wrapper)).toBeNull();

    const recents = mountPicker({ storage });
    await settle();
    expect(tiles(recents).map((tile) => tile.textContent?.trim())).toEqual([picked.glyph]);
  });

  it('opens on stored recents even when asked to skip an empty recents bucket', async () => {
    const storage = memoryStorageBroker();
    const first = mountPicker({ storage, showFirstCategoryWhenRecentsEmpty: true });
    tiles(first)[3]!.click();
    await settle();
    const glyph = lastPick(first)!.glyph;
    first.unmount();
    wrappers.splice(0);
    const reopened = mountPicker({ storage, showFirstCategoryWhenRecentsEmpty: true });
    await settle();
    expect(tiles(reopened).map((tile) => tile.textContent?.trim())).toEqual([glyph]);
  });

  it('keeps one tab stop that the arrow keys move, starting from a clicked tile', async () => {
    const wrapper = mountPicker({ showFirstCategoryWhenRecentsEmpty: true });
    const stops = (): number[] =>
      tiles(wrapper).flatMap((tile, index) => (tile.getAttribute('tabindex') === '0' ? [index] : []));
    expect(stops()).toEqual([0]);
    tiles(wrapper)[0]!.focus();
    tiles(wrapper)[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await settle();
    expect(document.activeElement).toBe(tiles(wrapper)[1]);
    expect(stops()).toEqual([1]);

    // A pointer focus moves the stop, so the next arrow continues from the tile the reader is on.
    tiles(wrapper)[5]!.focus();
    await settle();
    tiles(wrapper)[5]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    await settle();
    expect(document.activeElement).toBe(tiles(wrapper)[4]);

    tiles(wrapper)[4]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    await settle();
    expect(document.activeElement).toBe(tiles(wrapper).at(-1));
  });
});
