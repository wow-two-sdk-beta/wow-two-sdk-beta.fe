<script lang="ts">
/* eslint-disable-next-line @typescript-eslint/no-empty-object-type -- kept as an
   exported name: React declared `CommentThreadGroupProps` and consumers import it. Its
   only member was `children`, which is the default slot here; the rest of the
   React interface was `HTMLAttributes`, which falls through. */
export interface CommentThreadGroupProps {}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';

const locale = useLocale();

/**
 * Renders the root of a nested comment tree, owning the ARIA `tree` role and nothing else.
 *
 * Every row is a `Comment`; nesting happens through each `Comment`'s `replies` slot.
 */
defineOptions({ name: 'CommentThreadGroup', inheritAttrs: false });

/** The `Comment` rows — React's `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const classes = computed(() => cn('flex flex-col gap-3', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div
    ref="el"
    role="tree"
    :aria-label="locale.t('CommentThreadGroup.comments', undefined, 'Comments')"
    v-bind="rest"
    :class="classes"
  >
    <slot />
  </div>
</template>
