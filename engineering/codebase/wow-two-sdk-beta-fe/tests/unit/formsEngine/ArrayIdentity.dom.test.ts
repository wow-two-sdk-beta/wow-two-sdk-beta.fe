import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { ResultExtensions } from '@src/foundation/results';
import { useFieldArray, type AppForm, type FormEngine, type StandardSchemaV1 } from '@src/formsEngine';
import { houseFormEngine } from '@src/formsEngine/adapters/house';
import { tanstackFormEngine } from '@src/formsEngine/adapters/tanstack';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});
interface Values {
  rows: { text: string; nested: { value: string }[] }[];
}
const defaults = (): Values => ({
  rows: [
    { text: 'a', nested: [{ value: 'first' }] },
    { text: 'b', nested: [{ value: 'second' }] },
  ],
});

for (const [name, engine] of [
  ['house', houseFormEngine],
  ['tanstack', tanstackFormEngine],
] as const) {
  describe(`${name} canonical row identity`, () => {
    function create(schema?: StandardSchemaV1<Values>): AppForm<Values> {
      let form!: AppForm<Values>;
      wrappers.push(
        mount(
          defineComponent({
            setup() {
              form = (engine as FormEngine).useAppForm({
                defaultValues: defaults(),
                schema,
                onSubmit: async () => ResultExtensions.ok(undefined),
              });
              return () => h('div');
            },
          }),
        ),
      );
      return form;
    }
    it('shares identity between bindings and direct operations, including nested arrays', async () => {
      const form = create();
      let first!: ReturnType<typeof useFieldArray<Values['rows'][number]>>;
      let second!: typeof first;
      wrappers.push(
        mount(
          defineComponent({
            setup() {
              first = useFieldArray(form, 'rows');
              second = useFieldArray(form, 'rows');
              return () => h('div');
            },
          }),
        ),
      );
      const initial = first.rows.map((row) => row.key);
      const nestedA = form.array('rows[0].nested').keys[0];
      const nestedB = form.array('rows[1].nested').keys[0];
      form.array('rows').swap(0, 1);
      await nextTick();
      expect(first.rows.map((row) => row.key)).toEqual([initial[1], initial[0]]);
      expect(second.rows).toEqual(first.rows);
      expect(form.array('rows[0].nested').keys[0]).toBe(nestedB);
      expect(form.array('rows[1].nested').keys[0]).toBe(nestedA);
      form.setValue('rows[0].text', 'edited');
      expect(first.rows.map((row) => row.key)).toEqual([initial[1], initial[0]]);
      form.setValue('rows[0]', { text: 'replacement', nested: [] });
      expect(first.rows[0]?.key).not.toBe(initial[1]);
      const beforeReset = first.rows.map((row) => row.key);
      form.reset(defaults());
      expect(first.rows.every((row) => !beforeReset.includes(row.key))).toBe(true);
      expect(second.rows).toEqual(first.rows);
    });
    it('ignores invalid indices without changing values or row identities', () => {
      const form = create();
      const array = form.array('rows');
      const keys = [...array.keys];
      array.remove(-1);
      array.swap(0, 3);
      array.move(NaN, 1);
      array.insert(0.5, {});
      expect(form.values).toEqual(defaults());
      expect(array.keys).toEqual(keys);
    });
    it('does not publish stale async schema errors after values change', async () => {
      let release!: () => void;
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      const schema: StandardSchemaV1<Values> = {
        '~standard': {
          version: 1,
          vendor: 'test',
          validate: async (value) => {
            await pending;
            if ((value as Values).rows[0]?.text !== 'a') return { value: value as Values };
            return { issues: [{ path: ['rows', 0, 'text'], message: 'Old value is invalid' }] };
          },
        },
      };
      const form = create(schema);
      const validation = form.validate();
      form.setValue('rows[0].text', 'replacement');
      release();
      expect(await validation).toBe(false);
      expect(form.state.isValid).toBe(true);
    });
    it('rejects a whole-form validation result after the validated inputs changed', async () => {
      let release!: () => void;
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      const schema: StandardSchemaV1<Values> = {
        '~standard': {
          version: 1,
          vendor: 'test',
          validate: async (value) => {
            await pending;
            return { value: value as Values };
          },
        },
      };
      const form = create(schema);
      const validation = form.validate();
      form.setValue('rows[0].text', 'new');
      release();
      expect(await validation).toBe(false);
    });
  });
}
