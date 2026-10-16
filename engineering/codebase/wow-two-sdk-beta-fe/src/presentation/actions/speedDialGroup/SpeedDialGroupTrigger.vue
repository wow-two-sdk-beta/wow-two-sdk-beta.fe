<script lang="ts">
import type { ButtonHTMLAttributes, VNodeChild } from 'vue';
import type { FabButtonVariant, FabButtonSize } from '../fabButton/FabButton.variants';

/* Native button attributes stay in attribute fallthrough rather than becoming runtime props. */
export interface SpeedDialGroupTriggerProps extends /* @vue-ignore */ Omit<ButtonHTMLAttributes, 'children'> {
  /** The glyph shown while closed. Defaults to a `Plus` icon. Prefer the `closed-icon` named slot. */
  readonly closedIcon?: VNodeChild;

  /** The glyph shown while open. Defaults to an `X` icon. Prefer the `open-icon` named slot. */
  readonly openIcon?: VNodeChild;

  /** The FabButton surface style. */
  readonly variant?: FabButtonVariant;

  /** The FabButton diameter. */
  readonly size?: FabButtonSize;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, defineComponent, useAttrs, useTemplateRef, watchPostEffect } from 'vue';
import type { ClassValue } from 'clsx';
import { Plus, X } from 'lucide-vue-next';
import { AriaAttribute } from '../../../foundation/dom';
import { cn } from '../../../foundation/styles';
import { Icon } from '../../../foundation/icons';
import FabButton from '../fabButton/FabButton.vue';
import { useSpeedDialContext } from './SpeedDialGroupContext';

const locale = useLocale();

/** Renders the speed dial's pinned FAB, swapping its glyph as the dial opens and closes. */
defineOptions({ name: 'SpeedDialGroupTrigger', inheritAttrs: false });

const props = withDefaults(defineProps<SpeedDialGroupTriggerProps>(), {
  /* `VNodeChild` includes `boolean`, so Vue's boolean casting turns an absent node-valued prop
     into `false` rather than `undefined` — which reads as "supplied" at every `!== undefined`
     check. An explicit `undefined` default suppresses the cast. */
  closedIcon: undefined,
  openIcon: undefined,
});

defineSlots<{
  /** The glyph shown while the dial is open. Falls back to `openIcon`, then to an `X` icon. */
  'open-icon'?(): unknown;

  /** The glyph shown while the dial is closed. Falls back to `closedIcon`, then to a `Plus` icon. */
  'closed-icon'?(): unknown;
}>();

const attrs = useAttrs();
const context = useSpeedDialContext();

/* `aria-label` is read off `attrs`, not `props`: Vue camelizes declared prop keys, so a declared
   `'aria-label'` would arrive as `props.ariaLabel` and never render. It is stripped from the
   forwarded attrs and re-bound below, so the resolved value is the one that lands. */
const ariaLabel = computed(
  () =>
    (attrs[AriaAttribute.Label] as string | undefined) ??
    locale.t('SpeedDialGroupTrigger.label', undefined, 'Toggle actions'),
);

const OwnedAttributes: ReadonlySet<string> = new Set(['class', AriaAttribute.Label]);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

/* Stable render-only wrappers for the node-valued props, so each can render as the fallback of its
   named-slot twin. */
const ClosedIconProp = defineComponent({ render: () => props.closedIcon });
const OpenIconProp = defineComponent({ render: () => props.openIcon });

const fab = useTemplateRef('fab');

/* Publishes the trigger element into the root's context — Escape and action-select return focus
   here. The React original threaded a shared `MutableRefObject` through `composeRefs`. */
watchPostEffect(() => {
  const node = fab.value?.el;
  const elementType = node?.ownerDocument.defaultView?.HTMLElement;
  context.triggerEl.value = elementType && node instanceof elementType ? node : null;
});

const rootClass = computed(() =>
  cn('static !bottom-auto !left-auto !right-auto !top-auto !translate-x-0', attrs.class as ClassValue),
);

/* Chained after the consumer's own click (attribute fallthrough puts theirs first) and skipped
   when they called `preventDefault()` — the original's `onClick?.(e); if (e.defaultPrevented) return`. */
function handleClick(event: MouseEvent): void {
  if (event.defaultPrevented) return;
  context.setOpen(!context.open);
}
</script>

<template>
  <FabButton
    ref="fab"
    v-bind="passthroughAttrs"
    :aria-label="ariaLabel"
    aria-haspopup="menu"
    :aria-expanded="context.open"
    :variant="variant"
    :size="size"
    :position="context.position"
    :class="rootClass"
    @click="handleClick"
  >
    <template v-if="context.open">
      <slot name="open-icon">
        <OpenIconProp v-if="openIcon !== undefined" />
        <Icon v-else :icon="X" :size="20" />
      </slot>
    </template>
    <template v-else>
      <slot name="closed-icon">
        <ClosedIconProp v-if="closedIcon !== undefined" />
        <Icon v-else :icon="Plus" :size="20" />
      </slot>
    </template>
  </FabButton>
</template>
