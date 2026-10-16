<script lang="ts">
import type { TagVariant } from './Tag.variants';

export interface TagProps {
  /** The color treatment. */
  readonly variant?: TagVariant;

  /** The accessible label for the close button. Default `"Remove"`. */
  readonly closeLabel?: string;
}
</script>

<script setup lang="ts">
import { useLocaleDefaults } from '../../../foundation/i18n';
import { computed, getCurrentInstance, useAttrs, useTemplateRef } from 'vue';
import { X } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { Icon } from '../../../foundation/icons';
import { tagVariants } from './Tag.variants';

const CloseIcon = X;

/**
 * Renders a pill with an optional close button, shown only when the consumer binds `@close`.
 *
 * The close button is a raw `<button>` to keep the strict atom rule — `Tag` is L3, so importing `Button` would make
 * this an atom-on-atom composition.
 */
defineOptions({ name: 'Tag', inheritAttrs: false });

/** The tag copy — React's optional `children`. */
defineSlots<{ default?(): unknown }>();

const componentProps = withDefaults(defineProps<TagProps>(), {});
const props = useLocaleDefaults(componentProps, 'Tag', { closeLabel: 'Remove' });

/** Replaces React's `onClose`; omitting `@close` omits the close button. */
const emit = defineEmits<{
  /** Fires when the close (×) button is clicked. */
  close: [];
}>();

const attrs = useAttrs();
const instance = getCurrentInstance();
const el = useTemplateRef<HTMLSpanElement>('el');

/**
 * Mirrors React's `onClose && <button/>` guard — the close button renders only
 * when the consumer bound `@close`. Read through a call, not a cached computed:
 * `instance.vnode` is replaced on every re-render.
 */
const hasClose = () => Boolean(instance?.vnode.props?.onClose);

const classes = computed(() => cn(tagVariants({ variant: props.variant }), attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <span ref="el" v-bind="rest" :class="classes">
    <slot />
    <button
      v-if="hasClose()"
      type="button"
      :aria-label="props.closeLabel"
      class="-mr-1 inline-flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
      @click="emit('close')"
    >
      <Icon :icon="CloseIcon" :size="12" />
    </button>
  </span>
</template>
