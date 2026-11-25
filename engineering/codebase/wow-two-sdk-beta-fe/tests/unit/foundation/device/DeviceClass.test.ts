import { describe, expect, it } from 'vitest';
import {
  DeviceClass,
  DeviceClassOrder,
  PointerType,
  ShortHeightPx,
  ShortHeightQuery,
  TailwindBreakpoints,
  detectDeviceClass,
  resolveDeviceClass,
} from '@src/foundation/device';

const { Phone, Tablet, Desktop } = DeviceClass;
const { Coarse, Fine, None } = PointerType;

describe('DeviceClassOrder', () => {
  it('runs phone, tablet, desktop', () => {
    expect(DeviceClassOrder).toEqual([Phone, Tablet, Desktop]);
  });
});

describe('detectDeviceClass', () => {
  const detect = (width: number, height: number, pointer: PointerType) =>
    detectDeviceClass({ width, height, pointer }, TailwindBreakpoints);

  it('calls a landscape phone a phone though its width alone reads as a tablet', () => {
    expect(detect(844, 390, Coarse)).toBe(Phone);
    expect(detectDeviceClass({ width: 844, height: 390, pointer: Fine }, TailwindBreakpoints)).toBe(Tablet);
  });

  it('calls an iPad-like tablet a tablet in portrait', () => {
    expect(detect(820, 1180, Coarse)).toBe(Tablet);
  });

  it('calls a landscape iPad-like tablet a desktop', () => {
    expect(detect(1024, 768, Coarse)).toBe(Desktop);
    expect(detect(1180, 820, Coarse)).toBe(Desktop);
  });

  it('calls a wide fine-pointer window a desktop', () => {
    expect(detect(1440, 900, Fine)).toBe(Desktop);
  });

  it('calls a viewport narrower than md a phone whatever its pointer or height', () => {
    expect(detect(390, 844, Coarse)).toBe(Phone);
    expect(detect(767, 1200, Fine)).toBe(Phone);
    expect(detect(767, 1200, None)).toBe(Phone);
  });

  it('switches class exactly at md and lg', () => {
    expect(detect(767, 900, Fine)).toBe(Phone);
    expect(detect(768, 900, Fine)).toBe(Tablet);
    expect(detect(1023, 900, Fine)).toBe(Tablet);
    expect(detect(1024, 900, Fine)).toBe(Desktop);
  });

  it('switches to a phone exactly below the short height, and only for a coarse pointer', () => {
    expect(detect(1200, ShortHeightPx - 1, Coarse)).toBe(Phone);
    expect(detect(1200, ShortHeightPx, Coarse)).toBe(Desktop);
    expect(detect(1200, ShortHeightPx - 1, Fine)).toBe(Desktop);
    expect(detect(900, ShortHeightPx - 1, Fine)).toBe(Tablet);
    expect(detect(1200, ShortHeightPx - 1, None)).toBe(Desktop);
  });

  it('reads the caller scale, not a built-in one', () => {
    const scale = { md: 600, lg: 900 };
    expect(detectDeviceClass({ width: 599, height: 900, pointer: Fine }, scale)).toBe(Phone);
    expect(detectDeviceClass({ width: 700, height: 900, pointer: Fine }, scale)).toBe(Tablet);
    expect(detectDeviceClass({ width: 900, height: 900, pointer: Fine }, scale)).toBe(Desktop);
  });

  it('reads a scale without finite md and lg as desktop instead of throwing', () => {
    const broken = { md: Number.NaN, lg: Number.NaN };
    expect(detectDeviceClass({ width: 100, height: 900, pointer: Fine }, broken)).toBe(Desktop);
  });

  it('exposes the query that matches the short-height band', () => {
    expect(ShortHeightQuery).toBe('(max-height: 499px)');
  });
});

describe('resolveDeviceClass', () => {
  it('serves a class the product declares as itself', () => {
    expect(resolveDeviceClass(Tablet, [Phone, Tablet, Desktop])).toBe(Tablet);
    expect(resolveDeviceClass(Phone, [Phone])).toBe(Phone);
  });

  it('serves an undeclared tablet with the phone layout when targets are phone and desktop', () => {
    expect(resolveDeviceClass(Tablet, [Phone, Desktop])).toBe(Phone);
  });

  it('serves a phone with the smallest declared class when none is narrower', () => {
    expect(resolveDeviceClass(Phone, [Desktop])).toBe(Desktop);
    expect(resolveDeviceClass(Phone, [Tablet, Desktop])).toBe(Tablet);
  });

  it('serves a desktop with the largest declared class', () => {
    expect(resolveDeviceClass(Desktop, [Phone])).toBe(Phone);
    expect(resolveDeviceClass(Desktop, [Phone, Tablet])).toBe(Tablet);
  });

  it('returns the detected class for empty or missing targets', () => {
    expect(resolveDeviceClass(Tablet)).toBe(Tablet);
    expect(resolveDeviceClass(Tablet, undefined)).toBe(Tablet);
    expect(resolveDeviceClass(Phone, [])).toBe(Phone);
  });

  it('ignores the order and repetition of targets', () => {
    expect(resolveDeviceClass(Tablet, [Desktop, Phone, Desktop, Phone])).toBe(Phone);
    expect(resolveDeviceClass(Phone, [Desktop, Tablet])).toBe(Tablet);
  });

  it('ignores an entry that is not a device class', () => {
    expect(resolveDeviceClass(Tablet, ['watch' as DeviceClass])).toBe(Tablet);
    expect(resolveDeviceClass(Desktop, ['watch' as DeviceClass, Phone])).toBe(Phone);
  });

  it('serves every detected class from every non-empty set of targets', () => {
    const sets = [
      [Phone],
      [Tablet],
      [Desktop],
      [Phone, Tablet],
      [Phone, Desktop],
      [Tablet, Desktop],
      [Phone, Tablet, Desktop],
    ];
    for (const detected of DeviceClassOrder) {
      for (const targets of sets) {
        const served = resolveDeviceClass(detected, targets);
        expect(targets).toContain(served);
        const wider = targets.filter(
          (candidate) => DeviceClassOrder.indexOf(candidate) > DeviceClassOrder.indexOf(detected),
        );
        if (wider.length < targets.length) {
          expect(DeviceClassOrder.indexOf(served)).toBeLessThanOrEqual(DeviceClassOrder.indexOf(detected));
        }
      }
    }
  });
});
