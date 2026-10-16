<script lang="ts">
export interface Reaction {
  /** Stable id (typically the emoji or shortcode). */
  readonly key: string;

  /** Emoji displayed in the chip. Rich content → the `emoji` scoped slot. */
  readonly emoji: string | number;

  /** Total count of users who reacted. */
  readonly count: number;

  /** Whether the current viewer has reacted with this. */
  readonly isReactedByMe?: boolean;

  /** Optional list of user names — surfaced in the chip's `title`. */
  readonly users?: ReadonlyArray<string>;
}

export interface ReactionBarProps {
  readonly reactions: ReadonlyArray<Reaction>;

  /** The trailing "add reaction" button's visibility. Default true. */
  readonly hasAddButton?: boolean;

  /** The compact mode — emoji only, no counts. */
  readonly isCompact?: boolean;

  /** The empty-chip visibility — renders chips with `count === 0`. Default false. */
  readonly hasEmpty?: boolean;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, getCurrentInstance, useAttrs, useTemplateRef } from 'vue';
import { SmilePlus } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { dataAttr } from '../../../foundation/dom';

const locale = useLocale();

/**
 * Renders a row of reaction chips with an optional trailing add-reaction button.
 *
 * Each chip emits `@react` with its key; the trailing `+` emits `@add` to open a picker. Pair with
 * `forms/ReactionPicker` to wire the add flow.
 */
defineOptions({ name: 'ReactionBar', inheritAttrs: false });

/**
 * React typed `Reaction.emoji` as a `ReactNode`, so a chip could hold a custom
 * glyph. The prop keeps the scalar form and the per-row node becomes a scoped
 * slot whose fallback is the default rendering.
 */
defineSlots<{
  /** The chip glyph override, per reaction. */
  emoji(props: { reaction: Reaction; index: number }): unknown;
}>();

const props = withDefaults(defineProps<ReactionBarProps>(), {
  /* `reactions` stays declared-required — Vue still warns when it is missing — but a
     default keeps an absent (or transiently-undefined) value out of the `.filter`
     below, which took the whole page down. */
  reactions: () => [],
  hasAddButton: true,
  isCompact: undefined,
  hasEmpty: false,
});

const emit = defineEmits<{
  /** Fires when the reader toggles a reaction chip, with that chip's key. */
  react: [key: string];

  /** Fires when the trailing "add" button is activated (opens a picker). */
  add: [];
}>();

const attrs = useAttrs();
const instance = getCurrentInstance();
const el = useTemplateRef<HTMLDivElement>('el');

/**
 * Mirrors React's `hasAddButton && onAdd && <button/>` guard — the button
 * renders only when the consumer bound `@add`. Read through a call, not a
 * cached computed: `instance.vnode` is replaced on every re-render.
 */
const hasAdd = () => props.hasAddButton && Boolean(instance?.vnode.props?.onAdd);

const visible = computed(() => (props.hasEmpty ? props.reactions : props.reactions.filter((r) => r.count > 0)));

/** Was React's private `ReactionChip` component — a class map is all it carried. */
const chipClasses = (reaction: Reaction): string =>
  cn(
    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs leading-none transition-colors',
    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    reaction.isReactedByMe
      ? 'border-primary bg-primary-soft text-primary-soft-foreground'
      : 'border-border bg-background hover:bg-muted',
  );

const chipTitle = (reaction: Reaction): string | undefined =>
  reaction.users?.length ? reaction.users.join(', ') : undefined;

const classes = computed(() => cn('inline-flex flex-wrap items-center gap-1', attrs.class as string | undefined));

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
    role="group"
    :aria-label="locale.t('ReactionBar.reactions', undefined, 'Reactions')"
    v-bind="rest"
    :class="classes"
  >
    <button
      v-for="(reaction, index) in visible"
      :key="reaction.key"
      type="button"
      :data-active="dataAttr(reaction.isReactedByMe)"
      :title="chipTitle(reaction)"
      :class="chipClasses(reaction)"
      @click="emit('react', reaction.key)"
    >
      <span class="text-sm leading-none">
        <slot name="emoji" :reaction="reaction" :index="index">{{ reaction.emoji }}</slot>
      </span>
      <span v-if="!props.isCompact" class="font-medium tabular-nums">{{ reaction.count }}</span>
    </button>
    <button
      v-if="hasAdd()"
      type="button"
      :aria-label="locale.t('ReactionBar.addReaction', undefined, 'Add reaction')"
      class="inline-flex items-center justify-center rounded-full border border-dashed border-border px-2 py-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      @click="emit('add')"
    >
      <SmilePlus class="h-3.5 w-3.5" />
    </button>
  </div>
</template>
