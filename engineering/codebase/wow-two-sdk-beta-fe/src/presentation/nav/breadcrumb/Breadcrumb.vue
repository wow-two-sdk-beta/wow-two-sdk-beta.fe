<script lang="ts">
export interface BreadcrumbItem {
  /** The item's label — scalar; an array item carries no rich content. The `#label` slot is the rich override. */
  readonly label: string | number;

  /** Make this item a link. Last item is typically rendered as plain text. */
  readonly href?: string;
}

export interface BreadcrumbProps {
  readonly items: ReadonlyArray<BreadcrumbItem>;

  /**
   * Keeps the trail on one line, as in an app bar: items shorten with an ellipsis instead of wrapping, the current
   * page takes the emphasis, and below `md` only the last two items show.
   */
  readonly isSingleLine?: boolean;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { UrlExtensions } from '../../../foundation/dom';
import { computed, useAttrs, useTemplateRef } from 'vue';
import { ChevronRight } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { Icon } from '../../../foundation/icons';

const locale = useLocale();

/**
 * Renders a linear trail of links and separators marking where the reader stands.
 * The last item is always rendered as `aria-current="page"` and not a link. Use the L5
 * collapsing version when the chain gets long.
 */
defineOptions({ name: 'Breadcrumb', inheritAttrs: false });

defineSlots<{
  /** The rich override for an item's `label`. */
  label?(props: { item: BreadcrumbItem; index: number }): unknown;

  /** The custom separator element. React's `separator` prop; defaults to a chevron-right icon. */
  separator?(): unknown;
}>();

const props = withDefaults(defineProps<BreadcrumbProps>(), { isSingleLine: false });

const attrs = useAttrs();
const el = useTemplateRef<HTMLElement>('el');

const classes = computed(() => cn('text-sm', props.isSingleLine && 'min-w-0', attrs.class as string | undefined));

const listClasses = computed(() =>
  props.isSingleLine ? 'flex min-w-0 flex-nowrap items-center gap-1.5' : 'flex flex-wrap items-center gap-1.5',
);

/** An item's place from the end of the trail, separators included: the last item is 1, its separator 2. */
function itemClasses(index: number): string | undefined {
  if (!props.isSingleLine) return undefined;
  const isLast = index === lastIndex.value;
  // Below `md` the trail keeps its last two items; the earlier ones return from `md` up.
  const isEarly = index < lastIndex.value - 1;
  return cn('min-w-0 truncate', isLast && 'font-semibold', isEarly && 'max-md:hidden');
}

function separatorClasses(index: number): string {
  return cn(
    'text-subtle-foreground',
    props.isSingleLine && 'shrink-0',
    props.isSingleLine && index < lastIndex.value - 1 && 'max-md:hidden',
  );
}

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

const lastIndex = computed(() => props.items.length - 1);

defineExpose({ el });
</script>

<template>
  <!-- `aria-label` sits before `v-bind="rest"` so a consumer-supplied one wins,
       the precedence React got from spreading `{...props}` after it. -->
  <nav ref="el" :aria-label="locale.t('Breadcrumb.breadcrumb', undefined, 'Breadcrumb')" v-bind="rest" :class="classes">
    <ol :class="listClasses">
      <template v-for="(item, i) in props.items" :key="item.href ?? item.label">
        <li :class="itemClasses(i)">
          <a
            v-if="item.href && i !== lastIndex"
            :href="UrlExtensions.safeNavigation(item.href)"
            class="text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            <slot name="label" :item="item" :index="i">{{ item.label }}</slot>
          </a>
          <span v-else :aria-current="i === lastIndex ? 'page' : undefined" class="text-foreground">
            <slot name="label" :item="item" :index="i">{{ item.label }}</slot>
          </span>
        </li>
        <li v-if="i !== lastIndex" aria-hidden="true" :class="separatorClasses(i)">
          <slot name="separator"><Icon :icon="ChevronRight" :size="14" /></slot>
        </li>
      </template>
    </ol>
  </nav>
</template>
