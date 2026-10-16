<script lang="ts">
import { Marked } from 'marked';
import {
  Bold,
  Code as CodeIcon,
  Heading1,
  Heading2,
  Italic,
  Link2,
  List as ListIcon,
  Quote as QuoteIcon,
} from 'lucide-vue-next';
import type { IconAdapter } from '../../../foundation/icons';

/** Defines the pane layout of a markdown editor. */
export const MarkdownEditorView = {
  /** Refers to editor + preview shown side by side. */
  Split: 'split',
  /** Refers to the editor pane only. */
  Edit: 'edit',
  /** Refers to the rendered-preview pane only. */
  Preview: 'preview',
} as const;

export type MarkdownEditorView = (typeof MarkdownEditorView)[keyof typeof MarkdownEditorView];

export interface MarkdownEditorProps {
  /** The markdown source, controlled. The `v-model` binding target. */
  readonly modelValue?: string;

  /** The initial markdown source when uncontrolled. */
  readonly defaultValue?: string;

  /** The pane layout, controlled. The `v-model:view` binding target. */
  readonly view?: MarkdownEditorView;

  /** The initial pane layout when uncontrolled. Default `split`. */
  readonly defaultView?: MarkdownEditorView;

  /** The invalid surface override. Falls back to the surrounding form control's `isInvalid`. */
  readonly isInvalid?: boolean;

  /** The CSS minHeight on the surface (default `18rem`). */
  readonly minHeight?: string;

  /** Allows image elements in the built-in preview; false renders their alternative text only. */
  readonly showImages?: boolean;

  /** The control's id. Auto-filled from `FormControl` context when omitted. */
  readonly id?: string;

  /** The disabled state. Falls back to the surrounding field's `isDisabled`. */
  readonly isDisabled?: boolean;

  /** @deprecated Use `isDisabled`; this alias is removed next release. */
  readonly disabled?: boolean;

  /** Keeps the value but blocks changes. Falls back to the surrounding field's `isReadOnly`. */
  readonly isReadOnly?: boolean;

  /** @deprecated Use `isReadOnly`; this alias is removed next release. */
  readonly readOnly?: boolean;

  /** @deprecated Use `isReadOnly`; this alias is removed next release. */
  readonly readonly?: boolean;

  /** The required state. Falls back to the surrounding field's `isRequired`. */
  readonly isRequired?: boolean;

  /** @deprecated Use `isRequired`; this alias is removed next release. */
  readonly required?: boolean;
}

/** Describes the selection a toolbar action operates on. */
interface ToolbarSelection {
  value: string;
  start: number;
  end: number;
}

/** Describes the edit a toolbar action produces. */
interface ToolbarEdit {
  value: string;
  selStart: number;
  selEnd: number;
}

interface ToolbarAction {
  key: string;
  label: string;
  /* React held a rendered `ReactNode` here; an SFC's plain script block cannot carry JSX, so
     the icon COMPONENT is stored and `<Icon>` renders it in the template. */
  icon: IconAdapter;
  apply: (sel: ToolbarSelection) => ToolbarEdit;
}

const wrap =
  (before: string, after: string) =>
  ({ value, start, end }: ToolbarSelection): ToolbarEdit => {
    const sel = value.slice(start, end);
    const next = value.slice(0, start) + before + sel + after + value.slice(end);
    const selStart = start + before.length;
    return { value: next, selStart, selEnd: selStart + sel.length };
  };

const linePrefix =
  (prefix: string) =>
  ({ value, start, end }: ToolbarSelection): ToolbarEdit => {
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const trailing = value.slice(end).indexOf('\n');
    const lineEnd = trailing === -1 ? value.length : end + trailing;
    const block = value.slice(lineStart, lineEnd);
    const updated = block
      .split('\n')
      .map((l) => prefix + l)
      .join('\n');
    const next = value.slice(0, lineStart) + updated + value.slice(lineEnd);
    return { value: next, selStart: lineStart + prefix.length, selEnd: lineStart + updated.length };
  };

const escapeHtml = (html: string) =>
  html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Only protocols a markdown link/image may navigate to from the preview;
// anything else (javascript:, data:, vbscript:, …) is dropped.

// Local marked instance whose raw-HTML tokens render as escaped text, so
// embedded HTML (e.g. `<img onerror=…>`) is inert in the default preview,
// and whose link/image URLs are protocol-filtered (no `javascript:` links).
// Markdown formatting is unaffected. Consumers needing real HTML fill the
// `preview` slot and sanitize themselves.
const createPreviewMarked = (showImages: boolean) =>
  new Marked({
    renderer: {
      html({ text }) {
        return escapeHtml(text);
      },
      link({ href, title, tokens }) {
        const url = UrlExtensions.safeNavigation(href);
        const text = this.parser.parseInline(tokens);
        if (url === undefined) return text;
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
        return `<a href="${escapeHtml(url)}"${titleAttr}>${text}</a>`;
      },
      image({ href, title, text }) {
        if (!showImages) return escapeHtml(text);
        const url = UrlExtensions.safeResource(href);
        if (url === undefined) return escapeHtml(text);
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
        return `<img src="${escapeHtml(url)}" alt="${escapeHtml(text)}"${titleAttr}>`;
      },
    },
  });

const ToolbarActions: ReadonlyArray<ToolbarAction> = [
  { key: 'h1', label: 'Heading 1', icon: Heading1, apply: linePrefix('# ') },
  { key: 'h2', label: 'Heading 2', icon: Heading2, apply: linePrefix('## ') },
  { key: 'bold', label: 'Bold', icon: Bold, apply: wrap('**', '**') },
  { key: 'italic', label: 'Italic', icon: Italic, apply: wrap('*', '*') },
  { key: 'code', label: 'Inline code', icon: CodeIcon, apply: wrap('`', '`') },
  { key: 'link', label: 'Link', icon: Link2, apply: wrap('[', '](https://)') },
  { key: 'list', label: 'List', icon: ListIcon, apply: linePrefix('- ') },
  { key: 'quote', label: 'Blockquote', icon: QuoteIcon, apply: linePrefix('> ') },
];

/* Hoisted out of the template — the runtime template compiler resolves plain identifiers,
   not array literals built from an imported enum. */
const ViewOrder: ReadonlyArray<MarkdownEditorView> = [
  MarkdownEditorView.Edit,
  MarkdownEditorView.Split,
  MarkdownEditorView.Preview,
];
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { useNativeFormReset } from '../UseNativeFormReset';
import { UrlExtensions } from '../../../foundation/dom';
import { computed, nextTick, useAttrs, useSlots, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { AriaAttribute } from '../../../foundation/dom';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { useId } from '../../../foundation/identifiers';
import { Icon } from '../../../foundation/icons';
import { useFormControl } from '../../../foundation/primitives';
import { InputState } from '../InputStyles';

/** Renders a markdown pane, a formatting toolbar and a sanitized live preview, in split, edit or preview view. */
/* `inheritAttrs: false` so `class` folds into the surface's own `cn()` call, and so the rest
   of the attrs land on the inner `<textarea>` rather than the surface. */
defineOptions({ name: 'MarkdownEditor', inheritAttrs: false });

const props = withDefaults(defineProps<MarkdownEditorProps>(), {
  minHeight: '18rem',
  showImages: true,
  /* Explicit `undefined` defaults: `useControlled` keys on `=== undefined`, and Vue casts an
     absent `boolean` prop to `false` — which would shadow the form control context. */
  modelValue: undefined,
  view: undefined,
  defaultView: undefined,
  isInvalid: undefined,
  isDisabled: undefined,
  disabled: undefined,
  readOnly: undefined,
  isReadOnly: undefined,
  readonly: undefined,
  isRequired: undefined,
  required: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader edits the markdown, by typing or via a toolbar action — the `v-model` half. */
  'update:modelValue': [value: string];
  /** Fires when the reader picks a different pane layout — the `v-model:view` half. */
  'update:view': [view: MarkdownEditorView];
}>();

defineSlots<{
  /** Replaces the rendered preview pane — React's `renderPreview`. Filling it opts out of
   *  the built-in `marked` render, and the consumer owns sanitizing. */
  preview?(props: { markdown: string }): unknown;
}>();

const attrs = useAttrs();
const slots = useSlots();

const valueCtl = useControlled<string>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? '',
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const viewCtl = useControlled<MarkdownEditorView>({
  controlled: () => props.view,
  default: () => props.defaultView ?? MarkdownEditorView.Split,
  onChange: (next) => {
    emit('update:view', next);
  },
});

/* Named `markdown` / `mode`, not `modelValue` / `view`: a setup const sharing a prop's name
   collides with it in the template scope (`vue/no-dupe-keys`). */
const markdown = valueCtl.value;
const mode = viewCtl.value;

const textarea = useTemplateRef<HTMLTextAreaElement>('textarea');
const generatedId = useId('markdown-editor');

/* Inherits id/flags/describedby from a surrounding <Field>; explicit props win.
   The context wires the EDITING surface (textarea) only — the preview pane is
   read-only chrome, not the control. */
const ctx = useFormControl();
const finalDisabled = computed(() => props.isDisabled ?? props.disabled ?? ctx?.isDisabled);
const finalReadOnly = computed(() => props.isReadOnly ?? props.readonly ?? props.readOnly ?? ctx?.isReadOnly);
const finalInvalid = computed(() => props.isInvalid ?? ctx?.isInvalid);

const hasPreviewSlot = computed(() => Boolean(slots.preview));

const previewHtml = computed(() => {
  if (hasPreviewSlot.value) return null;
  try {
    return createPreviewMarked(props.showImages).parse(markdown.value, { async: false }) as string;
  } catch {
    return '<p>Failed to render preview.</p>';
  }
});

function applyAction(action: ToolbarAction): void {
  const ta = textarea.value;
  if (!ta) return;
  const next = action.apply({
    value: markdown.value,
    start: ta.selectionStart ?? markdown.value.length,
    end: ta.selectionEnd ?? markdown.value.length,
  });
  valueCtl.setValue(next.value);
  /* React reached for `requestAnimationFrame` to wait out its re-render; `nextTick` resolves
     after the reactive update has been flushed to the DOM, and keeps a browser global out of
     this file. */
  void nextTick(() => {
    ta.focus();
    ta.selectionStart = next.selStart;
    ta.selectionEnd = next.selEnd;
  });
}

function onInput(event: Event): void {
  if ((event as InputEvent).isComposing) return;
  valueCtl.setValue((event.target as HTMLTextAreaElement).value);
}

const showEdit = computed(() => mode.value === MarkdownEditorView.Split || mode.value === MarkdownEditorView.Edit);
const showPreview = computed(
  () => mode.value === MarkdownEditorView.Split || mode.value === MarkdownEditorView.Preview,
);

const state = computed(() => (finalInvalid.value ? InputState.Invalid : InputState.Default));

/* Never a declared prop — a declared `'aria-describedby'` would arrive as
   `props.ariaDescribedby` and stop reaching the DOM. */
const ariaDescribedBy = computed(() => attrs[AriaAttribute.DescribedBy] as string | undefined);

const textareaId = computed(() => props.id ?? ctx?.id ?? generatedId);
const finalRequired = computed(() => props.isRequired ?? props.required ?? ctx?.isRequired);
const describedBy = computed(() => ariaDescribedBy.value ?? ctx?.describedBy);

const OwnedAttributes: ReadonlySet<string> = new Set(['class', AriaAttribute.DescribedBy]);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const surfaceClass = computed(() =>
  cn(
    'flex flex-col overflow-hidden rounded-md border border-input bg-card text-card-foreground shadow-sm',
    state.value === InputState.Invalid && 'border-destructive',
    finalDisabled.value && 'opacity-60',
    attrs.class as ClassValue,
  ),
);

const textareaClass = computed(() =>
  cn(
    'flex-1 resize-none whitespace-pre-wrap break-words bg-transparent p-3 font-mono text-sm outline-hidden placeholder:text-subtle-foreground disabled:cursor-not-allowed',
    showPreview.value && 'border-r-0',
  ),
);

function viewButtonClass(v: MarkdownEditorView): string {
  return cn(
    'inline-flex h-6 items-center rounded px-2 text-xs font-medium transition-colors',
    mode.value === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
  );
}

/** The rendered `<textarea>` — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: textarea });

const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
const formResetRevision = useNativeFormReset(formResetAnchor, () => {
  valueCtl.reset();
  viewCtl.reset();
});

const locale = useLocale();
</script>

<template>
  <div :key="formResetRevision" :data-state="state" :class="surfaceClass" :style="{ minHeight }">
    <div class="flex items-center gap-1 border-b border-border bg-muted/40 px-2 py-1">
      <div
        role="toolbar"
        :aria-label="locale.t('MarkdownEditor.markdownFormatting', undefined, 'Markdown formatting')"
        class="flex items-center gap-0.5"
      >
        <button
          v-for="a in ToolbarActions"
          :key="a.key"
          type="button"
          :aria-label="locale.t(`MarkdownEditor.${a.key}`, undefined, a.label)"
          :disabled="finalDisabled || finalReadOnly"
          class="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          @click="applyAction(a)"
        >
          <Icon :icon="a.icon" :size="14" />
        </button>
      </div>
      <div
        role="radiogroup"
        :aria-label="locale.t('MarkdownEditor.viewMode', undefined, 'View mode')"
        class="ml-auto flex items-center gap-0.5 rounded-md bg-card p-0.5 ring-1 ring-border"
      >
        <button
          v-for="v in ViewOrder"
          :key="v"
          type="button"
          role="radio"
          :aria-checked="mode === v"
          :class="viewButtonClass(v)"
          @click="viewCtl.setValue(v)"
        >
          {{ v }}
        </button>
      </div>
    </div>
    <div class="flex flex-1 divide-x divide-border" :style="{ minHeight: 0 }">
      <textarea
        v-if="showEdit"
        ref="textarea"
        :id="textareaId"
        :value="markdown"
        :disabled="finalDisabled"
        :readonly="finalReadOnly"
        :required="finalRequired"
        :spellcheck="false"
        :aria-invalid="finalInvalid || undefined"
        :aria-describedby="describedBy"
        :class="textareaClass"
        v-bind="passthroughAttrs"
        @input="onInput"
        @compositionend="onInput"
      />
      <!--
        `group` role: aria-label is prohibited on a bare (generic) div —
        axe aria-prohibited-attr. Non-landmark grouping keeps the pane
        named for AT without polluting the page's region list.
      -->
      <div
        v-if="showPreview"
        role="group"
        aria-live="polite"
        :aria-label="locale.t('MarkdownEditor.preview', undefined, 'Preview')"
        class="prose prose-sm flex-1 overflow-auto bg-background p-3 text-sm text-foreground"
      >
        <slot v-if="hasPreviewSlot" name="preview" :markdown="markdown" />
        <!-- eslint-disable-next-line vue/no-v-html -- `previewMarked` escapes raw HTML tokens
             and protocol-filters link/image URLs; the consumer opts out via the `preview` slot. -->
        <div v-else v-html="previewHtml ?? ''" />
      </div>
    </div>
    <input
      ref="formResetAnchor"
      type="hidden"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      aria-hidden="true"
    />
  </div>
</template>
