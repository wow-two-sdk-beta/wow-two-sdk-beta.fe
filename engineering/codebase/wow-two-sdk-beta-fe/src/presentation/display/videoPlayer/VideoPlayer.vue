<script lang="ts">
/** Defines the kind of a video text track. */
export const VideoTrackKind = {
  /** Refers to translation subtitles. */
  Subtitles: 'subtitles',
  /** Refers to closed captions. */
  Captions: 'captions',
  /** Refers to audio descriptions. */
  Descriptions: 'descriptions',
  /** Refers to chapter markers. */
  Chapters: 'chapters',
  /** Refers to script-only metadata. */
  Metadata: 'metadata',
} as const;

export type VideoTrackKind = (typeof VideoTrackKind)[keyof typeof VideoTrackKind];

export interface VideoTrack {
  readonly src: string;
  readonly srcLang: string;
  readonly label: string;
  readonly kind?: VideoTrackKind;
  readonly default?: boolean;
}

export interface VideoPlayerProps {
  /** The video source URL. */
  readonly src: string;
  /** The preview image shown before playback. */
  readonly poster?: string;
  /** The caption/subtitle tracks rendered as `<track>` children. */
  readonly tracks?: ReadonlyArray<VideoTrack>;
  /** The CSS `aspect-ratio` of the frame. Default `16 / 9`. */
  readonly aspectRatio?: string | number;
  /** The autoplay state, forwarded to the native `<video>`. */
  readonly autoPlay?: boolean;
  /** The loop state, forwarded to the native `<video>`. */
  readonly loop?: boolean;
  /** The initial muted state — seeds the internal toggle, exactly as React's `muted` did. */
  readonly muted?: boolean;
  /** The initial volume in 0..1. Default `1`. */
  readonly defaultVolume?: number;
  /** The initial playback rate. Default `1`. */
  readonly defaultPlaybackRate?: number;
}

const PlaybackRates: ReadonlyArray<number> = [0.5, 0.75, 1, 1.25, 1.5, 2];

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/** The idle delay, in ms, before the controls bar fades out during playback. */
const IdleHideMs = 3000;

const IconButtonClass =
  'inline-flex h-7 w-7 items-center justify-center rounded text-white/80 hover:bg-white/20 hover:text-white';
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { UrlExtensions } from '../../../foundation/dom';
import { computed, onBeforeUnmount, onMounted, ref, useAttrs, useTemplateRef, watch } from 'vue';
import {
  Captions,
  CaptionsOff,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { Icon } from '../../../foundation/icons';

const locale = useLocale();

/**
 * Renders a video player whose custom controls auto-hide 3s into playback.
 *
 * Click the video to toggle play. Keyboard shortcuts: Space / F / M / C and the arrow keys.
 */
defineOptions({ name: 'VideoPlayer', inheritAttrs: false });

const props = withDefaults(defineProps<VideoPlayerProps>(), {
  poster: undefined,
  tracks: undefined,
  aspectRatio: '16 / 9',
  // Explicit `undefined` so an absent Boolean prop is not cast to `false` and the
  // native element keeps its own default.
  autoPlay: undefined,
  loop: undefined,
  muted: undefined,
  defaultVolume: 1,
  defaultPlaybackRate: 1,
});

const attrs = useAttrs();
/** The wrapper — React held it as `containerRef`; fullscreen and the idle timer target it. */
const container = useTemplateRef<HTMLDivElement>('container');
/** The native `<video>` — React exposed it through `useImperativeHandle`. */
const el = useTemplateRef<HTMLVideoElement>('el');

const playing = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(Number.isFinite(props.defaultVolume) ? Math.max(0, Math.min(1, props.defaultVolume)) : 1);
/**
 * Named apart from the `muted` prop, which only seeds it. A setup ref and a prop
 * of the same name collapse into one template binding, so the prop keeps its
 * React name and the state gets a distinct one.
 */
const isMuted = ref(!!props.muted);
const speed = ref(
  Number.isFinite(props.defaultPlaybackRate) && props.defaultPlaybackRate > 0 ? props.defaultPlaybackRate : 1,
);
const fullscreen = ref(false);
const captionsOn = ref(
  props.tracks?.some(
    (track) =>
      track.default &&
      (track.kind == null || track.kind === VideoTrackKind.Captions || track.kind === VideoTrackKind.Subtitles),
  ) ?? false,
);
const showControls = ref(true);
const focused = ref(false);

let idleTimer: number | null = null;

/** Push the three imperative settings onto the element — React's first `useEffect`. */
function applyVideoSettings(): void {
  const video = el.value;
  if (!video) return;
  video.volume = volume.value;
  video.muted = isMuted.value;
  try {
    video.playbackRate = speed.value;
  } catch {
    // Playback-rate support varies by media engine; retain a valid native default.
    speed.value = 1;
    video.playbackRate = 1;
  }
}

onMounted(applyVideoSettings);
watch([volume, isMuted, speed], applyVideoSettings, { flush: 'post' });

/** Only one caption/subtitle track is shown; metadata and chapter tracks remain caller-owned. */
function applyCaptionMode(): void {
  const video = el.value;
  if (!video?.textTracks) return;
  const tracks = Array.from(video.textTracks).filter(
    (track) => track.kind === VideoTrackKind.Captions || track.kind === VideoTrackKind.Subtitles,
  );
  const preferred = props.tracks?.find(
    (track) =>
      track.default &&
      (track.kind == null || track.kind === VideoTrackKind.Captions || track.kind === VideoTrackKind.Subtitles),
  );
  const selected =
    tracks.find((track) => track.language === preferred?.srcLang && track.label === preferred?.label) ??
    tracks.find((track) => track.mode === 'showing') ??
    tracks[0];
  for (const track of tracks) track.mode = captionsOn.value && track === selected ? 'showing' : 'hidden';
}

onMounted(applyCaptionMode);
watch([captionsOn, () => props.tracks], applyCaptionMode, { flush: 'post' });

function onFullscreenChange(): void {
  fullscreen.value = document.fullscreenElement === container.value;
}

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange);
});

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange);
});

function resetMediaState(): void {
  playing.value = false;
  currentTime.value = 0;
  duration.value = 0;
}
watch(() => props.src, resetMediaState, { flush: 'post' });

function togglePlay(): void {
  const video = el.value;
  if (!video) return;
  if (video.paused) {
    video.play().catch(() => {
      /* autoplay rejection */
    });
  } else {
    video.pause();
  }
}

function seekTo(seconds: number): void {
  const video = el.value;
  if (!video || !Number.isFinite(seconds)) return;
  video.currentTime = Math.max(0, Math.min(video.duration || 0, seconds));
}

function toggleFullscreen(): void {
  const node = container.value;
  if (!node) return;
  if (document.fullscreenElement !== node) {
    void node.requestFullscreen?.().catch(() => {
      /* denied by the user agent */
    });
  } else {
    void document.exitFullscreen?.().catch(() => {
      /* already exiting */
    });
  }
}

function togglePiP(): void {
  const video = el.value;
  if (!video) return;
  if ('pictureInPictureElement' in document && document.pictureInPictureElement === video) {
    void (document as unknown as { exitPictureInPicture?: () => Promise<void> }).exitPictureInPicture?.()?.catch(() => {
      /* not in picture-in-picture */
    });
  } else if ('requestPictureInPicture' in video) {
    void (video as HTMLVideoElement & { requestPictureInPicture?: () => Promise<unknown> })
      .requestPictureInPicture?.()
      ?.catch(() => {
        /* refused by the user agent */
      });
  }
}

/** Reveal the controls, and re-arm the idle fade only while playing. */
function bumpControls(): void {
  showControls.value = true;
  if (idleTimer != null) window.clearTimeout(idleTimer);
  if (playing.value && !focused.value) {
    idleTimer = window.setTimeout(() => {
      showControls.value = false;
    }, IdleHideMs);
  }
}

onMounted(bumpControls);
watch([playing, focused], bumpControls);
onBeforeUnmount(() => {
  if (idleTimer != null) window.clearTimeout(idleTimer);
});

function onMouseLeave(): void {
  if (playing.value && !focused.value) showControls.value = false;
}

function onFocusout(event: FocusEvent): void {
  const node = container.value;
  if (!(event.relatedTarget instanceof Node) || !node?.contains(event.relatedTarget)) focused.value = false;
}

function onKeydown(event: KeyboardEvent): void {
  // Only handle shortcuts aimed at the container itself — never hijack
  // keys from interactive children (seek slider, speed select, buttons).
  if (event.target !== event.currentTarget) return;
  switch (event.key) {
    case ' ':
    case 'Spacebar':
      event.preventDefault();
      togglePlay();
      break;
    case 'ArrowRight':
      event.preventDefault();
      seekTo(currentTime.value + 5);
      break;
    case 'ArrowLeft':
      event.preventDefault();
      seekTo(currentTime.value - 5);
      break;
    case 'ArrowUp':
      event.preventDefault();
      volume.value = Math.min(1, volume.value + 0.1);
      break;
    case 'ArrowDown':
      event.preventDefault();
      volume.value = Math.max(0, volume.value - 0.1);
      break;
    case 'm':
    case 'M':
      event.preventDefault();
      isMuted.value = !isMuted.value;
      break;
    case 'f':
    case 'F':
      event.preventDefault();
      toggleFullscreen();
      break;
    case 'c':
    case 'C':
      event.preventDefault();
      if (hasTracks.value) captionsOn.value = !captionsOn.value;
      break;
  }
}

/*
 * The five handlers below sit AFTER `v-bind="rest"` on the `<video>`, so a
 * consumer's own listener for the same event runs first and this one second —
 * the order React's `composeEventHandlers(theirs, ours)` produced. The
 * `defaultPrevented` guard is that helper's `checkForDefaultPrevented`.
 */
function onNativePlay(event: Event): void {
  if (event.defaultPrevented) return;
  playing.value = true;
}

function onNativePause(event: Event): void {
  if (event.defaultPrevented) return;
  playing.value = false;
}

function onNativeTimeUpdate(event: Event): void {
  if (event.defaultPrevented) return;
  const video = el.value;
  if (!video) return;
  currentTime.value = video.currentTime;
}

function onNativeLoadedMetadata(event: Event): void {
  if (event.defaultPrevented) return;
  const video = el.value;
  if (video) duration.value = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
  applyCaptionMode();
}

function onVideoClick(event: MouseEvent): void {
  if (event.defaultPrevented) return;
  togglePlay();
}

function onRangeInput(event: Event): void {
  seekTo(Number((event.target as HTMLInputElement).value));
}

const classes = computed(() =>
  cn(
    'group relative overflow-hidden rounded-md bg-black text-white shadow-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    attrs.class as string | undefined,
  ),
);

/** `aspect-ratio` is unitless, so the numeric form only needs stringifying. */
const containerStyle = computed(() => ({
  aspectRatio: typeof props.aspectRatio === 'number' ? String(props.aspectRatio) : props.aspectRatio,
}));

const controlsClasses = computed(() =>
  cn(
    'absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6 transition-opacity',
    showControls.value ? 'opacity-100' : 'opacity-0',
  ),
);

const hasTracks = computed(
  () =>
    props.tracks?.some(
      (track) =>
        track.kind == null || track.kind === VideoTrackKind.Captions || track.kind === VideoTrackKind.Subtitles,
    ) ?? false,
);

/**
 * Everything but `class` — and, exactly as in the React original, it lands on
 * the inner `<video>`, not on the wrapper. `class` is re-applied through `cn`.
 */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div
    ref="container"
    role="region"
    :aria-label="locale.t('VideoPlayer.videoPlayer', undefined, 'Video player')"
    :tabindex="0"
    :class="classes"
    :style="containerStyle"
    @keydown="onKeydown"
    @mousemove="bumpControls"
    @mouseleave="onMouseLeave"
    @focusin="focused = true"
    @focusout="onFocusout"
  >
    <video
      ref="el"
      :src="UrlExtensions.safeResource(src)"
      :poster="UrlExtensions.safeResource(poster)"
      :autoplay="autoPlay"
      :loop="loop"
      :muted="isMuted"
      v-bind="rest"
      class="h-full w-full bg-black"
      @play="onNativePlay"
      @pause="onNativePause"
      @ended="onNativePause"
      @timeupdate="onNativeTimeUpdate"
      @loadedmetadata="onNativeLoadedMetadata"
      @durationchange="onNativeLoadedMetadata"
      @emptied="resetMediaState"
      @click="onVideoClick"
    >
      <track
        v-for="item in tracks"
        :key="item.src"
        :src="UrlExtensions.safeResource(item.src)"
        :srclang="item.srcLang"
        :label="item.label"
        :kind="item.kind ?? 'captions'"
        :default="item.default"
        @load="applyCaptionMode"
      />
    </video>

    <!-- Big center play button when paused -->
    <button
      v-if="!playing"
      type="button"
      :aria-label="locale.t('VideoPlayer.play', undefined, 'Play')"
      class="absolute inset-0 grid place-items-center bg-black/30 transition-opacity hover:bg-black/40"
      @click="togglePlay"
    >
      <span class="grid h-16 w-16 place-items-center rounded-full bg-white/90 text-foreground shadow-lg">
        <Icon :icon="Play" :size="28" />
      </span>
    </button>

    <!-- Controls bar -->
    <div :class="controlsClasses">
      <button
        type="button"
        :aria-label="
          locale.t(playing ? 'VideoPlayer.pause' : 'VideoPlayer.play', undefined, playing ? 'Pause' : 'Play')
        "
        class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
        @click="togglePlay"
      >
        <Icon :icon="playing ? Pause : Play" :size="14" />
      </button>
      <span class="text-xs tabular-nums"> {{ formatTime(currentTime) }} / {{ formatTime(duration) }} </span>
      <input
        type="range"
        role="slider"
        :aria-label="locale.t('VideoPlayer.seek', undefined, 'Seek')"
        :aria-valuetext="formatTime(currentTime)"
        :min="0"
        :max="duration || 0"
        step="any"
        :value="currentTime"
        class="flex-1 accent-primary"
        @input="onRangeInput"
      />
      <button
        type="button"
        :aria-label="
          locale.t(
            isMuted || volume === 0 ? 'VideoPlayer.unmute' : 'VideoPlayer.mute',
            undefined,
            isMuted || volume === 0 ? 'Unmute' : 'Mute',
          )
        "
        :class="IconButtonClass"
        @click="isMuted = !isMuted"
      >
        <Icon :icon="isMuted || volume === 0 ? VolumeX : Volume2" :size="14" />
      </button>
      <select
        v-model="speed"
        :aria-label="locale.t('VideoPlayer.playbackSpeed', undefined, 'Playback speed')"
        class="h-7 rounded-sm border border-white/20 bg-black/40 px-1 text-xs"
      >
        <option v-for="rate in PlaybackRates" :key="rate" :value="rate" class="text-foreground">{{ rate }}×</option>
      </select>
      <button
        v-if="hasTracks"
        type="button"
        :aria-label="
          locale.t(
            captionsOn ? 'VideoPlayer.hideCaptions' : 'VideoPlayer.showCaptions',
            undefined,
            captionsOn ? 'Hide captions' : 'Show captions',
          )
        "
        :aria-pressed="captionsOn"
        :class="IconButtonClass"
        @click="captionsOn = !captionsOn"
      >
        <Icon :icon="captionsOn ? Captions : CaptionsOff" :size="14" />
      </button>
      <button
        type="button"
        :aria-label="locale.t('VideoPlayer.pictureInPicture', undefined, 'Picture in picture')"
        :class="IconButtonClass"
        @click="togglePiP"
      >
        <Icon :icon="PictureInPicture2" :size="14" />
      </button>
      <button
        type="button"
        :aria-label="
          locale.t(
            fullscreen ? 'VideoPlayer.exitFullscreen' : 'VideoPlayer.enterFullscreen',
            undefined,
            fullscreen ? 'Exit fullscreen' : 'Enter fullscreen',
          )
        "
        :class="IconButtonClass"
        @click="toggleFullscreen"
      >
        <Icon :icon="fullscreen ? Minimize : Maximize" :size="14" />
      </button>
    </div>
  </div>
</template>
