<script lang="ts">
export interface AccordionGroupItemProps {
  /** The identity of this panel within the group's open set. */
  readonly value: string;
  /** The disabled state for this item alone. Default `false`. */
  readonly isDisabled?: boolean;
}
</script>

<script setup lang="ts">
import { computed, provide, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { dataAttr } from '../../../foundation/dom';
import { useId } from '../../../foundation/identifiers';
import {
  AccordionGroupItemKey,
  useAccordionContext,
  type AccordionGroupItemContextValue,
} from './AccordionGroupContext';

/** Renders one disclosure panel, pairing an `AccordionGroupTrigger` with its `AccordionGroupContent`. */
defineOptions({ name: 'AccordionGroupItem', inheritAttrs: false });

/** The trigger + content — React's required `children`. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<AccordionGroupItemProps>(), { isDisabled: false });

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');
const accordion = useAccordionContext();

const contentId = useId();
const triggerId = useId();

const open = computed(() => accordion.isOpen(props.value));
const itemDisabled = computed(() => props.isDisabled || accordion.disabled);

/* Live getters — `open` and `disabled` both change after mount. */
provide<AccordionGroupItemContextValue>(AccordionGroupItemKey, {
  get value() {
    return props.value;
  },
  get open() {
    return open.value;
  },
  contentId,
  triggerId,
  get disabled() {
    return itemDisabled.value;
  },
});

const classes = computed(() => cn('border-b border-border', attrs.class as string | undefined));

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
    :data-state="open ? 'open' : 'closed'"
    :data-disabled="dataAttr(itemDisabled)"
    v-bind="rest"
    :class="classes"
  >
    <slot />
  </div>
</template>
