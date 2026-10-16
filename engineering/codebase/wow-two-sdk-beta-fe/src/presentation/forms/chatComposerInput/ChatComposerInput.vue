<script lang="ts">
/** Defines which keypress submits a chat composer. */
export const SubmitTrigger = {
  /** Refers to plain Enter (Shift+Enter inserts a newline). */
  Enter: 'enter',
  /** Refers to Cmd/Ctrl+Enter (plain Enter inserts a newline). */
  ModEnter: 'mod-enter',
} as const;

export type SubmitTrigger = (typeof SubmitTrigger)[keyof typeof SubmitTrigger];

export interface ChatComposerInputProps {
  /** The text value, controlled. The `v-model` binding target. */
  readonly modelValue?: string;

  /** The initial text when uncontrolled. */
  readonly defaultValue?: string;

  /** The placeholder text. */
  readonly placeholder?: string;

  /** The disabled state for the input + send button. */
  readonly isDisabled?: boolean;

  /** The content rendered on the leading edge of the toolbar (e.g. attach button).
   *  Fill the `leading` slot for richer content. */
  readonly leading?: string | number;

  /** The content rendered between the leading slot and the send button.
   *  Fill the `trailing` slot for richer content. */
  readonly trailing?: string | number;

  /** The custom send button, replacing the default. Fill the `sendButton` slot for richer content. */
  readonly sendButton?: string | number;

  /** The hidden state for the send button (e.g. when consumer renders a custom CTA). */
  readonly isSendButtonHidden?: boolean;

  /** The submit trigger for the textarea. `enter` = Enter alone (default).
   *  `mod-enter` = Cmd/Ctrl+Enter (Enter inserts a newline). */
  readonly submitOn?: SubmitTrigger;

  /** The maximum textarea pixel height before scroll kicks in. Default `200`. */
  readonly maxHeight?: number;

  /**
   * The pass-through textarea attributes (`rows` is overridden).
   *
   * React typed this `Omit<TextareaHTMLAttributes, 'value' | 'defaultValue' | 'onChange'>`;
   * it is a loose attribute bag here because the SFC prop resolver has to resolve the
   * declared type at build time and cannot follow Vue's `TextareaHTMLAttributes` through a
   * mapped `Omit`. Listener keys use Vue's spelling — `onKeydown`, not `onKeyDown`.
   */
  readonly textareaProps?: Record<string, unknown>;
}
</script>

<script setup lang="ts">
import { useLocaleDefaults, useLocale } from '../../../foundation/i18n';
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, nextTick, onMounted, useAttrs, useSlots, useTemplateRef, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { Send } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';

/**
 * Renders a chat input row — auto-resizing textarea, send button, and leading / trailing slots.
 *
 * Enter sends by default and Shift+Enter inserts a newline; `submitOn="mod-enter"` flips that.
 */
/* `inheritAttrs: false` so `class` folds into the form's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'ChatComposerInput', inheritAttrs: false });

const inputProps = withDefaults(defineProps<ChatComposerInputProps>(), {
  submitOn: 'enter',
  maxHeight: 200,
  isSendButtonHidden: false,
  /* Explicit `undefined` default: `useControlled` keys on `=== undefined`, so an absent
     `modelValue`/`modelValue` must stay undefined rather than be read as a controlled empty string. */
  modelValue: undefined,
  isDisabled: undefined,
});
const props = useLocaleDefaults(inputProps, 'ChatComposerInput', { placeholder: 'Write a message…' });

const emit = defineEmits<{
  /** Fires when the writer edits the draft message — the `v-model` half. */
  'update:modelValue': [value: string];
  /** Fires when the writer sends — Enter, Mod+Enter or the button — carrying the trimmed text. */
  submit: [value: string];
}>();

defineSlots<{
  leading?(): unknown;
  trailing?(): unknown;
  sendButton?(): unknown;
}>();

const attrs = useAttrs();
const slots = useSlots();

const controlled = useControlled<string>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? '',
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const text = controlled.value;

const textarea = useTemplateRef<HTMLTextAreaElement>('textarea');

/* Reads + writes layout, so it must never run during SSR: it is reached only from `onMounted`
   and from a NON-immediate watcher, both client-only. An `immediate: true, flush: 'post'`
   watcher would run on the server and throw on the element access. */
function resize(): void {
  const ta = textarea.value;
  if (!ta) return;
  ta.style.height = 'auto';
  const next = Math.min(ta.scrollHeight, props.maxHeight);
  ta.style.height = `${next}px`;
  ta.style.overflowY = ta.scrollHeight > props.maxHeight ? 'auto' : 'hidden';
}

onMounted(resize);

/* React re-ran the resize effect on `modelValue` and on `maxHeight` (a `resize` callback dep). */
watch([text, () => props.maxHeight], () => void nextTick(resize));

const isControlled = computed(() => props.modelValue !== undefined);
const isEmpty = computed(() => text.value.trim().length === 0);

function submit(event?: Event): void {
  event?.preventDefault();
  const trimmed = text.value.trim();
  if (!trimmed || props.isDisabled) return;
  emit('submit', trimmed);
  if (!isControlled.value) controlled.setValue('');
}

function onInput(event: Event): void {
  if ((event as InputEvent).isComposing) return;
  controlled.setValue((event.target as HTMLTextAreaElement).value);
}

function onKeydown(event: KeyboardEvent): void {
  if (event.isComposing) return;
  /* React invoked `textareaProps.onKeyDown` first and then honoured `defaultPrevented`; the
     handler is pulled off the bag by hand to keep that ordering (and excluded from the bound
     passthrough below so it cannot fire twice). */
  (props.textareaProps?.onKeydown as ((e: KeyboardEvent) => void) | undefined)?.(event);
  if (event.defaultPrevented) return;
  const isEnter = event.key === 'Enter' && !event.shiftKey && !event.isComposing;
  const wantsMod = props.submitOn === 'mod-enter';
  const modPressed = event.metaKey || event.ctrlKey;
  if (isEnter && (wantsMod ? modPressed : !modPressed)) {
    event.preventDefault();
    submit();
  }
}

const hasLeading = computed(() => Boolean(props.leading) || Boolean(slots.leading));
const hasTrailing = computed(() => Boolean(props.trailing) || Boolean(slots.trailing));
const hasSendButton = computed(() => Boolean(props.sendButton) || Boolean(slots.sendButton));

/* `class` + the textarea's own class are owned; `onKeydown` is invoked by hand above. */
const TextAreaOwned: ReadonlySet<string> = new Set(['class', 'onKeydown', 'rows']);
const textareaPassthrough = computed(() =>
  Object.fromEntries(Object.entries(props.textareaProps ?? {}).filter(([key]) => !TextAreaOwned.has(key))),
);

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
/* Fallthrough attrs land on the `<form>`, matching React's trailing `{...props}` spread. */
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const formClass = computed(() =>
  cn(
    'flex w-full items-end gap-2 rounded-2xl border border-input bg-background px-3 py-2',
    'focus-within:ring-2 focus-within:ring-ring',
    props.isDisabled && 'cursor-not-allowed opacity-60',
    attrs.class as ClassValue,
  ),
);

const textareaClass = computed(() =>
  cn(
    'flex-1 resize-none bg-transparent py-1 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-hidden',
    props.textareaProps?.class as ClassValue,
  ),
);

const sendButtonClass = computed(() =>
  cn(
    'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full self-end',
    isEmpty.value ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90',
    'disabled:cursor-not-allowed',
    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
  ),
);

const SendIcon = Send;

/** The rendered `<textarea>` — the Vue stand-in for the React original's forwarded ref. */
useNativeFormReset(textarea, controlled.reset, () => {
  if (textarea.value) textarea.value.value = String(text.value ?? '');
});

defineExpose({ el: textarea });

const locale = useLocale();
</script>

<template>
  <form :class="formClass" v-bind="passthroughAttrs" @submit="submit">
    <div v-if="hasLeading" class="flex shrink-0 items-center gap-1 self-end pb-1">
      <slot name="leading">{{ leading }}</slot>
    </div>
    <textarea
      ref="textarea"
      v-bind="textareaPassthrough"
      :value="text"
      :rows="1"
      :placeholder="props.placeholder"
      :disabled="isDisabled"
      :class="textareaClass"
      @input="onInput"
      @compositionend="onInput"
      @keydown="onKeydown"
    />
    <div v-if="hasTrailing" class="flex shrink-0 items-center gap-1 self-end pb-1">
      <slot name="trailing">{{ trailing }}</slot>
    </div>
    <template v-if="!isSendButtonHidden">
      <slot v-if="hasSendButton" name="sendButton">{{ sendButton }}</slot>
      <button
        v-else
        type="submit"
        :disabled="isDisabled || isEmpty"
        :aria-label="locale.t('ChatComposerInput.sendMessage', undefined, 'Send message')"
        :class="sendButtonClass"
      >
        <SendIcon class="h-4 w-4" />
      </button>
    </template>
  </form>
</template>
