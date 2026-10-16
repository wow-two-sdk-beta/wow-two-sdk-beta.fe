# Icon

Source: [Icon.vue](Icon.vue). Exported from `foundation/icons`.

Renders the caller's `IconAdapter` component. Required `icon` accepts a Vue component with SVG attributes and an optional numeric `size`; `size` defaults to 20 pixels. Ordinary SVG attributes fall through to the rendered adapter. The adapter must forward those attributes to its SVG root.

An absent `aria-label` makes the icon decorative (`aria-hidden=true`). A supplied label sets `role=img` and removes that derived hidden state. The SVG is not independently focusable. A decorative icon inside a labelled action should inherit the action's meaning instead of repeating its label. `IconProps`, `IconAdapter` and `IconAdapterProps` remain public types.

Existing verification: `tests/unit/foundation/icons/Icons.dom.test.ts` and `Icons.ssr.test.ts` render the public export with a real Lucide adapter. These are mount/render checks, not a full screen-reader behavior claim.

## Native attributes

SVG attributes are part of the public component type and remain runtime fallthrough attributes.
Native `class` overrides merge through the shared class engine. An explicit `aria-label` supplies
the accessible name; unnamed icons remain decorative.
