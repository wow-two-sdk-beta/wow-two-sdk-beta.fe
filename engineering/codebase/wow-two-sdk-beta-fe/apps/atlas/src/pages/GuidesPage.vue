<script setup lang="ts">
import { computed, reactive } from 'vue';
import { Guides, recommend } from '../content/guides';
import { findArchetype } from '../content/layouts';
import { specToQuery } from '../content/specQuery';
import { href, route } from '../router';
import ChoiceChips from '../shell/ChoiceChips.vue';
import LayoutWire from '../wire/LayoutWire.vue';

const guide = computed(() => Guides.find((entry) => entry.id === route.value.id) ?? Guides[0]!);

/** Answers per guide, as the chosen option index per question; every question starts on its first option. */
const answers = reactive<Record<string, Record<string, number>>>({});

function answersFor(guideId: string): Record<string, number> {
  answers[guideId] ??= {};
  return answers[guideId]!;
}

function selected(questionId: string): string {
  return String(answersFor(guide.value.id)[questionId] ?? 0);
}

function select(questionId: string, value: string): void {
  answersFor(guide.value.id)[questionId] = Number(value);
}

const outcome = computed(() => {
  const chosen = Object.fromEntries(
    guide.value.questions.map((question) => [question.id, answersFor(guide.value.id)[question.id] ?? 0]),
  );
  return recommend(guide.value, chosen);
});

const archetype = computed(() => findArchetype(outcome.value.archetype ?? null));

function optionsOf(index: number): Record<string, string> {
  return Object.fromEntries(
    guide.value.questions[index]!.options.map((option, position) => [String(position), option.label]),
  );
}
</script>

<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-5">
    <header>
      <h1 class="text-2xl font-semibold tracking-tight">Guides</h1>
      <p class="mt-1 max-w-2xl text-muted-foreground">Answer a few questions; the wireframe follows your answers.</p>
    </header>

    <nav aria-label="Guides" class="flex flex-wrap gap-1">
      <a
        v-for="entry in Guides"
        :key="entry.id"
        :href="href('guides', entry.id)"
        :aria-current="entry.id === guide.id ? 'page' : undefined"
        class="rounded-md px-3 py-1.5 text-sm transition-colors"
        :class="
          entry.id === guide.id
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        "
      >
        {{ entry.name }}
      </a>
    </nav>

    <div class="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <section class="flex flex-col gap-4">
        <p class="text-sm text-muted-foreground">{{ guide.intro }}</p>
        <ChoiceChips
          v-for="(question, index) in guide.questions"
          :key="question.id"
          :label="question.text"
          :options="optionsOf(index)"
          :model-value="selected(question.id)"
          @update:model-value="select(question.id, $event)"
        />
      </section>
      <section class="flex flex-col gap-3" aria-live="polite">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h2 class="text-xl font-semibold">{{ outcome.name }}</h2>
          <div class="flex gap-3 text-sm">
            <a v-if="archetype" :href="href('layouts', archetype.id)" class="text-primary hover:underline"
              >{{ archetype.name }} →</a
            >
            <a :href="href('lab', null, specToQuery(outcome.spec))" class="text-primary hover:underline"
              >Open in lab →</a
            >
          </div>
        </div>
        <p class="text-muted-foreground">{{ outcome.why }}</p>
        <LayoutWire :spec="outcome.spec" :label="`${outcome.name} wireframe`" />
      </section>
    </div>
  </div>
</template>
