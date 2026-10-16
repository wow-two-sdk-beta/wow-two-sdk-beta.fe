import type { Component, ComponentPublicInstance, IntrinsicElementAttributes } from 'vue';

/**
 * The value set accepted by an `as` prop — an intrinsic tag name or any Vue
 * component. Rendered through `<component :is="as">`.
 */
export type ElementType = keyof IntrinsicElementAttributes | Component;

/** Resolves the attribute bag for `C` — intrinsic tags map to their DOM attributes, components to an open bag. */
type AttributesOf<C extends ElementType> = C extends keyof IntrinsicElementAttributes
  ? IntrinsicElementAttributes[C]
  : Record<string, unknown>;

/**
 * Props for a polymorphic component (`as` prop). Use only when a component
 * meaningfully changes its DOM element — most components should use `Slot`/`asChild`
 * instead.
 */
export type PolymorphicProps<C extends ElementType, P = object> = P &
  Omit<AttributesOf<C>, keyof P | 'as'> & { as?: C };

/**
 * Vue props never carry a `ref` — template refs are bound by the parent, not
 * passed down. Kept as an alias of `PolymorphicProps` so consumers porting
 * from the React package keep compiling.
 */
export type PolymorphicPropsWithoutRef<C extends ElementType, P = object> = PolymorphicProps<C, P>;

/**
 * The value a template ref receives when bound to a polymorphic element —
 * a DOM element for intrinsic tags, a component instance otherwise. Pair with
 * `useTemplateRef<PolymorphicRef<C>>(...)`.
 */
export type PolymorphicRef<C extends ElementType> = C extends keyof IntrinsicElementAttributes
  ? Element
  : ComponentPublicInstance;
