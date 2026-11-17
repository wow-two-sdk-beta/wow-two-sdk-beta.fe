<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, shallowRef, useTemplateRef, watch } from 'vue';
import { Politeness } from '@wow-two-beta/fe/foundation/primitives';
import { Button } from '@wow-two-beta/fe/presentation/actions';
import {
  ContextScenarios,
  DefaultToastLabSettings,
  ImplementedFeatures,
  PreviewWidths,
  SharedScenarios,
  ToastGroupMotions,
  ToastLabContexts,
  ToastMotions,
  ToastPlacements,
  ToastScenarios,
  ToastSurfaces,
  ToastTimerChoices,
  UpcomingFeatures,
  type ToastAnnouncement,
  type ToastLabSettings,
  type ToastPreviewEvent,
  type ToastPreviewMessage,
  type ToastScenario,
} from './ToastLabConfig';

interface LoggedAnnouncement extends ToastAnnouncement {
  readonly key: number;
}

/** The screen reader log keeps the newest few entries only. */
const AnnouncementLimit = 8;

const settings = reactive<ToastLabSettings>({ ...DefaultToastLabSettings });
const isPhone = matchMedia('(max-width: 600px)').matches;
const viewport = ref<keyof typeof PreviewWidths>(
  isPhone ? 'phone' : matchMedia('(max-width: 1023px)').matches ? 'tablet' : 'desktop',
);
const ready = ref(false);
const showMotion = ref(false);
const featuresOpen = ref(!isPhone);
const cancellable = ref(false);
const announcements = shallowRef<ReadonlyArray<LoggedAnnouncement>>([]);
let announcementKey = 0;
const preview = useTemplateRef<HTMLIFrameElement>('preview');
const stage = useTemplateRef<HTMLDivElement>('stage');
const stageWidth = ref(0);
const windowHeight = ref(window.innerHeight);
let resizeObserver: ResizeObserver | undefined;

const previewUrl = new URL(location.pathname, location.origin);
previewUrl.searchParams.set('toast-preview', '');

const scenarios = computed<ReadonlyArray<ToastScenario>>(() => [
  ...ContextScenarios[settings.context],
  ...SharedScenarios,
]);
const size = computed(() => PreviewWidths[viewport.value]);
const scale = computed(() => (stageWidth.value > 0 ? Math.min(1, stageWidth.value / size.value.width) : 1));
const stageHeight = computed(() =>
  scale.value < 0.65
    ? size.value.height
    : Math.min(size.value.height, Math.max(340, Math.floor((windowHeight.value * 0.62) / scale.value))),
);

function send(message: ToastPreviewMessage): void {
  preview.value?.contentWindow?.postMessage(message, location.origin);
}

function sendSettings(): void {
  send({ type: 'toast-preview-settings', settings: { ...settings } });
}

function logAnnouncement(entry: ToastAnnouncement): void {
  if (typeof entry.text !== 'string' || !entry.text) return;
  const logged: LoggedAnnouncement = {
    key: ++announcementKey,
    text: entry.text,
    politeness: entry.politeness === Politeness.Assertive ? Politeness.Assertive : Politeness.Polite,
    atMs: Number.isFinite(entry.atMs) ? entry.atMs : Date.now(),
  };
  announcements.value = [logged, ...announcements.value].slice(0, AnnouncementLimit);
}

function onPreviewMessage(event: MessageEvent<ToastPreviewEvent>): void {
  if (event.origin !== location.origin || event.source !== preview.value?.contentWindow) return;
  const data = event.data;
  switch (data?.type) {
    case 'toast-preview-ready':
      ready.value = true;
      cancellable.value = false;
      sendSettings();
      break;
    case 'toast-preview-state':
      cancellable.value = data.cancellable === true;
      break;
    case 'toast-preview-announcement':
      logAnnouncement(data);
      break;
  }
}

function play(scenario: ToastScenario): void {
  send({ type: 'toast-preview-play', scenario });
}

/** Replays a feature and brings the preview into view when the panel sits below it. */
function replay(scenario: ToastScenario): void {
  play(scenario);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  stage.value?.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
}

function scenarioLabel(scenario: ToastScenario): string {
  return scenario === 'cancel' && cancellable.value ? 'Cancel running task' : ToastScenarios[scenario];
}

function announcementTime(atMs: number): string {
  return new Date(atMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function onFeaturesToggle(event: Event): void {
  featuresOpen.value = (event.target as HTMLDetailsElement).open;
}

function measureWindow(): void {
  windowHeight.value = window.innerHeight;
}

watch(settings, sendSettings);
onMounted(() => {
  window.addEventListener('message', onPreviewMessage);
  window.addEventListener('resize', measureWindow);
  if (stage.value) {
    resizeObserver = new ResizeObserver(([entry]) => {
      if (entry) stageWidth.value = entry.contentRect.width;
    });
    resizeObserver.observe(stage.value);
  }
});
onUnmounted(() => {
  window.removeEventListener('message', onPreviewMessage);
  window.removeEventListener('resize', measureWindow);
  resizeObserver?.disconnect();
});
</script>

<template>
  <section class="mx-auto max-w-7xl space-y-5 px-1 pb-6 sm:px-3" aria-labelledby="toast-lab-title">
    <div class="flex flex-wrap items-end justify-between gap-4 pt-2">
      <div>
        <h2 id="toast-lab-title" class="text-2xl font-semibold tracking-tight">Toast motion lab</h2>
        <p class="mt-1 text-sm text-muted-foreground">
          Replay a notice or a stack to compare how it enters, expires, and closes.
        </p>
      </div>
      <div class="flex items-center gap-2 text-sm">
        <label for="toast-lab-context">App context</label>
        <select
          id="toast-lab-context"
          v-model="settings.context"
          class="rounded-md border border-border bg-card px-2.5 py-1.5"
        >
          <option v-for="(label, id) in ToastLabContexts" :key="id" :value="id">{{ label }}</option>
        </select>
      </div>
    </div>

    <div class="space-y-3 rounded-xl border border-border bg-card p-3">
      <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
        <fieldset class="flex items-center gap-1" aria-label="Preview width">
          <Button
            v-for="(width, id) in PreviewWidths"
            :key="id"
            size="sm"
            :variant="viewport === id ? 'solid' : 'ghost'"
            :aria-pressed="viewport === id"
            @click="viewport = id"
          >
            {{ width.label }}
          </Button>
        </fieldset>
        <div class="flex items-center gap-2 text-sm">
          <label for="toast-lab-placement">Placement</label>
          <select
            id="toast-lab-placement"
            v-model="settings.placement"
            class="rounded-md border border-border bg-card px-2 py-1"
          >
            <option v-for="(label, id) in ToastPlacements" :key="id" :value="id">{{ label }}</option>
          </select>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <label for="toast-lab-timer">Timer</label>
          <select
            id="toast-lab-timer"
            v-model="settings.timer"
            class="rounded-md border border-border bg-card px-2 py-1"
          >
            <option v-for="(choice, id) in ToastTimerChoices" :key="id" :value="id">{{ choice.label }}</option>
          </select>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <label for="toast-lab-surface">Toast surface</label>
          <select
            id="toast-lab-surface"
            v-model="settings.surface"
            class="rounded-md border border-border bg-card px-2 py-1"
          >
            <option v-for="(label, id) in ToastSurfaces" :key="id" :value="id">{{ label }}</option>
          </select>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <label for="toast-lab-group-motion">Group arrival</label>
          <select
            id="toast-lab-group-motion"
            v-model="settings.groupMotion"
            class="rounded-md border border-border bg-card px-2 py-1"
          >
            <option v-for="(label, id) in ToastGroupMotions" :key="id" :value="id">{{ label }}</option>
          </select>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <label for="toast-lab-speed">Motion speed</label>
          <select
            id="toast-lab-speed"
            v-model="settings.speed"
            class="rounded-md border border-border bg-card px-2 py-1"
          >
            <option :value="1">1×</option>
            <option :value="0.25">0.25×</option>
          </select>
        </div>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="settings.dark" type="checkbox" class="accent-primary" />
          Dark preview
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="settings.history" type="checkbox" class="accent-primary" />
          Enable history
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="settings.groupMatching" type="checkbox" class="accent-primary" />
          Group matching toasts
        </label>
        <label class="flex items-center gap-2 text-sm" :class="{ 'opacity-60': !settings.history }">
          <input
            v-model="settings.keepConfirmations"
            type="checkbox"
            :disabled="!settings.history"
            class="accent-primary"
          />
          Keep confirmations
        </label>
        <label class="flex items-center gap-2 text-sm" :class="{ 'opacity-60': !settings.history }">
          <input v-model="settings.pauseBypass" type="checkbox" :disabled="!settings.history" class="accent-primary" />
          Urgent breaks through pause
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="settings.hotkey" type="checkbox" class="accent-primary" />
          Hotkey F8
        </label>
      </div>
      <p class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" data-toast-lab-hints>
        <span>{{ settings.hotkey ? 'F8 jumps to notifications · Escape returns' : 'F8 hotkey is off' }}</span>
        <span v-if="viewport === 'phone'">Swipe a toast sideways to dismiss</span>
      </p>
      <div class="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Button
          v-for="(scenario, index) in scenarios"
          :key="scenario"
          size="sm"
          :variant="index === 0 ? 'solid' : 'outline'"
          :is-disabled="!ready"
          @click="play(scenario)"
        >
          {{ scenarioLabel(scenario) }}
        </Button>
        <Button
          class="ml-auto"
          size="sm"
          variant="ghost"
          :aria-expanded="showMotion"
          aria-controls="toast-lab-motion"
          @click="showMotion = !showMotion"
        >
          Motion settings
        </Button>
        <Button size="sm" variant="ghost" :is-disabled="!ready" @click="play('clear')">
          {{ ToastScenarios.clear }}
        </Button>
      </div>
      <div v-show="showMotion" id="toast-lab-motion">
        <fieldset class="grid min-w-0 grid-cols-2 gap-2 pt-2 md:grid-cols-4" aria-label="Motion">
          <button
            v-for="(motion, id) in ToastMotions"
            :key="id"
            type="button"
            :aria-pressed="settings.motion === id"
            class="rounded-lg border px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-ring"
            :class="settings.motion === id ? 'border-primary bg-muted' : 'border-border bg-card hover:bg-muted'"
            @click="settings.motion = id"
          >
            <span class="block text-sm font-medium">{{ motion.label }}</span>
            <span class="mt-0.5 block text-xs text-muted-foreground">{{ motion.detail }}</span>
          </button>
        </fieldset>
      </div>
    </div>

    <div class="overflow-hidden rounded-xl border border-border bg-muted">
      <div class="flex justify-between gap-3 border-b border-border bg-card px-3 py-2 text-xs text-muted-foreground">
        <span>{{ ToastLabContexts[settings.context] }} sample preview</span>
        <span class="font-mono">{{ size.width }} px</span>
      </div>
      <div ref="stage" class="relative overflow-hidden" :style="{ height: `${stageHeight * scale}px` }">
        <iframe
          ref="preview"
          :src="previewUrl.href"
          :width="size.width"
          :height="stageHeight"
          :style="{ transform: `translateX(-50%) scale(${scale})` }"
          title="Toast notification preview"
          class="absolute top-0 left-1/2 block max-w-none origin-top border-0 bg-background"
        />
      </div>
    </div>

    <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <details class="rounded-xl border border-border bg-card" :open="featuresOpen" @toggle="onFeaturesToggle">
        <summary class="cursor-pointer px-3 py-2 text-sm font-medium">Features</summary>
        <div class="grid gap-4 border-t border-border p-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section class="min-w-0">
            <h3 id="toast-lab-implemented" class="mb-1.5 text-xs font-semibold text-muted-foreground">Implemented</h3>
            <ul aria-labelledby="toast-lab-implemented" class="grid gap-x-4 text-sm sm:grid-cols-2">
              <li
                v-for="feature in ImplementedFeatures"
                :key="feature.label"
                class="flex min-h-8 items-center justify-between gap-2 border-b border-border/60 py-0.5"
              >
                <span class="min-w-0">{{ feature.label }}</span>
                <Button
                  v-if="feature.scenario"
                  size="xs"
                  variant="ghost"
                  class="shrink-0"
                  :aria-label="`Replay ${feature.label}`"
                  :is-disabled="!ready"
                  @click="replay(feature.scenario)"
                >
                  Replay
                </Button>
              </li>
            </ul>
          </section>
          <section class="min-w-0">
            <h3 id="toast-lab-upcoming" class="mb-1.5 text-xs font-semibold text-muted-foreground">Upcoming</h3>
            <ul aria-labelledby="toast-lab-upcoming" class="text-sm text-muted-foreground">
              <li
                v-for="feature in UpcomingFeatures"
                :key="feature"
                class="flex min-h-8 items-center border-b border-border/60 py-0.5"
              >
                {{ feature }}
              </li>
            </ul>
          </section>
        </div>
      </details>

      <section class="rounded-xl border border-border bg-card" aria-labelledby="toast-lab-announcements">
        <div class="flex items-center justify-between gap-2 px-3 py-1.5">
          <h3 id="toast-lab-announcements" class="text-sm font-medium">Screen reader</h3>
          <Button
            size="xs"
            variant="ghost"
            aria-label="Clear announcements"
            :is-disabled="!announcements.length"
            @click="announcements = []"
          >
            Clear
          </Button>
        </div>
        <p v-if="!announcements.length" class="border-t border-border px-3 py-2 text-xs text-muted-foreground">
          Text the toast host's live regions announce appears here, newest first.
        </p>
        <ol v-else aria-labelledby="toast-lab-announcements" class="divide-y divide-border border-t border-border">
          <li
            v-for="entry in announcements"
            :key="entry.key"
            class="flex items-start gap-2 px-3 py-1.5 text-sm"
            :data-politeness="entry.politeness"
          >
            <span
              class="mt-0.5 shrink-0 rounded px-1.5 text-[11px] leading-4 font-medium"
              :class="
                entry.politeness === Politeness.Assertive
                  ? 'bg-destructive-soft text-destructive-soft-foreground'
                  : 'bg-muted text-muted-foreground'
              "
            >
              {{ entry.politeness }}
            </span>
            <span class="min-w-0 flex-1 [overflow-wrap:anywhere]">{{ entry.text }}</span>
            <time
              class="shrink-0 font-mono text-[11px] leading-5 text-muted-foreground"
              :datetime="new Date(entry.atMs).toISOString()"
            >
              {{ announcementTime(entry.atMs) }}
            </time>
          </li>
        </ol>
      </section>
    </div>
  </section>
</template>
