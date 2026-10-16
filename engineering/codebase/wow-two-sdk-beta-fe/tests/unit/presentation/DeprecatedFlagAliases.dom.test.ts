import { afterEach, describe, expect, it } from 'vitest';
import type { Component } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import Pagination from '@src/presentation/nav/pagination/Pagination.vue';
import InlineLayout from '@src/presentation/layout/inlineLayout/InlineLayout.vue';
import Section from '@src/presentation/layout/section/Section.vue';
import Navbar from '@src/presentation/layout/navbar/Navbar.vue';
import PricingCard from '@src/presentation/display/pricingCard/PricingCard.vue';
import ControlGroupField from '@src/presentation/forms/controlGroupField/ControlGroupField.vue';
import OptionTileGroupField from '@src/presentation/forms/optionTileGroupField/OptionTileGroupField.vue';
import DateInput from '@src/presentation/forms/dateInput/DateInput.vue';
import TimeInput from '@src/presentation/forms/timeInput/TimeInput.vue';
import DateTimeInput from '@src/presentation/forms/dateTimeInput/DateTimeInput.vue';

/*
 * S8 renamed every unprefixed boolean prop to the `is*` / `has*` / `can*` / `show*` vocabulary and kept the old
 * name one release as a deprecated alias. Each case renders the component under the old name and under the new
 * one and expects identical markup — and a different render from the default, so no case passes vacuously.
 */

const wrappers: VueWrapper[] = [];

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
});

/** Renders a component and replaces generated ids, which differ per mount, with stable placeholders. */
function render(component: Component, props: Record<string, unknown>): string {
  const wrapper = mount(component, { props, slots: { default: () => 'Body' } });
  wrappers.push(wrapper);
  const html = wrapper.html();
  const ids = [...html.matchAll(/\bid="([^"]+)"/gu)].map((match) => match[1]!);
  return ids.reduce((text, id, index) => text.replaceAll(id, `id-${index}`), html);
}

interface AliasCase {
  readonly name: string;
  readonly component: Component;
  readonly base: Record<string, unknown>;
  readonly legacy: Record<string, unknown>;
  readonly current: Record<string, unknown>;
}

const Cases: ReadonlyArray<AliasCase> = [
  {
    name: 'Pagination hideFirstLast',
    component: Pagination,
    base: { page: 3, total: 10 },
    legacy: { hideFirstLast: true },
    current: { showFirstLast: false },
  },
  {
    name: 'InlineLayout wrap',
    component: InlineLayout,
    base: {},
    legacy: { wrap: false },
    current: { canWrap: false },
  },
  { name: 'Section bleed', component: Section, base: {}, legacy: { bleed: true }, current: { isFullBleed: true } },
  { name: 'Navbar sticky', component: Navbar, base: {}, legacy: { sticky: true }, current: { isSticky: true } },
  { name: 'Navbar bordered', component: Navbar, base: {}, legacy: { bordered: false }, current: { hasBorder: false } },
  {
    name: 'PricingCard featured',
    component: PricingCard,
    base: { name: 'Pro', price: '$9', features: ['Sync'] },
    legacy: { featured: true },
    current: { isFeatured: true },
  },
  {
    name: 'ControlGroupField divided',
    component: ControlGroupField,
    base: { label: 'Size' },
    legacy: { divided: false },
    current: { hasDivider: false },
  },
  {
    name: 'OptionTileGroupField wrap',
    component: OptionTileGroupField,
    base: { label: 'Plan' },
    legacy: { wrap: true },
    current: { canWrap: true },
  },
  { name: 'DateInput native', component: DateInput, base: {}, legacy: { native: true }, current: { isNative: true } },
  { name: 'TimeInput native', component: TimeInput, base: {}, legacy: { native: true }, current: { isNative: true } },
  {
    name: 'DateTimeInput native',
    component: DateTimeInput,
    base: {},
    legacy: { native: true },
    current: { isNative: true },
  },
];

describe('deprecated boolean prop aliases', () => {
  it.each(Cases)('$name renders like its prefixed replacement', ({ component, base, legacy, current }) => {
    const underLegacy = render(component, { ...base, ...legacy });
    expect(underLegacy).toBe(render(component, { ...base, ...current }));
    expect(underLegacy).not.toBe(render(component, base));
  });

  it('lets the prefixed name win when both are set', () => {
    const both = render(Pagination, { page: 3, total: 10, showFirstLast: true, hideFirstLast: true });
    expect(both).toBe(render(Pagination, { page: 3, total: 10 }));
  });
});
