# Spinner

Source: [Spinner.vue](Spinner.vue). Exported from `foundation/icons`; distinct from the presentation feedback Spinner.

Renders Lucide `Loader2` with `animate-spin` and a one-em size. Optional `className` merges caller utility classes through the shared class merger. SVG attributes fall through normally. `SpinnerProps` remains public.

This low-level glyph is decorative (`aria-hidden=true`); its parent owns the pending action's accessible name, busy state and any progress announcement. It does not manage requests, timing or a live region.

Existing verification: `tests/unit/foundation/icons/Icons.dom.test.ts` and `Icons.ssr.test.ts` cover public-export mounting and server rendering.

## Native attributes and motion

Native SVG attributes remain typed fallthrough attributes. Native `class` overrides merge after
`className`; reduced-motion styling suppresses rotation while retaining the loading glyph.
