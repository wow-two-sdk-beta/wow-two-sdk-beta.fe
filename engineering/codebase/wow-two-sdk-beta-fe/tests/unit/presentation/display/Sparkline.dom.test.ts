import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { Sparkline } from '@src/presentation/display';

/** The x of each vertex of the line path. */
function xs(d: string): number[] {
  return [...d.matchAll(/[ML]([\d.]+),/g)].map((match) => Number(match[1]));
}

describe('Sparkline time axis and thresholds', () => {
  it('places readings by instant inside the window, so a short history sits at the right end', () => {
    const wrapper = mount(Sparkline, {
      props: {
        width: 100,
        points: [
          { at: 1_000, value: 10 },
          { at: 1_500, value: 20 },
          { at: 2_000, value: 30 },
        ],
        since: 0,
        until: 2_000,
      },
    });
    expect(xs(wrapper.get('path').attributes('d')!)).toEqual([50, 75, 100]);
  });

  it('defaults the window to the first and last instants', () => {
    const wrapper = mount(Sparkline, {
      props: {
        width: 100,
        points: [
          { at: 0, value: 1 },
          { at: 250, value: 2 },
          { at: 1_000, value: 3 },
        ],
      },
    });
    expect(xs(wrapper.get('path').attributes('d')!)).toEqual([0, 25, 100]);
  });

  it('ignores data while points are set and keeps evenly spaced data otherwise', () => {
    const timed = mount(Sparkline, { props: { width: 100, data: [1, 2, 3, 4, 5], points: [{ at: 5, value: 1 }] } });
    expect(xs(timed.get('path').attributes('d')!)).toEqual([100]);
    const even = mount(Sparkline, { props: { width: 100, data: [1, 2, 3] } });
    expect(xs(even.get('path').attributes('d')!)).toEqual([0, 50, 100]);
  });

  it('draws a dashed line per threshold on the series scale, in its tone', () => {
    const wrapper = mount(Sparkline, {
      props: {
        width: 100,
        height: 52,
        min: 0,
        max: 100,
        points: [
          { at: 0, value: 20 },
          { at: 1, value: 40 },
        ],
        thresholds: [{ value: 80, tone: 'warning' }, { value: 95, tone: 'danger' }, { value: 50 }],
      },
    });
    const lines = wrapper.findAll('[data-threshold]');
    expect(lines.map((line) => Number(line.attributes('y1')))).toEqual([11, 3.5, 26]);
    expect(lines.map((line) => line.classes().join(' '))).toEqual([
      'text-warning',
      'text-destructive',
      'text-muted-foreground',
    ]);
    expect(lines[0]!.attributes('stroke-dasharray')).toBe('3 3');
  });

  it('keeps strokes hairline when CSS stretches the chart', () => {
    const wrapper = mount(Sparkline, { props: { data: [1, 2] }, attrs: { class: 'h-12 w-full' } });
    expect(wrapper.get('path').attributes('vector-effect')).toBe('non-scaling-stroke');
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['h-12', 'w-full']));
  });

  it('draws nothing but the label for an empty time series', () => {
    const wrapper = mount(Sparkline, { props: { points: [], thresholds: [{ value: 1 }], ariaLabel: 'CPU' } });
    expect(wrapper.find('path').attributes('d')).toBe('');
    expect(wrapper.findAll('[data-threshold]')).toHaveLength(0);
    expect(wrapper.get('title').text()).toBe('CPU');
  });
});
