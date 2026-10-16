<script lang="ts">
/** Defines the DiffViewer layout mode. */
export const DiffView = {
  /** Refers to side-by-side columns. */
  Split: 'split',
  /** Refers to a single interleaved column. */
  Unified: 'unified',
} as const;

export type DiffView = (typeof DiffView)[keyof typeof DiffView];

/** Defines a diff row's change operation. */
const DiffOp = {
  /** Refers to an unchanged line. */
  Unchanged: 'unchanged',
  /** Refers to an added line. */
  Added: 'added',
  /** Refers to a removed line. */
  Removed: 'removed',
} as const;

type DiffOp = (typeof DiffOp)[keyof typeof DiffOp];

/** Defines which side of a split diff a column renders. */
const DiffSide = {
  /** Refers to the left (old) column. */
  Left: 'left',
  /** Refers to the right (new) column. */
  Right: 'right',
} as const;

type DiffSide = (typeof DiffSide)[keyof typeof DiffSide];

export interface DiffViewerProps {
  readonly left: string;
  readonly right: string;
  readonly view?: DiffView;
  /** The label for the original text. Default `"Before"`. Rich content → the `leftLabel` slot. */
  readonly leftLabel?: string | number;
  /** The label for the modified text. Default `"After"`. Rich content → the `rightLabel` slot. */
  readonly rightLabel?: string | number;
  readonly hasStats?: boolean;
}
</script>

<script setup lang="ts">
import { useLocaleDefaults } from '../../../foundation/i18n';
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { computeDiff, type DiffRow } from './LineDiff';

/**
 * Renders a line-level diff in split or unified columns, from its own LCS pass.
 *
 * No external diff dep. Intra-line word highlighting needs the `diff` package and a post-process — deferred.
 *
 * React's private `SplitView` / `UnifiedView` / `DiffColumn` components render inline here: they held no state and
 * were never exported, so a computed cell model plus two template branches replaces them.
 */
defineOptions({ name: 'DiffViewer', inheritAttrs: false });

defineSlots<{
  /** The left-label override, when a plain string is not enough. */
  leftLabel(): unknown;

  /** The right-label override, when a plain string is not enough. */
  rightLabel(): unknown;
}>();

const componentProps = withDefaults(defineProps<DiffViewerProps>(), {
  /* Both sides stay declared-required — Vue still warns when one is missing — but
     the defaults keep an absent (or transiently-undefined) value out of
     `computeDiff`, which called `.split` on it and took the whole page down. */
  left: '',
  right: '',
  view: DiffView.Split,
  hasStats: true,
});
const props = useLocaleDefaults(componentProps, 'DiffViewer', { leftLabel: 'Before', rightLabel: 'After' });

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

/** One rendered line of a column. `op: null` marks a filler (the other side has no counterpart). */
interface DiffCell {
  key: number;
  op: DiffOp | null;
  num: number | null;
  text: string;
  rowClass: string;
}

/** One rendered line of the unified column — carries both line numbers and the `+` / `−` marker. */
interface UnifiedCell {
  key: number;
  op: DiffOp;
  leftNum: number | null;
  rightNum: number | null;
  sign: string;
  text: string;
  rowClass: string;
}

const rows = computed(() => computeDiff(props.left, props.right));

const stats = computed(() => {
  let added = 0;
  let removed = 0;
  for (const r of rows.value) {
    if (r.op === DiffOp.Added) added += 1;
    if (r.op === DiffOp.Removed) removed += 1;
  }
  return { added, removed };
});

const isSplit = computed(() => props.view === DiffView.Split);

const toCell = (row: DiffRow | undefined, index: number, side: DiffSide): DiffCell => {
  if (!row) return { key: index, op: null, num: null, text: '', rowClass: '' };
  const isChanged =
    (side === DiffSide.Left && row.op === DiffOp.Removed) || (side === DiffSide.Right && row.op === DiffOp.Added);
  return {
    key: index,
    op: row.op,
    num: side === DiffSide.Left ? row.leftNum : row.rightNum,
    text: row.text,
    rowClass: cn(
      'flex',
      isChanged && side === DiffSide.Left && 'bg-destructive-soft',
      isChanged && side === DiffSide.Right && 'bg-success-soft',
    ),
  };
};

/**
 * Pair removed/added rows row-by-row when possible to align them.
 * Simple alignment: walk, when we hit "removed" followed by "added", pair them.
 */
const splitColumns = computed<ReadonlyArray<{ side: DiffSide; cells: ReadonlyArray<DiffCell> }>>(() => {
  const pairs: Array<{ left?: DiffRow; right?: DiffRow }> = [];
  const source = rows.value;
  for (let i = 0; i < source.length; i++) {
    const r = source[i]!;
    if (r.op === DiffOp.Unchanged) {
      pairs.push({ left: r, right: r });
    } else if (r.op === DiffOp.Removed) {
      const next = source[i + 1];
      if (next && next.op === DiffOp.Added) {
        pairs.push({ left: r, right: next });
        i++;
      } else {
        pairs.push({ left: r });
      }
    } else if (r.op === DiffOp.Added) {
      pairs.push({ right: r });
    }
  }
  return [
    { side: DiffSide.Left, cells: pairs.map((p, i) => toCell(p.left, i, DiffSide.Left)) },
    { side: DiffSide.Right, cells: pairs.map((p, i) => toCell(p.right, i, DiffSide.Right)) },
  ];
});

const unifiedRows = computed<ReadonlyArray<UnifiedCell>>(() =>
  rows.value.map((r, i) => ({
    key: i,
    op: r.op,
    leftNum: r.leftNum,
    rightNum: r.rightNum,
    sign: r.op === DiffOp.Added ? '+' : r.op === DiffOp.Removed ? '−' : ' ',
    text: r.text,
    rowClass: cn('flex', r.op === DiffOp.Added && 'bg-success-soft', r.op === DiffOp.Removed && 'bg-destructive-soft'),
  })),
);

const classes = computed(() =>
  cn(
    'overflow-hidden rounded-md border border-border bg-card font-mono text-xs text-card-foreground shadow-sm',
    attrs.class as string | undefined,
  ),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div ref="el" v-bind="rest" :class="classes">
    <div
      v-if="props.hasStats"
      class="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-1.5 text-xs"
    >
      <div class="text-muted-foreground">
        <slot name="leftLabel">{{ props.leftLabel }}</slot> →
        <slot name="rightLabel">{{ props.rightLabel }}</slot>
      </div>
      <div class="flex items-center gap-3">
        <span class="font-medium text-success-soft-foreground">+{{ stats.added }}</span>
        <span class="font-medium text-destructive-soft-foreground">−{{ stats.removed }}</span>
      </div>
    </div>

    <div v-if="isSplit" class="grid grid-cols-2 divide-x divide-border">
      <div v-for="column in splitColumns" :key="column.side" class="overflow-x-auto">
        <template v-for="cell in column.cells" :key="cell.key">
          <div v-if="cell.op === null" class="flex bg-muted/30">
            <span class="select-none w-10 shrink-0 px-2 py-0.5 text-right text-muted-foreground">·</span>
            <span class="flex-1 whitespace-pre px-2 py-0.5">&nbsp;</span>
          </div>
          <div v-else :data-state="cell.op" :class="cell.rowClass">
            <span
              class="select-none w-10 shrink-0 border-r border-border px-2 py-0.5 text-right text-muted-foreground tabular-nums"
              >{{ cell.num ?? '' }}</span
            >
            <span class="flex-1 whitespace-pre px-2 py-0.5">{{ cell.text || ' ' }}</span>
          </div>
        </template>
      </div>
    </div>

    <div v-else class="overflow-x-auto">
      <div v-for="row in unifiedRows" :key="row.key" :data-state="row.op" :class="row.rowClass">
        <span
          class="select-none w-10 shrink-0 border-r border-border px-2 py-0.5 text-right text-muted-foreground tabular-nums"
          >{{ row.leftNum ?? '' }}</span
        >
        <span
          class="select-none w-10 shrink-0 border-r border-border px-2 py-0.5 text-right text-muted-foreground tabular-nums"
          >{{ row.rightNum ?? '' }}</span
        >
        <span class="w-5 shrink-0 px-1 py-0.5 text-center text-muted-foreground">{{ row.sign }}</span>
        <span class="flex-1 whitespace-pre px-2 py-0.5">{{ row.text || ' ' }}</span>
      </div>
    </div>
  </div>
</template>
