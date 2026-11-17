/* Provides the toast stack's class tables. The component-only stylesheet scans this module. */

import { OverlayPosition, Side } from '../../../foundation/styles';

/** The stack container: fixed, bounded by the safe-area insets. */
export const StackClass =
  'pointer-events-none fixed z-toast flex max-h-(--toast-available-height) max-w-(--toast-available-width)';

/** The stack's anchor and growth direction per position. */
export const PositionClasses: Record<OverlayPosition, string> = {
  [OverlayPosition.TopRight]: 'top-(--toast-top-inset) right-(--toast-right-inset) flex-col items-end',
  [OverlayPosition.TopLeft]: 'top-(--toast-top-inset) left-(--toast-left-inset) flex-col items-start',
  [OverlayPosition.TopCenter]: 'top-(--toast-top-inset) left-1/2 -translate-x-1/2 flex-col items-center',
  [OverlayPosition.BottomRight]: 'bottom-(--toast-bottom-inset) right-(--toast-right-inset) flex-col-reverse items-end',
  [OverlayPosition.BottomLeft]: 'bottom-(--toast-bottom-inset) left-(--toast-left-inset) flex-col-reverse items-start',
  [OverlayPosition.BottomCenter]:
    'bottom-(--toast-bottom-inset) left-1/2 -translate-x-1/2 flex-col-reverse items-center',
};

/** The safe-area insets and the room they leave, which shell styles adjust through the `--toast-*` offsets. */
export const StackInsets = {
  '--toast-top-inset': 'calc(var(--toast-top-offset, 1rem) + env(safe-area-inset-top, 0px))',
  '--toast-bottom-inset': 'calc(var(--toast-bottom-offset, 1rem) + env(safe-area-inset-bottom, 0px))',
  '--toast-left-inset': 'max(var(--toast-gutter, 1rem), env(safe-area-inset-left, 0px))',
  '--toast-right-inset': 'max(var(--toast-gutter, 1rem), env(safe-area-inset-right, 0px))',
  '--toast-available-width': 'calc(100dvw - var(--toast-left-inset) - var(--toast-right-inset))',
  '--toast-available-height': 'max(0px, calc(100dvh - var(--toast-top-inset) - var(--toast-bottom-inset)))',
} as const;

/**
 * A card's slot: `--toast-width` wide (20rem unset), within the available width, and spanning it below the
 * tablet breakpoint. Vertical pans stay with the page, so a horizontal drag is the card's own.
 */
export const ItemClass =
  'relative w-(--toast-width,20rem) max-w-full shrink-0 touch-pan-y rounded-md max-md:w-(--toast-available-width)';

/** The `SideSlide` entry and exit per edge, read from the overridable `--animate-slide-*` tokens. */
export const SideSlideClasses: Record<Side, string> = {
  [Side.Right]:
    'motion-safe:data-[state=open]:animate-(--animate-slide-in-right) ' +
    'motion-safe:data-[toast-exiting]:animate-(--animate-slide-out-right)',
  [Side.Left]:
    'motion-safe:data-[state=open]:animate-(--animate-slide-in-left) ' +
    'motion-safe:data-[toast-exiting]:animate-(--animate-slide-out-left)',
  [Side.Top]:
    'motion-safe:data-[state=open]:animate-(--animate-slide-in-top) ' +
    'motion-safe:data-[toast-exiting]:animate-(--animate-slide-out-top)',
  [Side.Bottom]:
    'motion-safe:data-[state=open]:animate-(--animate-slide-in-bottom) ' +
    'motion-safe:data-[toast-exiting]:animate-(--animate-slide-out-bottom)',
};

/** The vertical presets' entry and exit, driven by the `--toast-motion-*` properties the host sets. */
export const VerticalSlideClass =
  'motion-safe:transition-[opacity,transform] motion-safe:[transform-origin:var(--toast-motion-origin)] ' +
  'motion-safe:[transition-duration:calc(var(--toast-motion-enter)*var(--toast-motion-speed,1))] ' +
  'motion-safe:ease-(--toast-motion-ease) ' +
  'motion-safe:data-[state=closed]:opacity-0 ' +
  'motion-safe:data-[state=closed]:[transform:var(--toast-motion-transform)] ' +
  'motion-safe:data-[state=closed]:[transition-duration:calc(var(--toast-motion-exit)*var(--toast-motion-speed,1))] ' +
  'motion-safe:data-[state=closed]:ease-in';

/**
 * The full-width overflow control, pinned to the stack's far edge while the list scrolls. On a glass host it takes
 * the menu glass and its hairline; the attribute variant out-ranks the solid fill wherever the classes are ordered.
 */
export const OverflowButtonClass =
  'pointer-events-auto sticky z-10 h-auto min-h-9 w-0 min-w-full shrink-0 justify-between border-border ' +
  'bg-popover py-1.5 text-start text-popover-foreground pointer-coarse:min-h-11 ' +
  'data-[toast-surface=glass]:surface-glass-menu data-[toast-surface=glass]:border-glass-edge';

/** A group's count, which keeps its glow readable in forced colours. */
export const GroupCountClass =
  'forced-colors:forced-color-adjust-none forced-colors:text-[CanvasText] ' +
  'forced-colors:[--toast-count-rest:CanvasText] forced-colors:[--toast-count-peak:LinkText] ' +
  'forced-colors:[--toast-count-glow:none]';

/** The surface a changed card lights while its update highlight plays. */
export const UpdateHighlightClass =
  'pointer-events-none absolute inset-0 rounded-[inherit] border-2 border-primary/65 bg-primary/10 opacity-0 ' +
  'forced-colors:border-[Highlight]';

/** The merge preview, hidden until its flight shows it. */
export const GroupArrivalClass = 'pointer-events-none invisible absolute inset-x-0 top-0 z-20 rounded-[inherit]';
