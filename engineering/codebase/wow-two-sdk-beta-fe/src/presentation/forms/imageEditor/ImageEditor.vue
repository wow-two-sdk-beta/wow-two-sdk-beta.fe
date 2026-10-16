<script lang="ts">
import type { ImageEditRecipe } from '../../../domain/imageEditing';

/** Image editing controls; callers own processing, persistence and preview URLs. */
export interface ImageEditorProps {
  readonly src: string;
  readonly naturalWidth: number;
  readonly naturalHeight: number;
  readonly alt?: string;
  readonly modelValue?: ImageEditRecipe;
  readonly defaultValue?: ImageEditRecipe;
  readonly previewSrc?: string;
  readonly canRemoveBackground?: boolean;
  readonly maxDimension?: number;
  readonly maxPixels?: number;
  readonly isBusy?: boolean;
  readonly error?: string;
  readonly isDisabled?: boolean;
  readonly isReadOnly?: boolean;
}
</script>

<script setup lang="ts">
import { computed, shallowRef, useAttrs, useTemplateRef, watch } from 'vue';
import type { ClassValue } from 'clsx';
import {
  ImageEditRecipeExtensions,
  type ImageEditCrop,
  type ImageEditFormat,
  type ImageEditRotation,
} from '../../../domain/imageEditing';
import { createSnapshotHistory, useHistoryVersion } from '../../../foundation/history';
import { useControlled } from '../../../foundation/state';
import { useLocale } from '../../../foundation/i18n';
import { useId } from '../../../foundation/identifiers';
import { useFormControl } from '../../../foundation/primitives';
import { cn } from '../../../foundation/styles';
import { Button } from '../../actions/button';
import { ImageCropEditor } from '../imageCropEditor';
import { NumberInput } from '../numberInput';
import { CheckboxInput } from '../checkboxInput';
import { useNativeFormReset } from '../UseNativeFormReset';

defineOptions({ name: 'ImageEditor', inheritAttrs: false });
const props = withDefaults(defineProps<ImageEditorProps>(), {
  alt: '',
  modelValue: undefined,
  defaultValue: undefined,
  previewSrc: undefined,
  canRemoveBackground: false,
  maxDimension: 8192,
  maxPixels: 50_000_000,
  isBusy: false,
  error: undefined,
  isDisabled: undefined,
  isReadOnly: undefined,
});
const emit = defineEmits<{
  'update:modelValue': [recipe: ImageEditRecipe];
  preview: [recipe: ImageEditRecipe];
  apply: [recipe: ImageEditRecipe];
}>();
const attrs = useAttrs();
const locale = useLocale();
const field = useFormControl();
const id = useId('image-editor');
const label = (key: string, fallback: string) => locale.t(`ImageEditor.${key}`, undefined, fallback);
const ctl = useControlled<ImageEditRecipe>({
  controlled: () => props.modelValue,
  default: () => ImageEditRecipeExtensions.copy(props.defaultValue ?? ImageEditRecipeExtensions.create()),
  onChange: (recipe) => emit('update:modelValue', ImageEditRecipeExtensions.copy(recipe)),
});
const value = ctl.value;
const history = createSnapshotHistory(ImageEditRecipeExtensions.copy(value.value), { limit: 50 });
const version = useHistoryVersion(history);
const ratio = shallowRef<number | undefined>(undefined);
const isProportional = shallowRef(true);
const sourceRevision = shallowRef(0);
const needsSourceReset = shallowRef(false);
const hidden = useTemplateRef<HTMLInputElement>('hidden');
const locked = computed(
  () =>
    props.isBusy ||
    (props.isDisabled ?? field?.isDisabled ?? false) ||
    (props.isReadOnly ?? field?.isReadOnly ?? false),
);
const same = (left: ImageEditRecipe, right: ImageEditRecipe) => JSON.stringify(left) === JSON.stringify(right);
const rest = computed(() => {
  const { class: _class, ...other } = attrs;
  return other;
});
const sourceSize = computed(() => ImageEditRecipeExtensions.size(value.value, props.naturalWidth, props.naturalHeight));
const outputSize = computed(() => value.value.resize ?? sourceSize.value);
const crop = computed(() => value.value.crop ?? { x: 0, y: 0, width: props.naturalWidth, height: props.naturalHeight });
const issue = computed(() => ImageEditRecipeExtensions.validate(value.value, props));
const validationMessage = computed(() => {
  if (needsSourceReset.value) return label('sourceChanged', 'The image changed. Reset edits before continuing.');
  switch (issue.value) {
    case 'source':
      return label('sourceError', 'Image dimensions exceed the processing limits or are unavailable.');
    case 'crop':
      return label('cropError', 'Keep the crop inside the original image.');
    case 'rotation':
      return label('rotationError', 'Choose a quarter-turn rotation.');
    case 'resize':
      return label('resizeError', 'Choose positive output dimensions within the processing limits.');
    case 'output':
      return label('outputError', 'Choose PNG, JPEG or WebP and quality from 1 to 100.');
    case 'background':
      return label('backgroundError', 'Background removal is unavailable. Turn it off to continue.');
    default:
      return undefined;
  }
});
const canUndo = computed(() => {
  void version.value;
  return history.canUndo && same(history.present, value.value);
});
const canRedo = computed(() => {
  void version.value;
  return history.canRedo && same(history.present, value.value);
});
const stalePreview = shallowRef(false);
watch(
  value,
  (next) => {
    stalePreview.value = true;
    if (same(next, ImageEditRecipeExtensions.create())) needsSourceReset.value = false;
    if (!same(next, history.present)) {
      history.record(ImageEditRecipeExtensions.copy(next));
      history.clear();
    }
  },
  { flush: 'sync', deep: true },
);
watch(
  () => props.previewSrc,
  () => {
    stalePreview.value = false;
  },
);
watch(
  () => [props.src, props.naturalWidth, props.naturalHeight],
  () => {
    sourceRevision.value += 1;
    ratio.value = undefined;
    isProportional.value = true;
    stalePreview.value = true;
    const next = ImageEditRecipeExtensions.create();
    needsSourceReset.value = ctl.isControlled && !same(value.value, next);
    history.record(next);
    history.clear();
    ctl.setValue(next);
  },
);
function commit(next: ImageEditRecipe): void {
  if (locked.value || same(next, value.value)) return;
  if (!same(history.present, value.value)) {
    history.record(ImageEditRecipeExtensions.copy(value.value));
    history.clear();
  }
  history.record(ImageEditRecipeExtensions.copy(next));
  ctl.setValue(next);
}
function patch(next: Partial<ImageEditRecipe>): void {
  commit({ ...value.value, ...next });
}
function travel(direction: 'undo' | 'redo'): void {
  if (locked.value || !same(history.present, value.value)) return;
  history[direction]();
  ctl.setValue(ImageEditRecipeExtensions.copy(history.present));
  ratio.value = undefined;
}
function reset(): void {
  if (locked.value) return;
  ratio.value = undefined;
  commit(ImageEditRecipeExtensions.create());
}
useNativeFormReset(hidden, () => {
  if (locked.value) return;
  ratio.value = undefined;
  ctl.reset();
  history.clear();
});
function changeCrop(next: ImageEditCrop): void {
  patch({ crop: { ...next }, resize: null });
}
function setRatio(next?: number): void {
  if (locked.value) return;
  ratio.value = next;
  if (next === undefined) return;
  const width = Math.max(1, Math.round(Math.min(props.naturalWidth, props.naturalHeight * next)));
  const height = Math.max(1, Math.round(width / next));
  changeCrop({
    x: Math.floor((props.naturalWidth - width) / 2),
    y: Math.floor((props.naturalHeight - height) / 2),
    width,
    height,
  });
}
function rotate(delta: number): void {
  patch({ rotate: ((value.value.rotate + delta + 360) % 360) as ImageEditRotation, resize: null });
}
function resize(side: 'width' | 'height', number: number | null): void {
  if (locked.value || number === null || !Number.isFinite(number) || number < 1) return;
  let width = side === 'width' ? Math.round(number) : outputSize.value.width;
  let height = side === 'height' ? Math.round(number) : outputSize.value.height;
  const aspect = sourceSize.value.width / sourceSize.value.height;
  if (isProportional.value && Number.isFinite(aspect) && aspect > 0) {
    if (side === 'width') height = Math.max(1, Math.round(width / aspect));
    else width = Math.max(1, Math.round(height * aspect));
  }
  const scale = Math.min(
    1,
    props.maxDimension / width,
    props.maxDimension / height,
    Math.sqrt(props.maxPixels / (width * height)),
  );
  if (!Number.isFinite(scale) || scale <= 0) return;
  width = Math.max(1, Math.floor(width * scale));
  height = Math.max(1, Math.floor(height * scale));
  patch({ resize: { width, height } });
}
function format(next: ImageEditFormat): void {
  patch({ output: { ...value.value.output, format: next } });
}
function quality(next: number | null): void {
  if (next !== null && Number.isFinite(next)) {
    patch({ output: { ...value.value.output, quality: Math.max(1, Math.min(100, Math.round(next))) } });
  }
}
function request(kind: 'preview' | 'apply'): void {
  if (locked.value || issue.value || needsSourceReset.value) return;
  const next = ImageEditRecipeExtensions.copy(value.value);
  if (kind === 'preview') emit('preview', next);
  else emit('apply', next);
}
const ratios = [
  { value: undefined, key: 'free', text: 'Free crop' },
  { value: 1, key: 'square', text: 'Square' },
  { value: 4 / 5, key: 'portrait', text: 'Portrait 4:5' },
  { value: 16 / 9, key: 'landscape', text: 'Landscape 16:9' },
];
const formats: ImageEditFormat[] = ['png', 'jpeg', 'webp'];
</script>

<template>
  <section
    v-bind="rest"
    :class="
      cn(
        'flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-background p-4 text-foreground',
        attrs.class as ClassValue,
      )
    "
    :aria-busy="isBusy"
    :aria-label="(attrs['aria-label'] as string | undefined) ?? label('label', 'Image editor')"
  >
    <input ref="hidden" type="hidden" :value="JSON.stringify(value)" />
    <div class="flex flex-wrap gap-2" role="group" :aria-label="label('history', 'Edit history')">
      <Button type="button" variant="outline" size="sm" :is-disabled="locked || !canUndo" @click="travel('undo')">{{
        label('undo', 'Undo')
      }}</Button>
      <Button type="button" variant="outline" size="sm" :is-disabled="locked || !canRedo" @click="travel('redo')">{{
        label('redo', 'Redo')
      }}</Button>
      <Button type="button" variant="outline" size="sm" :is-disabled="locked" @click="reset">{{
        label('reset', 'Reset edits')
      }}</Button>
    </div>
    <div class="grid min-w-0 gap-4 lg:grid-cols-2">
      <div class="min-w-0 space-y-2">
        <p class="text-sm font-medium">{{ label('original', 'Original image · crop before rotation') }}</p>
        <ImageCropEditor
          :key="sourceRevision"
          :src="src"
          :alt="alt"
          :model-value="crop"
          :aspect-ratio="ratio"
          :min-size="1"
          :is-disabled="locked"
          @update:model-value="changeCrop"
        />
        <div class="flex flex-wrap gap-2" role="group" :aria-label="label('aspect', 'Crop aspect ratio')">
          <Button
            v-for="preset in ratios"
            :key="preset.key"
            type="button"
            variant="outline"
            size="sm"
            :aria-pressed="ratio === preset.value"
            :is-disabled="locked"
            @click="setRatio(preset.value)"
            >{{ label(preset.key, preset.text) }}</Button
          >
          <Button
            type="button"
            variant="outline"
            size="sm"
            :is-disabled="locked"
            @click="
              ratio = undefined;
              patch({ crop: null, resize: null });
            "
            >{{ label('full', 'Full image') }}</Button
          >
        </div>
      </div>
      <div class="min-w-0 space-y-2">
        <p class="text-sm font-medium">{{ label('preview', 'Processed preview') }}</p>
        <img
          v-if="previewSrc && !stalePreview"
          :src="previewSrc"
          :alt="label('previewAlt', 'Preview of the requested image edits')"
          class="max-h-96 max-w-full rounded border border-border object-contain"
        />
        <p v-else class="rounded border border-dashed border-border p-6 text-sm text-muted-foreground">
          {{
            label('previewHint', 'Choose Preview edits to inspect the processed result. The original stays unchanged.')
          }}
        </p>
      </div>
    </div>
    <div class="flex flex-wrap gap-2" role="group" :aria-label="label('transform', 'Rotate and flip')">
      <Button type="button" variant="outline" size="sm" :is-disabled="locked" @click="rotate(-90)">{{
        label('left', 'Rotate left')
      }}</Button>
      <Button type="button" variant="outline" size="sm" :is-disabled="locked" @click="rotate(90)">{{
        label('right', 'Rotate right')
      }}</Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        :aria-pressed="value.flipHorizontal"
        :is-disabled="locked"
        @click="patch({ flipHorizontal: !value.flipHorizontal })"
        >{{ label('horizontal', 'Flip horizontal') }}</Button
      >
      <Button
        type="button"
        variant="outline"
        size="sm"
        :aria-pressed="value.flipVertical"
        :is-disabled="locked"
        @click="patch({ flipVertical: !value.flipVertical })"
        >{{ label('vertical', 'Flip vertical') }}</Button
      >
      <span class="self-center text-sm" aria-live="polite"
        >{{ value.rotate }}° · {{ outputSize.width }} × {{ outputSize.height }}</span
      >
    </div>
    <div class="grid gap-4 sm:grid-cols-2">
      <label class="space-y-1" :for="`${id}-width`"
        ><span>{{ label('width', 'Output width') }}</span
        ><NumberInput
          :id="`${id}-width`"
          :model-value="outputSize.width"
          :min="1"
          :max="maxDimension"
          :is-disabled="locked"
          @update:model-value="resize('width', $event)"
      /></label>
      <label class="space-y-1" :for="`${id}-height`"
        ><span>{{ label('height', 'Output height') }}</span
        ><NumberInput
          :id="`${id}-height`"
          :model-value="outputSize.height"
          :min="1"
          :max="maxDimension"
          :is-disabled="locked"
          @update:model-value="resize('height', $event)"
      /></label>
    </div>
    <label class="flex items-center gap-2"
      ><CheckboxInput v-model="isProportional" :is-disabled="locked" />{{
        label('proportional', 'Keep proportions')
      }}</label
    >
    <div class="flex flex-wrap gap-2" role="group" :aria-label="label('format', 'Output format')">
      <Button
        v-for="item in formats"
        :key="item"
        type="button"
        variant="outline"
        size="sm"
        :aria-pressed="value.output.format === item"
        :is-disabled="locked"
        @click="format(item)"
        >{{ item.toUpperCase() }}</Button
      >
    </div>
    <label class="max-w-sm space-y-1" :for="`${id}-quality`"
      ><span>{{ label('quality', 'Output quality (JPEG and WebP)') }}</span
      ><NumberInput
        :id="`${id}-quality`"
        :model-value="value.output.quality"
        :min="1"
        :max="100"
        :is-disabled="locked || value.output.format === 'png'"
        @update:model-value="quality"
    /></label>
    <label class="flex items-center gap-2"
      ><CheckboxInput
        :model-value="value.removeBackground"
        :is-disabled="locked || (!canRemoveBackground && !value.removeBackground)"
        @update:model-value="patch({ removeBackground: $event })"
      />{{ label('removeBackground', 'Remove background') }}</label
    >
    <p v-if="!canRemoveBackground" class="text-sm text-muted-foreground">
      {{ label('backgroundUnavailable', 'Background removal is unavailable for this image.') }}
    </p>
    <p v-if="error || validationMessage" role="alert" class="text-sm text-destructive-soft-foreground">
      {{ error || validationMessage }}
    </p>
    <p v-if="isBusy" role="status" class="text-sm">{{ label('busy', 'Processing image…') }}</p>
    <div class="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        :is-disabled="locked || Boolean(issue) || needsSourceReset"
        @click="request('preview')"
        >{{ label('previewAction', 'Preview edits') }}</Button
      >
      <Button type="button" :is-disabled="locked || Boolean(issue) || needsSourceReset" @click="request('apply')">{{
        label('apply', 'Apply as new image')
      }}</Button>
    </div>
  </section>
</template>
