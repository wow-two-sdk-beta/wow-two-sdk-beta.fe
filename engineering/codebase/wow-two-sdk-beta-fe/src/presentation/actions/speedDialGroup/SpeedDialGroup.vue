<script lang="ts">
import type { SpeedDialGroupDirection, SpeedDialGroupPosition } from './SpeedDialGroupContext';

export interface SpeedDialGroupProps {
  /** The viewport anchor. Default `bottom-right`. */
  readonly position?: SpeedDialGroupPosition;

  /** The axis the action items fan out along. Defaults to the one implied by `position`. */
  readonly direction?: SpeedDialGroupDirection;

  /** The controlled open state. */
  readonly open?: boolean;

  /** The uncontrolled initial state. */
  readonly defaultOpen?: boolean;

  /** The pixel gap between stacked action items. Default 12. */
  readonly gap?: number;
}
</script>

<script setup lang="ts">
import { computed, provide, shallowRef, useAttrs, useSlots, useTemplateRef, watch, type VNode } from 'vue';
import type { ClassValue } from 'clsx';
import { cn, OverlayPosition } from '../../../foundation/styles';
import { Key } from '../../../foundation/dom';
import { Presence, renderableChildren } from '../../../foundation/primitives';
import { useControlled } from '../../../foundation/state';
import { useEscape } from '../../../foundation/shortcuts';
import { useOutsideClick } from '../../../foundation/dom';
import { SpeedDialGroupDirection as SpeedDialGroupDirectionValue, SpeedDialGroupKey } from './SpeedDialGroupContext';
import SpeedDialGroupList from './SpeedDialGroupList.vue';
import SpeedDialGroupTrigger from './SpeedDialGroupTrigger.vue';

/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
/** Renders a pinned trigger that fans a stack of action buttons out across the viewport when opened. */
defineOptions({ name: 'SpeedDialGroup', inheritAttrs: false });

/* `className` is Vue's `class` fallthrough attr; `children` is the default slot. */
const props = withDefaults(defineProps<SpeedDialGroupProps>(), {
  position: OverlayPosition.BottomRight,
  direction: undefined,
  gap: 12,
  defaultOpen: false,
  open: undefined,
});

const emit = defineEmits<{
  /** Fires when the dial opens or closes, carrying the new open state. */
  'update:open': [open: boolean];
}>();

const attrs = useAttrs();
const slots = useSlots();

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const PositionToDirection: Record<SpeedDialGroupPosition, SpeedDialGroupDirection> = {
  'bottom-right': SpeedDialGroupDirectionValue.Up,
  'bottom-left': SpeedDialGroupDirectionValue.Up,
  'bottom-center': SpeedDialGroupDirectionValue.Up,
  'top-right': SpeedDialGroupDirectionValue.Down,
  'top-left': SpeedDialGroupDirectionValue.Down,
  'top-center': SpeedDialGroupDirectionValue.Down,
};

const PositionOffsets: Record<SpeedDialGroupPosition, string> = {
  'bottom-right': 'bottom-6 right-6',
  'bottom-left': 'bottom-6 left-6',
  'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
  'top-right': 'top-6 right-6',
  'top-left': 'top-6 left-6',
  'top-center': 'top-6 left-1/2 -translate-x-1/2',
};

const DirectionToStack: Record<SpeedDialGroupDirection, string> = {
  [SpeedDialGroupDirectionValue.Up]: 'flex-col-reverse bottom-full mb-3',
  [SpeedDialGroupDirectionValue.Down]: 'flex-col top-full mt-3',
  [SpeedDialGroupDirectionValue.Left]: 'flex-row-reverse right-full mr-3',
  [SpeedDialGroupDirectionValue.Right]: 'flex-row top-1/2 -translate-y-1/2 left-full ml-3',
};

const { value: open, setValue: setOpen } = useControlled<boolean>({
  controlled: () => props.open,
  default: props.defaultOpen,
  onChange: (next) => emit('update:open', next),
});

const rootEl = useTemplateRef<HTMLDivElement>('rootEl');
const triggerEl = shallowRef<HTMLElement | null>(null);

const resolvedDirection = computed(() => props.direction ?? PositionToDirection[props.position]);

useEscape((event) => {
  if (event.defaultPrevented) return;
  setOpen(false);
}, open);

// Restore only while the closing dial owns focus; never queue a callback that can steal it later.
watch(
  open,
  (isOpen) => {
    const root = rootEl.value;
    if (!isOpen && root?.contains(root.ownerDocument.activeElement)) triggerEl.value?.focus();
  },
  { flush: 'pre' },
);

useOutsideClick(
  rootEl,
  () => {
    if (open.value) setOpen(false);
  },
  open,
);

provide(SpeedDialGroupKey, {
  get open() {
    return open.value;
  },
  setOpen,
  triggerEl,
  get direction() {
    return resolvedDirection.value;
  },
  get position() {
    return props.position;
  },
});

/* The trigger renders always (a closed dial must still be openable); only the action items are
   gated behind `open`. The React original partitioned `Children.toArray` on `child.type`; the
   same split runs over the slot's vnodes, so the authoring shape is unchanged. */
function splitChildren(keepTrigger: boolean): Array<VNode> {
  return renderableChildren(slots.default?.()).filter(
    (child) => (child.type === SpeedDialGroupTrigger) === keepTrigger,
  );
}

const rootClass = computed(() => cn('fixed', PositionOffsets[props.position], attrs.class as ClassValue));
const stackClass = computed(() => DirectionToStack[resolvedDirection.value]);

function handleKeydown(event: KeyboardEvent): void {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    !open.value ||
    (event.key !== Key.ArrowDown && event.key !== Key.ArrowUp)
  )
    return;
  const root = rootEl.value;
  if (!root) return;
  const items = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')).filter(
    (item) => !item.matches(':disabled,[aria-disabled="true"],[data-disabled],[hidden]') && !item.closest('[inert]'),
  );
  if (items.length === 0) return;
  event.preventDefault();
  const currentIndex = items.indexOf(root.ownerDocument.activeElement as HTMLButtonElement);
  const nextIndex =
    currentIndex === -1
      ? event.key === Key.ArrowDown
        ? 0
        : items.length - 1
      : (currentIndex + (event.key === Key.ArrowDown ? 1 : -1) + items.length) % items.length;
  items[nextIndex]?.focus();
}

/** The rendered element — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: rootEl });
</script>

<template>
  <div
    ref="rootEl"
    :data-state="open ? 'open' : 'closed'"
    :class="rootClass"
    v-bind="passthroughAttrs"
    @keydown="handleKeydown"
  >
    <!-- `Presence` clones `data-state` ("open" | "closed") + a `ref` onto the list and defers
         unmount until its fade-out ends — keeps the exit from being killed by the hard `!open`
         unmount. Items pop in/out off the list's `group` state (see `SpeedDialGroupAction`),
         staggered on enter. -->
    <Presence :is-present="open">
      <SpeedDialGroupList :data-direction="resolvedDirection" :style="{ gap: `${gap}px` }" :class="stackClass">
        <component :is="node" v-for="(node, index) in splitChildren(false)" :key="node.key ?? index" />
      </SpeedDialGroupList>
    </Presence>
    <component :is="node" v-for="(node, index) in splitChildren(true)" :key="node.key ?? index" />
  </div>
</template>
