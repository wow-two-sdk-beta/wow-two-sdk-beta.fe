<script lang="ts">
export interface PaginationProps {
  /** The total page count (1-based). */
  readonly total: number;

  /** The current page (1-based). The `v-model:page` binding target. */
  readonly page: number;

  /** The number of page buttons surrounding the current. Default `1`. At most 50 neighbors per side are rendered. */
  readonly siblings?: number;

  /** Shows the first/last buttons beside prev/next and the numbers. Default `true`. */
  readonly showFirstLast?: boolean;
  /** @deprecated Use `showFirstLast` (inverted); this alias is removed next release. */
  readonly hideFirstLast?: boolean;
}

function range(start: number, end: number): ReadonlyArray<number> {
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i);
}

function buildPages(total: number, page: number, siblings: number): ReadonlyArray<number | 'ellipsis'> {
  if (total <= 1) return [1];
  const left = Math.max(2, page - siblings);
  const right = Math.min(total - 1, page + siblings);
  const pages: Array<number | 'ellipsis'> = [1];
  if (left > 2) pages.push('ellipsis');
  pages.push(...range(left, right));
  if (right < total - 1) pages.push('ellipsis');
  if (total > 1) pages.push(total);
  return pages;
}

const BaseButton =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-transparent px-2 text-sm transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, useAttrs, useTemplateRef } from 'vue';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { Icon } from '../../../foundation/icons';

const locale = useLocale();

/**
 * Renders a compact page-number row with prev / next arrows and ellipses for skipped ranges.
 * Stateless — the consumer drives `page` and reacts to `update:page`.
 */
defineOptions({ name: 'Pagination', inheritAttrs: false });

const props = withDefaults(defineProps<PaginationProps>(), {
  siblings: 1,
  showFirstLast: undefined,
  hideFirstLast: undefined,
});

/** `showFirstLast` first, then the inverted deprecated `hideFirstLast`. */
const hasFirstLast = computed(() => props.showFirstLast ?? !(props.hideFirstLast ?? false));

const emit = defineEmits<{
  /** Fires when the reader lands on a different page — the `v-model:page` half. */
  'update:page': [page: number];
}>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLElement>('el');

const total = computed(() => (Number.isSafeInteger(props.total) && props.total > 0 ? props.total : 1));
const page = computed(() =>
  Number.isFinite(props.page) ? Math.max(1, Math.min(total.value, Math.trunc(props.page))) : 1,
);
const siblings = computed(() =>
  Number.isFinite(props.siblings) ? Math.max(0, Math.min(50, Math.trunc(props.siblings))) : 1,
);
const pages = computed(() => buildPages(total.value, page.value, siblings.value));

function go(target: number): void {
  const next = Math.min(total.value, Math.max(1, target));
  if (next === page.value) return;
  emit('update:page', next);
}

const classes = computed(() => cn('inline-flex items-center gap-1', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <nav ref="el" :aria-label="locale.t('Pagination.pagination', undefined, 'Pagination')" v-bind="rest" :class="classes">
    <button
      v-if="hasFirstLast"
      type="button"
      :aria-label="locale.t('Pagination.firstPage', undefined, 'First page')"
      :disabled="page <= 1"
      :class="cn(BaseButton, 'hover:bg-muted')"
      @click="go(1)"
    >
      <Icon :icon="ChevronsLeft" :size="16" />
    </button>
    <button
      type="button"
      :aria-label="locale.t('Pagination.previousPage', undefined, 'Previous page')"
      :disabled="page <= 1"
      :class="cn(BaseButton, 'hover:bg-muted')"
      @click="go(page - 1)"
    >
      <Icon :icon="ChevronLeft" :size="16" />
    </button>
    <template v-for="(p, i) in pages">
      <span v-if="p === 'ellipsis'" :key="`e-${i}`" class="px-1 text-muted-foreground">…</span>
      <button
        v-else
        :key="p"
        type="button"
        :aria-current="p === page ? 'page' : undefined"
        :class="cn(BaseButton, p === page ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted')"
        @click="go(p)"
      >
        {{ p }}
      </button>
    </template>
    <button
      type="button"
      :aria-label="locale.t('Pagination.nextPage', undefined, 'Next page')"
      :disabled="page >= total"
      :class="cn(BaseButton, 'hover:bg-muted')"
      @click="go(page + 1)"
    >
      <Icon :icon="ChevronRight" :size="16" />
    </button>
    <button
      v-if="hasFirstLast"
      type="button"
      :aria-label="locale.t('Pagination.lastPage', undefined, 'Last page')"
      :disabled="page >= total"
      :class="cn(BaseButton, 'hover:bg-muted')"
      @click="go(total)"
    >
      <Icon :icon="ChevronsRight" :size="16" />
    </button>
  </nav>
</template>
