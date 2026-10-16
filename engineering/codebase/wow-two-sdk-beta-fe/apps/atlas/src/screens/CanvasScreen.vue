<script setup lang="ts">
import { computed, reactive, shallowRef } from 'vue';
import { Circle, Minus, MousePointer2, PanelRightClose, PanelRightOpen, Plus, Square, Type } from 'lucide-vue-next';
import { Button, ButtonGroup, Toolbar, ToolbarButton } from '@wow-two-beta/ui-vue/presentation/actions';
import { ColorInput, SliderInput, SwitchField } from '@wow-two-beta/ui-vue/presentation/forms';

/* Canvas-islands archetype: the work fills the screen and every tool floats above it — a tool strip, an inspector
   that folds away, and zoom at the bottom. Islands leave the canvas visible around them, the Figma/Excalidraw feel. */

const Tools = [
  { id: 'select', label: 'Select', icon: MousePointer2 },
  { id: 'rectangle', label: 'Rectangle', icon: Square },
  { id: 'ellipse', label: 'Ellipse', icon: Circle },
  { id: 'text', label: 'Text', icon: Type },
] as const;

const tool = shallowRef<(typeof Tools)[number]['id']>('select');
const isInspectorOpen = shallowRef(true);
const zoom = shallowRef(100);
const shape = reactive({ fill: '#7c3aed', opacity: 90, isLocked: false });

const canvasStyle = {
  backgroundImage: 'radial-gradient(var(--color-border) 1px, transparent 1px)',
  backgroundSize: '18px 18px',
};
const shapeStyle = computed(() => ({
  background: shape.fill,
  opacity: shape.opacity / 100,
  transform: `scale(${zoom.value / 100})`,
}));

function stepZoom(delta: number): void {
  zoom.value = Math.min(200, Math.max(25, zoom.value + delta));
}

const Island = 'rounded-xl border border-border bg-popover text-popover-foreground shadow-lg';
</script>

<template>
  <div class="relative h-full min-h-0 overflow-hidden bg-muted/40" :style="canvasStyle">
    <div class="absolute inset-0 grid place-items-center" aria-label="Canvas" role="img">
      <div class="size-40 rounded-2xl shadow-md transition-transform" :style="shapeStyle" />
    </div>

    <div :class="[Island, 'absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-3 px-3 py-1.5']">
      <span class="text-sm font-medium">Launch poster</span>
      <Button size="sm">Share</Button>
    </div>

    <Toolbar
      orientation="vertical"
      aria-label="Tools"
      :class="[Island, 'absolute left-3 top-1/2 -translate-y-1/2 p-1']"
    >
      <ToolbarButton
        v-for="entry in Tools"
        :key="entry.id"
        :aria-label="entry.label"
        :aria-pressed="tool === entry.id"
        :class="tool === entry.id ? 'bg-primary-soft text-primary-soft-foreground' : ''"
        @click="tool = entry.id"
      >
        <component :is="entry.icon" class="size-4" aria-hidden="true" />
      </ToolbarButton>
    </Toolbar>

    <section
      v-if="isInspectorOpen"
      aria-label="Inspector"
      :class="[Island, 'absolute right-3 top-16 flex w-60 flex-col gap-4 p-4']"
    >
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold">Rectangle</h3>
        <Button size="sm" variant="ghost" aria-label="Hide inspector" @click="isInspectorOpen = false">
          <PanelRightClose class="size-4" aria-hidden="true" />
        </Button>
      </div>
      <label class="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
        Fill
        <ColorInput v-model="shape.fill" aria-label="Fill" />
      </label>
      <div class="flex flex-col gap-1.5">
        <span id="canvas-opacity" class="text-xs font-medium text-muted-foreground">Opacity {{ shape.opacity }}%</span>
        <SliderInput
          :model-value="shape.opacity"
          min="10"
          max="100"
          aria-labelledby="canvas-opacity"
          @update:model-value="(value: string) => (shape.opacity = Number(value))"
        />
      </div>
      <SwitchField v-model="shape.isLocked" label="Lock position" />
    </section>
    <Button
      v-else
      size="sm"
      variant="outline"
      aria-label="Show inspector"
      :class="[Island, 'absolute right-3 top-16']"
      @click="isInspectorOpen = true"
    >
      <PanelRightOpen class="size-4" aria-hidden="true" />
    </Button>

    <ButtonGroup is-attached :class="[Island, 'absolute bottom-3 left-1/2 -translate-x-1/2 overflow-hidden']">
      <Button size="sm" variant="ghost" aria-label="Zoom out" @click="stepZoom(-25)">
        <Minus class="size-4" aria-hidden="true" />
      </Button>
      <!-- The name starts with the visible text, so a voice command naming what is on screen still hits it. -->
      <Button size="sm" variant="ghost" class="tabular-nums" :aria-label="`${zoom}%, reset zoom`" @click="zoom = 100">
        {{ zoom }}%
      </Button>
      <Button size="sm" variant="ghost" aria-label="Zoom in" @click="stepZoom(25)">
        <Plus class="size-4" aria-hidden="true" />
      </Button>
    </ButtonGroup>
  </div>
</template>
