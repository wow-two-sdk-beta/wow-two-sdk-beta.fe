<script lang="ts">
import type { ElementTag } from '../../../foundation/dom';

export interface TypewriterTextProps {
  /** The phrase, or the phrases to cycle through. */
  readonly text: string | ReadonlyArray<string>;

  /** The ms between typed characters. Default `60`. */
  readonly typeSpeed?: number;

  /** The ms between deleted characters. Default `40`. */
  readonly deleteSpeed?: number;

  /** The ms held on a completed phrase before deleting. Default `1500`. */
  readonly pauseBetween?: number;

  /** The cycle-forever flag. Defaults to `true` when more than one phrase was given. */
  readonly canLoop?: boolean;

  /** The localized pause action label. */
  readonly pauseLabel?: string;

  /** The localized resume action label. */
  readonly resumeLabel?: string;

  /** The blinking caret. Default `true`. */
  readonly hasCursor?: boolean;

  /** The caret glyph. Default `│`. */
  readonly cursorChar?: string;

  /** The rendered tag. Default `span`. */
  readonly as?: ElementTag;
}
</script>

<script setup lang="ts">
import { useLocaleDefaults } from '../../../foundation/i18n';
import { computed, onBeforeUnmount, onMounted, ref, useAttrs, useTemplateRef, watch } from 'vue';
import { cn } from '../../../foundation/styles';
import { useReducedMotion } from '../../../foundation/device';

/**
 * Renders text typed character by character, cycling when given an array of strings.
 *
 * A single string types once; an array types, pauses, deletes, then moves on. `prefers-reduced-motion` short-circuits
 * to the full string.
 */
defineOptions({ name: 'TypewriterText', inheritAttrs: false });

const componentProps = withDefaults(defineProps<TypewriterTextProps>(), {
  typeSpeed: 60,
  deleteSpeed: 40,
  pauseBetween: 1500,
  // `undefined` is meaningful — it falls back to `phrases.length > 1`, and Vue
  // would otherwise cast an absent Boolean prop to `false`.
  canLoop: undefined,
  hasCursor: true,
  cursorChar: '│',
  as: 'span',
});
const props = useLocaleDefaults(componentProps, 'TypewriterText', {
  pauseLabel: 'Pause animation',
  resumeLabel: 'Resume animation',
});

const attrs = useAttrs();
const el = useTemplateRef<HTMLElement>('el');
/* Called before the lifecycle hooks below so its own `onMounted` subscription
   lands first and the flag is already settled when `step` first runs. */
const reducedMotion = useReducedMotion();

const phrases = computed(() => (Array.isArray(props.text) ? props.text : [props.text]));
const shouldLoop = computed(() => props.canLoop ?? phrases.value.length > 1);

const phraseIndex = ref(0);
const charIndex = ref(0);
const deleting = ref(false);
const paused = ref(false);

/* React's `useEffect` re-ran on every state / timing change and cleared its
   pending timeout on the way out. Driven from `onMounted` rather than an
   `immediate` watcher so `window.setTimeout` is never touched on the server. */
let timer: number | undefined;

function clearTimer(): void {
  if (timer !== undefined) {
    window.clearTimeout(timer);
    timer = undefined;
  }
}

function step(): void {
  clearTimer();
  if (reducedMotion.value || paused.value || phrases.value.length === 0) return;

  const current = phrases.value[phraseIndex.value] ?? '';

  if (!deleting.value) {
    // Typing phase.
    if (charIndex.value < current.length) {
      timer = window.setTimeout(() => {
        charIndex.value += 1;
      }, props.typeSpeed);
    } else {
      // Done typing this phrase.
      if (!shouldLoop.value && phraseIndex.value === phrases.value.length - 1) return;
      timer = window.setTimeout(() => {
        deleting.value = true;
      }, props.pauseBetween);
    }
    return;
  }

  // Deleting phase.
  if (charIndex.value > 0) {
    timer = window.setTimeout(() => {
      charIndex.value -= 1;
    }, props.deleteSpeed);
    return;
  }

  // Move to next phrase.
  const nextIndex = (phraseIndex.value + 1) % phrases.value.length;
  if (!shouldLoop.value && nextIndex === 0) return;
  deleting.value = false;
  phraseIndex.value = nextIndex;
}

onMounted(step);

watch(
  [
    charIndex,
    deleting,
    phraseIndex,
    phrases,
    shouldLoop,
    reducedMotion,
    paused,
    () => props.typeSpeed,
    () => props.deleteSpeed,
    () => props.pauseBetween,
  ],
  step,
);

watch(
  () => props.text,
  () => {
    phraseIndex.value = 0;
    charIndex.value = 0;
    deleting.value = false;
  },
);

onBeforeUnmount(clearTimer);

const fullText = computed(() =>
  reducedMotion.value
    ? Array.isArray(props.text)
      ? (props.text[0] ?? '')
      : props.text
    : (phrases.value[phraseIndex.value] ?? '').slice(0, charIndex.value),
);

const showsCursor = computed(() => props.hasCursor && !reducedMotion.value && !paused.value);

const classes = computed(() => cn('inline-block', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <component :is="props.as" ref="el" v-bind="rest" :class="classes">
    <span class="sr-only">{{ phrases.join(' ') }}</span>
    <span aria-hidden="true"
      >{{ fullText
      }}<span v-if="showsCursor" class="ml-0.5 inline-block motion-safe:animate-[blink-caret_1s_step-end_infinite]">{{
        props.cursorChar
      }}</span></span
    >
    <button
      v-if="!reducedMotion"
      type="button"
      :aria-pressed="paused"
      class="ml-2 rounded border px-2 py-1 text-sm"
      @click="paused = !paused"
    >
      {{ paused ? props.resumeLabel : props.pauseLabel }}
    </button>
  </component>
</template>
