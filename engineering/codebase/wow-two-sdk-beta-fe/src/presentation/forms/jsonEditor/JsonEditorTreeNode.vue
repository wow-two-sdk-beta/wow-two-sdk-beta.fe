<script lang="ts">
import type { JsonPath } from './JsonEditorExtensions';

/** Internal — one row of `JsonEditor`'s tree pane. Not exported from the folder barrel. */
export interface JsonEditorTreeNodeProps {
  /** The key this node sits under; `null` at the document root. */
  readonly keyName: string | number | null;

  /** The node's value. */
  readonly value: unknown;

  /** The node's address inside the document. */
  readonly path: JsonPath;

  /** The nesting depth — drives indentation and the initial open state. */
  readonly depth: number;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, ref } from 'vue';
import { ChevronRight, Copy } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { Icon } from '../../../foundation/icons';
import { useFormControl } from '../../../foundation/primitives';
import { useJsonEditorContext } from './JsonEditorContext';
import { JsonEditorExtensions } from './JsonEditorExtensions';

/** Renders one tree row — a collapsible object/array summary or an editable primitive leaf, plus copy-path. */
defineOptions({ name: 'JsonEditorTreeNode' });

const props = defineProps<JsonEditorTreeNodeProps>();

/* The transient leaf editor is a real editing surface — the Field's helper/error
   description follows it (the input keeps its own action name). */
const ctx = useFormControl();
const editor = useJsonEditorContext();

const type = computed(() => JsonEditorExtensions.describeType(props.value));
const isObject = computed(() => type.value === 'object' || type.value === 'array');

const open = ref(props.depth < 2);
const editing = ref(false);
const draft = ref('');

function startEdit(): void {
  if (editor.isDisabled || editor.isReadOnly || isObject.value) return;
  editing.value = true;
  draft.value = typeof props.value === 'string' ? props.value : String(props.value);
}

function commitEdit(): void {
  editing.value = false;
  if (typeof props.value === 'number') {
    const n = Number(draft.value);
    if (!Number.isNaN(n)) editor.updateAt(props.path, n);
  } else if (typeof props.value === 'boolean') {
    if (draft.value === 'true' || draft.value === 'false') {
      editor.updateAt(props.path, draft.value === 'true');
    }
  } else if (props.value === null) {
    if (draft.value === 'null') editor.updateAt(props.path, null);
  } else {
    editor.updateAt(props.path, draft.value);
  }
}

function onDraftInput(event: Event): void {
  draft.value = (event.target as HTMLInputElement).value;
}

function onKeydown(event: KeyboardEvent): void {
  if (event.isComposing) return;
  if (event.key === 'Enter') commitEdit();
  if (event.key === 'Escape') editing.value = false;
}

/* Guarded on `typeof navigator`; the handler is click-driven, so it is unreachable
   during SSR either way. */
function copyPath(): void {
  const text = JsonEditorExtensions.pathToString(props.path);
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}

const entries = computed<ReadonlyArray<readonly [string | number, unknown]>>(() => {
  if (!isObject.value) return [];
  if (Array.isArray(props.value)) {
    return (props.value as unknown[]).map((v, i) => [i, v] as const);
  }
  return Object.entries(props.value as Record<string, unknown>);
});

const keyLabel = computed(() => (typeof props.keyName === 'string' ? `"${props.keyName}"` : props.keyName));

const summary = computed(() =>
  Array.isArray(props.value) ? `Array(${entries.value.length})` : `Object(${entries.value.length})`,
);

const leafLabel = computed(() => (type.value === 'string' ? `"${props.value as string}"` : String(props.value)));

const copyLabel = computed(() => `Copy path ${JsonEditorExtensions.pathToString(props.path) || 'root'}`);

const rowStyle = computed(() => ({ paddingLeft: `${props.depth * 16}px` }));

const chevronClass = computed(() => cn('transition-transform', open.value && 'rotate-90'));

const leafClass = computed(() =>
  cn(
    'cursor-text rounded-sm px-1 text-left transition-colors',
    !editor.isDisabled && !editor.isReadOnly && 'hover:bg-muted',
    type.value === 'string' && 'text-info-soft-foreground',
    type.value === 'number' && 'text-warning-soft-foreground',
    type.value === 'boolean' && 'text-success-soft-foreground',
    type.value === 'null' && 'text-muted-foreground italic',
  ),
);

const ChevronIcon = ChevronRight;
const CopyIcon = Copy;

const locale = useLocale();
</script>

<template>
  <li role="treeitem" :aria-expanded="isObject ? open : undefined" class="px-1">
    <div class="group flex items-start gap-1 py-0.5" :style="rowStyle">
      <button
        v-if="isObject"
        type="button"
        :aria-label="
          open
            ? locale.t('JsonEditorTreeNode.collapse', undefined, 'Collapse')
            : locale.t('JsonEditorTreeNode.expand', undefined, 'Expand')
        "
        class="inline-flex h-5 w-5 items-center justify-center text-muted-foreground hover:text-foreground"
        @click="open = !open"
      >
        <Icon :icon="ChevronIcon" :size="12" :class="chevronClass" />
      </button>
      <span v-else class="inline-block h-5 w-5" />
      <span v-if="keyName !== null" class="text-foreground">
        {{ keyLabel }}<span class="text-muted-foreground">: </span>
      </span>
      <span v-if="isObject" class="text-muted-foreground">{{ summary }}</span>
      <input
        v-else-if="editing"
        autofocus
        :aria-label="locale.t('JsonEditorTreeNode.editValue', undefined, 'Edit value')"
        :aria-invalid="editor.isInvalid || undefined"
        :aria-describedby="ctx?.describedBy"
        :value="draft"
        class="h-5 rounded-sm bg-background px-1 text-sm font-mono outline-hidden ring-2 ring-ring"
        @input="onDraftInput"
        @keydown="onKeydown"
        @blur="commitEdit"
      />
      <button v-else type="button" :class="leafClass" @click="startEdit">{{ leafLabel }}</button>
      <button
        type="button"
        :aria-label="copyLabel"
        class="ml-auto opacity-0 transition-opacity group-hover:opacity-100 inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        @click="copyPath"
      >
        <Icon :icon="CopyIcon" :size="11" />
      </button>
    </div>
    <!-- Recursion by implicit self-reference: an SFC may name itself by its filename. -->
    <ul v-if="isObject && open" role="group">
      <JsonEditorTreeNode
        v-for="[k, v] in entries"
        :key="String(k)"
        :key-name="k"
        :value="v"
        :path="[...path, k]"
        :depth="depth + 1"
      />
    </ul>
  </li>
</template>
