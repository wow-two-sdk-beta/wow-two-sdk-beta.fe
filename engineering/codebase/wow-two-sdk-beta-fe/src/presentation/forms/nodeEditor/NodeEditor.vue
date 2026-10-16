<script lang="ts">
export interface NodeEditorNode {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly data?: Record<string, unknown>;
  /**
   * The node caption. A node is an array entry and cannot become its own slot,
   * so the scalar stays here and the `node` scoped slot is the rich override.
   */
  readonly label?: string | number;
}

export interface NodeEditorEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  /** The edge caption, drawn as SVG `<text>` at the curve midpoint. */
  readonly label?: string | number;
}

export interface NodeEditorProps {
  /** Localized labels for the built-in movement and viewport actions. */
  readonly labels?: Partial<
    Record<'selectNode' | 'left' | 'right' | 'up' | 'down' | 'zoomIn' | 'zoomOut' | 'fit', string>
  >;
  readonly nodes: ReadonlyArray<NodeEditorNode>;
  readonly edges?: ReadonlyArray<NodeEditorEdge>;
  /** The node box width in px. Default `160`. */
  readonly nodeWidth?: number;
  /** The node box height in px. Default `60`. */
  readonly nodeHeight?: number;
  /** The lower zoom bound. Default `0.25`. */
  readonly minZoom?: number;
  /** The upper zoom bound. Default `2`. */
  readonly maxZoom?: number;
}

interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

type DragState =
  | { kind: 'pan'; startX: number; startY: number; viewportX: number; viewportY: number }
  | {
      kind: 'node';
      nodeId: string;
      startX: number;
      startY: number;
      nodeStartX: number;
      nodeStartY: number;
    }
  | null;
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useAttrs, useTemplateRef } from 'vue';
import { Maximize, Minus, Plus } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { Icon } from '../../../foundation/icons';

/**
 * Renders a pannable, wheel-zoomable node graph whose nodes drag to reposition.
 *
 * Drag-to-connect ports, a minimap, and auto-layout are deferred.
 */
defineOptions({ name: 'NodeEditor', inheritAttrs: false });

const props = withDefaults(defineProps<NodeEditorProps>(), {
  edges: () => [],
  nodeWidth: 160,
  nodeHeight: 60,
  minZoom: 0.25,
  maxZoom: 2,
});

const emit = defineEmits<{
  /** Requests the full node list after a drag, arrow key or movement button. */
  'update:nodes': [nodes: ReadonlyArray<NodeEditorNode>];
  /** Fires when the reader clicks an edge, with that edge. */
  'edge-click': [edge: NodeEditorEdge];
}>();

defineSlots<{
  /** Replaces a node's box. Falls back to the default card with its `label` / `id`. */
  node(props: { node: NodeEditorNode }): unknown;
}>();

const labels = computed(() => ({
  selectNode: 'Node to move',
  left: 'Move node left',
  right: 'Move node right',
  up: 'Move node up',
  down: 'Move node down',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  fit: 'Fit view',
  ...props.labels,
}));
const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const viewport = ref<Viewport>({ x: 0, y: 0, zoom: 1 });
const selectedNodeId = ref<string | undefined>();
const selectedNode = computed(() => props.nodes.find((node) => node.id === selectedNodeId.value) ?? props.nodes[0]);
function moveNode(node: NodeEditorNode | undefined, dx: number, dy: number): void {
  if (!node) return;
  emit(
    'update:nodes',
    props.nodes.map((item) => (item.id === node.id ? { ...item, x: item.x + dx, y: item.y + dy } : item)),
  );
}
function onNodeKeydown(event: KeyboardEvent, node: NodeEditorNode): void {
  if (event.defaultPrevented || event.isComposing || event.target !== event.currentTarget) return;
  const moves: Record<string, readonly [number, number]> = {
    ArrowLeft: [-10, 0],
    ArrowRight: [10, 0],
    ArrowUp: [0, -10],
    ArrowDown: [0, 10],
  };
  const delta = moves[event.key];
  if (!delta) return;
  event.preventDefault();
  moveNode(node, delta[0], delta[1]);
}

/** Plain variable, not a ref — nothing renders off it. */
let dragState: DragState = null;

const nodeIndex = computed(() => new Map(props.nodes.map((node) => [node.id, node])));

function onContainerPointerDown(event: PointerEvent): void {
  if (event.button !== 0) return;
  if ((event.target as HTMLElement).closest('[data-node], button, input, select, textarea, a')) return;
  dragState = {
    kind: 'pan',
    startX: event.clientX,
    startY: event.clientY,
    viewportX: viewport.value.x,
    viewportY: viewport.value.y,
  };
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function onContainerPointerMove(event: PointerEvent): void {
  const drag = dragState;
  if (!drag) return;
  if (drag.kind === 'pan') {
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    viewport.value = { ...viewport.value, x: drag.viewportX + dx, y: drag.viewportY + dy };
  } else {
    const dx = (event.clientX - drag.startX) / viewport.value.zoom;
    const dy = (event.clientY - drag.startY) / viewport.value.zoom;
    const next = props.nodes.map((node) =>
      node.id === drag.nodeId ? { ...node, x: drag.nodeStartX + dx, y: drag.nodeStartY + dy } : node,
    );
    emit('update:nodes', next);
  }
}

function onContainerPointerUp(event: PointerEvent): void {
  dragState = null;
  (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
}

// Wheel-zoom must be a non-passive native listener — a template `@wheel` binding
// is attached passively, so `preventDefault` inside it cannot stop the page from
// scrolling. Registered once, reading `minZoom` / `maxZoom` live.
function onWheel(event: WheelEvent): void {
  const node = el.value;
  if (!node) return;
  event.preventDefault();
  const rect = node.getBoundingClientRect();
  // Zoom centered on the cursor.
  const cx = event.clientX - rect.left;
  const cy = event.clientY - rect.top;
  const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
  const current = viewport.value;
  const nextZoom = Math.max(props.minZoom, Math.min(props.maxZoom, current.zoom * factor));
  const ratio = nextZoom / current.zoom;
  viewport.value = {
    zoom: nextZoom,
    x: cx - (cx - current.x) * ratio,
    y: cy - (cy - current.y) * ratio,
  };
}

onMounted(() => {
  el.value?.addEventListener('wheel', onWheel, { passive: false });
});

onBeforeUnmount(() => {
  el.value?.removeEventListener('wheel', onWheel);
});

function beginNodeDrag(event: PointerEvent, node: NodeEditorNode): void {
  if (event.button !== 0 || (event.target as HTMLElement).closest('button, input, select, textarea, a')) return;
  event.stopPropagation();
  dragState = {
    kind: 'node',
    nodeId: node.id,
    startX: event.clientX,
    startY: event.clientY,
    nodeStartX: node.x,
    nodeStartY: node.y,
  };
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function fitView(): void {
  if (props.nodes.length === 0) {
    viewport.value = { x: 0, y: 0, zoom: 1 };
    return;
  }
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const node of props.nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + props.nodeWidth);
    maxY = Math.max(maxY, node.y + props.nodeHeight);
  }
  const width = maxX - minX;
  const height = maxY - minY;
  const rect = el.value?.getBoundingClientRect();
  if (!rect) return;
  const padding = 40;
  const zoomX = (rect.width - padding * 2) / width;
  const zoomY = (rect.height - padding * 2) / height;
  const zoom = Math.max(props.minZoom, Math.min(props.maxZoom, Math.min(zoomX, zoomY, 1)));
  viewport.value = {
    zoom,
    x: padding - minX * zoom + (rect.width - padding * 2 - width * zoom) / 2,
    y: padding - minY * zoom + (rect.height - padding * 2 - height * zoom) / 2,
  };
}

function zoomIn(): void {
  viewport.value = {
    ...viewport.value,
    zoom: Math.min(props.maxZoom, viewport.value.zoom * 1.2),
  };
}

function zoomOut(): void {
  viewport.value = {
    ...viewport.value,
    zoom: Math.max(props.minZoom, viewport.value.zoom / 1.2),
  };
}

/** Edges resolved to a cubic path; endpoints that name a missing node are dropped. */
const renderEdges = computed(() =>
  props.edges.flatMap((edge) => {
    const a = nodeIndex.value.get(edge.source);
    const b = nodeIndex.value.get(edge.target);
    if (!a || !b) return [];
    const x1 = a.x + props.nodeWidth;
    const y1 = a.y + props.nodeHeight / 2;
    const x2 = b.x;
    const y2 = b.y + props.nodeHeight / 2;
    const mid = (x1 + x2) / 2;
    return [
      {
        edge,
        path: `M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`,
        labelX: mid,
        labelY: (y1 + y2) / 2 - 6,
      },
    ];
  }),
);

const strokeWidth = computed(() => 2 / viewport.value.zoom);

/** Vue does not append `px` to a numeric `:style` value — every length is spelled out. */
const edgeLabelStyle = computed(() => ({ fontSize: `${10 / viewport.value.zoom}px` }));

const transformStyle = computed(() => ({
  transform: `translate(${viewport.value.x}px, ${viewport.value.y}px) scale(${viewport.value.zoom})`,
}));

function nodeStyle(node: NodeEditorNode): Record<string, string> {
  return {
    position: 'absolute',
    left: `${node.x}px`,
    top: `${node.y}px`,
    width: `${props.nodeWidth}px`,
    height: `${props.nodeHeight}px`,
  };
}

const SvgStyle = { overflow: 'visible', width: '100%', height: '100%' } as const;

const classes = computed(() =>
  cn(
    'relative h-96 w-full overflow-hidden rounded-md border border-border bg-muted/30 select-none',
    attrs.class as string | undefined,
  ),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div
    ref="el"
    v-bind="rest"
    :class="classes"
    @pointerdown="onContainerPointerDown"
    @pointermove="onContainerPointerMove"
    @pointerup="onContainerPointerUp"
    @pointercancel="onContainerPointerUp"
  >
    <!-- Pan/zoom transform -->
    <div class="absolute inset-0 origin-top-left" :style="transformStyle">
      <svg class="absolute pointer-events-none" :style="SvgStyle">
        <g
          v-for="entry in renderEdges"
          :key="entry.edge.id"
          class="pointer-events-auto cursor-pointer"
          role="button"
          tabindex="0"
          :aria-label="String(entry.edge.label ?? entry.edge.id)"
          @keydown.enter.prevent="emit('edge-click', entry.edge)"
          @keydown.space.prevent="emit('edge-click', entry.edge)"
          @click="emit('edge-click', entry.edge)"
        >
          <path
            :d="entry.path"
            fill="none"
            stroke="currentColor"
            :stroke-width="strokeWidth"
            class="text-border-strong hover:text-primary"
          />
          <text
            v-if="entry.edge.label"
            :x="entry.labelX"
            :y="entry.labelY"
            text-anchor="middle"
            class="fill-muted-foreground text-[10px]"
            :style="edgeLabelStyle"
          >
            {{ entry.edge.label }}
          </text>
        </g>
      </svg>
      <div
        v-for="node in nodes"
        :key="node.id"
        data-node="true"
        role="group"
        tabindex="0"
        @focus="selectedNodeId = node.id"
        @keydown="onNodeKeydown($event, node)"
        :aria-label="typeof node.label === 'string' ? node.label : node.id"
        :style="nodeStyle(node)"
        class="cursor-grab active:cursor-grabbing"
        @pointerdown="beginNodeDrag($event, node)"
      >
        <slot name="node" :node="node">
          <div
            class="flex h-full w-full items-center justify-center rounded-md border border-border bg-card px-3 text-sm font-medium shadow-sm"
          >
            {{ node.label ?? node.id }}
          </div>
        </slot>
      </div>
    </div>
    <div
      v-if="nodes.length"
      class="absolute left-3 top-3 flex flex-wrap items-center gap-1 rounded border bg-card p-2"
      @pointerdown.stop
    >
      <select
        :aria-label="labels.selectNode"
        :value="selectedNode?.id"
        @change="selectedNodeId = ($event.target as HTMLSelectElement).value"
      >
        <option v-for="node in nodes" :key="node.id" :value="node.id">{{ node.label ?? node.id }}</option>
      </select>
      <button type="button" :aria-label="labels.left" @click="moveNode(selectedNode, -10, 0)">←</button>
      <button type="button" :aria-label="labels.right" @click="moveNode(selectedNode, 10, 0)">→</button>
      <button type="button" :aria-label="labels.up" @click="moveNode(selectedNode, 0, -10)">↑</button>
      <button type="button" :aria-label="labels.down" @click="moveNode(selectedNode, 0, 10)">↓</button>
    </div>
    <!-- Controls -->
    <div class="absolute bottom-3 right-3 flex flex-col gap-1 rounded-md border border-border bg-card p-1 shadow-sm">
      <button
        type="button"
        :aria-label="labels.zoomIn"
        class="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        @click="zoomIn"
      >
        <Icon :icon="Plus" :size="14" />
      </button>
      <button
        type="button"
        :aria-label="labels.zoomOut"
        class="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        @click="zoomOut"
      >
        <Icon :icon="Minus" :size="14" />
      </button>
      <button
        type="button"
        :aria-label="labels.fit"
        class="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        @click="fitView"
      >
        <Icon :icon="Maximize" :size="12" />
      </button>
    </div>
  </div>
</template>
