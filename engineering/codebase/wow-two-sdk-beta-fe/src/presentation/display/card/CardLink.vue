<script lang="ts">
/** Defines props for the link that opens a card's subject from anywhere on the card. */
export interface CardLinkProps {
  /** The address the card opens. Omit it with `asChild` to merge onto a router link instead. */
  readonly href?: string;

  /** Renders the single slot child — a `RouterLink` or `AppLink` — with the stretched-link behaviour merged in. */
  readonly asChild?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { HtmlElement } from '../../../foundation/dom';
import { Primitive } from '../../../foundation/primitives';
import { cn } from '../../../foundation/styles';

/**
 * Renders the card's one link — usually its title — stretched over the whole `Card`, so a click anywhere on the card
 * opens it while the reading order keeps a single, named link. The card draws the focus ring when the link is
 * focused. Controls that must stay clickable inside the card sit above it with `relative z-10`.
 */
defineOptions({ name: 'CardLink', inheritAttrs: false });

/** The link text — the card's title. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<CardLinkProps>(), { href: undefined, asChild: false });

const attrs = useAttrs();

/* The pseudo-element covers the nearest positioned ancestor: the `Card`, which turns `relative` when it holds one. */
const classes = computed(() =>
  cn("outline-none after:absolute after:inset-0 after:content-['']", attrs.class as string | undefined),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});
</script>

<template>
  <Primitive
    :as="HtmlElement.Anchor"
    :as-child="props.asChild"
    :href="props.asChild ? undefined : props.href"
    data-card-link
    v-bind="rest"
    :class="classes"
    ><slot
  /></Primitive>
</template>
