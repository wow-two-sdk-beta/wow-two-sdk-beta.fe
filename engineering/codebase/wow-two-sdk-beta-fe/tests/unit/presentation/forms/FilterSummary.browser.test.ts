import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { FilterSummary } from '@src/presentation/forms';
import '@src/index.css';

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

/** Mounts a summary in a size container `width` px wide, the way an app's filter row declares `@container`. */
async function mountIn(width: number, isCounting = false): Promise<HTMLElement> {
  wrapper = mount(
    {
      render: () =>
        h('div', { style: { containerType: 'inline-size', width: `${width}px` } }, [
          h(FilterSummary, { matched: 1234, total: 10000, isFiltered: true, isCounting }),
        ]),
    },
    { attachTo: document.body },
  );
  await nextTick();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  return document.querySelector<HTMLElement>('[data-filter-summary-count]')!;
}

const shownText = (count: HTMLElement): string =>
  [...count.querySelectorAll<HTMLElement>(':scope > span > span')]
    .filter((span) => getComputedStyle(span).display !== 'none')
    .map((span) => span.textContent?.trim())
    .join('|');

describe('FilterSummary in the browser', () => {
  /* The threshold (spec § Container queries) is tested 1px under it and at it. */
  it('reads the compact count in a container under 300px and the full count from 300px', async () => {
    expect(shownText(await mountIn(299))).toBe('1,234 / 10,000');
    wrapper?.unmount();
    expect(shownText(await mountIn(300))).toBe('1,234 out of 10,000');
  });

  it('keeps one 40px pill and 14px tabular count text under a mouse', async () => {
    const count = await mountIn(480);
    const pill = document.querySelector<HTMLElement>('[data-filter-summary]')!;
    expect(pill.getBoundingClientRect().height).toBe(40);
    const style = getComputedStyle(count);
    expect(style.fontSize).toBe('14px');
    expect(style.fontVariantNumeric).toContain('tabular-nums');
    expect(style.whiteSpace).toBe('nowrap');
  });

  it('keeps the count box while counting, so the pill never jumps', async () => {
    const settled = (await mountIn(480)).getBoundingClientRect();
    wrapper?.unmount();
    const counting = (await mountIn(480, true)).getBoundingClientRect();
    expect(counting.width).toBe(settled.width);
    expect(counting.height).toBe(settled.height);
    const placeholder = document.querySelector<HTMLElement>('[data-filter-summary-placeholder]')!;
    expect(placeholder.getBoundingClientRect().width).toBeGreaterThan(0);
  });
});
