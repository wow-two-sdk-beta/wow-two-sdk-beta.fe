<script lang="ts">
export interface PhotoPreviewItem {
  /** Stable identity even when a protected preview URL arrives after render. */
  readonly key: string;
  readonly src?: string | undefined;
  readonly unavailable?: boolean | undefined;
}

export interface PhotoPreviewGridProps {
  readonly images: readonly PhotoPreviewItem[];
  /** Total photos when the caller resolves only the visible previews. */
  readonly total?: number | undefined;
  /** Caps the collage at `24rem` instead of `30rem`, for a tight header. */
  readonly isHeightFixed?: boolean;
  /** Draws the photos in grayscale — a subject that is gone or inactive. */
  readonly isMuted?: boolean;
}

/** The lead stands alone. Additional photos stack in reading order within each column. */
const PreviewColumns = [[], [[0]], [[0], [1]], [[0], [1, 2]], [[0], [1], [2, 3]], [[0], [1, 2], [3, 4]]] as const;
export const PhotoPreviewLimit = PreviewColumns.length - 1;
const DefaultAspect = 4 / 5;
const GutterRem = 0.5;
</script>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useLocale } from '../../../foundation/i18n';

/** Renders the visible photo collage and hands the selected index to its viewer. */
defineOptions({ name: 'PhotoPreviewGrid' });
const props = defineProps<PhotoPreviewGridProps>();
const emit = defineEmits<{ open: [index: number] }>();
const locale = useLocale();
const aspects = reactive(new Map<string, number>());
const previews = computed(() =>
  props.images.slice(0, PhotoPreviewLimit).map((item, index) => ({
    ...item,
    index,
    aspect: aspects.get(item.key) ?? DefaultAspect,
  })),
);
const total = computed(() => Math.max(props.total ?? 0, props.images.length));
const overflow = computed(() => total.value - previews.value.length);
const columns = computed(() =>
  PreviewColumns[previews.value.length]!.map((column) => column.map((index) => previews.value[index]!)),
);

const mosaicStyle = computed(() => {
  // Stacked images share a width, so their heights per unit of width add up.
  const weights = columns.value.map((column) => 1 / column.reduce((height, photo) => height + 1 / photo.aspect, 0));
  const aspect = weights.reduce((width, weight) => width + weight, 0) || DefaultAspect;
  const gutters = Math.max(0, weights.length - 1) * GutterRem;
  const maxHeight = props.isHeightFixed ? '24rem' : '30rem';
  return {
    '--mosaic-columns': weights.map((weight) => `minmax(0, ${weight}fr)`).join(' '),
    '--mosaic-height': `min(${maxHeight}, calc((100cqw - ${gutters}rem) / ${aspect}))`,
    '--mosaic-width': `calc(var(--mosaic-height) * ${aspect} + ${gutters}rem)`,
  };
});

function readAspect(key: string, event: Event) {
  const image = event.currentTarget as HTMLImageElement;
  const aspect = image.naturalWidth / image.naturalHeight;
  if (Number.isFinite(aspect) && aspect > 0) aspects.set(key, Math.min(2.5, Math.max(0.45, aspect)));
}
</script>

<template>
  <div v-if="previews.length" class="@container min-w-0">
    <div
      class="mx-auto flex max-w-full snap-x snap-proximity gap-2 overflow-x-auto overscroll-x-contain @xl:grid @xl:h-[var(--mosaic-height)] @xl:w-[var(--mosaic-width)] @xl:grid-cols-[var(--mosaic-columns)] @xl:overflow-visible"
      :class="{ 'justify-center': previews.length === 1 }"
      :style="mosaicStyle"
    >
      <div
        v-for="column in columns"
        :key="column[0]!.index"
        class="contents @xl:flex @xl:min-h-0 @xl:min-w-0 @xl:flex-col @xl:gap-2"
      >
        <button
          v-for="photo in column"
          :key="photo.index"
          type="button"
          class="group relative h-56 w-[var(--photo-width)] shrink-0 snap-start overflow-hidden rounded-xl bg-muted/60 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-white @xl:h-auto @xl:min-h-0 @xl:w-full @xl:flex-[var(--photo-grow)_1_0%]"
          :style="{ '--photo-grow': 1 / photo.aspect, '--photo-width': `min(80cqw, ${14 * photo.aspect}rem)` }"
          :aria-label="
            overflow > 0 && photo.index === previews.length - 1
              ? locale.t('PhotoPreviewGrid.viewAll', { count: total }, 'View all {count} photos')
              : locale.t('PhotoPreviewGrid.open', { index: photo.index + 1 }, 'Open photo {index}')
          "
          @click="emit('open', photo.index)"
        >
          <img
            v-if="photo.src"
            :src="photo.src"
            alt=""
            decoding="async"
            referrerpolicy="no-referrer"
            :loading="photo.index ? 'lazy' : 'eager'"
            class="absolute inset-0 size-full object-contain transition duration-200 group-hover:brightness-90"
            :class="{ grayscale: isMuted }"
            @load="readAspect(photo.key, $event)"
          />
          <span
            v-else-if="photo.unavailable"
            class="absolute inset-0 grid place-items-center text-sm text-muted-foreground"
            >{{ locale.t('PhotoPreviewGrid.unavailable', undefined, 'Photo unavailable') }}</span
          >
          <span
            v-if="overflow > 0 && photo.index === previews.length - 1"
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 grid place-items-center bg-black/60 text-2xl font-semibold text-white sm:text-3xl"
            >+{{ overflow }}</span
          >
        </button>
      </div>
    </div>
  </div>
</template>
