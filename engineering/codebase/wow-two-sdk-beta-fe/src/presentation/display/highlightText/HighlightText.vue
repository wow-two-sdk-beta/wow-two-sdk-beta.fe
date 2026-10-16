<script lang="ts">
export interface HighlightTextProps {
  /**
   * The source text to render.
   *
   * React took this as `children: string` and split it. A Vue slot renders
   * opaque vnodes that cannot be tokenised, so the text has to arrive as a
   * prop — named `text`, matching the sibling `SnippetText`, which faced the same
   * "string consumed by logic, not rendered as a node" case.
   */
  readonly text: string;

  /** The substring(s) to highlight. Match is case-insensitive. */
  readonly query: string | ReadonlyArray<string>;

  /** The whole-word-only matching mode. Default `false`. */
  readonly isWholeWord?: boolean;
}

/** One run of the source text, flagged for `MarkText` wrapping. */
interface HighlightTextSegment {
  text: string;
  isMatch: boolean;
}

function escapeRegExp(re: string): string {
  return re.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import MarkText from '../markText/MarkText.vue';

/**
 * Renders `text` with every occurrence of `query` wrapped in a `<MarkText>`.
 *
 * Case-insensitive, and `query` may be an array. Pass `isWholeWord` to skip partial matches.
 */
defineOptions({ name: 'HighlightText', inheritAttrs: false });

const props = defineProps<HighlightTextProps>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLSpanElement>('el');

/* `typeof` rather than `Array.isArray` — the latter does not narrow a
   `ReadonlyArray` cleanly, and the two branches are equivalent here. */
const queries = computed<Array<string>>(() =>
  (typeof props.query === 'string' ? [props.query] : [...props.query]).filter(Boolean),
);

/**
 * With no usable query React returned the raw text in a bare span; that is the
 * single non-matching segment below, so both paths share one root element.
 */
const segments = computed<Array<HighlightTextSegment>>(() => {
  const list = queries.value;
  if (list.length === 0) return [{ text: props.text, isMatch: false }];

  /* Longest first: regex alternation takes the first branch that matches, so `java|javascript` would split
     "javascript" into a highlighted "java" and a plain "script". */
  const pattern = [...list]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|');
  /* `\b` only knows ASCII word characters — "кофе" or "café" never sit between two of them — so whole words are
     fenced with Unicode letter / number lookarounds instead. */
  const regex = new RegExp(
    props.isWholeWord ? `(?<![\\p{L}\\p{N}_])(${pattern})(?![\\p{L}\\p{N}_])` : `(${pattern})`,
    'giu',
  );

  /* With one capture group, `split` puts every match at an odd index — read that, not a re-comparison. */
  return props.text
    .split(regex)
    .map((part, index) => ({ text: part, isMatch: index % 2 === 1 }))
    .filter((segment) => segment.text !== '');
});

const classes = computed(() => cn(attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <span ref="el" v-bind="rest" :class="classes">
    <template v-for="(segment, i) in segments" :key="i">
      <MarkText v-if="segment.isMatch">{{ segment.text }}</MarkText>
      <template v-else>{{ segment.text }}</template>
    </template>
  </span>
</template>
