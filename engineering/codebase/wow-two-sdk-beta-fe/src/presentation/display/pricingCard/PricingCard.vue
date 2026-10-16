<script lang="ts">
export interface PricingCardProps {
  /**
   * The tier name (e.g. "Pro"). React typed this `ReactNode`; a scalar stays a
   * prop so it remains the discriminator, and the same-named slot is the rich
   * override. The same pairing applies to `price` / `cadence` / `tagline` /
   * `badgeLabel` below.
   */
  readonly name: string | number;

  /** The headline price (e.g. "$9"). */
  readonly price: string | number;

  /** The billing cadence beside the price (e.g. "/mo"). */
  readonly cadence?: string | number;

  /** The short positioning line below the price. */
  readonly tagline?: string | number;

  /** The feature bullets — each rendered with a leading `Check`. The scoped `feature` slot overrides a row. */
  readonly features: ReadonlyArray<string | number>;

  /** The featured state — highlights this tier with a primary border + shadow + a badge. */
  readonly isFeatured?: boolean;
  /** @deprecated Use `isFeatured`; this alias is removed next release. */
  readonly featured?: boolean;

  /** The badge label shown when `isFeatured`. Default "Most popular". */
  readonly badgeLabel?: string | number;
}
</script>

<script setup lang="ts">
import { useLocaleDefaults } from '../../../foundation/i18n';
import type { ComponentElement } from '../../../foundation/primitives';
import { computed, useAttrs, useTemplateRef } from 'vue';
import { Check } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { Icon } from '../../../foundation/icons';
import Badge from '../badge/Badge.vue';
import Card from '../card/Card.vue';
import Heading from '../heading/Heading.vue';
import Text from '../text/Text.vue';

/**
 * Renders a pricing tier: name, price baseline, tagline, checked feature list, bottom-pinned CTA.
 *
 * Content-only — the CTA is the default slot, never baked routing. `isFeatured` adds a primary border, a shadow, and a
 * "Most popular" badge.
 */
defineOptions({ name: 'PricingCard', inheritAttrs: false });

/**
 * React's `children` was the CTA region; it becomes the default slot. Every
 * scalar prop above pairs with a same-named override slot, and `feature` is
 * scoped so a consumer can render a rich bullet per entry.
 */
defineSlots<{
  /** The tier name — overrides the `name` prop's rendering. */
  name(): unknown;
  /** The headline price — overrides the `price` prop's rendering. */
  price(): unknown;
  /** The billing cadence — overrides the `cadence` prop's rendering. */
  cadence(): unknown;
  /** The positioning line — overrides the `tagline` prop's rendering. */
  tagline(): unknown;
  /** The featured badge label — overrides the `badgeLabel` prop's rendering. */
  badgeLabel(): unknown;
  /** One feature bullet — overrides the row body (the leading `Check` stays). */
  feature(props: { feature: string | number; index: number }): unknown;
  /** The CTA pinned to the bottom — pass a `Button`. */
  default(): unknown;
}>();

const componentProps = withDefaults(defineProps<PricingCardProps>(), {
  cadence: undefined,
  tagline: undefined,
  isFeatured: undefined,
  featured: undefined,
});
const props = useLocaleDefaults(componentProps, 'PricingCard', { badgeLabel: 'Most popular' });

/** `isFeatured` first, then the deprecated `featured`. */
const isFeaturedTier = computed(() => props.isFeatured ?? props.featured ?? false);

const attrs = useAttrs();
const el = useTemplateRef<ComponentElement>('el');

const classes = computed(() =>
  cn(
    'relative flex flex-col bg-card p-6',
    isFeaturedTier.value ? 'border-primary shadow-lg shadow-primary/10' : 'border-border',
    attrs.class as string | undefined,
  ),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

/** Exposes the child's documented DOM handle, never its component instance. */
const rootElement = computed<HTMLElement | null>(() => {
  const node = el.value?.el;
  const elementType = node?.ownerDocument.defaultView?.HTMLElement;
  return elementType && node instanceof elementType ? node : null;
});

defineExpose({ el: rootElement });
</script>

<template>
  <Card ref="el" variant="outline" radius="2xl" :elevation="0" v-bind="rest" :class="classes">
    <Badge
      v-if="isFeaturedTier"
      variant="brand"
      size="md"
      class="absolute -top-3 left-6 bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
    >
      <slot name="badgeLabel">{{ props.badgeLabel }}</slot>
    </Badge>
    <Heading :level="3" size="md" class="tracking-normal">
      <slot name="name">{{ props.name }}</slot>
    </Heading>
    <div class="mt-2 flex items-baseline gap-1">
      <span class="text-3xl font-bold tracking-tight">
        <slot name="price">{{ props.price }}</slot>
      </span>
      <Text v-if="props.cadence !== undefined || $slots.cadence" as="span" size="sm" color="muted">
        <slot name="cadence">{{ props.cadence }}</slot>
      </Text>
    </div>
    <Text v-if="props.tagline !== undefined || $slots.tagline" size="sm" color="muted" class="mt-2">
      <slot name="tagline">{{ props.tagline }}</slot>
    </Text>
    <ul class="mt-5 flex flex-1 flex-col gap-2.5">
      <li v-for="(feature, index) in props.features" :key="feature" class="flex items-start gap-2 text-sm">
        <Icon :icon="Check" :size="16" class="mt-0.5 text-primary-soft-foreground" />
        <span
          ><slot name="feature" :feature="feature" :index="index">{{ feature }}</slot></span
        >
      </li>
    </ul>
    <div v-if="$slots.default" class="mt-6"><slot /></div>
  </Card>
</template>
