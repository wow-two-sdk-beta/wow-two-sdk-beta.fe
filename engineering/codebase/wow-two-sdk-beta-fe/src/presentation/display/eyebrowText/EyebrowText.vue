<script lang="ts">
type EyebrowTextLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** Defines the EyebrowText color tone. */
export const EyebrowTextTone = {
  /** Refers to the muted foreground. */
  Muted: 'muted',
  /** Refers to the subtle foreground. */
  Subtle: 'subtle',
  /** Refers to the default foreground. */
  Default: 'default',
} as const;

export type EyebrowTextTone = (typeof EyebrowTextTone)[keyof typeof EyebrowTextTone];

export interface EyebrowTextProps {
  /** The semantic heading level (1–6). Default 3. */
  readonly level?: EyebrowTextLevel;

  /** The color tone. Default `muted`. */
  readonly tone?: EyebrowTextTone;
}

const ToneClass: Record<NonNullable<EyebrowTextProps['tone']>, string> = {
  muted: 'text-muted-foreground',
  subtle: 'text-subtle-foreground',
  default: 'text-foreground',
};
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';

/**
 * Renders a tiny uppercase mini-heading above a section, at standard tracking.
 *
 * Lighter than `SectionHeading`, which is a chunkier title + description + actions component.
 */
defineOptions({ name: 'EyebrowText', inheritAttrs: false });

/** The eyebrow copy — React's `children`. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<EyebrowTextProps>(), {
  level: 3,
  tone: EyebrowTextTone.Muted,
});

const attrs = useAttrs();
const el = useTemplateRef<HTMLHeadingElement>('el');

const tag = computed(() => `h${props.level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6');

const classes = computed(() =>
  cn('text-[10px] font-semibold uppercase tracking-wider', ToneClass[props.tone], attrs.class as string | undefined),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <component :is="tag" ref="el" v-bind="rest" :class="classes"><slot /></component>
</template>
