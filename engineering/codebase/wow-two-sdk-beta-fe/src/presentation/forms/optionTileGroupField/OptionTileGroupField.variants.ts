import { tv, Align, type VariantProps } from '../../../foundation/styles';

/** Provides the tile-row layout for `OptionTileGroupField` — flex row, gap, optional wrap and alignment. */
export const optionTileGroupVariants = tv({
  base: 'flex items-center gap-2',
  variants: {
    wrap: {
      true: 'flex-wrap',
      false: '',
    },
    align: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
    },
  },
  defaultVariants: {
    wrap: false,
    align: 'start',
  },
});

export type OptionTileGroupFieldVariants = VariantProps<typeof optionTileGroupVariants>;

/* Compile-time lock: shared `Align` values ≡ tv `align` keys (drift = type error). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertOptionTileGroupAlign: AssertExact<Align, NonNullable<OptionTileGroupFieldVariants['align']>> = true;
void _assertOptionTileGroupAlign;
