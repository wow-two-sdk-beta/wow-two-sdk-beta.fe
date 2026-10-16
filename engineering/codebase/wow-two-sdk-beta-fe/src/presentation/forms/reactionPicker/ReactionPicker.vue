<script lang="ts">
import type { Size } from '../../../foundation/styles';

export interface ReactionPickerProps {
  /** The list of emoji shortcuts shown as quick-pick buttons. */
  readonly emojis?: ReadonlyArray<string>;

  /** The currently active emoji keys (highlighted). */
  readonly selected?: ReadonlyArray<string>;

  /**
   * Fires when the trailing "more" button is clicked (open full picker).
   *
   * Kept a PROP, not an emit: its presence is what renders the button at all, and Vue
   * strips a declared emit's listener out of `useAttrs()` — an emit could never be
   * detected, so the button would either always or never render.
   */
  readonly onMore?: () => void;

  /** The hidden state for the trailing "more" button. */
  readonly isMoreHidden?: boolean;

  /** The compact button size. */
  readonly size?: Size;
}

const DefaultReactions = ['👍', '❤️', '😂', '🎉', '😮', '😢', '🚀'];

/* Sizes not listed fall back to the `md` row at the call site. */
const SizeClass: Partial<Record<Size, string>> = {
  sm: 'h-7 w-7 text-base',
  md: 'h-8 w-8 text-lg',
};
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, shallowRef, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { Plus } from 'lucide-vue-next';
import { cn, Size as SizeValue } from '../../../foundation/styles';

/** Renders a quick-pick row of common emoji reactions, plus a `+` that hands off to a fuller picker. */
/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'ReactionPicker', inheritAttrs: false });

const props = withDefaults(defineProps<ReactionPickerProps>(), {
  emojis: () => DefaultReactions,
  size: SizeValue.Md,
  /* Explicit `undefined` default: Vue casts an absent `boolean` prop to `false`, keeping the
     prop a genuine tri-state for consumers reading it. */
  isMoreHidden: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader picks one of the reactions, carrying that emoji. */
  select: [emoji: string];
}>();

const attrs = useAttrs();

function isActive(emoji: string): boolean {
  return props.selected?.includes(emoji) ?? false;
}

function emojiClass(emoji: string): string {
  return cn(
    'inline-flex items-center justify-center rounded-full leading-none transition-transform',
    'hover:scale-125 hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    isActive(emoji) && 'bg-primary-soft',
    SizeClass[props.size] ?? SizeClass.md,
  );
}

const moreClass = computed(() =>
  cn(
    'inline-flex items-center justify-center rounded-full text-muted-foreground transition-colors',
    'hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    SizeClass[props.size],
  ),
);

const isMoreShown = computed(() => !props.isMoreHidden && Boolean(props.onMore));

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() =>
  cn(
    'inline-flex items-center gap-1 rounded-full border border-border bg-popover p-1 shadow-sm',
    attrs.class as ClassValue,
  ),
);

const root = useTemplateRef<HTMLDivElement>('root');

/** The rendered element — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: root });

const locale = useLocale();

/* APG toolbar: one tab stop that the arrow keys move (mirrored in RTL), Home and End jump to the ends. Focus
   arriving by pointer moves the stop too, so the next arrow starts where the reader is. */
const stop = shallowRef(0);
/* Clamped, so a shorter emoji list never leaves the toolbar without a tab stop. */
const tabStop = computed(() => Math.min(stop.value, props.emojis.length - (isMoreShown.value ? 0 : 1)));

function buttons(): HTMLButtonElement[] {
  return [...(root.value?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
}

function onFocusIn(event: FocusEvent): void {
  const index = buttons().indexOf(event.target as HTMLButtonElement);
  if (index >= 0) stop.value = index;
}

function onKeydown(event: KeyboardEvent): void {
  const all = buttons();
  const index = all.indexOf(event.target as HTMLButtonElement);
  if (index < 0) return;
  const isRtl = root.value ? getComputedStyle(root.value).direction === 'rtl' : false;
  const forward = isRtl ? 'ArrowLeft' : 'ArrowRight';
  const backward = isRtl ? 'ArrowRight' : 'ArrowLeft';
  let next: number;
  if (event.key === forward) next = (index + 1) % all.length;
  else if (event.key === backward) next = (index - 1 + all.length) % all.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = all.length - 1;
  else return;
  event.preventDefault();
  all[next]?.focus();
}
</script>

<template>
  <div
    ref="root"
    role="toolbar"
    :aria-label="locale.t('ReactionPicker.reactionPicker', undefined, 'Reaction picker')"
    :class="rootClass"
    v-bind="passthroughAttrs"
    @keydown="onKeydown"
    @focusin="onFocusIn"
  >
    <button
      v-for="(emoji, index) in emojis"
      :key="emoji"
      type="button"
      :tabindex="index === tabStop ? 0 : -1"
      :data-active="isActive(emoji) ? '' : undefined"
      :aria-pressed="isActive(emoji)"
      :aria-label="locale.t('ReactionPicker.reactWith', { emoji }, 'React with {emoji}')"
      :class="emojiClass(emoji)"
      @click="emit('select', emoji)"
    >
      <span aria-hidden="true">{{ emoji }}</span>
    </button>
    <button
      v-if="isMoreShown"
      type="button"
      :tabindex="emojis.length === tabStop ? 0 : -1"
      :aria-label="locale.t('ReactionPicker.moreReactions', undefined, 'More reactions')"
      :class="moreClass"
      @click="props.onMore?.()"
    >
      <Plus class="h-4 w-4" />
    </button>
  </div>
</template>
