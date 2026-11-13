import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { DotsIndicator, dotsIndicatorWindowOf } from '@src/presentation/display';

/** The positions and the current one of a window, as the dots draw them. */
function windowOf(count: number, index: number, visibleCount: number) {
  const dots = dotsIndicatorWindowOf(count, index, visibleCount);
  return { positions: dots.map((dot) => dot.position), active: dots.findIndex((dot) => dot.isActive) };
}

describe('dots indicator window', () => {
  it('centres the current item on a 3-dot window', () => {
    expect(windowOf(10, 2, 3)).toEqual({ positions: [1, 2, 3], active: 1 });
  });

  it('centres the current item on a 5-dot window', () => {
    expect(windowOf(10, 2, 5)).toEqual({ positions: [0, 1, 2, 3, 4], active: 2 });
    expect(windowOf(10, 5, 5)).toEqual({ positions: [3, 4, 5, 6, 7], active: 2 });
  });

  it('stops at the ends and moves the current dot toward the edge', () => {
    expect(windowOf(10, 0, 5)).toEqual({ positions: [0, 1, 2, 3, 4], active: 0 });
    expect(windowOf(10, 1, 5)).toEqual({ positions: [0, 1, 2, 3, 4], active: 1 });
    expect(windowOf(10, 8, 5)).toEqual({ positions: [5, 6, 7, 8, 9], active: 3 });
    expect(windowOf(10, 9, 5)).toEqual({ positions: [5, 6, 7, 8, 9], active: 4 });
  });

  it('centres one dot early on an even window', () => {
    expect(windowOf(10, 5, 4)).toEqual({ positions: [4, 5, 6, 7], active: 1 });
  });

  it('shows every item when the window is wider than the series', () => {
    expect(windowOf(3, 1, 5)).toEqual({ positions: [0, 1, 2], active: 1 });
    expect(windowOf(1, 0, 5)).toEqual({ positions: [0], active: 0 });
  });

  it('clamps the index and survives bad numbers', () => {
    expect(windowOf(10, 99, 3)).toEqual({ positions: [7, 8, 9], active: 2 });
    expect(windowOf(10, -4, 3)).toEqual({ positions: [0, 1, 2], active: 0 });
    expect(dotsIndicatorWindowOf(0, 0, 5)).toEqual([]);
    expect(dotsIndicatorWindowOf(Number.NaN, 0, 5)).toEqual([]);
    expect(windowOf(10, Number.NaN, 3)).toEqual({ positions: [0, 1, 2], active: 0 });
  });

  it('marks an edge dot only while more items lie beyond it', () => {
    const edges = (index: number) => dotsIndicatorWindowOf(10, index, 5).map((dot) => dot.edge);
    expect(edges(0)).toEqual([undefined, undefined, undefined, undefined, 'end']);
    expect(edges(5)).toEqual(['start', undefined, undefined, undefined, 'end']);
    expect(edges(9)).toEqual(['start', undefined, undefined, undefined, undefined]);
    expect(dotsIndicatorWindowOf(4, 1, 5).every((dot) => dot.edge === undefined)).toBe(true);
  });
});

describe('DotsIndicator', () => {
  it('draws the windowed dots, the current one highlighted, named by its position', () => {
    const wrapper = mount(DotsIndicator, { props: { count: 10, index: 2, visibleCount: 3 } });
    expect(wrapper.attributes('role')).toBe('img');
    expect(wrapper.attributes('aria-label')).toBe('3 of 10');
    const dots = wrapper.findAll('[data-dot]');
    expect(dots).toHaveLength(3);
    expect(dots.map((dot) => dot.attributes('data-active'))).toEqual([undefined, 'true', undefined]);
    expect(dots[1]!.classes()).toContain('opacity-100');
    expect(dots[0]!.attributes('data-edge')).toBe('start');
    expect(dots[0]!.classes()).toContain('size-1');
    expect(dots[2]!.attributes('data-edge')).toBe('end');
  });

  it('shows every dot of a short series, five by default for a long one', () => {
    expect(mount(DotsIndicator, { props: { count: 3, index: 0 } }).findAll('[data-dot]')).toHaveLength(3);
    expect(mount(DotsIndicator, { props: { count: 12, index: 6 } }).findAll('[data-dot]')).toHaveLength(5);
  });

  it('takes its colour from the text colour it is given, and renders nothing without items', () => {
    const wrapper = mount(DotsIndicator, { props: { count: 4, index: 1 }, attrs: { class: 'text-white' } });
    expect(wrapper.classes()).toContain('text-white');
    expect(wrapper.get('[data-dot]').classes()).toContain('bg-current');
    expect(
      mount(DotsIndicator, { props: { count: 0, index: 0 } })
        .find('[data-dot]')
        .exists(),
    ).toBe(false);
  });
});
