import { tv, type VariantProps } from '../../../foundation/styles';

/**
 * Adds `OptionTilePicker`'s pressed wash on top of the underlying `ToggleInput`
 * outline treatment. The tint is a semantic token (`primary`), not a
 * hard-coded color — it layers after `toggleButtonVariants` via class order.
 */
export const optionTileVariants = tv({
  base: 'data-[pressed=true]:bg-primary/10',
});

export type OptionTilePickerVariants = VariantProps<typeof optionTileVariants>;
