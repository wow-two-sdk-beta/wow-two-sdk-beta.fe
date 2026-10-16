<script lang="ts">
/* eslint-disable-next-line @typescript-eslint/no-empty-object-type -- kept as an
   exported name: React declared `EditableInputButtonProps` (an alias of
   `ButtonHTMLAttributes<HTMLButtonElement>`) and consumers import it, and both
   `EditableInputSubmit` and `EditableInputCancel` are typed by it. Every attribute falls through. */
export interface EditableInputButtonProps {}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { Check } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { Icon } from '../../../foundation/icons';
import { useEditableContext } from './EditableInputContext';

/** Renders the commit button, shown only while editing, that saves the draft and leaves edit mode. */
defineOptions({ name: 'EditableInputSubmit', inheritAttrs: false });

/** The button content — defaults to a check icon. React's `children`. */
defineSlots<{ default?(): unknown }>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLButtonElement>('el');

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useEditableContext();

/* `mousedown` is prevented so this fires before the input's blur handler closes edit mode. */
function onMousedown(event: MouseEvent): void {
  event.preventDefault();
}

/* Runs after any caller-supplied `@click` (declared after `v-bind`), exactly as React's
   `onClick?.(e)` ran before this body. */
function onClick(event: MouseEvent): void {
  if (event.defaultPrevented) return;
  ctx.submit();
}

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const buttonClass = computed(() =>
  cn(
    'inline-flex h-8 w-8 items-center justify-center rounded-md text-success-soft-foreground transition-colors hover:bg-success-soft focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    attrs.class as ClassValue,
  ),
);

const CheckIcon = Check;

/** The rendered `<button>` — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el });

const locale = useLocale();
</script>

<template>
  <button
    v-if="ctx.isEditing"
    ref="el"
    type="button"
    :aria-label="locale.t('EditableInputSubmit.submit', undefined, 'Submit')"
    :class="buttonClass"
    v-bind="passthroughAttrs"
    @mousedown="onMousedown"
    @click="onClick"
  >
    <slot><Icon :icon="CheckIcon" :size="14" /></slot>
  </button>
</template>
