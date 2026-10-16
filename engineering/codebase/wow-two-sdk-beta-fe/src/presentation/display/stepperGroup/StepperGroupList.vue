<script lang="ts">
/* eslint-disable-next-line @typescript-eslint/no-empty-object-type -- kept as an
   exported name: React declared `StepperGroupListProps` and consumers import it. Its only
   member was `children`, which is the default slot here; every attribute falls through. */
export interface StepperGroupListProps {}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { cn, Orientation } from '../../../foundation/styles';
import { RovingFocusGroup, type ComponentElement } from '../../../foundation/primitives';
import { useStepperContext } from './StepperGroupContext';

/** Renders the step strip, its arrow-key navigation coming from the surrounding `RovingFocusGroup`. */
defineOptions({ name: 'StepperGroupList', inheritAttrs: false });

/** The `StepperGroupStep` children — React's required `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const el = useTemplateRef<ComponentElement>('el');
const stepper = useStepperContext();

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const listClass = computed(() =>
  cn(
    'flex',
    stepper.orientation === Orientation.Vertical ? 'flex-col gap-4' : 'flex-row items-center gap-2',
    attrs.class as ClassValue,
  ),
);

/** Exposes the child's documented DOM handle, never its component instance. */
const rootElement = computed<HTMLElement | null>(() => {
  const node = el.value?.el;
  const elementType = node?.ownerDocument.defaultView?.HTMLElement;
  return elementType && node instanceof elementType ? node : null;
});

defineExpose({ el: rootElement });
</script>

<template>
  <RovingFocusGroup
    ref="el"
    :orientation="stepper.orientation"
    role="tablist"
    :aria-orientation="stepper.orientation"
    :data-orientation="stepper.orientation"
    :class="listClass"
    v-bind="passthroughAttrs"
  >
    <slot />
  </RovingFocusGroup>
</template>
