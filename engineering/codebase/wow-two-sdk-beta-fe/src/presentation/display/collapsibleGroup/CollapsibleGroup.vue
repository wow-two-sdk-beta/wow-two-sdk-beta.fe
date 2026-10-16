<script lang="ts">
/** Controlled axes use their canonical Vue model names; each update event requests caller state. */
export interface CollapsibleGroupProps {
  /** The open state, controlled. The `v-model:open` binding target. */
  readonly open?: boolean;

  /** The uncontrolled initial state. Default `false`. */
  readonly defaultOpen?: boolean;

  /** The disabled mode — the trigger stops toggling. Default `false`. */
  readonly isDisabled?: boolean;
}
</script>

<script setup lang="ts">
import { computed, provide, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { dataAttr } from '../../../foundation/dom';
import { useControlled } from '../../../foundation/state';
import { useId } from '../../../foundation/identifiers';
import { CollapsibleGroupKey } from './CollapsibleGroupContext';

/**
 * Renders the disclosure root that owns the open state and the trigger / content id pair.
 *
 * Both reach `CollapsibleGroupTrigger` and `CollapsibleGroupContent` through injection.
 */
defineOptions({ name: 'CollapsibleGroup', inheritAttrs: false });

/** The trigger + content — React's `children`. */
defineSlots<{ default(): unknown }>();

/* `open: undefined` / `open: undefined` are load-bearing: Vue coerces an absent
   `Boolean` prop to `false` unless the declaration owns a `default` key, which would
   read as explicitly-closed-and-controlled and strand the uncontrolled path. */
const props = withDefaults(defineProps<CollapsibleGroupProps>(), {
  open: undefined,
  defaultOpen: false,
  isDisabled: false,
});

const emit = defineEmits<{
  /** Fires when the pane opens or closes — the `v-model:open` half. */
  'update:open': [open: boolean];
}>();

/* `useControlled` returns a handle, not React's tuple, and takes `controlled` as a getter so the
   controlled branch tracks the prop. */
const { value: open, setValue: setOpen } = useControlled<boolean>({
  controlled: () => props.open,
  default: props.defaultOpen,
  onChange: (next) => {
    emit('update:open', next);
  },
});

const contentId = useId();
const triggerId = useId();

provide(CollapsibleGroupKey, {
  get open() {
    return open.value;
  },
  setOpen,
  contentId,
  triggerId,
  get disabled() {
    return props.isDisabled;
  },
});

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const classes = computed(() => cn(attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <!-- Own attrs first, `v-bind="rest"` after — a consumer-supplied `data-state` still wins, as it
       did through React's trailing `{...rest}` spread. -->
  <div
    ref="el"
    :data-state="open ? 'open' : 'closed'"
    :data-disabled="dataAttr(props.isDisabled)"
    v-bind="rest"
    :class="classes"
  >
    <slot />
  </div>
</template>
