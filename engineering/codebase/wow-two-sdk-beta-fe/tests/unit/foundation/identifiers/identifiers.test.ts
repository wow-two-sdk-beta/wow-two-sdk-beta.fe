import { describe, expect, it } from 'vitest';
import { Guid } from '@src/foundation/identifiers';

/*
 * Smoke depth, `unit` project (node). The slice is a .NET `System.Guid` parallel, so the
 * contracts worth pinning are the two a wire mismatch would break: the emitted string is a legal
 * hyphenated GUID carrying the right VERSION nibble, and v7 values sort in creation order — the
 * whole reason v7 is the default factory.
 */

const GUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('creation', () => {
  it('emits a legal lowercase D-string from both factories', () => {
    expect(Guid.createV7()).toMatch(GUID_SHAPE);
    expect(Guid.createV4()).toMatch(GUID_SHAPE);
  });

  it('stamps the version nibble each factory claims', () => {
    expect(Guid.version(Guid.createV7())).toBe(7);
    expect(Guid.version(Guid.createV4())).toBe(4);
  });

  it('orders v7 values by creation time', () => {
    const earlier = Guid.createV7(1_700_000_000_000);
    const later = Guid.createV7(1_800_000_000_000);

    expect(Guid.compare(earlier, later)).toBeLessThan(0);
  });
});

describe('parsing', () => {
  it('parses and lowercases a valid GUID', () => {
    const upper = '0197C8F4-3E2A-7C1D-8F9A-1B2C3D4E5F60';
    expect(Guid.parse(upper)).toBe(upper.toLowerCase());
  });

  it('throws on parse and answers undefined on tryParse', () => {
    expect(() => Guid.parse('not-a-guid')).toThrow();
    expect(Guid.tryParse('not-a-guid')).toBeUndefined();
  });

  it('narrows with isGuid, and the nil GUID passes', () => {
    expect(Guid.isGuid(Guid.empty)).toBe(true);
    expect(Guid.isGuid('not-a-guid')).toBe(false);
  });
});

describe('equality', () => {
  it('compares case-insensitively', () => {
    expect(
      Guid.equals(
        Guid.parse('0197C8F4-3E2A-7C1D-8F9A-1B2C3D4E5F60'),
        Guid.parse('0197c8f4-3e2a-7c1d-8f9a-1b2c3d4e5f60'),
      ),
    ).toBe(true);
  });
});

it('rejects a GUID token with a trailing newline', () => {
  const input = '00000000-0000-0000-0000-000000000000\n';
  expect(Guid.isGuid(input)).toBe(false);
  expect(Guid.tryParse(input)).toBeUndefined();
  expect(() => Guid.parse(input)).toThrow(TypeError);
  expect(Guid.version(input)).toBeUndefined();
});
