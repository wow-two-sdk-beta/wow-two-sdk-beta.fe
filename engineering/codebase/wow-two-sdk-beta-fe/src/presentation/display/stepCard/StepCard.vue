<script lang="ts">
export interface StepCardProps {
  /** The step number — rendered as a large faint overlay top-right. */
  readonly step: number;

  /**
   * The step title. React typed this `ReactNode`; a scalar stays a prop so it
   * remains the discriminator, and the same-named slot is the rich override.
   */
  readonly title: string | number;

  /** The optional supporting copy below the title. Falls back to the default slot when omitted. */
  readonly description?: string | number;
}
</script>

<script setup lang="ts">
import type { ComponentElement } from '../../../foundation/primitives';
import { computed, useAttrs, useSlots, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import Card from '../card/Card.vue';
import Heading from '../heading/Heading.vue';
import Text from '../text/Text.vue';

/**
 * Renders a numbered "how it works" step — faint step number, tinted icon badge, title, description.
 *
 * Outlined card, content-only, no baked routing.
 */
defineOptions({ name: 'StepCard', inheritAttrs: false });

/**
 * React's `icon` was a structural `ReactNode` prop — a region with no prop
 * equivalent in Vue, so it becomes a slot. `title` / `description` stay props
 * (scalars) with a same-named slot as the rich override; the default slot is
 * the body fallback React spelled `description ?? children`.
 */
defineSlots<{
  /** The icon node, rendered in a tinted badge (`bg-primary-soft text-primary-soft-foreground`). Size it yourself. */
  icon(): unknown;
  /** The step title — overrides the `title` prop's rendering. */
  title(): unknown;
  /** The supporting copy — overrides the `description` prop's rendering. */
  description(): unknown;
  /** The body content — used when neither `description` nor its slot is provided. */
  default(): unknown;
}>();

const props = withDefaults(defineProps<StepCardProps>(), { description: undefined });

const attrs = useAttrs();
const slots = useSlots();
const el = useTemplateRef<ComponentElement>('el');

const hasBody = computed(() => props.description !== undefined || !!slots.description || !!slots.default);

const classes = computed(() => cn('relative overflow-hidden bg-card p-6', attrs.class as string | undefined));

const headingClasses = computed(() => cn('tracking-normal', !!slots.icon && 'mt-4'));

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
  <Card ref="el" variant="outline" radius="xl" :elevation="0" v-bind="rest" :class="classes">
    <span class="absolute right-4 top-3 text-5xl font-bold text-foreground/5">{{ props.step }}</span>
    <span
      v-if="$slots.icon"
      class="grid size-11 place-items-center rounded-lg bg-primary-soft text-primary-soft-foreground"
    >
      <slot name="icon" />
    </span>
    <Heading :level="3" size="md" :class="headingClasses">
      <slot name="title">{{ props.title }}</slot>
    </Heading>
    <Text v-if="hasBody" size="sm" color="muted" class="mt-2">
      <slot name="description">
        <template v-if="props.description !== undefined">{{ props.description }}</template>
        <slot v-else />
      </slot>
    </Text>
  </Card>
</template>
