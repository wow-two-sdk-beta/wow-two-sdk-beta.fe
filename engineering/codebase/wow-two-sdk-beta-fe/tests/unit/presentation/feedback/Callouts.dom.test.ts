import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { Component } from 'vue';
import { CharacterCountCallout, MeterBar, PasswordStrengthCallout, TrendIndicator } from '@src/presentation/feedback';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});

function render(component: unknown, props: Record<string, unknown>): VueWrapper {
  const wrapper = mount(component as Component, { props });
  wrappers.push(wrapper);
  return wrapper;
}

describe('PasswordStrengthCallout', () => {
  function verdict(value: string, props: Record<string, unknown> = {}): { label: string; filled: number } {
    const wrapper = render(PasswordStrengthCallout, { value, ...props });
    return {
      label: wrapper.find('[aria-live]').exists() ? wrapper.get('[aria-live]').text() : '',
      filled: wrapper.findAll('[aria-hidden=true] > div').filter((bar) => !bar.classes().includes('bg-muted')).length,
    };
  }

  it.each([
    ['', '', 0],
    ['abc', 'Password strength: Too weak', 0],
    ['Aa1!xyz', 'Password strength: Weak', 1],
    ['password1', 'Password strength: Fair', 2],
    ['Password12', 'Password strength: Strong', 3],
    ['Tr0ub4dor&3xyz', 'Password strength: Excellent', 4],
  ])('rates %j', (value, label, filled) => {
    expect(verdict(value)).toEqual({ label, filled });
  });

  it('keeps short passwords weak however many character classes they mix', () => {
    expect(verdict('Ab1!').filled).toBe(1);
  });

  it('takes a supplied score and still speaks a visually hidden verdict', () => {
    const wrapper = render(PasswordStrengthCallout, { value: 'x', score: 3, isLabelHidden: true });
    const live = wrapper.get('[aria-live=polite]');
    expect(live.classes()).toContain('sr-only');
    expect(live.text()).toBe('Password strength: Strong');
  });
});

describe('CharacterCountCallout', () => {
  function live(wrapper: VueWrapper): string {
    return wrapper.get('[aria-live=polite]').text();
  }

  it('shows the count silently until the last tenth of the budget', () => {
    const calm = render(CharacterCountCallout, { value: 120, max: 280 });
    expect(calm.get('[aria-hidden=true]').text()).toBe('120 / 280');
    expect(live(calm)).toBe('');
    expect(live(render(CharacterCountCallout, { value: 262, max: 280 }))).toBe('18 characters left');
  });

  it('speaks and marks an overrun with the AA text token', () => {
    const over = render(CharacterCountCallout, { value: 285, max: 280, isMaxShown: false });
    expect(over.get('[aria-hidden=true]').text()).toBe('285');
    expect(live(over)).toBe('5 characters over the limit');
    expect(over.classes()).toContain('text-destructive-soft-foreground');
  });
});

describe('MeterBar', () => {
  it.each([
    [50, 'good', '50%, normal'],
    [80, 'warn', '80%, high'],
    [95, 'critical', '95%, critical'],
  ])('puts %i in the %s zone and says so', (value, zone, text) => {
    const meter = render(MeterBar, { value, label: 'Storage' }).get('[role=meter]');
    expect(meter.attributes('data-zone')).toBe(zone);
    expect(meter.attributes('aria-valuetext')).toBe(text);
    expect(meter.attributes('aria-label')).toBe('Storage');
  });

  it('honours custom thresholds and draws nothing for a scale-less max', () => {
    expect(
      render(MeterBar, { value: 40, thresholds: [30, 60] })
        .get('[role=meter]')
        .attributes('data-zone'),
    ).toBe('warn');
    const empty = render(MeterBar, { value: 5, max: 0 });
    expect((empty.get('[role=meter] > div').element as HTMLElement).style.width).toBe('0%');
  });
});

describe('TrendIndicator', () => {
  it.each([
    [{ value: 12 }, '+12%', 'text-success-soft-foreground'],
    [{ value: -4 }, '-4%', 'text-destructive-soft-foreground'],
    [{ value: 3, isInverse: true }, '+3%', 'text-destructive-soft-foreground'],
    [{ value: 0 }, '0%', 'text-muted-foreground'],
  ])('reads %o as %s in its AA tone', (props, text, tone) => {
    const wrapper = render(TrendIndicator, props);
    expect(wrapper.text()).toBe(text);
    expect(wrapper.classes()).toContain(tone);
  });

  it('formats through a supplied formatter and a trailing label', () => {
    const wrapper = render(TrendIndicator, { value: 0.5, format: (value: number) => `${value} pts`, label: 'vs May' });
    expect(wrapper.text()).toContain('0.5 pts');
    expect(wrapper.get('.text-muted-foreground').text()).toBe('vs May');
  });
});
