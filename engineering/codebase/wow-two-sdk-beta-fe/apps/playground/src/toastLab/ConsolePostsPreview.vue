<script lang="ts">
/** Defines how the console preview lays out its posts. */
export const ConsolePostsView = {
  /** Refers to a grid of photo cards. */
  Cards: 'cards',
  /** Refers to a list of title rows. */
  Rows: 'rows',
} as const;

export type ConsolePostsView = (typeof ConsolePostsView)[keyof typeof ConsolePostsView];

/** Defines props for the console posts preview. */
export interface ConsolePostsPreviewProps {
  /** The layout of the posts. */
  readonly view: ConsolePostsView;
}

/** @internal A fixture post collected from the sample source. The photographs show fictional performers. */
interface ConsolePreviewPost {
  readonly title: string;
  readonly category: 'Event' | 'Article';
  readonly date: string;
  readonly age: string;
  readonly image: string;
}
</script>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { CalendarDays, Clock3, LayoutList, ListFilter } from 'lucide-vue-next';

import { Badge, Card, EmptyState } from '@wow-two-beta/fe/presentation/display';
import { SearchInput, ToggleGroup, ToggleInput } from '@wow-two-beta/fe/presentation/forms';

import organ from './assets/organ.webp';
import piano from './assets/piano.webp';
import quartet from './assets/quartet.webp';
import recital from './assets/recital.webp';

defineProps<ConsolePostsPreviewProps>();

const Posts: ReadonlyArray<ConsolePreviewPost> = [
  {
    title: 'Evening of songs by the piano',
    category: 'Event',
    date: '18 Nov',
    age: '2 days ago',
    image: piano,
  },
  {
    title: 'Piano recital moves to spring',
    category: 'Article',
    date: '',
    age: '2 months ago',
    image: recital,
  },
  {
    title: 'Chamber quartet: winter programme',
    category: 'Event',
    date: '11 Dec',
    age: '1 month ago',
    image: quartet,
  },
  {
    title: 'Organ night: Bach and Buxtehude',
    category: 'Event',
    date: '17 Nov',
    age: '11 days ago',
    image: organ,
  },
];

const search = ref('');
const filter = ref<string>('all');
const shown = computed(() => {
  const query = search.value.trim().toLocaleLowerCase();
  return Posts.filter(
    (post) =>
      (filter.value === 'all' || filter.value === post.category) && post.title.toLocaleLowerCase().includes(query),
  );
});
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2.5">
      <SearchInput
        v-model="search"
        placeholder="Search this source’s posts"
        aria-label="Search posts"
        class="min-w-[min(100%,14rem)] flex-1 [&>input]:rounded-full [&>button]:rounded-full"
        is-clearable
      />
      <ToggleGroup
        variant="pill"
        aria-label="Filter posts"
        :model-value="filter"
        @update:model-value="filter = typeof $event === 'string' ? $event : 'all'"
      >
        <ToggleInput size="sm" value="all"><ListFilter :size="14" aria-hidden="true" /> All</ToggleInput>
        <ToggleInput size="sm" value="Event"><CalendarDays :size="14" aria-hidden="true" /> Events</ToggleInput>
        <ToggleInput size="sm" value="Article"><LayoutList :size="14" aria-hidden="true" /> Articles</ToggleInput>
      </ToggleGroup>
    </div>

    <EmptyState v-if="!shown.length" title="No posts match" description="Try a different search or filter." />
    <Card v-else-if="view === ConsolePostsView.Rows" radius="2xl" :elevation="0" class="overflow-hidden">
      <ul aria-label="Posts" class="divide-y divide-border">
        <li v-for="post in shown" :key="post.title" class="flex flex-wrap items-center justify-between gap-2 p-3">
          <span class="text-sm font-medium">{{ post.title }}</span>
          <Badge variant="outline">{{ post.category }}</Badge>
        </li>
      </ul>
    </Card>
    <ul v-else class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-3" aria-label="Posts">
      <li v-for="post in shown" :key="post.title" class="min-w-0">
        <Card
          radius="2xl"
          :elevation="0"
          class="relative isolate flex aspect-[4/5] min-h-48 flex-col justify-end overflow-hidden bg-muted"
        >
          <img :src="post.image" alt="" class="absolute inset-0 size-full object-cover" decoding="async" />
          <div
            aria-hidden="true"
            class="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-black/95 via-black/70 to-transparent"
          ></div>
          <div class="relative flex min-h-29 flex-col items-start gap-2 p-4 text-white">
            <Badge
              size="sm"
              :variant="post.category === 'Event' ? 'success' : 'neutral'"
              class="bg-black/45 text-white ring-1 ring-inset ring-white/30"
            >
              {{ post.category }}
            </Badge>
            <h3 class="line-clamp-2 text-sm leading-snug font-semibold">{{ post.title }}</h3>
            <div class="mt-auto flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/85">
              <span v-if="post.date" class="inline-flex items-center gap-1">
                <CalendarDays :size="13" aria-hidden="true" />{{ post.date }}
              </span>
              <span class="inline-flex items-center gap-1"><Clock3 :size="13" aria-hidden="true" />{{ post.age }}</span>
            </div>
          </div>
        </Card>
      </li>
    </ul>
  </div>
</template>
