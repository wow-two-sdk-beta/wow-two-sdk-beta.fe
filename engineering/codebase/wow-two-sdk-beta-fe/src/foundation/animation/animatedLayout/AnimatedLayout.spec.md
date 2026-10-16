# AnimatedLayout

Source: [AnimatedLayout.ts](AnimatedLayout.ts). Exported from `foundation/animation`.

`AnimatedLayout` is a Vue component authored with `defineComponent` and a render function. Its primary role is a rendered container, so it has a component folder even though the implementation is TypeScript rather than an SFC. `AnimatedLayoutProps` remains public.

The default slot renders inside one `div`; caller `class` and `style` fall through to that container. `isEnabled` defaults to true (`enabled` is its deprecated alias). Optional `duration`, `easing` and `reducedMotion` are forwarded to the FLIP animation helper. Explicit `reducedMotion` overrides the device preference.

Direct slot children receive `data-flip-key` derived from their Vue key. Use stable, unique string/number keys and child components with a single DOM root that forwards attributes. Unkeyed children use positional indices and cannot be tracked reliably through reordering. The component measures children after mount/update, then animates surviving children from their old geometry to the committed geometry. New or removed children appear/disappear without enter/exit choreography.

Disabled and reduced-motion paths preserve the committed layout. Prior animation handles cancel before the next measurement and on scope disposal. Layout/class choices remain caller-owned; the component does not provide list semantics, drag behavior or announcements.

Relocation validation covers TypeScript compilation and preserving the capability export. No new browser geometry/motion result is claimed by this structural change.
