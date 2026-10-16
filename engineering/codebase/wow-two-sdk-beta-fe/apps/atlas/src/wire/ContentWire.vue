<script setup lang="ts">
import { computed } from 'vue';
import type { ContentKind, Density, Device } from '../content/model';
import { lineWidth as w, range } from './lines';

/** Draws the main region's content, adapted to the device and density. */
const props = defineProps<{
  kind: ContentKind;
  device: Device;
  density: Density;
  /** Leaves the map's corner overlays out — islands or a sheet already hold the controls. */
  hasCornerControls?: boolean;
}>();

const isPhone = computed(() => props.device === 'phone');
const isTablet = computed(() => props.device === 'tablet');

/** Rows that fit at the density. */
const rowCount = computed(() => ({ compact: 10, comfortable: 8, spacious: 6 })[props.density]);

const gridColumns = computed(() => {
  if (isPhone.value) return 2;
  if (isTablet.value) return 3;
  return props.density === 'spacious' ? 3 : 4;
});
const gridCards = computed(() => gridColumns.value * (props.density === 'compact' ? 3 : 2));

const kanbanColumns = computed(() => {
  if (isPhone.value) return 1;
  if (isTablet.value) return 2;
  return props.density === 'spacious' ? 3 : 4;
});
</script>

<template>
  <!-- Table -->
  <div v-if="kind === 'table'" class="wpad wcol wfill">
    <div class="wrow">
      <span class="wl wl-strong" style="width: 22%" />
      <span class="wgrow" />
      <span v-if="!isPhone" class="wbtn" />
      <span class="wbtn wbtn-primary" />
    </div>
    <template v-if="isPhone">
      <div v-for="i in range(rowCount - 3)" :key="i" class="wcard">
        <div class="wrow">
          <span class="wl wl-strong" :style="{ width: w(i, 40, 30) }" />
          <span class="wgrow" />
          <span class="wchip" :class="i % 3 === 0 && 'wchip-on'" />
        </div>
        <span class="wl wl-soft" :style="{ width: w(i + 3, 50, 35) }" />
      </div>
    </template>
    <template v-else>
      <div class="wtable-row">
        <span class="wdot" />
        <span v-for="c in range(5)" :key="c" class="wl wl-soft" style="width: 55%" />
      </div>
      <div v-for="i in range(rowCount)" :key="i" class="wtable-row" :class="i === 2 && 'wsel'">
        <span class="wdot" :class="i === 2 && 'wdot-accent'" />
        <span class="wl" :style="{ width: w(i, 45, 45) }" />
        <span class="wl wl-soft" :style="{ width: w(i + 2, 40, 45) }" />
        <span class="wchip" :class="i % 4 === 1 && 'wchip-on'" />
        <span class="wl wl-soft" :style="{ width: w(i + 5, 35, 40) }" />
        <span class="wl" :style="{ width: w(i + 7, 30, 40) }" />
      </div>
      <span class="wgrow" />
      <div class="wrow">
        <span class="wl wl-soft" style="width: 16%" />
        <span class="wgrow" />
        <span v-for="p in range(4)" :key="p" class="wdot" :class="p === 0 && 'wdot-accent'" />
      </div>
    </template>
  </div>

  <!-- List -->
  <div v-else-if="kind === 'list'" class="wpad wcol wfill">
    <span class="wl wl-strong" style="width: 30%" />
    <div v-for="i in range(rowCount)" :key="i" class="wrow" style="padding: calc(var(--u) * 0.35 * var(--d)) 0">
      <span class="wdot wdot-round wdot-lg" />
      <div class="wcol wgrow" style="gap: calc(var(--u) * 0.4)">
        <span class="wl" :style="{ width: w(i, 35, 40) }" />
        <span class="wl wl-soft" :style="{ width: w(i + 4, 55, 35) }" />
      </div>
      <span class="wl wl-soft" style="width: 10%" />
    </div>
  </div>

  <!-- Gallery grid -->
  <div v-else-if="kind === 'grid'" class="wpad wcol wfill">
    <div class="wgrid" :style="{ '--cols': gridColumns }">
      <div v-for="i in range(gridCards)" :key="i" class="wcard" :class="i === 1 && 'wsel'">
        <span class="wimg" style="aspect-ratio: 4 / 3" />
        <span class="wl" :style="{ width: w(i, 45, 40) }" />
        <div class="wrow">
          <span class="wl wl-strong" style="width: 30%; height: calc(var(--u) * 0.55)" />
          <span class="wgrow" />
          <span class="wl wl-soft" style="width: 22%" />
        </div>
      </div>
    </div>
  </div>

  <!-- Kanban -->
  <div v-else-if="kind === 'kanban'" class="wpad wcol wfill">
    <div class="wkanban">
      <div v-for="c in range(kanbanColumns)" :key="c" class="wkanban-col">
        <div class="wrow">
          <span class="wl wl-strong" :style="{ width: w(c, 35, 25) }" />
          <span class="wgrow" />
          <span class="wl wl-soft" style="width: 12%" />
        </div>
        <div v-for="i in range(4 - (c % 3))" :key="i" class="wcard" :class="c === 1 && i === 0 && 'wsel'">
          <span v-if="(c + i) % 3 === 0" class="wimg" style="height: calc(var(--u) * 3.2)" />
          <span class="wl" :style="{ width: w(c * 3 + i, 50, 40) }" />
          <div class="wrow">
            <span class="wchip" :class="(c + i) % 2 === 0 && 'wchip-on'" />
            <span class="wgrow" />
            <span class="wdot wdot-round" />
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Dashboard / bento -->
  <div v-else-if="kind === 'dashboard'" class="wpad wcol wfill">
    <div class="wgrid" :style="{ '--cols': isPhone ? 2 : 4 }">
      <div v-for="i in range(4)" :key="i" class="wcard">
        <span class="wl wl-soft" :style="{ width: w(i, 35, 30) }" />
        <span class="wl wl-strong" style="width: 55%; height: calc(var(--u) * 1.4)" />
        <span class="wl" :class="i % 2 === 0 && 'wl-accent'" style="width: 30%" />
      </div>
    </div>
    <div class="wrow wfill" style="align-items: stretch">
      <div class="wcard wgrow" style="flex: 2">
        <span class="wl wl-strong" style="width: 26%" />
        <span class="wgrow" />
        <div class="wbars">
          <span v-for="b in range(isPhone ? 8 : 16)" :key="b" :style="{ height: w(b, 25, 70) }" />
        </div>
      </div>
      <div v-if="!isPhone" class="wcard wgrow">
        <span class="wl wl-strong" style="width: 40%" />
        <div
          style="
            margin: auto;
            width: calc(var(--u) * 7);
            aspect-ratio: 1;
            border-radius: 50%;
            background: conic-gradient(var(--w-accent) 0 38%, var(--w-ink) 38% 70%, var(--w-ink-soft) 70%);
            mask: radial-gradient(circle, transparent 42%, #000 43%);
          "
        />
      </div>
    </div>
    <div class="wcard">
      <div v-for="i in range(3)" :key="i" class="wrow">
        <span class="wl" :style="{ width: w(i, 25, 20) }" />
        <span class="wgrow" />
        <span class="wl wl-soft" :style="{ width: w(i + 2, 10, 15) }" />
        <span class="wchip" :class="i === 0 && 'wchip-on'" />
      </div>
    </div>
  </div>

  <!-- Map canvas -->
  <template v-else-if="kind === 'map'">
    <div class="wmap" />
    <div class="wmap-route" />
    <span
      v-for="p in range(7)"
      :key="p"
      class="wdot wdot-round"
      :class="p === 3 && 'wdot-accent'"
      :style="{ position: 'absolute', left: w(p, 12, 70), top: w(p + 3, 18, 60) }"
    />
    <template v-if="hasCornerControls">
      <div class="wcorner" style="top: calc(var(--u) * 1); right: calc(var(--u) * 1)">
        <span class="wdot" />
        <span class="wdot" />
        <span class="wdot wdot-round" />
      </div>
      <div class="wcorner" style="bottom: calc(var(--u) * 1); left: calc(var(--u) * 1); width: calc(var(--u) * 12)">
        <span class="wl wl-soft" style="width: 60%" />
        <div class="wrow" style="gap: 1px">
          <span
            v-for="s in range(6)"
            :key="s"
            class="wl"
            :class="s > 3 && 'wl-accent'"
            style="flex: 1; border-radius: 0"
          />
        </div>
        <span class="wl wl-soft" style="width: 80%" />
      </div>
    </template>
  </template>

  <!-- 3D scene -->
  <template v-else-if="kind === 'scene'">
    <div class="wscene" />
    <div class="wscene-floor" />
    <div class="wscene-object" />
  </template>

  <!-- Article -->
  <div v-else-if="kind === 'article'" class="wpad wcol wfill" style="align-items: center">
    <div class="wcol" style="width: min(100%, calc(var(--u) * 42)); gap: calc(var(--u) * 0.8 * var(--d))">
      <span class="wl wl-soft" style="width: 26%" />
      <span class="wl wl-strong" style="width: 70%; height: calc(var(--u) * 1.3)" />
      <span v-for="i in range(4)" :key="i" class="wl" :style="{ width: w(i, 80, 20) }" />
      <span class="wimg" style="height: calc(var(--u) * 8)" />
      <span class="wl wl-strong" style="width: 40%" />
      <span v-for="i in range(5)" :key="`p${i}`" class="wl" :style="{ width: w(i + 3, 78, 22) }" />
    </div>
  </div>

  <!-- Form -->
  <div v-else-if="kind === 'form'" class="wpad wcol wfill">
    <span class="wl wl-strong" style="width: 28%; height: calc(var(--u) * 1.1)" />
    <span class="wl wl-soft" style="width: 46%" />
    <div class="wgrid" :style="{ '--cols': isPhone ? 1 : 2, marginTop: 'calc(var(--u) * 0.8)' }">
      <div v-for="i in range(isPhone ? 4 : 6)" :key="i" class="wcol" style="gap: calc(var(--u) * 0.45)">
        <span class="wl wl-soft" :style="{ width: w(i, 22, 20) }" />
        <div class="winput"><span class="wl wl-soft" :style="{ width: w(i + 2, 30, 30) }" /></div>
      </div>
    </div>
    <div class="wcard" style="margin-top: calc(var(--u) * 0.6)">
      <div v-for="i in range(2)" :key="i" class="wrow">
        <div class="wcol wgrow" style="gap: calc(var(--u) * 0.4)">
          <span class="wl" :style="{ width: w(i, 30, 20) }" />
          <span class="wl wl-soft" :style="{ width: w(i + 3, 50, 20) }" />
        </div>
        <span class="wchip" :class="i === 0 && 'wchip-on'" style="width: calc(var(--u) * 2.4)" />
      </div>
    </div>
    <span class="wgrow" />
    <div class="wrow">
      <span class="wgrow" />
      <span class="wbtn" />
      <span class="wbtn wbtn-primary" />
    </div>
  </div>

  <!-- Calendar -->
  <div v-else-if="kind === 'calendar'" class="wpad wcol wfill">
    <div class="wrow">
      <span class="wl wl-strong" style="width: 20%" />
      <span class="wdot" />
      <span class="wdot" />
      <span class="wgrow" />
      <span class="wchip" />
      <span class="wchip wchip-on" />
      <span class="wchip" />
    </div>
    <div class="wcal">
      <div v-for="d in range(35)" :key="d">
        <span class="wl wl-soft" style="width: 22%" />
        <span v-if="d % 5 === 1" class="wl wl-accent" style="width: 90%" />
        <span v-if="d % 7 === 3" class="wl" style="width: 70%" />
      </div>
    </div>
  </div>

  <!-- Chat -->
  <div v-else-if="kind === 'chat'" class="wpad wcol wfill">
    <div class="wrow">
      <span class="wdot wdot-round wdot-lg" />
      <span class="wl wl-strong" style="width: 24%" />
      <span class="wgrow" />
      <span class="wdot" />
    </div>
    <div class="wcol wfill" style="justify-content: flex-end">
      <div v-for="i in range(5)" :key="i" class="wbubble" :class="i % 2 === 1 && 'wbubble-own'">
        <span class="wl" :style="{ width: `calc(var(--u) * ${8 + ((i * 5) % 9)})` }" />
        <span v-if="i % 3 === 0" class="wl wl-soft" style="width: calc(var(--u) * 6)" />
      </div>
    </div>
    <div class="winput">
      <span class="wl wl-soft wgrow" />
      <span class="wdot wdot-round wdot-accent" />
    </div>
  </div>

  <!-- Feed -->
  <div v-else-if="kind === 'feed'" class="wpad wcol wfill" style="align-items: center">
    <div class="wcol" style="width: min(100%, calc(var(--u) * 36))">
      <div v-for="i in range(3)" :key="i" class="wcard">
        <div class="wrow">
          <span class="wdot wdot-round wdot-lg" />
          <div class="wcol wgrow" style="gap: calc(var(--u) * 0.4)">
            <span class="wl wl-strong" :style="{ width: w(i, 25, 20) }" />
            <span class="wl wl-soft" style="width: 18%" />
          </div>
        </div>
        <span v-for="l in range(2)" :key="l" class="wl" :style="{ width: w(i + l, 70, 28) }" />
        <span v-if="i === 0" class="wimg" style="height: calc(var(--u) * 7)" />
      </div>
    </div>
  </div>

  <!-- Record detail -->
  <div v-else-if="kind === 'detail'" class="wpad wcol wfill">
    <div class="wrow">
      <span class="wdot wdot-lg" />
      <div class="wcol wgrow" style="gap: calc(var(--u) * 0.4)">
        <span class="wl wl-strong" style="width: 34%; height: calc(var(--u) * 1)" />
        <div class="wrow">
          <span class="wchip wchip-on" />
          <span class="wchip" />
        </div>
      </div>
      <span v-if="!isPhone" class="wbtn" />
      <span class="wbtn wbtn-primary" />
    </div>
    <div
      class="wrow"
      style="gap: calc(var(--u) * 1.4); border-bottom: 1px solid var(--w-line); padding-bottom: calc(var(--u) * 0.5)"
    >
      <span
        v-for="t in range(isPhone ? 3 : 5)"
        :key="t"
        class="wl"
        :class="t === 0 && 'wl-accent'"
        style="width: calc(var(--u) * 3.4)"
      />
    </div>
    <div class="wgrid" :style="{ '--cols': isPhone ? 1 : 2 }">
      <div v-for="i in range(isPhone ? 4 : 6)" :key="i" class="wrow">
        <span class="wl wl-soft" :style="{ width: w(i, 18, 14) }" />
        <span class="wgrow" />
        <span class="wl" :style="{ width: w(i + 2, 30, 30) }" />
      </div>
    </div>
    <div class="wrow wfill" style="align-items: stretch">
      <div class="wcard wgrow">
        <span class="wl wl-strong" style="width: 30%" />
        <div class="wbars">
          <span v-for="b in range(12)" :key="b" :style="{ height: w(b, 25, 70) }" />
        </div>
      </div>
      <div v-if="!isPhone" class="wcard wgrow">
        <span class="wl wl-strong" style="width: 36%" />
        <span v-for="l in range(4)" :key="l" class="wl" :style="{ width: w(l, 55, 40) }" />
      </div>
    </div>
  </div>

  <!-- Landing hero -->
  <div v-else class="wpad wcol wfill" style="gap: calc(var(--u) * 1.6 * var(--d))">
    <div class="wrow" style="align-items: center; gap: calc(var(--u) * 2)">
      <div class="wcol wgrow" style="gap: calc(var(--u) * 0.9)">
        <span class="wl wl-soft" style="width: 22%" />
        <span class="wl wl-strong" style="width: 90%; height: calc(var(--u) * 1.8)" />
        <span class="wl wl-strong" style="width: 70%; height: calc(var(--u) * 1.8)" />
        <span v-for="i in range(2)" :key="i" class="wl" :style="{ width: w(i, 60, 25) }" />
        <div class="wrow" style="margin-top: calc(var(--u) * 0.6)">
          <span class="wbtn wbtn-primary" />
          <span class="wbtn" />
        </div>
      </div>
      <span v-if="!isPhone" class="wimg wgrow" style="aspect-ratio: 4 / 3" />
    </div>
    <div class="wgrid" :style="{ '--cols': isPhone ? 1 : 3 }">
      <div v-for="i in range(3)" :key="i" class="wcard">
        <span class="wdot wdot-accent" />
        <span class="wl wl-strong" :style="{ width: w(i, 40, 20) }" />
        <span class="wl" :style="{ width: w(i + 2, 70, 25) }" />
      </div>
    </div>
  </div>
</template>
