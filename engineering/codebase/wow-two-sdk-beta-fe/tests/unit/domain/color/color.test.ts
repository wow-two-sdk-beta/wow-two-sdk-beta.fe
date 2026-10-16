import { describe, expect, it } from 'vitest';
import { Gradient, GradientType } from '@src/domain/color';

/*
 * Smoke depth, `unit` project (node). `domain/color` is a pure value model — every op returns a
 * NEW gradient and the input is never mutated, which is what lets a picker hold one in a `ref`
 * and diff it. The type-switch op is the one with real branching, so it gets both directions.
 */

const linear = Gradient.twoStop('#ff0000', '#0000ff', 90);

describe('construction', () => {
  it('builds a two-stop linear gradient with the documented offsets', () => {
    expect(linear.type).toBe(GradientType.Linear);
    expect(linear.angle).toBe(90);
    expect(linear.stops.map((stop) => stop.offset)).toEqual([0, 1]);
  });

  it('builds a radial gradient', () => {
    expect(Gradient.radial(linear.stops, 0.5).type).toBe(GradientType.Radial);
  });
});

describe('immutability', () => {
  it('returns a new gradient and leaves the source alone', () => {
    const changed = Gradient.withStop(linear, 0, '#00ff00');

    expect(changed).not.toBe(linear);
    expect(linear.stops[0]?.color).toBe('#ff0000');
    expect(changed.stops[0]?.color).toBe('#00ff00');
  });
});

describe('reverseStops', () => {
  it('mirrors the colors end-to-end, keeping every offset', () => {
    const flipped = Gradient.reverseStops(linear);

    expect(flipped.stops.map((stop) => stop.color)).toEqual(['#0000ff', '#ff0000']);
    expect(flipped.stops.map((stop) => stop.offset)).toEqual([0, 1]);
  });
});

describe('projection ops', () => {
  const defaults = { angle: 45, radius: 0.75 };

  it('switches type, carrying the stops and seeding the target field', () => {
    const radial = Gradient.withType(linear, GradientType.Radial, defaults);
    expect(radial.type).toBe(GradientType.Radial);
    expect(radial.stops).toEqual(linear.stops);

    const back = Gradient.withType(radial, GradientType.Linear, defaults);
    expect(back.type).toBe(GradientType.Linear);
  });

  it('is a no-op when already that type', () => {
    expect(Gradient.withType(linear, GradientType.Linear, defaults)).toBe(linear);
  });

  /* An angle op on a radial gradient (or a radius op on a linear one) has nowhere to land — it
     must return the value untouched rather than growing a field the discriminant forbids. */
  it('ignores an op that does not apply to the projection', () => {
    const radial = Gradient.radial(linear.stops, 0.5);

    expect(Gradient.withAngle(radial, 30)).toBe(radial);
    expect(Gradient.withRadius(linear, 0.3)).toBe(linear);
  });
});
