<script setup lang="ts">
import {
  NotificationCenterGroup,
  NotificationItem,
  OnboardingChecklistCard,
  OnboardingChecklistCardTask,
} from '@wow-two-beta/ui-vue/presentation/display';
import { defineComponent, h, ref } from 'vue';
import * as feedback from '@wow-two-beta/ui-vue/presentation/feedback';
import { Button } from '@wow-two-beta/ui-vue/presentation/actions';
import { Info } from 'lucide-vue-next';
import Demo from '../gallery/Demo.vue';
import Matrix from '../gallery/Matrix.vue';
import AutoGroup from '../gallery/AutoGroup.vue';
import { feedbackExamples } from '../gallery/fixtures/FeedbackExamples';
import ToastReportDemo from './ToastReportDemo.vue';

const {
  Alert,
  AlertSimple,
  Banner,
  BannerSimple,
  Callout,
  Toast,
  ToastSimple,
  Spinner,
  InlineSpinner,
  SkeletonState,
  ProgressBar,
  ProgressCircleIndicator,
  ProgressStepsIndicator,
  MeterBar,
  StatusIndicator,
  PresenceIndicator,
  TrendIndicator,
  TypingIndicator,
  LoadingOverlay,
  LoadingState,
  SplashScreen,
  UndoBar,
  LiveCursorIndicator,
  ErrorBoundary,
} = feedback;

const covered = [
  'ErrorBoundary',
  'Alert',
  'AlertSimple',
  'Banner',
  'BannerSimple',
  'Callout',
  'Toast',
  'ToastSimple',
  'Spinner',
  'InlineSpinner',
  'SkeletonState',
  'ProgressBar',
  'ProgressCircleIndicator',
  'ProgressStepsIndicator',
  'MeterBar',
  'StatusIndicator',
  'PresenceIndicator',
  'TrendIndicator',
  'TypingIndicator',
  'LoadingOverlay',
  'LoadingState',
  'SplashScreen',
  'NotificationCenterGroup',
  'NotificationItem',
  'OnboardingChecklistCard',
  'OnboardingChecklistCardTask',
  'UndoBar',
  'LiveCursorIndicator',
  'ToastHost',
  'FeedbackToastHost',
  'ReportAction',
];

const SEVERITIES = ['neutral', 'info', 'success', 'warning', 'danger'] as const;
const SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
const PROGRESS_TONES = ['brand', 'success', 'warning', 'danger', 'neutral'] as const;

const undoOpen = ref(false);
const overlayOn = ref(false);
const widgetBroken = ref(false);
const splashOpen = ref(false);
const splashValue = ref(0);

/** Plays a first load: the overlay fills its bar in steps, then lifts. */
function playSplash(): void {
  splashValue.value = 0;
  splashOpen.value = true;
  const timer = setInterval(() => {
    splashValue.value = Math.min(100, splashValue.value + 25);
    if (splashValue.value < 100) return;
    clearInterval(timer);
    setTimeout(() => (splashOpen.value = false), 300);
  }, 400);
}

/** A widget that throws while rendering once broken, to exercise the boundary. */
const FragileWidget = defineComponent({
  name: 'FragileWidget',
  setup: () => () => {
    if (widgetBroken.value) throw new Error('Widget crashed while rendering');
    return h('p', { class: 'text-xs' }, 'The widget renders fine.');
  },
});

/** Repairs the widget, then clears the boundary so it remounts. */
function repair(reset: () => void): void {
  widgetBroken.value = false;
  reset();
}
</script>

<template>
  <div class="space-y-6">
    <h2 class="font-mono text-sm font-bold uppercase tracking-wide">feedback</h2>

    <Demo name="Alert" note="severity axis — icon / title / description / actions + close">
      <div class="space-y-2">
        <Alert
          v-for="s in SEVERITIES"
          :key="s"
          :severity="s"
          :title="`${s} alert`"
          description="A one-line explanation of what happened."
          @close="() => {}"
        >
          <template #icon><Info :size="16" /></template>
          <template #actions>
            <Button size="xs" variant="soft">Retry</Button>
            <Button size="xs" variant="ghost">Details</Button>
          </template>
        </Alert>
      </div>
    </Demo>

    <div class="grid grid-cols-[repeat(auto-fill,minmax(330px,1fr))] gap-3">
      <Demo name="AlertSimple" note="severity axis, free-form children">
        <div class="space-y-2">
          <AlertSimple v-for="s in SEVERITIES" :key="s" :severity="s">{{ s }}</AlertSimple>
        </div>
      </Demo>

      <Demo name="Banner / BannerSimple" note="severity axis">
        <div class="space-y-2">
          <Banner
            v-for="s in SEVERITIES"
            :key="s"
            :severity="s"
            :title="`${s} banner`"
            description="Full-bleed notice."
          />
          <BannerSimple severity="info">BannerSimple — info</BannerSimple>
        </div>
      </Demo>

      <Demo name="Callout" note="severity axis">
        <div class="space-y-2">
          <Callout v-for="s in SEVERITIES" :key="s" :severity="s" :title="`${s} callout`">
            Body copy inside the callout.
          </Callout>
        </div>
      </Demo>

      <Demo name="Toast / ToastSimple" note="rendered inline, not through the ToastHost">
        <div class="space-y-2">
          <Toast
            v-for="s in SEVERITIES"
            :key="s"
            :severity="s"
            :title="`${s} toast`"
            description="Short message."
            @close="() => {}"
          />
          <ToastSimple severity="success">ToastSimple</ToastSimple>
        </div>
      </Demo>

      <Demo name="ToastHost / ReportAction" note="timer display, severity glyphs, one-click report of a failure">
        <ToastReportDemo />
      </Demo>

      <Demo name="Spinner" note="size × tone">
        <Matrix row-axis="size" col-axis="tone" :rows="SIZES" :cols="['default', 'brand', 'muted', 'current']">
          <template #default="{ row, col }">
            <Spinner :size="row as never" :tone="col as never" />
          </template>
        </Matrix>
      </Demo>

      <Demo name="InlineSpinner">
        <p class="text-sm">Saving <InlineSpinner /> please wait…</p>
      </Demo>

      <Demo name="SkeletonState" note="shape: rect / text / circle">
        <div class="space-y-2">
          <SkeletonState shape="rect" class="h-8 w-full" />
          <SkeletonState shape="text" class="w-3/4" />
          <SkeletonState shape="circle" class="size-10" />
        </div>
      </Demo>

      <Demo name="ProgressBar" note="size × tone at 60%">
        <Matrix row-axis="size" col-axis="tone" :rows="['sm', 'md', 'lg']" :cols="PROGRESS_TONES">
          <template #default="{ row, col }">
            <ProgressBar :value="60" :size="row as never" :tone="col as never" class="w-16" label="60%" />
          </template>
        </Matrix>
        <div class="mt-2 space-y-2">
          <ProgressBar :value="0" label="0%" />
          <ProgressBar :value="100" label="100%" />
          <ProgressBar label="indeterminate (no value)" />
        </div>
      </Demo>

      <Demo name="ProgressCircleIndicator" note="tone axis at 25 / 50 / 75%">
        <div class="flex flex-wrap items-center gap-3">
          <ProgressCircleIndicator
            v-for="(t, i) in PROGRESS_TONES"
            :key="t"
            :value="[10, 25, 50, 75, 100][i]"
            :tone="t"
          />
        </div>
      </Demo>

      <Demo name="ProgressStepsIndicator" note="horizontal + vertical, current = 1">
        <div class="space-y-4">
          <ProgressStepsIndicator :steps="['Account', 'Profile', 'Billing', 'Done']" :current="1" />
          <ProgressStepsIndicator :steps="['Account', 'Profile', 'Done']" :current="2" orientation="vertical" />
        </div>
      </Demo>

      <Demo name="MeterBar" note="thresholds — colour should change across them">
        <div class="space-y-2">
          <MeterBar :value="20" label="20 / 100" />
          <MeterBar :value="60" label="60 / 100" />
          <MeterBar :value="95" label="95 / 100" />
          <MeterBar :value="95" :thresholds="[50, 80]" label="95 with [50,80]" />
        </div>
      </Demo>

      <Demo name="StatusIndicator" note="tone axis + pulse">
        <div class="space-y-1">
          <StatusIndicator
            v-for="t in ['success', 'warning', 'destructive', 'info', 'neutral']"
            :key="t"
            :tone="t as never"
            :label="t"
            description="service description"
          />
          <StatusIndicator tone="success" label="pulsing" has-pulse />
        </div>
      </Demo>

      <Demo name="PresenceIndicator" note="status axis">
        <div class="flex flex-wrap items-center gap-3">
          <div v-for="s in ['online', 'idle', 'busy', 'offline', 'invisible']" :key="s" class="flex items-center gap-1">
            <PresenceIndicator :status="s as never" />
            <span class="text-[10px] text-subtle-foreground">{{ s }}</span>
          </div>
        </div>
      </Demo>

      <Demo name="TrendIndicator" note="positive / negative / zero, inverse flips the palette">
        <div class="flex flex-wrap items-center gap-3">
          <TrendIndicator :value="12.5" label="vs last week" />
          <TrendIndicator :value="-4.2" />
          <TrendIndicator :value="0" />
          <TrendIndicator :value="-4.2" is-inverse />
        </div>
      </Demo>

      <Demo name="TypingIndicator" note="tone axis — dots should animate">
        <div class="flex items-center gap-4">
          <TypingIndicator v-for="t in ['muted', 'primary', 'foreground']" :key="t" :tone="t as never" />
        </div>
      </Demo>

      <Demo name="ErrorBoundary" note="break the widget — the page around it keeps working">
        <div class="space-y-2">
          <ErrorBoundary>
            <FragileWidget />
            <template #fallback="{ error, reset }">
              <div
                role="alert"
                class="space-y-1 rounded-md border border-destructive/40 bg-destructive-soft p-2 text-xs"
              >
                <p>{{ (error as Error).message }}</p>
                <Button variant="ghost" size="sm" @click="repair(reset)">Repair and retry</Button>
              </div>
            </template>
          </ErrorBoundary>
          <Button variant="outline" size="sm" @click="widgetBroken = true">Break the widget</Button>
        </div>
      </Demo>

      <Demo name="LoadingState">
        <LoadingState title="Fetching packages…" />
      </Demo>

      <Demo name="LoadingOverlay" note="inline, over the box">
        <div class="relative h-24 overflow-hidden rounded-md bg-muted">
          <div class="p-2 text-xs">content behind</div>
          <LoadingOverlay :is-open="overlayOn" is-inline has-blur />
        </div>
        <Button variant="ghost" size="sm" class="mt-2" @click="overlayOn = !overlayOn">
          toggle ({{ overlayOn }})
        </Button>
      </Demo>

      <Demo name="SplashScreen" note="page in a box · overlay on demand">
        <div class="h-40 overflow-hidden rounded-md border border-border">
          <SplashScreen :value="40" class="h-full min-h-0">
            <template #logo><span class="text-lg font-semibold">Product</span></template>
          </SplashScreen>
        </div>
        <Button variant="ghost" size="sm" class="mt-2" @click="playSplash">play the overlay</Button>
        <SplashScreen :is-open="splashOpen" is-overlay :value="splashValue">
          <template #logo><span class="text-2xl font-semibold">Product</span></template>
        </SplashScreen>
      </Demo>

      <Demo name="NotificationCenterGroup / NotificationItem">
        <NotificationCenterGroup class="w-full">
          <NotificationItem title="Build finished" description="2 minutes ago" @dismiss="() => {}" />
          <NotificationItem title="New comment" description="9 minutes ago" @select="() => {}" />
          <NotificationItem title="Deploy failed" description="1 hour ago" />
        </NotificationCenterGroup>
      </Demo>

      <Demo name="OnboardingChecklistCard">
        <OnboardingChecklistCard title="Get started">
          <OnboardingChecklistCardTask label="Create an account" description="Done in 30s" is-done />
          <OnboardingChecklistCardTask label="Install the SDK" action="Install" />
          <OnboardingChecklistCardTask label="Ship a page" />
        </OnboardingChecklistCard>
      </Demo>

      <Demo name="UndoBar" note="fixed-position portal — click to raise it">
        <Button variant="outline" size="sm" @click="undoOpen = true">Show undo bar</Button>
        <UndoBar
          :open="undoOpen"
          message="Item deleted"
          has-countdown
          @undo="undoOpen = false"
          @update:open="(o) => (undoOpen = o)"
        />
      </Demo>

      <Demo name="LiveCursorIndicator" note="absolute-positioned collaborator cursor">
        <div class="relative h-24 rounded-md bg-muted">
          <LiveCursorIndicator :x="40" :y="30" name="Ada" />
          <LiveCursorIndicator :x="140" :y="60" name="Grace" color="var(--color-success)" />
        </div>
      </Demo>
    </div>

    <h3 class="border-t border-border pt-4 font-mono text-xs uppercase text-subtle-foreground">auto-mounted tail</h3>
    <AutoGroup :examples="feedbackExamples" :namespace="feedback" :covered="covered" />
  </div>
</template>
