<script setup lang="ts">
import { computed } from 'vue';
import type { Device, LayoutSpec } from '../content/model';
import ContentWire from './ContentWire.vue';
import PanelWire from './PanelWire.vue';
import { lineWidth as w, range } from './lines';
import './wire.css';

/**
 * Draws one `LayoutSpec` as a grey wireframe at a device size. Phones and tablets adapt the spec the way the
 * guidance says they should: sidebars become rails or menus, rails become bottom tabs, side panels become sheets.
 */
const props = withDefaults(
  defineProps<{
    spec: LayoutSpec;
    device?: Device;
    /** The accessible description of the drawing. */
    label?: string;
  }>(),
  { device: 'desktop', label: undefined },
);

const isPhone = computed(() => props.device === 'phone');
const isTablet = computed(() => props.device === 'tablet');
const isCanvas = computed(() => props.spec.content === 'map' || props.spec.content === 'scene');

/** The navigation actually drawn at this device size. */
const nav = computed(() => {
  const requested = props.spec.nav;
  if (isPhone.value) {
    if (requested === 'rail' || requested === 'bottom') return 'bottom';
    if (requested === 'side' || requested === 'top') return 'compact';
    return requested;
  }
  if (isTablet.value && requested === 'side') return 'rail';
  return requested;
});

const hasTopBar = computed(() => ['top', 'compact', 'toolbar'].includes(nav.value));
const hasBottomTabs = computed(() => nav.value === 'bottom');

/* Phones keep one panel at most, as a sheet; tablets drop the leading panel when a trailing one exists. */
const leading = computed(() => {
  if (isPhone.value) return null;
  if (isTablet.value && props.spec.trailing && props.spec.panelMode === 'docked') return null;
  return props.spec.leading;
});
const trailing = computed(() => (isPhone.value ? null : props.spec.trailing));
const sheetRole = computed(() => (isPhone.value ? (props.spec.trailing ?? null) : null));

const mode = computed(() => props.spec.panelMode);
const dockedLeading = computed(() => (leading.value && mode.value !== 'floating' ? leading.value : null));
const dockedTrailing = computed(() => (trailing.value && mode.value === 'docked' ? trailing.value : null));
const floatingLeading = computed(() => (leading.value && mode.value === 'floating' ? leading.value : null));
const floatingTrailing = computed(() => (trailing.value && mode.value === 'floating' ? trailing.value : null));
const overlayTrailing = computed(() => (trailing.value && mode.value === 'overlay' ? trailing.value : null));

/** Bento dashboards and canvases let the canvas colour show between their tiles. */
const isTransparentMain = computed(
  () => isCanvas.value || (props.spec.content === 'dashboard' && props.spec.surface !== 'flat'),
);

const navItems = computed(() => (isTablet.value ? 3 : props.spec.density === 'spacious' ? 4 : 5));
</script>

<template>
  <div
    class="wf"
    :class="[`wf-${device}`, `wf-${spec.surface}`, `wf-${spec.density}`]"
    role="img"
    :aria-label="label ?? 'Layout wireframe'"
  >
    <div class="wf-stage">
      <div v-if="hasTopBar" class="wtop">
        <template v-if="nav === 'compact'">
          <span class="wdot" />
          <span class="wl wl-strong" style="width: 34%" />
          <span class="wgrow" />
          <span class="wdot wdot-round" />
        </template>
        <template v-else-if="nav === 'toolbar'">
          <span class="wdot wdot-accent" />
          <span class="wl wl-strong" style="width: calc(var(--u) * 5)" />
          <span v-for="i in range(isPhone ? 2 : 4)" :key="i" class="wdot" />
          <template v-if="spec.local === 'tabs' && !isPhone">
            <span
              v-for="t in range(3)"
              :key="`t${t}`"
              class="wcard"
              :class="t === 2 && 'wsel'"
              style="width: calc(var(--u) * 7); padding: calc(var(--u) * 0.45) calc(var(--u) * 0.6)"
            >
              <span class="wl" :style="{ width: w(t, 40, 30) }" />
            </span>
          </template>
          <span class="wgrow" />
          <span class="wdot" />
          <span class="wdot wdot-round" />
        </template>
        <template v-else>
          <span class="wdot wdot-accent" />
          <span class="wl wl-strong" style="width: calc(var(--u) * 5)" />
          <span
            v-for="i in range(navItems)"
            :key="i"
            class="wl"
            :class="i === 0 && 'wl-accent'"
            :style="{ width: `calc(var(--u) * ${3 + (i % 3)})` }"
          />
          <span class="wgrow" />
          <span class="winput" style="width: calc(var(--u) * 11)"><span class="wl wl-soft wgrow" /></span>
          <span class="wdot" />
          <span class="wdot wdot-round" />
        </template>
      </div>

      <div
        v-if="spec.local !== 'none' && !(nav === 'toolbar' && spec.local === 'tabs')"
        class="wlocal"
        :style="
          spec.surface !== 'flat'
            ? { margin: 'var(--g) var(--g) 0', padding: '0', background: 'transparent', borderBottom: '0' }
            : undefined
        "
      >
        <template v-if="spec.local === 'tabs'">
          <span
            v-for="t in range(isPhone ? 3 : 5)"
            :key="t"
            class="wl"
            :class="t === 0 && 'wl-accent'"
            style="width: calc(var(--u) * 3.6)"
          />
        </template>
        <template v-else-if="spec.local === 'filters'">
          <span class="winput" style="width: calc(var(--u) * 10)"><span class="wl wl-soft wgrow" /></span>
          <span v-for="c in range(isPhone ? 1 : 3)" :key="c" class="wchip" :class="c === 0 && 'wchip-on'" />
          <span class="wgrow" />
          <span class="wdot wdot-accent" />
          <span class="wdot" />
          <span class="wdot" />
        </template>
        <template v-else-if="spec.local === 'breadcrumbs'">
          <template v-for="b in range(3)" :key="b">
            <span class="wl" :class="b === 2 && 'wl-strong'" style="width: calc(var(--u) * 4)" />
            <span v-if="b < 2" class="wl wl-soft" style="width: calc(var(--u) * 0.6)" />
          </template>
        </template>
        <template v-else>
          <template v-for="s in range(isPhone ? 3 : 4)" :key="s">
            <span class="wdot wdot-round" :class="s <= 1 && 'wdot-accent'" />
            <span v-if="!isPhone" class="wl" :class="s === 1 && 'wl-strong'" style="width: calc(var(--u) * 4)" />
            <span v-if="s < (isPhone ? 2 : 3)" class="wl wl-soft wgrow" style="height: calc(var(--u) * 0.2)" />
          </template>
        </template>
      </div>

      <div class="wbody">
        <div v-if="nav === 'side'" class="wregion wside">
          <span class="wl wl-soft" style="width: 36%; margin-bottom: calc(var(--u) * 0.3)" />
          <div v-for="i in range(5)" :key="i" class="witem" :class="i === 0 && 'wsel'">
            <span class="wdot" :class="i === 0 && 'wdot-accent'" />
            <span class="wl" :class="i === 0 && 'wl-accent'" :style="{ width: w(i, 35, 35) }" />
          </div>
          <span class="wl wl-soft" style="width: 30%; margin: calc(var(--u) * 0.6) 0 calc(var(--u) * 0.3)" />
          <div v-for="i in range(3)" :key="`s${i}`" class="witem">
            <span class="wdot" />
            <span class="wl" :style="{ width: w(i + 5, 30, 40) }" />
          </div>
        </div>
        <div v-else-if="nav === 'rail'" class="wregion wrail">
          <span class="wdot wdot-accent" />
          <span v-for="i in range(5)" :key="i" class="wdot" :class="i === 1 && 'wdot-accent'" style="opacity: 0.9" />
        </div>

        <div v-if="dockedLeading" class="wregion wpanel wcol" :class="isTablet && 'wpanel-narrow'">
          <PanelWire :role="dockedLeading" />
        </div>

        <div class="wregion wmain" :class="isTransparentMain && 'wmain-canvas'" style="box-shadow: none">
          <ContentWire
            :kind="spec.content"
            :device="device"
            :density="spec.density"
            :has-corner-controls="mode !== 'floating' && !isPhone"
          />

          <div v-if="floatingLeading" class="wisland wisland-leading">
            <PanelWire :role="floatingLeading" />
          </div>
          <div v-if="floatingTrailing" class="wisland wisland-trailing">
            <PanelWire :role="floatingTrailing" is-short />
          </div>
          <div v-if="spec.bottomDock && !isPhone" class="wisland wisland-dock">
            <span v-for="i in range(5)" :key="i" class="wdot" :class="i === 2 && 'wdot-accent'" />
          </div>

          <template v-if="overlayTrailing">
            <div class="wscrim" />
            <div class="wdrawer"><PanelWire :role="overlayTrailing" /></div>
          </template>

          <div v-if="sheetRole" class="wsheet">
            <span class="wsheet-handle" />
            <PanelWire :role="sheetRole" is-short />
          </div>
        </div>

        <div v-if="dockedTrailing" class="wregion wpanel wcol" :class="isTablet && 'wpanel-narrow'">
          <PanelWire :role="dockedTrailing" />
        </div>
      </div>

      <div v-if="hasBottomTabs" class="wtabs">
        <div v-for="i in range(4)" :key="i" class="wtab">
          <span class="wdot" :class="i === 0 && 'wdot-accent'" />
          <span class="wl" :class="i === 0 && 'wl-accent'" style="width: calc(var(--u) * 2.6)" />
        </div>
      </div>
    </div>
  </div>
</template>
