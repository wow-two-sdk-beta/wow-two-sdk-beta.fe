<script lang="ts">
import type { AvatarSize } from '../avatar/Avatar.vue';

export interface AvatarGroupProps {
  /** The maximum avatars to render. Excess is shown as a "+N" tile. */
  readonly max?: number;

  /** The avatar size applied to all children. Default `md`. */
  readonly size?: AvatarSize;

  /** The negative-margin overlap class applied between avatars. Default `-ml-2`. */
  readonly overlap?: string;
}
</script>

<script setup lang="ts">
import { cloneVNode, computed, useAttrs, useSlots, useTemplateRef, type VNode } from 'vue';
import { cn, SizePreset } from '../../../foundation/styles';
import { renderableChildren } from '../../../foundation/primitives';
import Avatar from '../avatar/Avatar.vue';
import { useLocale } from '../../../foundation/i18n';

/** Renders a stack of overlapping `Avatar` children, with a "+N more" chip once they exceed `max`. */
defineOptions({ name: 'AvatarGroup', inheritAttrs: false });

/** The `Avatar` children — React's `children`. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<AvatarGroupProps>(), {
  max: undefined,
  size: SizePreset.Md,
  overlap: '-ml-2',
});

const attrs = useAttrs();
const slots = useSlots();
const el = useTemplateRef<HTMLDivElement>('el');

/**
 * React rebuilt every child as `<Avatar {...child.props} size={size} />`, which forced the
 * group's size *and* the `Avatar` type. A Vue slot hands over already-rendered vnodes, so
 * each is cloned with `size` instead — same size coercion, and a child that is a wrapped or
 * decorated `Avatar` keeps its own type rather than being flattened into a bare one.
 *
 * A function, not a `computed`: the slot is re-invoked on every render, so the vnodes handed
 * to `v-for` are always fresh rather than a cached array of already-mounted ones.
 */
function sizedChildren(): Array<VNode> {
  const all = renderableChildren(slots.default?.());
  const visible = props.max ? all.slice(0, props.max) : all;
  return visible.map((child) => cloneVNode(child, { size: props.size }));
}

const locale = useLocale();

const overflow = computed(() => {
  const count = renderableChildren(slots.default?.()).length;
  return props.max ? Math.max(0, count - props.max) : 0;
});

const classes = computed(() => cn('inline-flex items-center', attrs.class as string | undefined));

const itemClasses = (index: number): string => cn('ring-2 ring-background rounded-full', index > 0 && props.overlap);

const overflowClasses = computed(() => cn(props.overlap, 'ring-2 ring-background'));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div ref="el" v-bind="rest" :class="classes">
    <div v-for="(child, index) in sizedChildren()" :key="child.key ?? index" :class="itemClasses(index)">
      <!-- Force consistent size -->
      <component :is="child" />
    </div>
    <!-- "+3" is the chip's look; its name says what it counts. -->
    <Avatar
      v-if="overflow > 0"
      :size="props.size"
      :fallback="`+${overflow}`"
      :alt="locale.t('AvatarGroup.more', { count: overflow }, '{count} more')"
      :class="overflowClasses"
    />
  </div>
</template>
