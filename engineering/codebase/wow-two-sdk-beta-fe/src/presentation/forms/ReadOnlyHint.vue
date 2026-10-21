<script lang="ts">
export interface ReadOnlyHintProps {
  /** The element id the read-only control references from `aria-describedby`. */
  readonly id: string;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../foundation/i18n';
import { VisuallyHidden } from '../../foundation/primitives';

/** Renders the visually hidden "Read only" description of a read-only control whose role has no `aria-readonly`. */
defineOptions({ name: 'ReadOnlyHint' });

const props = defineProps<ReadOnlyHintProps>();

const locale = useLocale();
</script>

<template>
  <VisuallyHidden :id="props.id">{{ locale.t('Field.readOnly', undefined, 'Read only') }}</VisuallyHidden>
</template>
