<script lang="ts">
import type { CSSProperties } from 'vue';
import type { SizePreset, SizeUnion } from '../../../foundation/styles';
/* The four value-sets are imported as values (not `import type`) so the one binding serves
   as both the prop type below and the runtime enum used in the auto-color guard. */
import { AvatarBackground, AvatarRing, AvatarShape, AvatarTone, type AvatarVariants } from './Avatar.variants';

/* Avatar supports the full canonical preset vocabulary. */
type AvatarSizePreset = SizePreset;

/**
 * The size union — preset (`xs|sm|md|lg|xl|2xl`) · raw number/string (square inline dims) ·
 * object (explicit dims). Named here so `AvatarGroup` can reuse it.
 */
export type AvatarSize = SizeUnion<AvatarSizePreset>;

const AvatarSizePresets: ReadonlySet<string> = new Set<AvatarSizePreset>(['xs', 'sm', 'md', 'lg', 'xl', '2xl']);

/* autoColor palette — 17 hues, dark-mode aware. No opacity keeps contrast deterministic. */
const AutoColorPalette = [
  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
  'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
  'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-100',
  'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100',
  'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100',
  'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-100',
  'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-100',
  'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100',
  'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100',
  'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
  'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-100',
  'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-100',
  'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-100',
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pickAutoColor(name: string): string {
  return AutoColorPalette[hashName(name) % AutoColorPalette.length]!;
}

/** The first character of a word by code point — `[0]` would split an astral character into a lone surrogate. */
function firstCharacter(word: string | undefined): string {
  return word ? (Array.from(word)[0] ?? '') : '';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const first = firstCharacter(parts[0]);
  const last = parts.length > 1 ? firstCharacter(parts[parts.length - 1]) : '';
  return (first + last).toUpperCase();
}

export interface AvatarProps {
  /** The silhouette. */
  readonly shape?: AvatarShape;

  /** The tone palette (`none` cedes color to autoColor). */
  readonly tone?: AvatarTone;

  /** The background fill style. */
  readonly bgStyle?: AvatarBackground;

  /** The focus/emphasis ring tone. */
  readonly ring?: AvatarRing;

  /** The skeleton state — pulses the tile and hides its content. Defaults to the nearest `DataRegion` first load. */
  readonly isLoading?: boolean;

  /** The image source; falls back to `name` initials or `fallback` on error. */
  readonly src?: string;

  /** The person/entity name — used to derive initials when no image. */
  readonly name?: string;

  /** The custom fallback (overrides initials). Rich content goes through the `fallback` slot. */
  readonly fallback?: string | number;

  /** The alt text for the underlying `<img>` (defaults to `name`). */
  readonly alt?: string;

  /**
   * The auto-color flag — derives a deterministic tint from the `name` hash.
   * A non-neutral `tone` or a non-solid `bgStyle` overrides it.
   */
  readonly canAutoColor?: boolean;

  /** The size — preset → variant class · number/string → square inline · object → explicit dims. */
  readonly size?: AvatarSize;
}

/* Compile-time lock: the hand-written `isLoading` prop ≡ the tv variant key (drift = type error).
   `shape` / `tone` / `bgStyle` / `ring` need no lock here — they use the named enums the
   variants file already locks against `avatarVariants`. */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertAvatarLoading: AssertExact<
  NonNullable<AvatarProps['isLoading']>,
  NonNullable<AvatarVariants['isLoading']>
> = true;
void _assertAvatarLoading;
</script>

<script setup lang="ts">
import { UrlExtensions } from '../../../foundation/dom';
import { computed, ref, useAttrs, useTemplateRef, watch } from 'vue';
import { cn, CssExtensions } from '../../../foundation/styles';
import { useSkeletonState } from '../../feedback/skeletonState/SkeletonStateContext';
import { avatarVariants } from './Avatar.variants';

/**
 * Renders a user image avatar that falls back to initials, with tone, ring, and loading skeleton.
 *
 * Auto-color is a deterministic hash of the name. Compose with `BadgeOverlay` for status dots / counts / icons.
 */
defineOptions({ name: 'Avatar', inheritAttrs: false });

defineSlots<{
  /** The custom fallback content — wins over the `fallback` prop and the derived initials. */
  fallback?(): unknown;
}>();

/**
 * `isLoading` / `canAutoColor` default to `undefined`, not `false`: Vue casts an absent
 * `Boolean` prop to `false`, and `avatarVariants` expects the tri-state React handed it.
 */
const props = withDefaults(defineProps<AvatarProps>(), {
  name: '',
  isLoading: undefined,
  canAutoColor: undefined,
});

const attrs = useAttrs();
const el = useTemplateRef<HTMLSpanElement>('el');

const errored = ref(false);

/* A new src deserves a fresh load attempt — reset the error latch. */
watch(
  () => props.src,
  () => {
    errored.value = false;
  },
);

/* An absent `isLoading` follows the nearest `DataRegion` first load; an explicit one wins either way. */
const skeleton = useSkeletonState(() => props.isLoading);
const loading = computed(() => skeleton.isSkeleton.value);

const showImage = computed(() => !!props.src && !errored.value && !loading.value);

/* Parse union-typed `size` — preset routes to variant class, raw/object routes to inline dims. */
const parsedSize = computed(() => CssExtensions.parseSizeUnion<AvatarSizePreset>(props.size, AvatarSizePresets));

const boxStyle = computed<CSSProperties | undefined>(() =>
  parsedSize.value.box ? CssExtensions.resolveBoxSize(parsedSize.value.box) : undefined,
);

/* Auto-color fires only when: name set, no explicit non-neutral tone, bgStyle not gradient. Explicit dials win. */
const autoColorClass = computed(() =>
  props.canAutoColor &&
  props.name &&
  props.bgStyle !== AvatarBackground.Gradient &&
  (props.tone === undefined || props.tone === AvatarTone.Neutral)
    ? pickAutoColor(props.name)
    : undefined,
);

/* When auto-color is active, suppress the tone variant so its theme-token classes don't compete in the cascade. */
const effectiveTone = computed(() => (autoColorClass.value ? AvatarTone.None : props.tone));

const initials = computed(() => getInitials(props.name));

/*
 * Without an image the initials are not a name — "AK" reads as two letters. The fallback therefore speaks as one
 * image named like the `<img>` would be: `alt`, else `name`. An empty `alt` marks the avatar decorative.
 */
const fallbackName = computed(() => (props.alt === '' ? undefined : (props.alt ?? (props.name || undefined))));
const isDecorative = computed(() => props.alt === '');

const classes = computed(() =>
  cn(
    avatarVariants({
      size: parsedSize.value.preset,
      shape: props.shape,
      tone: effectiveTone.value,
      bgStyle: props.bgStyle,
      ring: props.ring,
      isLoading: loading.value,
    }),
    autoColorClass.value,
    attrs.class as string | undefined,
  ),
);

/** The consumer's inline style lands last, so it wins over the parsed box dims. */
const styles = computed(() => [boxStyle.value, attrs.style as CSSProperties | undefined]);

/** Everything but `class` / `style`, both re-applied above. */
const rest = computed(() => {
  const { class: _class, style: _style, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <!-- Own attrs first, `v-bind="rest"` after — a consumer-supplied `data-loading` / `aria-busy`
       still wins, as it did through React's trailing `{...props}` spread. -->
  <span
    ref="el"
    :data-loading="loading ? 'true' : undefined"
    :aria-busy="loading ? true : undefined"
    :role="!showImage && fallbackName ? 'img' : undefined"
    :aria-label="!showImage ? fallbackName : undefined"
    :aria-hidden="isDecorative ? 'true' : undefined"
    v-bind="rest"
    :class="classes"
    :style="styles"
  >
    <img
      v-if="showImage"
      :src="UrlExtensions.safeResource(props.src)"
      :alt="props.alt ?? props.name"
      class="h-full w-full object-cover"
      @error="errored = true"
    />
    <span v-else :aria-hidden="fallbackName ? 'true' : undefined" class="contents">
      <slot name="fallback">{{ props.fallback ?? initials }}</slot>
    </span>
  </span>
</template>
