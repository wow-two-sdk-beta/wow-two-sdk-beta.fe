import { tv, type VariantProps, Orientation } from '../../../foundation/styles';

/**
 * Provides the layout for `ControlGroupField` across three slots — the `root`
 * arrangement, the muted `label`, and the `content` slot holding the control(s) —
 * keyed by `orientation` and whether adjacent groups are `divided`.
 */
export const controlGroupVariants = tv({
  slots: {
    root: 'py-2 first:pt-0',
    label: 'text-sm text-muted-foreground',
    content: 'flex items-center gap-2',
  },
  variants: {
    orientation: {
      /* LabelText beside the control(s) — the settings-row look. */
      horizontal: {
        root: 'flex min-h-10 items-center justify-between gap-4',
      },
      /* LabelText stacked above the control(s) — for wide controls. */
      vertical: {
        root: 'flex flex-col gap-1.5',
        content: 'flex-wrap',
      },
    },
    /* Hairline between adjacent groups (semantic `border` token), skipped on the last. */
    divided: {
      true: { root: '[&:not(:last-child)]:border-b [&:not(:last-child)]:border-border' },
      false: {},
    },
  },
  defaultVariants: {
    orientation: 'horizontal',
    divided: true,
  },
});

export type ControlGroupFieldVariants = VariantProps<typeof controlGroupVariants>;

/* Compile-time lock: shared `Orientation` values ≡ tv `orientation` keys (drift = type error). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertControlGroupOrientation: AssertExact<
  Orientation,
  NonNullable<VariantProps<typeof controlGroupVariants>['orientation']>
> = true;
void _assertControlGroupOrientation;

/** Represents the label-to-control arrangement of a `ControlGroupField` — the shared {@link Orientation} vocabulary. */
export type ControlGroupFieldOrientation = Orientation;
