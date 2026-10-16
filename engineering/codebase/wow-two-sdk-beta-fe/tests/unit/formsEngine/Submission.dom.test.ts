import { ExactNumber } from '@src/foundation/numbers';
import { LosslessJson } from '@src/foundation/json';
import { Temporal } from 'temporal-polyfill';
import { object, string } from '@src/foundation/validators';
import { AppErrorFactory, ResultExtensions } from '@src/foundation/results';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { AppForm, AppFormOptions, FormEngine, StandardSchemaV1 } from '@src/formsEngine';
import { houseFormEngine } from '@src/formsEngine/adapters/house';
import { tanstackFormEngine } from '@src/formsEngine/adapters/tanstack';

interface Input {
  readonly amount: string;
}
interface Output {
  readonly amount: number;
}
const wrappers: VueWrapper[] = [];

afterEach(() => {
  vi.useRealTimers();
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function settle(): Promise<void> {
  for (let index = 0; index < 30; index += 1) await Promise.resolve();
  await nextTick();
}

function createForm<TOutput = Input, TValues extends object = Input>(
  engine: FormEngine,
  options: AppFormOptions<TValues, TOutput>,
): AppForm<TValues> {
  let form!: AppForm<TValues>;
  wrappers.push(
    mount(
      defineComponent({
        setup() {
          form = engine.useAppForm(options);
          return () => h('div');
        },
      }),
    ),
  );
  return form;
}

const schema: StandardSchemaV1<Input, Output> = {
  '~standard': {
    version: 1,
    vendor: 'test',
    validate: (value) => {
      const amount = (value as Input).amount.trim();
      return amount === '' || !Number.isFinite(Number(amount))
        ? { issues: [{ path: ['amount'], message: 'Enter an amount' }] }
        : { value: { amount: Number(amount) } };
    },
  },
};

for (const [name, engine] of [
  ['house', houseFormEngine],
  ['tanstack', tanstackFormEngine],
] as const) {
  describe(`${name} form submission contract`, () => {
    it('preserves exact numeric leaves through dirty tracking, submission and reset', async () => {
      const exact = (token: string): ExactNumber => {
        const result = ExactNumber.parse(token);
        if (!result.ok) throw new Error('Invalid fixture');
        return result.value;
      };
      const initial = exact('1.0');
      const submit = vi.fn(async (value: { amount: ExactNumber }) => {
        expect(ExactNumber.isExactNumber(value.amount)).toBe(true);
        return ResultExtensions.ok(LosslessJson.stringify(value));
      });
      const form = createForm(engine, { defaultValues: { amount: initial }, onSubmit: submit });
      expect(form.values.amount).toBe(initial);
      form.setValue('amount', exact('1.00'));
      await settle();
      expect(form.state.isDirty).toBe(false);
      const edited = exact('12345678901234567890.12345678901234567890');
      form.setValue('amount', edited);
      await settle();
      expect(form.state.isDirty).toBe(true);
      expect(await form.handleSubmit()).toBe(true);
      expect(submit.mock.calls[0]?.[0].amount).toBe(edited);
      expect(await submit.mock.results[0]?.value).toEqual({
        ok: true,
        value: { ok: true, value: '{"amount":12345678901234567890.12345678901234567890}' },
      });
      await settle();
      expect(form.state.isDirty).toBe(false);
      form.reset({ amount: initial });
      expect(form.values.amount).toBe(initial);
    });

    it('submits parsed output while retaining editable input', async () => {
      const submit = vi.fn(async (value: Output) => ResultExtensions.ok(value));
      const form = createForm(engine, { defaultValues: { amount: ' 12 ' }, schema, onSubmit: submit });
      expect(await form.handleSubmit()).toBe(true);
      expect(submit).toHaveBeenCalledExactlyOnceWith({ amount: 12 }, { signal: expect.any(AbortSignal) });
      expect(form.values.amount).toBe(' 12 ');
    });

    it('preserves native-validator input/output types and transformations', async () => {
      const native = object({ amount: string().transform(Number) });
      const submit = vi.fn(async (value: Output) => ResultExtensions.ok(value));
      const form = createForm<Output>(engine, { defaultValues: { amount: '12' }, schema: native, onSubmit: submit });
      expect(await form.handleSubmit()).toBe(true);
      expect(submit).toHaveBeenCalledExactlyOnceWith({ amount: 12 }, { signal: expect.any(AbortSignal) });
      expect(form.values.amount).toBe('12');
    });

    it('blocks invalid editing input instead of casting it to output', async () => {
      const submit = vi.fn(async (value: Output) => ResultExtensions.ok(value));
      const form = createForm(engine, { defaultValues: { amount: '' }, schema, onSubmit: submit });
      expect(await form.handleSubmit()).toBe(false);
      expect(submit).not.toHaveBeenCalled();
      expect(form.state.isValid).toBe(false);
    });

    it('submits the validated snapshot when input changes during async validation', async () => {
      const gate = deferred<void>();
      const asyncSchema: StandardSchemaV1<Input, Output> = {
        '~standard': {
          ...schema['~standard'],
          validate: async (value) => {
            await gate.promise;
            return schema['~standard'].validate(value);
          },
        },
      };
      const submit = vi.fn(async (value: Output) => ResultExtensions.ok(value));
      const form = createForm(engine, { defaultValues: { amount: '12' }, schema: asyncSchema, onSubmit: submit });
      const pending = form.handleSubmit();
      await settle();
      form.setValue('amount', 'not valid');
      gate.resolve();
      expect(await pending).toBe(true);
      expect(submit).toHaveBeenCalledExactlyOnceWith({ amount: 12 }, { signal: expect.any(AbortSignal) });
      expect(form.values.amount).toBe('not valid');
      expect(form.state.isDirty).toBe(true);
    });

    it('coalesces edits during autosave into one trailing latest snapshot', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const first = deferred<void>();
      const submit = vi.fn(async (value: Input) => {
        if (submit.mock.calls.length === 1) await first.promise;
        return ResultExtensions.ok(value);
      });
      const form = createForm(engine, {
        defaultValues: { amount: '0' },
        submitOn: 'change',
        submitDebounceMs: 10,
        onSubmit: submit,
      });
      form.setValue('amount', '1');
      await vi.advanceTimersByTimeAsync(11);
      expect(submit).toHaveBeenCalledTimes(1);
      form.setValue('amount', '2');
      await vi.advanceTimersByTimeAsync(11);
      form.setValue('amount', '3');
      await vi.advanceTimersByTimeAsync(11);
      expect(submit).toHaveBeenCalledTimes(1);
      first.resolve();
      await vi.advanceTimersByTimeAsync(2);
      await settle();
      expect(submit.mock.calls.map(([value]) => value.amount)).toEqual(['1', '3']);
      expect(form.state.isDirty).toBe(false);
    });

    it('coalesces repeated manual submits for the same snapshot', async () => {
      const gate = deferred<void>();
      const submit = vi.fn(async (value: Input) => {
        await gate.promise;
        return ResultExtensions.ok(value);
      });
      const form = createForm(engine, { defaultValues: { amount: '1' }, onSubmit: submit });
      const first = form.handleSubmit();
      const second = form.handleSubmit();
      await vi.waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
      gate.resolve();
      expect(await first).toBe(true);
      expect(await second).toBe(true);
    });

    it('restores the most recently loaded baseline on bare reset', () => {
      const form = createForm(engine, {
        defaultValues: { amount: '0' },
        onSubmit: async () => ResultExtensions.ok(undefined),
      });
      form.reset({ amount: '20' });
      form.setValue('amount', '30');
      form.reset();
      expect(form.values.amount).toBe('20');
      expect(form.state.isDirty).toBe(false);
    });

    it('suppresses stale completion state after reset', async () => {
      const gate = deferred<void>();
      const form = createForm(engine, {
        defaultValues: { amount: '1' },
        onSubmit: async () => {
          await gate.promise;
          return ResultExtensions.ok(undefined);
        },
      });
      const pending = form.handleSubmit();
      await settle();
      form.reset({ amount: '20' });
      gate.resolve();
      expect(await pending).toBe(false);
      expect(form.state.isSubmitSuccessful).toBeNull();
      expect(form.values.amount).toBe('20');
      expect(form.state.isDirty).toBe(false);
      expect(form.state.isSubmitting).toBe(false);
    });

    it('does not submit after reset interrupts async parsing', async () => {
      const gate = deferred<void>();
      const asyncSchema: StandardSchemaV1<Input, Output> = {
        '~standard': {
          ...schema['~standard'],
          validate: async (value) => {
            await gate.promise;
            return schema['~standard'].validate(value);
          },
        },
      };
      const submit = vi.fn(async (value: Output) => ResultExtensions.ok(value));
      const form = createForm(engine, { defaultValues: { amount: '12' }, schema: asyncSchema, onSubmit: submit });
      const pending = form.handleSubmit();
      await settle();
      form.reset({ amount: '20' });
      gate.resolve();
      expect(await pending).toBe(false);
      expect(submit).not.toHaveBeenCalled();
    });

    it('keeps an expected failed save dirty without retrying automatically', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const submit = vi.fn(async () => ResultExtensions.fail(AppErrorFactory.conflict()));
      const form = createForm(engine, { defaultValues: { amount: '0' }, submitOn: 'change', onSubmit: submit });
      form.setValue('amount', '1');
      await vi.advanceTimersByTimeAsync(5);
      expect(submit).toHaveBeenCalledTimes(1);
      expect(form.state.isDirty).toBe(true);
      expect(form.state.submitError?.type).toBe(AppErrorFactory.conflict().type);
      await vi.advanceTimersByTimeAsync(1000);
      expect(submit).toHaveBeenCalledTimes(1);
    });

    it('restores the confirmed saved snapshot while preserving newer edits', async () => {
      const gate = deferred<void>();
      const form = createForm(engine, {
        defaultValues: { amount: '0' },
        onSubmit: async () => {
          await gate.promise;
          return ResultExtensions.ok(undefined);
        },
      });
      form.setValue('amount', '1');
      const pending = form.handleSubmit();
      await vi.waitFor(() => expect(form.state.isSubmitting).toBe(true));
      form.setValue('amount', '2');
      gate.resolve();
      expect(await pending).toBe(true);
      expect(form.values.amount).toBe('2');
      expect(form.state.isDirty).toBe(true);
      form.reset();
      expect(form.values.amount).toBe('1');
    });

    it('cancels queued autosave when its owning component unmounts', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const gate = deferred<void>();
      const submit = vi.fn(async () => {
        await gate.promise;
        return ResultExtensions.ok(undefined);
      });
      const form = createForm(engine, { defaultValues: { amount: '0' }, submitOn: 'change', onSubmit: submit });
      form.setValue('amount', '1');
      await vi.advanceTimersByTimeAsync(5);
      expect(submit).toHaveBeenCalledTimes(1);
      form.setValue('amount', '2');
      await vi.advanceTimersByTimeAsync(5);
      wrappers.pop()?.unmount();
      gate.resolve();
      await vi.advanceTimersByTimeAsync(5);
      expect(submit).toHaveBeenCalledTimes(1);
    });

    it('discards invalid validation results after reset changes the generation', async () => {
      const gate = deferred<void>();
      const asyncSchema: StandardSchemaV1<Input, Output> = {
        '~standard': {
          ...schema['~standard'],
          validate: async (value) => {
            await gate.promise;
            return schema['~standard'].validate(value);
          },
        },
      };
      const form = createForm(engine, {
        defaultValues: { amount: '' },
        schema: asyncSchema,
        onSubmit: async () => ResultExtensions.ok(undefined),
      });
      const pending = form.handleSubmit();
      await settle();
      form.reset({ amount: '20' });
      gate.resolve();
      expect(await pending).toBe(false);
      expect(form.state.isValid).toBe(true);
    });

    it('serializes a replacement submission after reset without dropping it', async () => {
      const gate = deferred<void>();
      const submit = vi.fn(async (value: Input) => {
        if (submit.mock.calls.length === 1) await gate.promise;
        return ResultExtensions.ok(value);
      });
      const form = createForm(engine, { defaultValues: { amount: '1' }, onSubmit: submit });
      const first = form.handleSubmit();
      await vi.waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
      form.reset({ amount: '20' });
      form.setValue('amount', '30');
      const next = form.handleSubmit();
      gate.resolve();
      expect(await next).toBe(true);
      await first;
      expect(submit.mock.calls.map(([value]) => value.amount)).toEqual(['1', '30']);
      expect(form.state.isDirty).toBe(false);
    });

    it('detaches nested and Date snapshots without damaging opaque values', async () => {
      class Choice {
        constructor(readonly id: string) {}
      }
      interface Nested {
        rows: Array<{ amount: string }>;
        date: Date;
        instant: Temporal.Instant;
        file: File;
        choice: Choice;
      }
      const gate = deferred<void>();
      const instant = Temporal.Instant.from('2026-09-10T00:00:00Z');
      const file = new File(['content'], 'sample.txt');
      const choice = new Choice('stable');
      const defaults: Nested = {
        rows: [{ amount: '12' }],
        date: new Date('2026-09-10T00:00:00Z'),
        instant,
        file,
        choice,
      };
      const nestedSchema: StandardSchemaV1<Nested> = {
        '~standard': {
          version: 1,
          vendor: 'test',
          validate: async (value) => {
            await gate.promise;
            return { value: value as Nested };
          },
        },
      };
      const submit = vi.fn(async (value: Nested) => ResultExtensions.ok(value));
      const form = createForm<Nested, Nested>(engine, {
        defaultValues: defaults,
        schema: nestedSchema,
        onSubmit: submit,
      });
      const pending = form.handleSubmit();
      await settle();
      // Neither caller-held defaults nor an unsupported direct nested write may alter the pending parse.
      defaults.rows[0]!.amount = 'external edit';
      defaults.date.setUTCFullYear(2040);
      form.values.rows[0]!.amount = 'direct edit';
      form.values.date.setUTCFullYear(2030);
      gate.resolve();
      expect(await pending).toBe(true);
      const submitted = submit.mock.calls[0]?.[0];
      expect(submitted?.rows).toEqual([{ amount: '12' }]);
      expect(submitted?.date.toISOString()).toBe('2026-09-10T00:00:00.000Z');
      expect(submitted?.date).not.toBe(form.values.date);
      expect(submitted?.instant).toBe(instant);
      expect(submitted?.file).toBe(file);
      expect(submitted?.choice).toBe(choice);
      expect(submitted?.choice).toBeInstanceOf(Choice);
      expect(form.values.rows[0]?.amount).toBe('direct edit');
      expect(form.state.isDirty).toBe(true);
      form.reset();
      expect(form.values.rows[0]?.amount).toBe('12');
      expect(form.values.date.getUTCFullYear()).toBe(2026);
      form.setValue('instant', Temporal.Instant.from('2026-09-11T00:00:00Z'));
      expect(form.state.isDirty).toBe(true);
    });

    it.each(['sync', 'async'] as const)(
      'releases validation and submit latches after a %s schema exception',
      async (timing) => {
        let throws = true;
        const throwingSchema: StandardSchemaV1<Input> = {
          '~standard': {
            version: 1,
            vendor: 'test',
            validate: (value) => {
              if (!throws) return { value: value as Input };
              if (timing === 'async') return Promise.reject(new Error('validator crashed'));
              throw new Error('validator crashed');
            },
          },
        };
        const submit = vi.fn(async (value: Input) => ResultExtensions.ok(value));
        const form = createForm(engine, { defaultValues: { amount: '1' }, schema: throwingSchema, onSubmit: submit });
        expect(await form.handleSubmit()).toBe(false);
        expect(form.state.isValidating).toBe(false);
        expect(form.state.isSubmitting).toBe(false);
        expect(submit).not.toHaveBeenCalled();
        throws = false;
        expect(await form.handleSubmit()).toBe(true);
        expect(form.state.isValidating).toBe(false);
        expect(submit).toHaveBeenCalledExactlyOnceWith({ amount: '1' }, { signal: expect.any(AbortSignal) });
      },
    );
  });
}

for (const [name, engine] of [
  ['house', houseFormEngine],
  ['tanstack', tanstackFormEngine],
] as const) {
  describe(`${name} scoped validation and request lifecycle`, () => {
    it('gates selected fields and an explicit step schema while final submit retains full validation', async () => {
      const submit = vi.fn(async () => ResultExtensions.ok(undefined));
      const full: StandardSchemaV1<{ first: string; second: string }> = {
        '~standard': {
          version: 1,
          vendor: 'test',
          validate: (value) => {
            const input = value as { first: string; second: string };
            const issues = Object.entries(input)
              .filter(([, entry]) => !entry)
              .map(([key]) => ({ path: [key], message: 'Required' }));
            return issues.length ? { issues } : { value: input };
          },
        },
      };
      const form = createForm(engine, {
        defaultValues: { first: 'ready', second: '' },
        schema: full,
        onSubmit: submit,
      });
      expect(await form.validate()).toBe(false);
      expect(await form.validate({ fields: ['first'] })).toBe(true);
      expect(await form.validate({ fields: ['second'] })).toBe(false);
      expect(form.state.isValid).toBe(false);
      const step: StandardSchemaV1<{ first: string; second: string }> = {
        '~standard': {
          version: 1,
          vendor: 'step',
          validate: (value) => ({ value: value as { first: string; second: string } }),
        },
      };
      expect(await form.validate({ schema: step, fields: ['second'] })).toBe(true);
      expect(form.state.isValid).toBe(true);
      expect(await form.handleSubmit()).toBe(false);
      expect(submit).not.toHaveBeenCalled();
    });

    it('retains root cross-field errors and rejects a stale asynchronous step gate', async () => {
      const gate = deferred<StandardSchemaV1.Result<Input>>();
      const form = createForm(engine, {
        defaultValues: { amount: '1' },
        onSubmit: async () => ResultExtensions.ok(undefined),
      });
      const step: StandardSchemaV1<Input> = {
        '~standard': { version: 1, vendor: 'step', validate: () => gate.promise },
      };
      const pending = form.validate({ schema: step, fields: ['amount'] });
      expect(form.state.isValidating).toBe(true);
      form.setValue('amount', '2');
      gate.resolve({ issues: [{ message: 'Cross-field rule' }] });
      expect(await pending).toBe(false);
      await vi.waitFor(() => expect(form.state.isValidating).toBe(false));
      expect(form.state.isValid).toBe(true);
      const root: StandardSchemaV1<Input> = {
        '~standard': { version: 1, vendor: 'step', validate: () => ({ issues: [{ message: 'Cross-field rule' }] }) },
      };
      expect(await form.validate({ schema: root, fields: ['amount'] })).toBe(false);
      expect(form.state.isValid).toBe(false);
    });

    it('aborts ignored transports, keeps edits dirty, and permits a new attempt', async () => {
      const old = deferred<ReturnType<typeof ResultExtensions.ok>>();
      let signal: AbortSignal | undefined;
      let calls = 0;
      const form = createForm(engine, {
        defaultValues: { amount: '1' },
        onSubmit: async (value, context) => {
          signal = context.signal;
          return ++calls === 1 ? old.promise : ResultExtensions.ok(value);
        },
      });
      form.setValue('amount', '2');
      const pending = form.handleSubmit();
      await vi.waitFor(() => expect(form.state.isSubmitting).toBe(true));
      const firstSignal = signal;
      form.cancelSubmit();
      expect(firstSignal?.aborted).toBe(true);
      expect(await pending).toBe(false);
      expect(form.state.submitError?.type).toBe('cancelled');
      expect(form.state.isDirty).toBe(true);
      expect(form.state.isSubmitting).toBe(false);
      expect(await form.handleSubmit()).toBe(true);
      old.resolve(ResultExtensions.ok(undefined));
      await settle();
      expect(form.state.isSubmitSuccessful).toBe(true);
      expect(form.state.submitError).toBe(null);
    });

    it('invalidates session work during schema validation without later sending the old request', async () => {
      const gate = deferred<StandardSchemaV1.Result<Input>>();
      let first = true;
      const submit = vi.fn(async () => ResultExtensions.ok(undefined));
      const form = createForm(engine, {
        defaultValues: { amount: 'old' },
        onSubmit: submit,
        schema: {
          '~standard': {
            version: 1,
            vendor: 'test',
            validate: (value) => {
              if (first) {
                first = false;
                return gate.promise;
              }
              return { value: value as Input };
            },
          },
        },
      });
      const pending = form.handleSubmit();
      await settle();
      form.invalidateSession({ amount: 'new' });
      expect(await pending).toBe(false);
      expect(form.values.amount).toBe('new');
      expect(await form.handleSubmit()).toBe(true);
      gate.resolve({ issues: [{ path: ['amount'], message: 'Old session error' }] });
      await settle();
      expect(submit).toHaveBeenCalledTimes(1);
      expect(form.state.isValid).toBe(true);
      expect(form.state.isSubmitSuccessful).toBe(true);
    });

    it('focuses failed manual submissions after rendering, with summary fallback and no autosave focus', async () => {
      const root = document.createElement('form');
      document.body.append(root);
      const input = document.createElement('input');
      const disabled = document.createElement('input');
      disabled.disabled = true;
      disabled.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-invalid', 'true');
      const summary = document.createElement('div');
      summary.tabIndex = -1;
      summary.setAttribute('data-form-error-summary', '');
      root.append(disabled, input, summary);
      try {
        const form = createForm<Output>(engine, {
          defaultValues: { amount: '' },
          schema,
          focusRoot: () => root,
          onSubmit: async () => ResultExtensions.ok(undefined),
          submitOn: 'change',
        });
        expect(await form.handleSubmit()).toBe(false);
        expect(document.activeElement).toBe(input);
        input.disabled = true;
        expect(await form.handleSubmit()).toBe(false);
        expect(document.activeElement).toBe(summary);
        input.disabled = false;
        disabled.disabled = false;
        disabled.focus();
        form.setValue('amount', 'bad');
        await new Promise((resolve) => setTimeout(resolve, 15));
        expect(document.activeElement).toBe(disabled);
      } finally {
        root.remove();
      }
    });
  });
}
