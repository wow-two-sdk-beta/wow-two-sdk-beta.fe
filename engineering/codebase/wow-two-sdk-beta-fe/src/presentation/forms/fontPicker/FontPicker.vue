<script lang="ts">
/** Represents a single selectable font face. */
export interface FontOption {
  readonly name: string;
  readonly family: string;
  readonly sample?: string;
}

export const BuiltInFonts: ReadonlyArray<FontOption> = [
  { name: 'System Sans', family: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  { name: 'System Serif', family: 'ui-serif, Cambria, Georgia, "Times New Roman", serif' },
  { name: 'System Mono', family: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
  { name: 'Helvetica', family: 'Helvetica, Arial, sans-serif' },
  { name: 'Times', family: '"Times New Roman", Times, serif' },
  { name: 'Courier', family: '"Courier New", Courier, monospace' },
  { name: 'Georgia', family: 'Georgia, "Times New Roman", serif' },
  { name: 'Verdana', family: 'Verdana, Geneva, Tahoma, sans-serif' },
  { name: 'Tahoma', family: 'Tahoma, Geneva, Verdana, sans-serif' },
  { name: 'Trebuchet', family: '"Trebuchet MS", Helvetica, sans-serif' },
  { name: 'Garamond', family: 'Garamond, "Times New Roman", serif' },
  { name: 'Comic Sans', family: '"Comic Sans MS", "Comic Sans", cursive' },
  { name: 'Impact', family: 'Impact, "Arial Narrow", sans-serif' },
];

export interface FontPickerProps {
  /** The selected font family, controlled. The `v-model` binding target. */
  readonly modelValue?: string;

  /** The initial font family when uncontrolled. Defaults to the first entry in `fonts`. */
  readonly defaultValue?: string;

  /** The selectable font set. Defaults to {@link BuiltInFonts}. */
  readonly fonts?: ReadonlyArray<FontOption>;

  /** The trigger text shown when the value matches no known font. */
  readonly placeholder?: string;

  /** The sample string rendered in each row's own face, unless the option carries its own `sample`. */
  readonly previewText?: string;

  /** The disabled state. Falls back to the surrounding form control's `isDisabled`. */
  readonly isDisabled?: boolean;

  /** The hidden form input name; the hidden input emits the selected family. */
  readonly name?: string;

  /** The control's id — it lands on the trigger button. Auto-filled from `FormControl` context. */
  readonly id?: string;
}
</script>

<script setup lang="ts">
import { useLocaleDefaults, useLocale } from '../../../foundation/i18n';
import { useTemplateRef } from 'vue';
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, ref, useAttrs } from 'vue';
import type { ClassValue } from 'clsx';
import { ChevronDown } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { Icon } from '../../../foundation/icons';
import { useFormControl } from '../../../foundation/primitives';
import { Popover, PopoverContent, PopoverTrigger } from '../../overlays';

/** Renders a font-family picker whose every option row previews itself in its own face. */
/* `inheritAttrs: false` so `class` folds into the wrapper's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'FontPicker', inheritAttrs: false });

const inputProps = withDefaults(defineProps<FontPickerProps>(), {
  fonts: () => BuiltInFonts,

  /* Explicit `undefined` defaults: `useControlled` keys on `=== undefined`, and Vue casts an
     absent `boolean` prop to `false` — which would shadow the form control context. */
  modelValue: undefined,
  isDisabled: undefined,
});
const props = useLocaleDefaults(inputProps, 'FontPicker', {
  placeholder: 'Select font…',
  previewText: 'The quick brown fox',
});

const emit = defineEmits<{
  /** Fires when the reader picks a different font — the `v-model` half. */
  'update:modelValue': [family: string];
}>();

const attrs = useAttrs();

/* Inherits id/disabled/invalid/labelledby/describedby from a surrounding <Field>;
   standalone props win when provided, context fills the gaps (SelectPicker parity).
   The `id` lands on the trigger button (the control), not the wrapper div. */
const field = useFormControl();
const finalDisabled = computed(() => props.isDisabled ?? field?.isDisabled);

const controlled = useControlled<string>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? props.fonts[0]?.family ?? '',
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const family = controlled.value;

/* React kept the popover state internal and exposed no `open` prop; so does this port. */
const open = ref(false);
const query = ref('');

const filtered = computed(() => {
  if (!query.value) return props.fonts;
  const q = query.value.toLowerCase();
  return props.fonts.filter((f) => f.name.toLowerCase().includes(q));
});

const current = computed(() => props.fonts.find((f) => f.family === family.value));

function onOpenChange(next: boolean): void {
  open.value = next;
}

function onQueryInput(event: Event): void {
  query.value = (event.target as HTMLInputElement).value;
}

function select(option: FontOption): void {
  controlled.setValue(option.family);
  open.value = false;
}

const list = useTemplateRef<HTMLDivElement>('list');

function options(): HTMLElement[] {
  return [...(list.value?.querySelectorAll<HTMLElement>('[role=option]') ?? [])];
}

/* A listbox moves by arrows, not by Tab: ArrowDown from the search enters the list at the picked font (or the
   first), arrows walk it, Home/End jump, and ArrowUp from the first option returns to the search. */
function onSearchKeydown(event: KeyboardEvent): void {
  if (event.key !== 'ArrowDown') return;
  const all = options();
  const target = all.find((option) => option.getAttribute('aria-selected') === 'true') ?? all[0];
  if (!target) return;
  event.preventDefault();
  target.focus();
}

function onListKeydown(event: KeyboardEvent): void {
  const all = options();
  const index = all.indexOf(event.target as HTMLElement);
  if (index < 0) return;
  let next: number;
  if (event.key === 'ArrowDown') next = Math.min(index + 1, all.length - 1);
  else if (event.key === 'ArrowUp') next = index - 1;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = all.length - 1;
  else return;
  event.preventDefault();
  if (next < 0) search.value?.focus();
  else all[next]?.focus();
}

const search = useTemplateRef<HTMLInputElement>('search');

function optionClass(option: FontOption): string {
  return cn(
    'flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted',
    option.family === family.value && 'bg-primary-soft text-primary-soft-foreground',
  );
}

const triggerId = computed(() => props.id ?? field?.id);

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const wrapperClass = computed(() => cn('inline-block', attrs.class as ClassValue));

const ChevronDownIcon = ChevronDown;

const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
const formResetRevision = useNativeFormReset(formResetAnchor, () => {
  controlled.reset();
});

const locale = useLocale();
</script>

<template>
  <div :key="formResetRevision" :class="wrapperClass" v-bind="passthroughAttrs">
    <Popover :open="open" @update:open="onOpenChange">
      <PopoverTrigger as-child>
        <button
          type="button"
          :id="triggerId"
          :disabled="finalDisabled"
          :aria-invalid="field?.isInvalid || undefined"
          :aria-labelledby="field?.labelledBy"
          :aria-describedby="field?.describedBy"
          aria-haspopup="listbox"
          :aria-expanded="open"
          class="inline-flex h-10 min-w-[14rem] items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span :style="{ fontFamily: family }" class="truncate text-foreground">
            {{ current?.name ?? placeholder }}
          </span>
          <Icon :icon="ChevronDownIcon" :size="14" class="text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <!-- NOT `is-bare` (which the React original passed): bare strips the whole surface
           recipe — background, border, shadow — leaving a transparent panel with the page
           showing through the font list. The explicit `w-`/`p-` classes already override the
           chrome defaults (`w-72`, `padding: lg`) through `cn`, which is all `is-bare` was
           being used for. -->
      <PopoverContent class="w-[20rem] p-2">
        <input
          ref="search"
          type="search"
          autofocus
          :aria-label="locale.t('FontPicker.searchLabel', undefined, 'Search fonts')"
          :value="query"
          :placeholder="locale.t('FontPicker.searchFonts', undefined, 'Search fonts…')"
          class="mb-2 h-8 w-full rounded-md border border-input bg-background px-2 text-sm outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          @input="onQueryInput"
          @keydown="onSearchKeydown"
        />
        <div
          ref="list"
          role="listbox"
          :aria-label="locale.t('FontPicker.fonts', undefined, 'Fonts')"
          class="max-h-72 overflow-y-auto"
          @keydown="onListKeydown"
        >
          <button
            v-for="f in filtered"
            :key="f.name"
            type="button"
            role="option"
            tabindex="-1"
            :aria-selected="f.family === family"
            :class="optionClass(f)"
            @click="select(f)"
          >
            <span class="font-medium">{{ f.name }}</span>
            <span :style="{ fontFamily: f.family }" class="ml-3 truncate text-xs text-muted-foreground">
              {{ f.sample ?? previewText }}
            </span>
          </button>
          <div v-if="filtered.length === 0" class="px-2 py-6 text-center text-xs text-muted-foreground">
            {{ locale.t('FontPicker.noFontsMatch', undefined, 'No fonts match.') }}
          </div>
        </div>
      </PopoverContent>
    </Popover>
    <input
      v-if="name"
      type="hidden"
      :disabled="finalDisabled"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      :name="name"
      :value="family"
    />
    <input
      ref="formResetAnchor"
      type="hidden"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      aria-hidden="true"
    />
  </div>
</template>
