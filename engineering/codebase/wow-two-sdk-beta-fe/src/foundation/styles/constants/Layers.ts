/* Provides semantic z-index tiers — the single source of truth for stacking order. */

/** Contains the semantic z-index tiers; matching `z-{name}` utilities ship via @theme. */
export const Layer = {
  /** Slips under the base layer; visually hidden. */
  Hide: -1,
  /** Sits in the default DOM flow with no z-index applied. */
  Base: 0,
  /** Slightly elevates over siblings — badges, sticky list items, in-grid overlays. */
  Raised: 10,
  /** Pins widgets inside a section — panels, inline overlays. */
  Docked: 20,
  /** Anchors a page-level sticky header or footer. */
  Sticky: 30,
  /** Hosts system banners — cookie notice, status banner, persistent Fab. */
  Banner: 40,
  /** Hosts dropdowns, popovers, comboboxes, menus, hover-cards anchored to a trigger. */
  Dropdown: 50,
  /** Dims the page behind a modal — backdrop / scrim layer. */
  Overlay: 60,
  /** Hosts modal / dialog / drawer / sheet content above its backdrop. */
  Modal: 70,
  /** Hosts popovers / menus opened FROM inside a modal — must beat Modal. */
  Popover: 80,
  /** Hosts toasts, snackbars, undo bars — survives above modals. */
  Toast: 90,
  /** Hosts tooltips and live-cursors — highest functional layer. */
  Tooltip: 100,
  /** Hosts DevTools / design-system inspector overlays — always wins. */
  Debug: 9999,
} as const;

/** Represents the name of a semantic z-index tier. */
export type LayerName = keyof typeof Layer;

/** Provides an inline `style` object for programmatic z-index assignment. */
export function layerStyle(layer: LayerName): { zIndex: number } {
  return { zIndex: Layer[layer] };
}
