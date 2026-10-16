<script setup lang="ts">
import { ExactNumberInput } from '@wow-two-beta/ui-vue/presentation/forms';
import { useAppForm } from '@wow-two-beta/ui-vue/forms-engine/house';
import { ResultExtensions } from '@wow-two-beta/ui-vue/foundation/results';
const form = useAppForm({ defaultValues: { title: '' }, onSubmit: async () => ResultExtensions.ok(undefined) });
</script>
<template>
  <ExactNumberInput :model-value="1" />
  <form.Field name="title" v-slot="field">{{ field.value.toFixed() }}</form.Field>
</template>
