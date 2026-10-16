<script setup lang="ts">
import type { PanelRole } from '../content/model';
import { lineWidth as w, range } from './lines';

/** Draws what a side panel holds, by its role. */
defineProps<{
  role: PanelRole;
  /** A shorter rendering for sheets and small islands. */
  isShort?: boolean;
}>();
</script>

<template>
  <template v-if="role === 'navigator' || role === 'sections'">
    <div v-if="role === 'navigator'" class="winput">
      <span class="wdot wdot-round" /><span class="wl wl-soft wgrow" />
    </div>
    <span class="wl wl-soft" style="width: 34%" />
    <div v-for="i in range(isShort ? 3 : 7)" :key="i" class="witem" :class="i === 1 && 'wsel'">
      <span v-if="role === 'navigator'" class="wdot" :class="i === 1 && 'wdot-accent'" />
      <span class="wl" :class="i === 1 && 'wl-accent'" :style="{ width: w(i, 35, 40) }" />
    </div>
    <span v-if="!isShort" class="wl wl-soft" style="width: 28%" />
    <div v-for="i in range(isShort ? 0 : 3)" :key="`b${i}`" class="witem">
      <span v-if="role === 'navigator'" class="wdot" />
      <span class="wl" :style="{ width: w(i + 5, 30, 40) }" />
    </div>
  </template>

  <template v-else-if="role === 'library'">
    <div class="winput"><span class="wdot wdot-round" /><span class="wl wl-soft wgrow" /></div>
    <div v-for="i in range(isShort ? 3 : 6)" :key="i" class="wrow" :class="i === 2 && 'wsel'">
      <span class="wimg" style="width: calc(var(--u) * 2.6); height: calc(var(--u) * 2.6)" />
      <div class="wcol wgrow" style="gap: calc(var(--u) * 0.4)">
        <span class="wl" :style="{ width: w(i, 45, 40) }" />
        <span class="wl wl-soft" :style="{ width: w(i + 3, 25, 30) }" />
      </div>
    </div>
  </template>

  <template v-else-if="role === 'list'">
    <div class="wrow">
      <span class="wl wl-strong" style="width: 36%" />
      <span class="wgrow" />
      <span class="wdot" />
    </div>
    <div v-for="i in range(isShort ? 3 : 7)" :key="i" class="wrow witem" :class="i === 1 && 'wsel'">
      <span class="wdot wdot-round" />
      <div class="wcol wgrow" style="gap: calc(var(--u) * 0.4)">
        <span class="wl" :style="{ width: w(i, 45, 40) }" />
        <span class="wl wl-soft" :style="{ width: w(i + 2, 55, 35) }" />
      </div>
      <span class="wl wl-soft" style="width: 12%" />
    </div>
  </template>

  <template v-else-if="role === 'inspector' || role === 'detail'">
    <div class="wrow">
      <span class="wl wl-strong" style="width: 48%" />
      <span class="wgrow" />
      <span class="wdot" />
      <span class="wdot" />
    </div>
    <div v-if="role === 'detail'" class="wrow">
      <span class="wchip wchip-on" />
      <span class="wchip" />
    </div>
    <span v-if="role === 'detail' && !isShort" class="wimg" style="height: calc(var(--u) * 6)" />
    <div v-for="section in range(isShort ? 1 : 3)" :key="section" class="wcol">
      <span class="wl wl-soft" style="width: 30%" />
      <div v-for="i in range(3)" :key="i" class="wrow">
        <span class="wl" :style="{ width: w(i + section, 22, 18) }" />
        <span class="wgrow" />
        <span class="wl wl-strong" :style="{ width: w(i + section * 2, 14, 16), height: 'calc(var(--u) * 0.5)' }" />
      </div>
      <div v-if="section === 1" class="wrow">
        <span class="wl wgrow" style="height: calc(var(--u) * 0.3)" />
        <span class="wdot wdot-round wdot-accent" />
        <span class="wl wl-soft wgrow" style="height: calc(var(--u) * 0.3)" />
      </div>
    </div>
    <span class="wgrow" />
    <span class="wbtn wbtn-primary" style="width: 100%" />
  </template>

  <template v-else-if="role === 'toc'">
    <span class="wl wl-soft" style="width: 44%" />
    <span
      v-for="i in range(isShort ? 4 : 8)"
      :key="i"
      class="wl"
      :class="i === 2 && 'wl-accent'"
      :style="{ width: w(i, 35, 40), marginLeft: i % 3 === 2 ? 'calc(var(--u) * 1)' : undefined }"
    />
  </template>

  <template v-else-if="role === 'filters'">
    <span class="wl wl-strong" style="width: 40%" />
    <div v-for="group in range(isShort ? 1 : 3)" :key="group" class="wcol">
      <span class="wl wl-soft" style="width: 32%" />
      <div v-for="i in range(3)" :key="i" class="wrow">
        <span class="wdot" :class="(i + group) % 3 === 0 && 'wdot-accent'" />
        <span class="wl" :style="{ width: w(i + group, 30, 35) }" />
      </div>
    </div>
  </template>

  <template v-else>
    <div class="wrow">
      <span class="wdot wdot-round wdot-lg" />
      <div class="wcol wgrow" style="gap: calc(var(--u) * 0.4)">
        <span class="wl wl-strong" style="width: 60%" />
        <span class="wl wl-soft" style="width: 40%" />
      </div>
    </div>
    <div v-for="i in range(isShort ? 2 : 5)" :key="i" class="wrow">
      <span class="wl wl-soft" :style="{ width: w(i, 20, 15) }" />
      <span class="wgrow" />
      <span class="wl" :style="{ width: w(i + 4, 25, 25) }" />
    </div>
  </template>
</template>
