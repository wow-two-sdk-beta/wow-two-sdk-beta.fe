<script lang="ts">
import type { ButtonHTMLAttributes } from 'vue';
import type { Side } from '../../../foundation/styles';

/* Native button attributes stay in attribute fallthrough rather than becoming runtime props. */
export interface DisclosureButtonProps extends /* @vue-ignore */ Omit<ButtonHTMLAttributes, 'children' | 'onChange'> {
  /** The controlled open state. */
  readonly open?: boolean;
  /** The uncontrolled initial state. */
  readonly defaultOpen?: boolean;
  /** The side the chevron sits on (`left` · `right`). Default `right`. */
  readonly chevronSide?: Side;
  /** The button type. Default `ButtonType.Button`. */
  readonly type?: ButtonType;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { ChevronDown } from 'lucide-vue-next';
import type { ClassValue } from 'clsx';
import { ButtonType, dataAttr } from '../../../foundation/dom';
import { cn, Side as SideValue } from '../../../foundation/styles';
import { Icon } from '../../../foundation/icons';
import { useControlled } from '../../../foundation/state';

/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
/** Renders a full-width labelled button with a rotating chevron that expands or collapses a section. */
defineOptions({ name: 'DisclosureButton', inheritAttrs: false });

/* `children` became the default slot (the visible, left-aligned label); `onOpenChange` the
   `update:open` emit. */
const props = withDefaults(defineProps<DisclosureButtonProps>(), {
  chevronSide: SideValue.Right,
  type: ButtonType.Button,
  defaultOpen: false,
  open: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader expands or collapses the section, carrying the new open state. */
  'update:open': [open: boolean];
}>();

defineSlots<{
  /** The button's own label, left-aligned beside the chevron. */
  default(): unknown;
}>();

const attrs = useAttrs();

const { value: open, setValue: setOpen } = useControlled<boolean>({
  controlled: () => props.open,
  default: props.defaultOpen,
  onChange: (next) => emit('update:open', next),
});

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const chevronClass = computed(() => cn('transition-transform', open.value && 'rotate-180'));

const rootClass = computed(() =>
  cn(
    'inline-flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
    attrs.class as ClassValue,
  ),
);

/* Chained after the consumer's own click (attribute fallthrough puts theirs first) and skipped
   when they called `preventDefault()` — the original's `onClick?.(e); if (!e.defaultPrevented)`. */
function handleClick(event: MouseEvent): void {
  if (event.defaultPrevented) return;
  setOpen(!open.value);
}

const root = useTemplateRef<HTMLButtonElement>('root');

/** The rendered element — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: root });
</script>

<template>
  <!-- Button with a rotating chevron — sets `aria-expanded` + `data-state="open|closed"`. -->
  <button
    ref="root"
    :type="type"
    :aria-expanded="open"
    :data-state="open ? 'open' : 'closed'"
    :data-disabled="dataAttr(attrs.disabled as boolean | undefined)"
    :class="rootClass"
    v-bind="passthroughAttrs"
    @click="handleClick"
  >
    <Icon v-if="chevronSide === SideValue.Left" :icon="ChevronDown" :size="16" :class="chevronClass" />
    <span class="flex-1 text-left"><slot /></span>
    <Icon v-if="chevronSide === SideValue.Right" :icon="ChevronDown" :size="16" :class="chevronClass" />
  </button>
</template>
