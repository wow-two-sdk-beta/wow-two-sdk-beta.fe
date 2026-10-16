import { describe, expect, it } from 'vitest';
import { h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { MultiSelectPicker, MultiSelectPickerTrigger } from '@src/presentation/forms';
import { applyMask } from '@src/presentation/forms/maskedInput/MaskedInput.vue';

/*
 * Defects found walking the playground. Each case pins the exact shape that was wrong, not
 * the component's whole surface — the smoke sweeps in `Forms.dom.test.ts` cover that.
 */

describe('MaskedInput — applyMask', () => {
  /*
   * `mask` is a required prop, but Vue only warns on a missing one and renders anyway, so the
   * unguarded `mask.length` turned every keystroke into `TypeError: Cannot read properties of
   * undefined (reading 'length')`. A required-prop mistake must stay a console warning.
   */
  it('passes the raw value through instead of throwing when the mask is missing', () => {
    expect(() => applyMask('123', undefined as unknown as string)).not.toThrow();
    expect(applyMask('123', undefined as unknown as string)).toBe('123');
    expect(applyMask('123', '')).toBe('123');
  });

  it('still applies a real mask', () => {
    expect(applyMask('5558675309', '###-###-####')).toBe('555-867-5309');
    expect(applyMask('abc1234', 'AAA-####')).toBe('abc-1234');
    /* Characters of the wrong class are skipped, not inserted. */
    expect(applyMask('a1b2c3', '###')).toBe('123');
  });
});

describe('MultiSelectPickerTags', () => {
  const OPTIONS: Record<string, string> = {
    a: 'Alpha',
    b: 'Beta',
    c: 'Gamma',
    d: 'Delta',
    e: 'Epsilon',
  };

  function mountTrigger(values: string[], maxVisibleTags?: number) {
    return mount({
      render: () =>
        h(MultiSelectPicker, { modelValue: values, getOptionLabel: (v: string) => OPTIONS[v] ?? null }, () =>
          h(MultiSelectPickerTrigger, { maxVisibleTags }),
        ),
    });
  }

  /*
   * Rows register their label only while the panel is mounted, so before the first open the
   * trigger had nothing but the raw key — and the chip carried `bg-muted` on a `bg-popover`
   * trigger, which is the same color in several shipped themes. Selections read as an empty
   * trigger. `getOptionLabel` is the closed-trigger resolver; the border is what keeps the
   * chip visible when the two surfaces collide.
   */
  it('labels a preselected value from getOptionLabel and gives the chip an edge', async () => {
    const wrapper = mountTrigger(['a', 'b']);
    await nextTick();

    const chips = wrapper.findAll('span.bg-muted');
    expect(chips).toHaveLength(2);
    expect(chips.map((c) => c.text().trim())).toEqual(['Alpha', 'Beta']);
    expect(chips[0]?.classes(), 'chip has no border to separate it from the trigger').toContain('border-border');
  });

  /*
   * Past the budget the rest collapse into a `+N` summary. It must not be reachable or
   * chip-shaped: a rounded, filled, removable-looking `+N` reads as one more selection.
   */
  it('collapses past max-visible-tags into a non-interactive +N block', async () => {
    const wrapper = mountTrigger(['a', 'b', 'c', 'd', 'e'], 2);
    await nextTick();

    expect(wrapper.findAll('span.bg-muted')).toHaveLength(2);
    expect(wrapper.text()).toContain('+3');

    const overflow = wrapper.findAll('span').find((s) => s.text().trim() === '+3' && s.element.children.length === 0);
    expect(overflow, 'no +N element rendered').toBeDefined();
    expect(overflow?.attributes('role'), '+N is exposed as a control').toBeUndefined();
    expect(overflow?.classes().join(' ')).not.toMatch(/rounded|bg-muted/);

    /* One remove button per VISIBLE chip — the collapsed values contribute none. */
    expect(wrapper.findAll('[role="button"]')).toHaveLength(2);
  });

  it('renders every chip when no budget is set', async () => {
    const wrapper = mountTrigger(['a', 'b', 'c', 'd', 'e']);
    await nextTick();

    expect(wrapper.findAll('span.bg-muted')).toHaveLength(5);
    expect(wrapper.text()).not.toContain('+');
  });
});
