<script lang="ts">
import type { SectionHeadingSize } from '../../display/sectionHeading';

type PageHeaderLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** Represents the prop surface of `PageHeader`. */
export interface PageHeaderProps {
  /** The page title. Rich content goes through the `title` slot. */
  readonly title?: string | number;

  /** The supporting line under the title. Rich content goes through the `description` slot. */
  readonly description?: string | number;

  /** The heading level. Default `1`. */
  readonly level?: PageHeaderLevel;

  /** The title size. Default `xl`. */
  readonly size?: SectionHeadingSize;
}
</script>

<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  useAttrs,
  useSlots,
  useTemplateRef,
  type ComponentPublicInstance,
} from 'vue';
import { resolveElement } from '../../../foundation/dom';
import { cn } from '../../../foundation/styles';
import SectionHeading from '../../display/sectionHeading/SectionHeading.vue';
import { usePageHeaderOutlet } from './PageHeaderOutlet';

/**
 * Renders a page's identity — title, description and actions. Actions come from the `actions` slot and from any
 * `PageHeaderActions` a routed page renders elsewhere in the tree, which teleport into this header.
 */
defineOptions({ name: 'PageHeader', inheritAttrs: false });

defineSlots<{
  /** The rich override for the `title` prop. */
  title?(): unknown;
  /** The rich override for the `description` prop. */
  description?(): unknown;
  /** The header's own actions, placed before any a page contributes through `PageHeaderActions`. */
  actions?(): unknown;
}>();

const props = withDefaults(defineProps<PageHeaderProps>(), { level: 1, size: 'xl' });

const attrs = useAttrs();
const slots = useSlots();
const inner = useTemplateRef<ComponentPublicInstance & { el?: unknown }>('inner');
const el = computed(() => resolveElement(inner.value));
const outletEl = useTemplateRef<HTMLDivElement>('outlet');
const outlet = usePageHeaderOutlet();

onMounted(() => {
  outlet.value = outletEl.value;
});
onBeforeUnmount(() => {
  if (outlet.value === outletEl.value) outlet.value = null;
});

const classes = computed(() => cn('flex-wrap items-end pb-0', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <SectionHeading
    ref="inner"
    v-bind="rest"
    :class="classes"
    :title="props.title"
    :description="props.description"
    :level="props.level"
    :size="props.size"
    :is-bordered="false"
  >
    <template v-if="slots.title" #title><slot name="title" /></template>
    <template v-if="slots.description" #description><slot name="description" /></template>
    <template #actions>
      <slot name="actions" />
      <div ref="outlet" class="contents" data-page-header-actions />
    </template>
  </SectionHeading>
</template>
