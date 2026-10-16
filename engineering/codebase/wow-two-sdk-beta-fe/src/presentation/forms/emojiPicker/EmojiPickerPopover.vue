<script lang="ts">
import type { Placement } from '@floating-ui/vue';
import type { EmojiCatalogEntry } from '../../../domain/emoji';
import type { StorageBroker } from '../../../foundation/storage';
import type { CategoryNavVariant, EmojiPickerSizeInput, EmojiTileShape } from './EmojiPicker.variants';

/**
 * Defines props for the popover-hosted emoji picker.
 *
 * React wrote this as `extends Omit<EmojiPickerProps, 'value' | 'onChange'>`. The
 * forwarded picker props are spelled out instead: the SFC compiler has to generate
 * them as real props (they are forwarded by hand, not fallthrough attrs), and an
 * `Omit<…>` heritage over an imported interface is exactly what its type resolver
 * cannot follow.
 */
export interface EmojiPickerPopoverProps {
  /** The current emoji catalog entry, or `null` for none. The `v-model` binding target. */
  readonly modelValue?: EmojiCatalogEntry | null;

  /** The persistence contract backing the "recently used" list. */
  readonly storage: StorageBroker;

  /** The category-navigation affordance. Default `strip`. */
  readonly categoryNavVariant?: CategoryNavVariant;

  /** The element scale — one value for every element, or a per-element `{ search, nav, tile }`. Default `md`. */
  readonly size?: EmojiPickerSizeInput;

  /** The emoji-tile frame — rounded chip or circle. Default `rounded`. */
  readonly tileShape?: EmojiTileShape;

  /** The scrollable tile viewport's height, in tile rows. Default `6`. */
  readonly rowsCount?: number;

  /** The heading rendered above the picker. Default `Emoji`. */
  readonly label?: string;

  /** When `true` and no emoji has been used yet, opens on the first real category. Default `false`. */
  readonly showFirstCategoryWhenRecentsEmpty?: boolean;

  /** The scrollbar thumb color for the tile viewport — any CSS color. */
  readonly scrollThumbColor?: string;

  /** The popover placement relative to the trigger. Default `bottom`. */
  readonly placement?: Placement;

  /** The open state, controlled. The `v-model:open` binding target. */
  readonly open?: boolean;

  /** The initial open state when uncontrolled. Default `false`. */
  readonly defaultOpen?: boolean;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { useTemplateRef } from 'vue';
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed } from 'vue';
import { ColorTone, SizePreset } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { FormControlProvider, useFormControl } from '../../../foundation/primitives';
import { Button, ButtonShape, ButtonVariant } from '../../actions';
import { Popover, PopoverContent, PopoverTrigger } from '../../overlays';
import EmojiPicker from './EmojiPicker.vue';

/** Renders a trigger opening a popover that holds the full `EmojiPicker` — the chat/toolbar-friendly variant. */
/* Picking an entry emits it via `@update:modelValue` / `v-model` (consumers read `entry.glyph`) and closes the
   popover. Size is out of scope here — compose `EmojiSizePicker` separately for a per-emoji scale. */
defineOptions({ name: 'EmojiPickerPopover' });

/** A custom trigger replacing the default emoji-icon `Button`. */
defineSlots<{ trigger?(): unknown }>();

const props = withDefaults(defineProps<EmojiPickerPopoverProps>(), {
  placement: 'bottom',
  defaultOpen: false,
  /* `useControlled` keys on `=== undefined`, and Vue casts an absent `boolean` prop to `false`:
     without these the popover would read as "controlled, and closed" and never open. */
  open: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader picks an emoji in the panel — the `v-model` half. */
  'update:modelValue': [entry: EmojiCatalogEntry | null];
  /** Fires when the popover opens or closes — the `v-model:open` half. */
  'update:open': [open: boolean];
}>();

const openCtl = useControlled<boolean>({
  controlled: () => props.open,
  default: () => props.defaultOpen,
  onChange: (next) => {
    emit('update:open', next);
  },
});

const isOpenNow = computed(() => openCtl.value.value);
const currentValue = computed(() => props.modelValue ?? null);

/* Inherits id/invalid/labelledby/describedby from a surrounding <Field> for the DEFAULT trigger
   (`Button` already inherits `isDisabled` from the context itself). A custom trigger slot owns
   its own form-control wiring. `aria-labelledby` wins the accessible-name computation, so
   "Choose emoji" stays the fallback when there is no Field label. */
const field = useFormControl();

const fieldId = computed(() => field?.id);
const fieldLabelledBy = computed(() => field?.labelledBy);
const fieldDescribedBy = computed(() => field?.describedBy);
const fieldInvalid = computed(() => field?.isInvalid || undefined);

const triggerGlyph = computed(() => currentValue.value?.glyph ?? '🙂');

function onPick(entry: EmojiCatalogEntry | null): void {
  if (field?.isDisabled || field?.isReadOnly) return;
  emit('update:modelValue', entry);
  if (entry !== null) openCtl.setValue(false);
}

const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
const formResetRevision = useNativeFormReset(formResetAnchor, () => {
  openCtl.reset();
  if (currentValue.value !== null) emit('update:modelValue', null);
});

const locale = useLocale();
</script>

<template>
  <Popover :key="formResetRevision" :open="isOpenNow" :placement="placement" @update:open="openCtl.setValue($event)">
    <PopoverTrigger as-child :disabled="field?.isDisabled || field?.isReadOnly">
      <slot name="trigger">
        <Button
          :variant="ButtonVariant.Ghost"
          :tone="ColorTone.Neutral"
          :size="SizePreset.Sm"
          :shape="ButtonShape.Square"
          :id="fieldId"
          :aria-label="locale.t('EmojiPickerPopover.chooseEmoji', undefined, 'Choose emoji')"
          :aria-labelledby="fieldLabelledBy"
          :aria-describedby="fieldDescribedBy"
          :aria-invalid="fieldInvalid"
        >
          {{ triggerGlyph }}
        </Button>
      </slot>
    </PopoverTrigger>
    <PopoverContent class="w-80" padding="sm">
      <!--
        The panel's SearchInput is a sub-control of the picker, not the field's control — a bare
        FormControlProvider keeps it from adopting the surrounding Field's id (which now names
        the trigger; adoption would duplicate it) or its chrome.
      -->
      <FormControlProvider :is-disabled="field?.isDisabled" :is-read-only="field?.isReadOnly">
        <EmojiPicker
          :model-value="currentValue"
          :storage="storage"
          :category-nav-variant="categoryNavVariant"
          :size="size"
          :tile-shape="tileShape"
          :rows-count="rowsCount"
          :label="label"
          :show-first-category-when-recents-empty="showFirstCategoryWhenRecentsEmpty"
          :scroll-thumb-color="scrollThumbColor"
          @update:modelValue="onPick"
        />
      </FormControlProvider>
    </PopoverContent>
    <input
      ref="formResetAnchor"
      type="hidden"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      aria-hidden="true"
    />
  </Popover>
</template>
