import { describe, expect, it } from 'vitest';
import { continuationSize } from '@src/foundation/virtualization';

/*
 * `continuationSize(speed, viewportSize, minimum, maximum)` — `speed` in pixels per millisecond. The page grows by
 * `minimum` for every 1.5 viewports consumed per second (rounded up), and never past `maximum`.
 */
describe('continuationSize', () => {
  it('asks for the minimum page at rest', () => {
    expect(continuationSize(0, 800, 20, 100)).toBe(20);
  });

  it('asks for the minimum page while the pace stays within 1.5 viewports a second', () => {
    /* 1.5 px/ms over a 1000px viewport is exactly 1.5 viewports a second. */
    expect(continuationSize(1.5, 1000, 20, 200)).toBe(20);
    expect(continuationSize(0.3, 1000, 20, 200)).toBe(20);
  });

  it('steps to two minimum pages just past 1.5 viewports a second', () => {
    expect(continuationSize(1.5001, 1000, 20, 200)).toBe(40);
    expect(continuationSize(3, 1000, 20, 200)).toBe(40);
  });

  it('steps to three minimum pages just past 3 viewports a second, and so on', () => {
    expect(continuationSize(3.0001, 1000, 20, 200)).toBe(60);
    expect(continuationSize(4.5, 1000, 20, 200)).toBe(60);
    expect(continuationSize(4.5001, 1000, 20, 200)).toBe(80);
  });

  it('measures the pace in viewports, so the same speed asks for more on a shorter viewport', () => {
    expect(continuationSize(1.5, 1000, 10, 500)).toBe(10);
    expect(continuationSize(1.5, 500, 10, 500)).toBe(20);
    expect(continuationSize(1.5, 250, 10, 500)).toBe(40);
  });

  it('never exceeds the maximum, however fast', () => {
    expect(continuationSize(4.5001, 1000, 20, 70)).toBe(70);
    expect(continuationSize(1000, 800, 20, 100)).toBe(100);
    expect(continuationSize(Number.POSITIVE_INFINITY, 800, 20, 100)).toBe(100);
  });

  it('returns exactly the maximum at the step that reaches it', () => {
    expect(continuationSize(3, 1000, 20, 40)).toBe(40);
    expect(continuationSize(3.0001, 1000, 20, 60)).toBe(60);
  });

  it('lets the maximum win over a larger minimum', () => {
    expect(continuationSize(0, 800, 50, 20)).toBe(20);
    expect(continuationSize(10, 800, 50, 20)).toBe(20);
  });

  it('asks for the minimum when the pace is negative', () => {
    expect(continuationSize(-5, 800, 20, 100)).toBe(20);
  });

  it('floors the viewport at 1px, so a collapsed viewport divides by one, never by zero', () => {
    expect(continuationSize(0.0015, 0, 20, 100)).toBe(20);
    expect(continuationSize(0.0016, 0, 20, 100)).toBe(40);
    expect(continuationSize(0.0015, -300, 20, 100)).toBe(20);
    expect(continuationSize(0.5, 0, 20, 100)).toBe(100);
  });

  it('scales a fractional minimum without rounding it', () => {
    expect(continuationSize(2, 1000, 7.5, 100)).toBe(15);
  });
});
