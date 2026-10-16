<script setup lang="ts">
import {
  ToggleInput,
  ToggleGroup,
  OptionTilePicker,
  OptionTileGroupField,
  SegmentedPicker,
} from '@wow-two-beta/ui-vue/presentation/forms';
import { LinkItem } from '@wow-two-beta/ui-vue/presentation/nav';
import { ref } from 'vue';
import * as actions from '@wow-two-beta/ui-vue/presentation/actions';
import { Check, Copy, Pencil, Plus, Share2, Star, Trash2 } from 'lucide-vue-next';
import Demo from '../gallery/Demo.vue';
import Matrix from '../gallery/Matrix.vue';
import AutoGroup from '../gallery/AutoGroup.vue';
import { actionsExamples } from '../gallery/fixtures/ActionsExamples';

const {
  Button,
  ButtonGroup,
  FabButton,
  CopyButton,
  DisclosureButton,
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
  ToolbarLink,
  SpeedDialGroup,
  SpeedDialGroupTrigger,
  SpeedDialGroupAction,
  BackToTopButton,
} = actions;

const covered = [
  'Button',
  'LinkItem',
  'ButtonGroup',
  'ToggleInput',
  'ToggleGroup',
  'OptionTilePicker',
  'OptionTileGroupField',
  'SegmentedPicker',
  'FabButton',
  'CopyButton',
  'DisclosureButton',
  'Toolbar',
  'ToolbarButton',
  'ToolbarSeparator',
  'ToolbarLink',
  'SpeedDialGroup',
  'SpeedDialGroupTrigger',

  'SpeedDialGroupAction',
  'BackToTopButton',
];

const BUTTON_VARIANTS = [
  'solid',
  'soft',
  'surface',
  'outline',
  'ghost',
  'reveal',
  'link',
  'glass',
  'glass-surface',
] as const;
const BUTTON_TONES = ['primary', 'neutral', 'danger', 'success', 'warning'] as const;
const SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

const ALIGNMENTS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'CenterLayout' },
  { value: 'right', label: 'Right' },
] as const;

const pressed = ref(false);
const align = ref('center');
const toggleValue = ref<string[]>(['bold']);
const segment = ref('week');
const tile = ref('b');
</script>

<template>
  <div class="space-y-6">
    <h2 class="font-mono text-sm font-bold uppercase tracking-wide">actions</h2>

    <Demo name="Button" note="variant × tone — 9 × 5, the canonical cn() merge check">
      <Matrix row-axis="variant" col-axis="tone" :rows="BUTTON_VARIANTS" :cols="BUTTON_TONES">
        <template #default="{ row, col }">
          <Button :variant="row as never" :tone="col as never" size="sm">Save</Button>
        </template>
      </Matrix>
    </Demo>

    <div class="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3">
      <Demo name="Button" note="size × shape">
        <Matrix row-axis="size" col-axis="shape" :rows="SIZES" :cols="['default', 'square', 'circle']">
          <template #default="{ row, col }">
            <Button :size="row as never" :shape="col as never" variant="solid">
              <template v-if="col === 'default'">Go</template>
              <Star v-else :size="14" />
            </Button>
          </template>
        </Matrix>
      </Demo>

      <Demo name="Button" note="states: loading / disabled / skeleton / fullWidth / multiline">
        <div class="flex flex-wrap items-center gap-2">
          <Button is-loading>Loading</Button>
          <Button is-loading loading-text="Saving…">Save</Button>
          <Button is-disabled>Disabled</Button>
          <Button is-skeleton>SkeletonState</Button>
          <Button variant="outline" tone="danger">
            <template #leading><Trash2 :size="14" /></template>
            Delete
          </Button>
          <Button :leading-slot="undefined" variant="soft">
            Share
            <template #trailing><Share2 :size="14" /></template>
          </Button>
          <Button is-full-width variant="soft" tone="success">Full width</Button>
        </div>
      </Demo>

      <Demo name="LinkItem" note="variant × size">
        <Matrix
          row-axis="variant"
          col-axis="size"
          :rows="['default', 'subtle', 'muted', 'inherit']"
          :cols="['sm', 'md', 'lg']"
        >
          <template #default="{ row, col }">
            <LinkItem href="#" :variant="row as never" :size="col as never">link</LinkItem>
          </template>
        </Matrix>
      </Demo>

      <Demo name="ButtonGroup" note="attached horizontal + vertical">
        <div class="flex flex-col gap-3">
          <ButtonGroup>
            <Button variant="outline" size="sm">Left</Button>
            <Button variant="outline" size="sm">Middle</Button>
            <Button variant="outline" size="sm">Right</Button>
          </ButtonGroup>
          <ButtonGroup orientation="vertical" class="w-24">
            <Button variant="outline" size="sm">Top</Button>
            <Button variant="outline" size="sm">Bottom</Button>
          </ButtonGroup>
          <ButtonGroup :is-attached="false">
            <Button variant="soft" size="sm">Detached</Button>
            <Button variant="soft" size="sm">Pair</Button>
          </ButtonGroup>
        </div>
      </Demo>

      <Demo name="ToggleInput" note="variant × tone, pressed state">
        <Matrix
          row-axis="variant"
          col-axis="tone"
          :rows="['ghost', 'soft', 'outline', 'solid', 'glass', 'glass-surface']"
          :cols="BUTTON_TONES"
        >
          <template #default="{ row, col }">
            <ToggleInput :variant="row as never" :tone="col as never" :default-value="true">
              <Star :size="14" />
            </ToggleInput>
          </template>
        </Matrix>
        <div class="mt-2 flex items-center gap-2">
          <ToggleInput v-model:is-pressed="pressed">Controlled</ToggleInput>
          <span class="text-xs text-subtle-foreground">pressed = {{ pressed }}</span>
        </div>
      </Demo>

      <Demo name="ToggleGroup" note="multi mode, variant axis">
        <div class="space-y-2">
          <ToggleGroup
            v-for="v in ['default', 'segmented', 'pill']"
            :key="v"
            :model-value="toggleValue"
            type="multi"
            @update:modelValue="(v) => (toggleValue = v as string[])"
            :variant="v as never"
          >
            <ToggleInput value="bold">B</ToggleInput>
            <ToggleInput value="italic">I</ToggleInput>
            <ToggleInput value="underline">U</ToggleInput>
          </ToggleGroup>
          <p class="text-xs text-subtle-foreground">value = {{ toggleValue }}</p>
        </div>
      </Demo>

      <!-- `orientation` already shipped (it is React's, ported) — it was just never demoed.
           Vertical collapses top/bottom radii and stacks with `-mt-px`, the mirror of the
           horizontal row. `smart-qr` uses the vertical form. -->
      <Demo name="ToggleGroup" note="orientation axis — horizontal + vertical">
        <div class="flex items-start gap-6">
          <ToggleGroup
            :model-value="align"
            @update:modelValue="(v) => (align = v as string)"
            aria-label="Align (horizontal)"
          >
            <ToggleInput v-for="a in ALIGNMENTS" :key="a.value" :value="a.value">
              {{ a.label }}
            </ToggleInput>
          </ToggleGroup>
          <ToggleGroup
            orientation="vertical"
            :model-value="align"
            @update:modelValue="(v) => (align = v as string)"
            aria-label="Align (vertical)"
          >
            <ToggleInput v-for="a in ALIGNMENTS" :key="a.value" :value="a.value">
              {{ a.label }}
            </ToggleInput>
          </ToggleGroup>
          <ToggleGroup
            orientation="vertical"
            variant="segmented"
            :model-value="align"
            @update:modelValue="(v) => (align = v as string)"
            aria-label="Align (vertical, segmented)"
          >
            <ToggleInput v-for="a in ALIGNMENTS" :key="a.value" :value="a.value">
              {{ a.label }}
            </ToggleInput>
          </ToggleGroup>
        </div>
        <p class="mt-2 text-xs text-subtle-foreground">value = {{ align }}</p>
      </Demo>

      <Demo name="SegmentedPicker" note="single-select ToggleGroup preset">
        <SegmentedPicker :model-value="segment" @update:modelValue="(v) => (segment = v as string)">
          <ToggleInput value="day">Day</ToggleInput>
          <ToggleInput value="week">Week</ToggleInput>
          <ToggleInput value="month">Month</ToggleInput>
        </SegmentedPicker>
        <p class="mt-1 text-xs text-subtle-foreground">value = {{ segment }}</p>
      </Demo>

      <Demo name="OptionTilePicker / OptionTileGroupField" note="icon-only tiles; `selected` is consumer-owned">
        <OptionTileGroupField label="Row density">
          <OptionTilePicker
            v-for="o in ['a', 'b', 'c'] as const"
            :key="o"
            :label="`Option ${o}`"
            :selected="tile === o"
            @select="() => (tile = o)"
          >
            <Star :size="14" />
          </OptionTilePicker>
        </OptionTileGroupField>
        <p class="mt-1 text-xs text-subtle-foreground">value = {{ tile }}</p>
      </Demo>

      <Demo name="CopyButton" note="click — icon should swap to a check for 2s">
        <div class="flex items-center gap-3">
          <CopyButton text="copied text" aria-label="Copy" />
          <CopyButton text="with label" aria-label="Copy with label">
            <template #default="{ copied }">
              <span class="flex items-center gap-1 text-xs">
                <Check v-if="copied" :size="12" /><Copy v-else :size="12" />
                {{ copied ? 'Copied' : 'Copy' }}
              </span>
            </template>
          </CopyButton>
        </div>
      </Demo>

      <Demo name="DisclosureButton" note="click toggles the chevron">
        <div class="space-y-2">
          <DisclosureButton>Details (chevron right)</DisclosureButton>
          <DisclosureButton chevron-side="left">Chevron left</DisclosureButton>
        </div>
      </Demo>

      <Demo name="Toolbar">
        <Toolbar class="rounded-md border border-border p-1">
          <ToolbarButton><Pencil :size="14" /></ToolbarButton>
          <ToolbarButton><Star :size="14" /></ToolbarButton>
          <ToolbarSeparator />
          <ToolbarButton><Trash2 :size="14" /></ToolbarButton>
          <ToolbarLink href="#">Help</ToolbarLink>
        </Toolbar>
      </Demo>

      <Demo name="FabButton" note="variant × size — positioned absolute inside the frame">
        <div class="relative h-32 rounded-md bg-muted">
          <FabButton
            v-for="(v, i) in ['primary', 'secondary', 'destructive']"
            :key="v"
            :variant="v as never"
            :position="(['bottom-right', 'bottom-left', 'bottom-center'] as const)[i]"
            :aria-label="`FabButton ${v}`"
            class="absolute"
          >
            <Plus :size="18" />
          </FabButton>
        </div>
      </Demo>

      <!-- `transform-gpu` is what makes the frame work: `SpeedDialGroup` is `position: fixed`, so
           a plain `relative` ancestor does not contain it and the dial lands in the window's
           bottom-right corner instead of the card — reading as "renders nothing" here. A
           transformed ancestor becomes the containing block for fixed descendants. -->
      <Demo name="SpeedDialGroup" note="click the trigger to fan the actions out">
        <!-- Actions go DIRECTLY inside the root: `SpeedDialGroup` renders its own internal
             `SpeedDialGroupList` around whatever is not a trigger. `SpeedDialGroupList` is not a
             public export. -->
        <div class="relative h-36 transform-gpu rounded-md bg-muted">
          <SpeedDialGroup position="bottom-right" direction="up" default-open>
            <SpeedDialGroupTrigger />
            <SpeedDialGroupAction aria-label="Edit" tooltip="Edit"><Pencil :size="14" /></SpeedDialGroupAction>
            <SpeedDialGroupAction aria-label="Share" tooltip="Share"><Share2 :size="14" /></SpeedDialGroupAction>
            <SpeedDialGroupAction aria-label="Delete" tooltip="Delete"><Trash2 :size="14" /></SpeedDialGroupAction>
          </SpeedDialGroup>
        </div>
      </Demo>

      <Demo name="BackToTopButton" note="threshold 0 so it shows unscrolled — normally past 400px">
        <div class="relative h-24 transform-gpu rounded-md bg-muted">
          <BackToTopButton :threshold="0" label="Back to top" />
        </div>
      </Demo>
    </div>

    <h3 class="border-t border-border pt-4 font-mono text-xs uppercase text-subtle-foreground">auto-mounted tail</h3>
    <AutoGroup :examples="actionsExamples" :namespace="actions" :covered="covered" />
  </div>
</template>
