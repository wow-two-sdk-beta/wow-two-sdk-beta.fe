<script lang="ts">
import type { AiBrand } from './AiBrands';

export interface AiBrandMarkProps {
  /** The brand to draw. Wins over `provider` and `model`; `null` draws the neutral chip. */
  readonly brand?: AiBrand | null;

  /** The operator's provider key (`anthropic`, `openai`…), resolved to a brand when `brand` is absent. */
  readonly provider?: string | null;

  /** The model id (`claude-haiku-5-5`, `gpt-4.1-mini`…), resolved to a brand when `brand` is absent. */
  readonly model?: string | null;

  /** The pixel size of the square mark. Default 20. */
  readonly size?: number;

  /** `color` draws the brand's own colors; `mono` paints with `currentColor`. Default `color`. */
  readonly variant?: 'color' | 'mono';

  /** The accessible name. Without it the mark is decorative (`aria-hidden`). */
  readonly label?: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import type { ClassValue } from 'clsx';
import { Cpu } from 'lucide-vue-next';
import { Icon } from '../../foundation/icons';
import { useId } from '../../foundation/identifiers';
import { cn } from '../../foundation/styles';
import { resolveAiBrand } from './AiBrands';
import { aiBrandIdToken, aiBrandMarkData } from './AiBrandMarkData';

/**
 * Draws the mark of the AI brand that named a model — Claude, Gemini, OpenAI and the other providers — or, for a brand
 * it does not know, a neutral chip with a processor glyph, never an empty box.
 *
 * - `brand` draws that brand; without it, `provider` and `model` resolve one (`resolveAiBrand`).
 * - Without `label` the mark is decorative (`aria-hidden`); with it, `role="img"` and `aria-label`.
 * - Every gradient id is prefixed with an id unique to the instance, so two marks on a page never share one.
 */
defineOptions({ name: 'AiBrandMark', inheritAttrs: false });

const props = withDefaults(defineProps<AiBrandMarkProps>(), { size: 20, variant: 'color' });
const attrs = useAttrs();
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

/** Unique per mounted instance and stable across a server render and its hydration; `-` keeps it a valid `url(#…)`. */
const instanceId = useId('mark').replace(/[^\w-]/g, '-');

const resolvedBrand = computed<AiBrand | null>(() =>
  props.brand !== undefined ? props.brand : resolveAiBrand({ provider: props.provider, model: props.model }),
);

/** The drawn art, or `null` for the chip. A brand without a color mark draws its mono art under `color`. */
const drawn = computed(() => {
  if (resolvedBrand.value === null) return null;
  const entry = aiBrandMarkData[resolvedBrand.value];
  const art = props.variant === 'color' ? (entry.color ?? entry.mono) : entry.mono;
  return { art, isMono: art === entry.mono };
});

/** The inner markup is generated, allow-listed data (see `AiBrandMarkData.ts`), never caller input. */
const markup = computed(() => drawn.value?.art.markup.replaceAll(aiBrandIdToken, instanceId) ?? '');

const isNamed = computed(() => props.label !== undefined && props.label !== '');
const glyphSize = computed(() => Math.max(8, Math.round(props.size * 0.6)));
</script>

<template>
  <svg
    v-if="drawn !== null"
    v-bind="rest"
    :class="cn('inline-block shrink-0', attrs.class as ClassValue)"
    :width="size"
    :height="size"
    :viewBox="drawn.art.viewBox"
    :fill="drawn.isMono ? 'currentColor' : undefined"
    :data-ai-brand="resolvedBrand"
    :data-variant="drawn.isMono ? 'mono' : 'color'"
    :role="isNamed ? 'img' : undefined"
    :aria-label="isNamed ? label : undefined"
    :aria-hidden="isNamed ? undefined : 'true'"
    focusable="false"
    v-html="markup"
  />
  <span
    v-else
    v-bind="rest"
    :class="
      cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground',
        attrs.class as ClassValue,
      )
    "
    :style="{ width: `${size}px`, height: `${size}px` }"
    data-ai-brand="unknown"
    :role="isNamed ? 'img' : undefined"
    :aria-label="isNamed ? label : undefined"
    :aria-hidden="isNamed ? undefined : 'true'"
  >
    <Icon :icon="Cpu" :size="glyphSize" />
  </span>
</template>
