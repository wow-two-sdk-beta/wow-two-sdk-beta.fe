<script setup lang="ts">
import { defineConfig, json } from '@wow-two-beta/ui-vue/foundation/config';
import { createFlagClient, useObjectFlag } from '@wow-two-beta/ui-vue/flags';
import { createAuthBridge } from '@wow-two-beta/ui-vue/auth';
import { createApiClient, ApiFailureFactory } from '@wow-two-beta/ui-vue/foundation/http';
import { shallowRef } from 'vue';
import { ExactNumber } from '@wow-two-beta/ui-vue/foundation/numbers';
import { ResultExtensions } from '@wow-two-beta/ui-vue/foundation/results';
import { useAppForm } from '@wow-two-beta/ui-vue/forms-engine/house';
import { useFieldArray } from '@wow-two-beta/ui-vue/forms-engine';
import { Button } from '@wow-two-beta/ui-vue/presentation/actions';
import { ExactNumberInput, TextInput, Field } from '@wow-two-beta/ui-vue/presentation/forms';
import { DataTable, type DataTableColumn } from '@wow-two-beta/ui-vue/presentation/display';

const decodeTitle = (value: unknown) =>
  typeof value === 'object' && value !== null && 'title' in value && typeof value.title === 'string'
    ? ResultExtensions.ok({ title: value.title })
    : ResultExtensions.fail('invalid');
const config = defineConfig({ view: json(decodeTitle, { defaultFactory: () => ({ title: '' }) }) }, { sources: [] });
config.view.title.toUpperCase();
const flags = createFlagClient();
flags.getObject('view', { title: '' }, decodeTitle).title.toUpperCase();
const view = useObjectFlag('view', { title: '' }, decodeTitle);
view.value.title.toUpperCase();
const bridge = createAuthBridge<{ id: string }>({ getIdentity: (user) => user.id });
const api = createApiClient({ scope: bridge.scope, onUnauthorized: bridge.onUnauthorized });
async function detailed(): Promise<void> {
  const response = await api.detailed.get('/title', {
    decode: (value) => ResultExtensions.mapFailure(decodeTitle(value), () => ApiFailureFactory.create('validation')),
  });
  if (response.ok) response.value.value.title.toUpperCase();
}
void detailed;

const result = ExactNumber.parse('9223372036854775807.01');
const amount = shallowRef<ExactNumber | null>(result.ok ? result.value : null);
type Item = { kind: 'link'; title: string } | { kind: 'counter'; count: number };
const form = useAppForm({
  defaultValues: { name: '', count: 1, links: [{ title: 'Example' }], items: [] as Item[] },
  onSubmit: async () => ResultExtensions.ok(undefined),
});
const links = useFieldArray<{ title: string }>(form, 'links');
const items = useFieldArray<Item>(form, 'items');
const counters = items.variant((item): item is Extract<Item, { kind: 'counter' }> => item.kind === 'counter');
const rows = [{ name: 'Ada', count: 1 }];
const columns: ReadonlyArray<DataTableColumn<(typeof rows)[number]>> = [
  { key: 'name', header: 'Name', accessor: (row) => row.name },
];
</script>

<template>
  <form id="consumer-form" @submit.prevent="form.handleSubmit">
    <form.Field name="name" v-slot="field">
      <Field :label="field.value.toUpperCase()">
        <TextInput
          v-model="field.value"
          name="name"
          form="consumer-form"
          autocomplete="name"
          @blur="field.onBlur"
          @input="(event) => event.currentTarget"
          @keydown="(event) => event.key.toUpperCase()"
        />
      </Field>
    </form.Field>
    <form.Field name="count" v-slot="field"
      ><span>{{ field.value.toFixed(2) }}</span></form.Field
    >
    <template v-for="row in links.rows" :key="row.key">
      <links.Field :index="row.index" name="title" v-slot="field"><TextInput v-model="field.value" /></links.Field>
    </template>
    <template v-for="row in items.rows" :key="row.key">
      <counters.Field v-if="counters.matches(row.index)" :index="row.index" name="count" v-slot="field">
        {{ field.value.toFixed(2) }}
      </counters.Field>
    </template>
    <ExactNumberInput
      v-model="amount"
      @invalid="
        (failure, draft) => {
          failure.code.toUpperCase();
          draft.toUpperCase();
        }
      "
    />
    <DataTable :data="rows" :columns="columns">
      <template #cell="{ row }">{{ row.name.toUpperCase() }}: {{ row.count.toFixed() }}</template>
    </DataTable>
    <Button type="submit">Save</Button>
  </form>
</template>
