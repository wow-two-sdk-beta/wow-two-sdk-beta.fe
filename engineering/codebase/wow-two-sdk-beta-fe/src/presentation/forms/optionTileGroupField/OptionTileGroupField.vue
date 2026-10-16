<script lang="ts">
import type { Align } from '../../../foundation/styles';

/** Defines props for a group of option tiles. */
export interface OptionTileGroupFieldProps {
  /** The group's accessible name. */
  readonly label: string;

  /** The disabled state — greys + blocks every tile via a native `<fieldset disabled>`. */
  readonly isDisabled?: boolean;

  /** @deprecated Use `isDisabled`; this alias is removed next release. */
  readonly disabled?: boolean;

  /** Lets tiles flow onto multiple rows. Default `false` (single row). */
  readonly canWrap?: boolean;
  /** @deprecated Use `canWrap`; this alias is removed next release. */
  readonly wrap?: boolean;

  /** The main-axis alignment of the tiles. Default `start`. */
  readonly align?: Align;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import { FieldsetLayout } from '../../layout/fieldsetLayout';
import { optionTileGroupVariants } from './OptionTileGroupField.variants';

/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
/** Renders a named `<fieldset>` around a row of option tiles, disabling every tile at once. */
defineOptions({ name: 'OptionTileGroupField', inheritAttrs: false });

/* `children` has no prop counterpart — the `OptionTilePicker` children are the default slot — and the
   React `className` prop is Vue's `class` fallthrough attr. */
/* Explicit `undefined` defaults keep Vue's boolean casting from turning an absent prop into
   `false` — `canWrap` and `wrap` must stay undefined so the variants config's own default decides. */
const props = withDefaults(defineProps<OptionTileGroupFieldProps>(), {
  isDisabled: undefined,
  disabled: undefined,
  canWrap: undefined,
  wrap: undefined,
});

const finalDisabled = computed(() => props.isDisabled ?? props.disabled);

defineSlots<{
  /** The `OptionTilePicker` children the fieldset groups and disables together. */
  default(): unknown;
}>();

const attrs = useAttrs();

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

/* `FieldsetLayout` owns the `m-0 min-w-0 border-0 p-0` reset, so only the layout variants are
   composed here — the same split the React original had. */
const rootClass = computed(() =>
  cn(optionTileGroupVariants({ wrap: props.canWrap ?? props.wrap, align: props.align }), attrs.class as ClassValue),
);

const root = useTemplateRef<{ el: HTMLFieldSetElement | null }>('root');

/** The rendered element — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: computed(() => root.value?.el ?? null) });
</script>

<template>
  <!--
    Renders a labelled group of `OptionTilePicker`s — a reset `<fieldset>` (native
    `disabled` greys + blocks the whole group) laid out as a tile row, with the
    group's accessible name on `aria-label`.
  -->
  <FieldsetLayout ref="root" :disabled="finalDisabled" :aria-label="label" :class="rootClass" v-bind="passthroughAttrs">
    <slot />
  </FieldsetLayout>
</template>
