<script lang="ts">
import type { Orientation } from '../../../foundation/styles';
import type { TabsGroupActivationMode } from './TabsGroupContext';

export interface TabsGroupProps {
  /** The controlled active tab value. */
  readonly modelValue?: string;
  /** The uncontrolled initial tab value. */
  readonly defaultValue?: string;
  /** The layout axis. Default `horizontal`. */
  readonly orientation?: Orientation;
  /** Whether focus alone activates a tab. Default `automatic`. */
  readonly activationMode?: TabsGroupActivationMode;
  /** Keeps every tab's box and draws its label as a bar, inert; defaults to the nearest `DataRegion` first load. */
  readonly isSkeleton?: boolean;
}
</script>

<script setup lang="ts">
import { computed, provide, useAttrs, useTemplateRef } from 'vue';
import { cn, Orientation as OrientationValue } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { useId } from '../../../foundation/identifiers';
import { provideSkeletonState, useSkeletonState } from '../../feedback/skeletonState/SkeletonStateContext';
import {
  TabsGroupActivationMode as TabsGroupActivationModeValue,
  TabsGroupKey,
  type TabsGroupContextValue,
} from './TabsGroupContext';

/**
 * Renders the tabs root that owns the active value and shares it with its parts.
 *
 * `TabsGroupList` / `TabsGroupTab` / `TabsGroupPanel` read it through injection — React attached those as
 * `TabsGroup.List` / `.Tab` /
 * `.Panel` statics, which an SFC's default export cannot carry.
 */
defineOptions({ name: 'TabsGroup', inheritAttrs: false });

/** The tablist and panels — React's `children`. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<TabsGroupProps>(), {
  modelValue: undefined,
  defaultValue: undefined,
  orientation: OrientationValue.Horizontal,
  activationMode: TabsGroupActivationModeValue.Automatic,
  isSkeleton: undefined,
});

/* One flag switches the tabs and the panel content; each draws its own skeleton. */
provideSkeletonState(useSkeletonState(() => props.isSkeleton));

const emit = defineEmits<{
  /** Fires when the reader selects a different tab, with its value. */
  'update:modelValue': [value: string];
}>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const { value: active, setValue: setActive } = useControlled<string>({
  controlled: () => props.modelValue,
  default: props.defaultValue ?? '',
  onChange: (next) => emit('update:modelValue', next),
});

const baseId = useId();

/* Live getters, not a snapshot — an orientation or activation-mode change on
   the root has to reach every already-mounted tab. */
provide<TabsGroupContextValue>(TabsGroupKey, {
  get value() {
    return active.value;
  },
  setValue: setActive,
  get orientation() {
    return props.orientation;
  },
  get activationMode() {
    return props.activationMode;
  },
  baseId,
});

const classes = computed(() =>
  cn(
    props.orientation === OrientationValue.Vertical ? 'flex gap-2' : 'flex flex-col gap-2',
    attrs.class as string | undefined,
  ),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div ref="el" :data-orientation="orientation" v-bind="rest" :class="classes"><slot /></div>
</template>
