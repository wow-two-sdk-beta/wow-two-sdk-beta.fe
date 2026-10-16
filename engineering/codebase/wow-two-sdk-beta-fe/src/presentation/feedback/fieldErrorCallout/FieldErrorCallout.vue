<script lang="ts">
export interface FieldErrorCalloutProps {
  /**
   * The node's own id. An explicit id detaches it from the context's `errorId`,
   * so the control's `aria-describedby` stops referencing it.
   */
  readonly id?: string;

  /**
   * The single hand-written message — the scalar half of React's `children`.
   * Set it (or fill the default slot) to override the context's `errors`.
   */
  readonly message?: string | number;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useSlots, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import { useFormControl, useFormControlChrome } from '../../../foundation/primitives';

/** Renders an invalid control's error copy — every merged context error, or one hand-written override. */
/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'FieldErrorCallout', inheritAttrs: false });

const props = defineProps<FieldErrorCalloutProps>();

defineSlots<{
  /** The hand-written message, overriding the context's errors. Falls back to the `message` prop. */
  default?(): unknown;
}>();

const attrs = useAttrs();
const slots = useSlots();

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useFormControl();

/* React tested `children != null && children !== false && children !== ''` because
   `{cond && 'msg'}` renders nothing; the Vue counterpart is an empty `message` or an
   absent slot, both of which must fall through to the context's errors. */
const hasChildren = computed(() => (props.message != null && props.message !== '') || Boolean(slots.default));

const messages = computed<ReadonlyArray<string>>(() => (hasChildren.value ? [] : (ctx?.errors ?? [])));

const isShown = computed(() => (hasChildren.value || messages.value.length > 0) && (ctx ? ctx.isInvalid : true));

/* Register only while rendering under the context id — an explicit `id` prop
   means the context's errorId is NOT in the DOM and must stay unreferenced. */
useFormControlChrome('error', () => isShown.value && props.id == null);

const errorId = computed(() => props.id ?? ctx?.errorId);

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() => cn('text-sm text-destructive-soft-foreground', attrs.class as ClassValue));

const root = useTemplateRef<HTMLParagraphElement>('root');

/** The rendered element — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: root });
</script>

<template>
  <p v-if="isShown" ref="root" :id="errorId" role="alert" :class="rootClass" v-bind="passthroughAttrs">
    <template v-if="hasChildren">
      <slot>{{ message }}</slot>
    </template>
    <template v-else-if="messages.length === 1">{{ messages[0] }}</template>
    <template v-else>
      <!-- Keyed on the index: two rules can emit the same copy, and a duplicate key patches worse. -->
      <span v-for="(entry, index) in messages" :key="index" class="block">{{ entry }}</span>
    </template>
  </p>
</template>
