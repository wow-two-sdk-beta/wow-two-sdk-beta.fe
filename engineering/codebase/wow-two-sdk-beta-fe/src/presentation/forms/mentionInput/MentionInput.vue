<script lang="ts">
/** Defines one person, tag or item a mention can insert. */
export interface MentionOption {
  /** The option's identity, carried by the `mention` event. */
  readonly value: string;

  /** The visible name; also what the default filter matches and what gets inserted. */
  readonly label: string;

  /** The secondary line under the label. */
  readonly description?: string;
}

/** Defines props for the text field with mention suggestions. */
export interface MentionInputProps {
  /** The text, controlled. The `v-model` binding target. */
  readonly modelValue?: string;

  /** The initial text when uncontrolled. */
  readonly defaultValue?: string;

  /** The suggestions; update them from `search` for server-side lookup. */
  readonly options: ReadonlyArray<MentionOption>;

  /** The character that starts a mention. Default `@`. */
  readonly trigger?: string;

  /** Decides which options match the typed query. Default a case-insensitive label match. */
  readonly filter?: (option: MentionOption, query: string) => boolean;

  /** Builds the inserted text. Default the trigger and the label (`@Ada Lovelace`). */
  readonly format?: (option: MentionOption) => string;

  /** The most suggestions listed. Default 8. */
  readonly maxSuggestions?: number;

  /** The visible text rows. Default 3. */
  readonly rows?: number;

  /** The empty-state text. */
  readonly placeholder?: string;

  /** The field's id. Auto-filled from `Field` context when omitted. */
  readonly id?: string;

  /** The disabled state. Falls back to the surrounding field's state. */
  readonly isDisabled?: boolean;

  /** Prevents changes while keeping the text submitted. Falls back to the surrounding field's state. */
  readonly isReadOnly?: boolean;

  /** The invalid state. Falls back to the surrounding field's state. */
  readonly isInvalid?: boolean;

  /** The field name; the text submits with the form. */
  readonly name?: string;
}

/** @internal A mention being typed: where its trigger sits and what follows it. */
interface ActiveMention {
  readonly start: number;
  readonly query: string;
}

/** @internal Finds the mention the caret is in — a trigger at the start or after whitespace, then no whitespace. */
function findMention(text: string, caret: number, trigger: string): ActiveMention | null {
  const before = text.slice(0, caret);
  const start = before.lastIndexOf(trigger);
  if (start < 0 || (start > 0 && !/\s/.test(before[start - 1]!))) return null;
  const query = before.slice(start + trigger.length);
  return /\s/.test(query) ? null : { start, query };
}

/** @internal The textarea styles the caret mirror copies. */
const MirroredStyles = [
  'boxSizing',
  'width',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'letterSpacing',
  'lineHeight',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'textTransform',
  'textIndent',
  'tabSize',
  'wordSpacing',
] as const;

/** @internal Measures where a text offset renders inside a textarea, relative to its border box. */
function caretOffset(textarea: HTMLTextAreaElement, offset: number): { top: number; left: number; height: number } {
  const style = getComputedStyle(textarea);
  const mirror = document.createElement('div');
  for (const property of MirroredStyles) mirror.style[property] = style[property];
  Object.assign(mirror.style, {
    position: 'absolute',
    visibility: 'hidden',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    top: '0',
    left: '0',
  });
  mirror.textContent = textarea.value.slice(0, offset);
  const marker = document.createElement('span');
  marker.textContent = textarea.value.slice(offset) || '.';
  mirror.append(marker);
  document.body.append(mirror);
  const measured = {
    top: marker.offsetTop - textarea.scrollTop,
    left: marker.offsetLeft - textarea.scrollLeft,
    height: Number.parseFloat(style.lineHeight) || marker.offsetHeight,
  };
  mirror.remove();
  return measured;
}
</script>

<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, useAttrs, useTemplateRef, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { useLocale } from '../../../foundation/i18n';
import { useId } from '../../../foundation/identifiers';
import { AnchoredPositioner, Portal, useFormControl } from '../../../foundation/primitives';
import { useControlled } from '../../../foundation/state';
import { cn } from '../../../foundation/styles';
import { inputBaseVariants, InputState } from '../InputStyles';

/**
 * Renders a multi-line text field that suggests people or items after a trigger character (`@`) and inserts
 * the pick in place.
 */
defineOptions({ name: 'MentionInput', inheritAttrs: false });

defineSlots<{
  /** Replaces a suggestion's content. */
  option?(props: { option: MentionOption; isHighlighted: boolean }): unknown;
}>();

const props = withDefaults(defineProps<MentionInputProps>(), {
  modelValue: undefined,
  defaultValue: '',
  trigger: '@',
  filter: undefined,
  format: undefined,
  maxSuggestions: 8,
  rows: 3,
  placeholder: undefined,
  id: undefined,
  isDisabled: undefined,
  isReadOnly: undefined,
  isInvalid: undefined,
  name: undefined,
});

const emit = defineEmits<{
  /** Fires when the text changes — the `v-model` half. */
  'update:modelValue': [text: string];

  /** Fires when the typed mention query changes — fetch matching `options` for server-side lookup. */
  search: [query: string];

  /** Fires when the reader inserts a suggestion. */
  mention: [option: MentionOption];
}>();

const attrs = useAttrs();
const locale = useLocale();
const field = useFormControl();
const listId = useId('mention-list');

const disabled = computed(() => props.isDisabled ?? field?.isDisabled ?? false);
const readOnly = computed(() => props.isReadOnly ?? field?.isReadOnly ?? false);
const invalid = computed(() => props.isInvalid ?? field?.isInvalid ?? false);

const controlled = useControlled<string>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue,
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});
const text = controlled.value;

const textarea = useTemplateRef<HTMLTextAreaElement>('textarea');
const marker = useTemplateRef<HTMLElement>('marker');
const active = shallowRef<ActiveMention | null>(null);
const dismissedStart = ref<number | null>(null);
const highlighted = ref(0);
const markerStyle = shallowRef<Record<string, string>>({ top: '0px', left: '0px', height: '0px' });

const suggestions = computed<ReadonlyArray<MentionOption>>(() => {
  const mention = active.value;
  if (!mention) return [];
  const query = mention.query.toLocaleLowerCase(locale.locale.value);
  const matches =
    props.filter ?? ((option: MentionOption) => option.label.toLocaleLowerCase(locale.locale.value).includes(query));
  return props.options.filter((option) => matches(option, mention.query)).slice(0, Math.max(1, props.maxSuggestions));
});

const isOpen = computed(
  () =>
    active.value !== null &&
    active.value.start !== dismissedStart.value &&
    suggestions.value.length > 0 &&
    !disabled.value &&
    !readOnly.value,
);

watch(
  () => active.value?.query,
  (query) => {
    if (query !== undefined) emit('search', query);
  },
);

watch(suggestions, (list) => {
  if (highlighted.value >= list.length) highlighted.value = 0;
});

/** Moves the anchor marker under the mention's trigger, where the suggestions open. */
function place(start: number): void {
  const element = textarea.value;
  if (!element) return;
  const caret = caretOffset(element, start);
  markerStyle.value = {
    top: `${element.offsetTop + caret.top}px`,
    left: `${element.offsetLeft + caret.left}px`,
    height: `${caret.height}px`,
  };
}

/** Reads the mention around the caret after every edit or caret move. */
function sync(): void {
  const element = textarea.value;
  if (!element) return;
  const caret = element.selectionStart ?? element.value.length;
  const found = element.selectionEnd === caret ? findMention(element.value, caret, props.trigger) : null;
  if (!found) {
    active.value = null;
    dismissedStart.value = null;
    return;
  }
  if (active.value?.start !== found.start) {
    highlighted.value = 0;
    place(found.start);
  }
  active.value = found;
}

function onInput(event: Event): void {
  controlled.setValue((event.target as HTMLTextAreaElement).value);
  sync();
}

/** Replaces the typed mention with the formatted pick and parks the caret after it. */
function insert(option: MentionOption): void {
  const element = textarea.value;
  const mention = active.value;
  if (!element || !mention) return;
  const caret = element.selectionStart ?? element.value.length;
  const inserted = props.format ? props.format(option) : `${props.trigger}${option.label}`;
  const after = element.value.slice(caret);
  const spacer = after.startsWith(' ') ? '' : ' ';
  controlled.setValue(`${element.value.slice(0, mention.start)}${inserted}${spacer}${after}`);
  emit('mention', option);
  active.value = null;
  const position = mention.start + inserted.length + spacer.length;
  void nextTick(() => {
    element.focus();
    element.setSelectionRange(position, position);
  });
}

function onKeydown(event: KeyboardEvent): void {
  if (!isOpen.value) return;
  const count = suggestions.value.length;
  if (event.key === 'ArrowDown') highlighted.value = (highlighted.value + 1) % count;
  else if (event.key === 'ArrowUp') highlighted.value = (highlighted.value - 1 + count) % count;
  else if (event.key === 'Enter' || event.key === 'Tab') insert(suggestions.value[highlighted.value]!);
  else if (event.key === 'Escape') dismissedStart.value = active.value?.start ?? null;
  else return;
  event.preventDefault();
}

function optionId(index: number): string {
  return `${listId}-${index}`;
}

const announcement = computed(() =>
  isOpen.value ? locale.t('MentionInput.suggestions', { count: suggestions.value.length }, '{count} suggestions') : '',
);

const rest = computed(() => Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== 'class')));

const textareaClass = computed(() =>
  cn(
    inputBaseVariants({ state: invalid.value ? InputState.Invalid : InputState.Default }),
    'h-auto min-h-20 resize-y py-2',
    attrs.class as ClassValue,
  ),
);

function optionClass(index: number): string {
  return cn(
    'flex cursor-default flex-col rounded-sm px-2 py-1.5 text-sm',
    index === highlighted.value && 'bg-primary-soft text-primary-soft-foreground',
  );
}
</script>

<template>
  <div class="relative w-full">
    <textarea
      ref="textarea"
      v-bind="rest"
      :id="props.id ?? field?.id"
      :value="text"
      :rows="props.rows"
      :name="props.name"
      :placeholder="props.placeholder"
      :disabled="disabled"
      :readonly="readOnly"
      :aria-invalid="invalid || undefined"
      :aria-describedby="field?.describedBy"
      aria-autocomplete="list"
      :aria-controls="isOpen ? listId : undefined"
      :aria-activedescendant="isOpen ? optionId(highlighted) : undefined"
      :class="textareaClass"
      @input="onInput"
      @keydown="onKeydown"
      @keyup="sync"
      @click="sync"
      @blur="active = null"
    />
    <span ref="marker" class="pointer-events-none absolute w-px" :style="markerStyle" aria-hidden="true" />
    <Portal v-if="isOpen">
      <AnchoredPositioner :anchor="marker" placement="bottom-start" :offset="4" class="z-dropdown">
        <ul
          :id="listId"
          role="listbox"
          :aria-label="locale.t('MentionInput.label', undefined, 'Suggestions')"
          class="max-h-64 min-w-48 max-w-72 overflow-y-auto rounded-md border border-border-strong/60 bg-popover p-1 text-popover-foreground shadow-lg"
        >
          <li
            v-for="(option, index) in suggestions"
            :id="optionId(index)"
            :key="option.value"
            role="option"
            :aria-selected="index === highlighted"
            :class="optionClass(index)"
            @mousedown.prevent
            @pointermove="highlighted = index"
            @click="insert(option)"
          >
            <slot name="option" :option="option" :is-highlighted="index === highlighted">
              <span class="truncate">{{ option.label }}</span>
              <span v-if="option.description" class="truncate text-xs text-muted-foreground">
                {{ option.description }}
              </span>
            </slot>
          </li>
        </ul>
      </AnchoredPositioner>
    </Portal>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>
