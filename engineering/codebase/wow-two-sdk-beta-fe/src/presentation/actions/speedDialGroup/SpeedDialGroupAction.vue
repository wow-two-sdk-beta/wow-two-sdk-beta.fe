<script lang="ts">
import type { ButtonHTMLAttributes, VNodeChild } from 'vue';
import { AriaAttribute } from '../../../foundation/dom';

/** @internal An attribute name this component derives or requires. */
type RequiredAttribute = typeof AriaAttribute.Label;

/* The required accessible label rides on the ignored heritage rather than the body — action items
   are icon-only, so the name is mandatory, but it must reach the DOM as an attribute. */
type SpeedDialGroupActionAttributes = Omit<ButtonHTMLAttributes, 'children'> & Record<RequiredAttribute, string>;

/* Native button attributes stay in attribute fallthrough rather than becoming runtime props. */
export interface SpeedDialGroupActionProps extends /* @vue-ignore */ SpeedDialGroupActionAttributes {
  /** The action's glyph. Prefer the `icon` named slot; this prop stays for parity with the React API. */
  readonly icon?: VNodeChild;

  /** The label chip rendered beside the button. Prefer the `tooltip` named slot. */
  readonly tooltip?: VNodeChild;

  /** The button type. Default `ButtonType.Button`. */
  readonly type?: ButtonType;
}
</script>

<script setup lang="ts">
import { computed, defineComponent, useAttrs, useSlots, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { ButtonType } from '../../../foundation/dom';
import { cn, Side } from '../../../foundation/styles';
import { SpeedDialGroupDirection, useSpeedDialContext } from './SpeedDialGroupContext';

/* `aria-label` is deliberately NOT a declared prop: Vue camelizes prop keys, so a declared
   `'aria-label'` would arrive as `props.ariaLabel` and never render. It stays a fallthrough attr;
   the interface keeps the requirement through the `@vue-ignore`d heritage. */
/** Renders one icon button of an open speed dial, with an optional label chip beside it. */
defineOptions({ name: 'SpeedDialGroupAction', inheritAttrs: false });

const props = withDefaults(defineProps<SpeedDialGroupActionProps>(), {
  type: ButtonType.Button,
  /* `VNodeChild` includes `boolean`, so Vue's boolean casting turns an absent node-valued prop
     into `false` rather than `undefined` — which reads as "supplied" at every `!== undefined`
     check. An explicit `undefined` default suppresses the cast. */
  icon: undefined,
  tooltip: undefined,
});

const emit = defineEmits<{
  /** Fires when the action is chosen — the dial closes and focus returns to the trigger afterwards. */
  select: [];
}>();

defineSlots<{
  /** The action's glyph. Preferred over the `icon` prop. */
  icon?(): unknown;
  /** The glyph, in the plain-children shape a Vue caller reaches for. Same slot as `icon`. */
  default?(): unknown;
  /** The label chip beside the button. Preferred over the `tooltip` prop. */
  tooltip?(): unknown;
}>();

const attrs = useAttrs();
const slots = useSlots();
const context = useSpeedDialContext();

const DirectionLabelSide: Record<SpeedDialGroupDirection, Side> = {
  [SpeedDialGroupDirection.Up]: Side.Right,
  [SpeedDialGroupDirection.Down]: Side.Right,
  [SpeedDialGroupDirection.Left]: Side.Right,
  [SpeedDialGroupDirection.Right]: Side.Left,
};

/* Stable render-only wrappers for the node-valued props, so each can render as the fallback of its
   named-slot twin. */
const IconProp = defineComponent({ render: () => props.icon });
const TooltipProp = defineComponent({ render: () => props.tooltip });

const labelSide = computed(() => DirectionLabelSide[context.direction]);
const hasTooltip = computed(() => props.tooltip !== undefined || slots.tooltip !== undefined);

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const buttonClass = computed(() =>
  cn(
    'inline-flex h-10 w-10 items-center justify-center rounded-full bg-card text-card-foreground shadow-md transition-all hover:shadow-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    attrs.class as ClassValue,
  ),
);

/* Chained after the consumer's own click (attribute fallthrough puts theirs first) and skipped
   when they called `preventDefault()` — the original's `onClick?.(e); if (e.defaultPrevented) return`. */
function handleClick(event: MouseEvent): void {
  if (
    event.defaultPrevented ||
    !context.open ||
    root.value?.matches(':disabled,[aria-disabled="true"],[data-disabled]')
  )
    return;
  emit('select');
  context.setOpen(false);
}

const root = useTemplateRef<HTMLButtonElement>('root');
function handleClickCapture(event: MouseEvent): void {
  if (context.open && !root.value?.matches(':disabled,[aria-disabled="true"],[data-disabled]')) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}

/** The rendered element — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: root });
</script>

<template>
  <li
    role="none"
    :data-side="labelSide"
    :class="
      cn(
        'flex items-center gap-2',
        /* fade+scale each action off the list's `group` state; motion-safe so
           reduced-motion users get no movement (delay ramp lives on the list). */
        'motion-safe:group-data-[state=open]:animate-(--animate-pop-in)',
        'motion-safe:group-data-[state=closed]:animate-(--animate-pop-out)',
        'motion-reduce:animate-none',
      )
    "
  >
    <span
      v-if="hasTooltip && labelSide === Side.Left"
      class="rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow"
    >
      <slot name="tooltip"><TooltipProp v-if="tooltip !== undefined" /></slot>
    </span>
    <button
      ref="root"
      v-bind="passthroughAttrs"
      :type="type"
      role="menuitem"
      :class="buttonClass"
      @click.capture="handleClickCapture"
      @click="handleClick"
    >
      <!-- The default slot is the fallback, not a second API: React typed `children` away,
           so a Vue caller writing `<SpeedDialGroupAction><Pencil /></SpeedDialGroupAction>` — the
           idiomatic shape — got a silently empty button. Precedence stays `icon` slot →
           default slot → `icon` prop. -->
      <slot name="icon">
        <slot><IconProp v-if="icon !== undefined" /></slot>
      </slot>
    </button>
    <span
      v-if="hasTooltip && labelSide === Side.Right"
      class="rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow"
    >
      <slot name="tooltip"><TooltipProp v-if="tooltip !== undefined" /></slot>
    </span>
  </li>
</template>
