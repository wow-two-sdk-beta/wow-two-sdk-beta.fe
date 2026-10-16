<script lang="ts">
export interface FieldHelperTextProps {
  /**
   * The node's own id. An explicit id detaches it from the context's `helperId`,
   * so the control's `aria-describedby` stops referencing it.
   */
  readonly id?: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import { useFormControl, useFormControlChrome } from '../../../foundation/primitives';
import { useSkeletonState } from '../../feedback/skeletonState/SkeletonStateContext';
import { SkeletonStateLine } from '../../feedback/skeletonState/SkeletonStateLine';

/** Renders the hint text under a form control, registering its id with the control's `aria-describedby`. */
/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'FieldHelperText', inheritAttrs: false });

/* React took the copy as `children`; here it is the default slot. */
const props = defineProps<FieldHelperTextProps>();

defineSlots<{
  /** The hint copy — React's `children`. */
  default(): unknown;
}>();

const attrs = useAttrs();

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useFormControl();

/* An explicit `id` prop detaches the node from the context's helperId — don't register.
   Passed as a getter so the registration re-runs if the prop changes. */
useFormControlChrome('helper', () => props.id == null);

const helperId = computed(() => props.id ?? ctx?.helperId);

/* Follows the nearest `DataRegion` or `Field` skeleton: the hint keeps its lines and turns into bars. */
const skeleton = useSkeletonState();

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() => cn('text-sm text-muted-foreground', attrs.class as ClassValue));

const root = useTemplateRef<HTMLParagraphElement>('root');

/** The rendered element — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: root });
</script>

<template>
  <p
    ref="root"
    :id="helperId"
    :data-skeleton="skeleton.isSkeleton.value || undefined"
    :class="rootClass"
    v-bind="passthroughAttrs"
  >
    <SkeletonStateLine :is-skeleton="skeleton.isSkeleton.value"><slot /></SkeletonStateLine>
  </p>
</template>
