import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, type VNode } from 'vue';
import { Calendar } from 'lucide-vue-next';
import { Icon } from '@src/foundation/icons';
import { Badge, type BadgeProps } from '@src/presentation/display';
import '@src/index.css';

// Forced colours replace fills and text with system colours by design, so there is nothing to compare.
const isForcedColors = matchMedia('(forced-colors: active)').matches;

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

const LongLabel = 'contemporary exhibitions, installations and performance art';

/** A flex row that never wraps, `width` px wide, holding `pills`. */
function mountRow(width: number, pills: () => VNode[]): HTMLElement {
  wrapper = mount(
    {
      render: () =>
        h(
          'div',
          { 'data-row': '', class: 'flex flex-nowrap items-center gap-1.5', style: { width: `${width}px` } },
          pills(),
        ),
    },
    { attachTo: document.body },
  );
  return document.querySelector<HTMLElement>('[data-row]')!;
}

/** A glyph pill: the leading `Icon` and a label, as an app's own glyph table would set one. */
function pill(props: BadgeProps, label: string): VNode {
  return h(Badge, props, { default: () => label, leading: () => h(Icon, { icon: Calendar, size: 14 }) });
}

function part(row: HTMLElement, selector: string): HTMLElement {
  return row.querySelector<HTMLElement>(selector)!;
}

describe('a shrinkable badge in a narrow row', () => {
  it('cuts a long label with an ellipsis and keeps the leading glyph at full width', () => {
    const row = mountRow(120, () => [pill({ isShrinkable: true }, LongLabel)]);
    const label = part(row, '[data-badge-label]');
    const glyph = part(row, '[data-badge-leading]');
    const badge = row.firstElementChild as HTMLElement;

    expect(getComputedStyle(label).textOverflow).toBe('ellipsis');
    expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
    expect(badge.getBoundingClientRect().width).toBeLessThanOrEqual(120.5);
    const narrowGlyph = glyph.getBoundingClientRect().width;

    wrapper!.unmount();
    const wide = mountRow(800, () => [pill({ isShrinkable: true }, LongLabel)]);
    const wideLabel = part(wide, '[data-badge-label]');
    expect(wideLabel.scrollWidth).toBeLessThanOrEqual(wideLabel.clientWidth);
    const fullGlyph = part(wide, '[data-badge-leading]').getBoundingClientRect().width;
    expect(fullGlyph).toBeGreaterThanOrEqual(14);
    expect(narrowGlyph).toBeCloseTo(fullGlyph, 1);
  });

  it('cuts a plain label with no glyph or detail the same way', () => {
    const row = mountRow(120, () => [h(Badge, { isShrinkable: true }, () => LongLabel)]);
    const label = part(row, '[data-badge-label]');
    expect(getComputedStyle(label).textOverflow).toBe('ellipsis');
    expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
    expect((row.firstElementChild as HTMLElement).getBoundingClientRect().width).toBeLessThanOrEqual(120.5);
  });

  it('takes only the room its siblings leave, which keep their width', () => {
    const row = mountRow(120, () => [
      pill({ variant: 'glass' }, 'event'),
      pill({ variant: 'glassSuccess', isShrinkable: true }, LongLabel),
    ]);
    const [first, second] = [...row.children] as HTMLElement[];
    const firstLabel = part(first!, '[data-badge-label]');
    const secondLabel = part(second!, '[data-badge-label]');
    expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
    expect(second!.getBoundingClientRect().right).toBeLessThanOrEqual(row.getBoundingClientRect().right + 0.5);
    expect(secondLabel.scrollWidth).toBeGreaterThan(secondLabel.clientWidth);
    expect(firstLabel.scrollWidth).toBeLessThanOrEqual(firstLabel.clientWidth);
    expect(part(second!, '[data-badge-leading]').getBoundingClientRect().width).toBeGreaterThanOrEqual(14);
  });

  it('overflows the row without isShrinkable, which is what the prop prevents', () => {
    const row = mountRow(120, () => [pill({}, 'event'), pill({}, LongLabel)]);
    expect(row.scrollWidth).toBeGreaterThan(row.clientWidth);
  });
});

describe.skipIf(isForcedColors)('glass badges over imagery', () => {
  it('draws light text on a blurred wash in either theme', () => {
    for (const theme of ['light', 'dark']) {
      document.documentElement.classList.toggle('dark', theme === 'dark');
      const row = mountRow(400, () => [
        h(Badge, { variant: 'glass' }, () => 'glass'),
        h(Badge, { variant: 'glassSuccess' }, () => 'success'),
      ]);
      const [glass, success] = [...row.children] as HTMLElement[];
      expect(getComputedStyle(glass!).color).toBe('rgb(255, 255, 255)');
      expect(getComputedStyle(success!).color).toBe('rgb(240, 253, 244)');
      const sample = document.createElement('canvas').getContext('2d')!;
      sample.fillStyle = '#fff';
      sample.fillRect(0, 0, 1, 1);
      sample.fillStyle = getComputedStyle(glass!).backgroundColor;
      sample.fillRect(0, 0, 1, 1);
      expect(Math.max(...sample.getImageData(0, 0, 1, 1).data.slice(0, 3))).toBeLessThanOrEqual(118);
      for (const pillElement of [glass!, success!]) {
        const style = getComputedStyle(pillElement);
        expect(style.backdropFilter || style.getPropertyValue('-webkit-backdrop-filter')).toContain('blur');
      }
      wrapper!.unmount();
    }
    document.documentElement.classList.remove('dark');
  });

  it('keeps the detail in the pill light text and draws a hairline only when outlined', () => {
    const row = mountRow(400, () => [
      h(Badge, { variant: 'glass', detail: '3' }, () => 'posts'),
      h(Badge, { variant: 'glassSuccess', isOutlined: true, borderStyle: 'dashed' }, () => 'ok'),
    ]);
    const [plain, outlined] = [...row.children] as HTMLElement[];
    expect(part(row, '[data-detail]').classList.contains('text-muted-foreground')).toBe(false);
    expect(getComputedStyle(plain!).borderTopWidth).toBe('0px');
    expect(getComputedStyle(outlined!).borderTopWidth).toBe('1px');
    expect(getComputedStyle(outlined!).borderTopStyle).toBe('dashed');
  });
});
