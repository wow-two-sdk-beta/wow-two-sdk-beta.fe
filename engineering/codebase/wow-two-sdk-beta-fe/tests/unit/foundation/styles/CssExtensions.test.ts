import { describe, expect, it } from 'vitest';
import { CssExtensions } from '@src/foundation/styles';

describe('CssExtensions.resolveRadius', () => {
  it('resolves own radius tokens and raw CSS values', () => {
    expect(CssExtensions.resolveRadius('md')).toEqual({ borderRadius: '0.5rem' });
    expect(CssExtensions.resolveRadius('calc(1rem + 2px)')).toEqual({ borderRadius: 'calc(1rem + 2px)' });
    expect(CssExtensions.resolveRadius(0)).toEqual({ borderRadius: '0px' });
  });

  it.each(['constructor', 'toString', '__proto__'])('preserves inherited names as raw strings: %s', (radius) => {
    expect(CssExtensions.resolveRadius(radius)).toEqual({ borderRadius: radius });
  });
});
