<script lang="ts">
export interface ConfettiOverlayOrigin {
  readonly x?: number;
  readonly y?: number;
}

export interface ConfettiOverlayFireOptions {
  particleCount?: number;
  colors?: ReadonlyArray<string>;
  spread?: number;
  velocity?: number;
  origin?: ConfettiOverlayOrigin;
}

export interface ConfettiOverlayProps {
  readonly particleCount?: number;
  readonly colors?: ReadonlyArray<string>;
  readonly gravity?: number;
  readonly spread?: number;
  readonly velocity?: number;
  readonly lifetime?: number;
  readonly origin?: ConfettiOverlayOrigin;
  /** The auto-fire-on-mount mode. Useful for one-shot confetti on a route landing. */
  readonly canAutoFire?: boolean;
}

/** The imperative handle — React's `useImperativeHandle`, here `defineExpose`. */
export interface ConfettiOverlayHandle {
  fire: (opts?: ConfettiOverlayFireOptions) => void;
}

/** Defines a confetti particle's silhouette. */
const ConfettiOverlayShape = {
  /** Refers to a rectangular particle. */
  Rect: 'rect',
  /** Refers to a circular particle. */
  Circle: 'circle',
} as const;

type ConfettiOverlayShape = (typeof ConfettiOverlayShape)[keyof typeof ConfettiOverlayShape];

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  color: string;
  shape: ConfettiOverlayShape;
  bornAt: number;
}

const DefaultColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ec4899'];

let nextParticleId = 0;
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef, watch } from 'vue';
import { Portal } from '../../../foundation/primitives';
import { useReducedMotion } from '../../../foundation/device';

/**
 * Renders a burst of SVG confetti particles, animated by rAF from an imperative `fire()`.
 *
 * Fires on mount with `canAutoFire`. No-op under `prefers-reduced-motion`.
 */
defineOptions({ name: 'ConfettiOverlay', inheritAttrs: false });

const props = withDefaults(defineProps<ConfettiOverlayProps>(), {
  particleCount: 60,
  colors: () => DefaultColors,
  gravity: 1200,
  spread: 60,
  velocity: 500,
  lifetime: 3000,
  origin: undefined,
  canAutoFire: undefined,
});

const reducedMotion = useReducedMotion();

/* `shallowRef`: the array is replaced wholesale every frame, and deep-proxying
   60 particle objects per tick would cost far more than the render. */
const particles = shallowRef<ReadonlyArray<Particle>>([]);

let raf: number | null = null;
let lastTime = 0;

function stop(): void {
  if (raf != null) cancelAnimationFrame(raf);
  raf = null;
  lastTime = 0;
}

/*
 * React restarted the loop from an effect keyed on `particles.length`. Here the
 * loop owns its own lifetime: it starts when a burst spawns and stops when the
 * last particle has fallen out of view or aged past `lifetime`.
 */
function tick(now: number): void {
  const last = lastTime || now;
  const dt = (now - last) / 1000;
  lastTime = now;
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;

  particles.value = particles.value
    .map((p) => ({
      ...p,
      x: p.x + p.vx * dt,
      y: p.y + p.vy * dt,
      vy: p.vy + props.gravity * dt,
      rotation: p.rotation + p.rotationSpeed * dt,
    }))
    .filter((p) => p.y < viewportH + 80 && now - p.bornAt < props.lifetime);

  if (particles.value.length === 0) {
    stop();
    return;
  }
  raf = requestAnimationFrame(tick);
}

function start(): void {
  if (raf != null) return;
  lastTime = 0;
  raf = requestAnimationFrame(tick);
}

function fire(opts?: ConfettiOverlayFireOptions): void {
  if (reducedMotion.value) return;

  const count = opts?.particleCount ?? props.particleCount;
  const palette = opts?.colors ?? props.colors;
  const sp = opts?.spread ?? props.spread;
  const vel = opts?.velocity ?? props.velocity;
  const o = opts?.origin ?? props.origin;
  const x = o?.x ?? (typeof window !== 'undefined' ? window.innerWidth / 2 : 200);
  const y = o?.y ?? (typeof window !== 'undefined' ? window.innerHeight / 2 : 200);

  const burst: Array<Particle> = [];
  const now = performance.now();
  for (let i = 0; i < count; i++) {
    // Angle: upward (-90deg) ± spread/2.
    const angle = -Math.PI / 2 + ((Math.random() - 0.5) * (sp * Math.PI)) / 180;
    const speed = vel * (0.7 + Math.random() * 0.6);
    burst.push({
      id: ++nextParticleId,
      x,
      y,
      vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 60,
      vy: Math.sin(angle) * speed,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 720,
      size: 6 + Math.random() * 6,
      color: palette[Math.floor(Math.random() * palette.length)] ?? '#000',
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
      bornAt: now,
    });
  }

  particles.value = [...particles.value, ...burst];
  start();
}

/*
 * React re-ran the auto-fire effect whenever the memoized `spawn` changed — i.e.
 * on any config-prop change. Here it fires on mount and whenever the flag itself
 * flips on, which is what the prop name promises.
 */
onMounted(() => {
  if (props.canAutoFire) fire();
});

watch(
  () => props.canAutoFire,
  (value) => {
    if (value) fire();
  },
);

onBeforeUnmount(stop);

defineExpose<ConfettiOverlayHandle>({ fire });
</script>

<template>
  <Portal v-if="particles.length > 0">
    <svg
      aria-hidden="true"
      class="pointer-events-none fixed inset-0 z-toast"
      :style="{ width: '100vw', height: '100vh' }"
    >
      <template v-for="p in particles" :key="p.id">
        <rect
          v-if="p.shape === 'rect'"
          :x="p.x - p.size / 2"
          :y="p.y - p.size / 2"
          :width="p.size"
          :height="p.size * 0.5"
          :fill="p.color"
          :transform="`rotate(${p.rotation} ${p.x} ${p.y})`"
        />
        <circle v-else :cx="p.x" :cy="p.y" :r="p.size / 2" :fill="p.color" />
      </template>
    </svg>
  </Portal>
</template>
