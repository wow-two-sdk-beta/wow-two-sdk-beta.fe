/** Defines the material a toast card is painted with. */
export const ToastSurface = {
  /** Refers to the opaque popover fill. */
  Solid: 'solid',
  /** Refers to the translucent menu glass, which falls back to an opaque fill under reduced transparency. */
  Glass: 'glass',
} as const;

export type ToastSurface = (typeof ToastSurface)[keyof typeof ToastSurface];
