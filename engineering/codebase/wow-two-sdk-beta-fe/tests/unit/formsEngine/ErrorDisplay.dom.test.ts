import { ResultExtensions } from '@src/foundation/results';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, type Component } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { AppFieldApi, AppForm, AppFormOptions, FormEngine, StandardSchemaV1 } from '@src/formsEngine';
import { houseFormEngine } from '@src/formsEngine/adapters/house';
import { tanstackFormEngine } from '@src/formsEngine/adapters/tanstack';

/*
 * Per-field error display. Validation is form-wide; a field shows its client error only once it was
 * blurred, after a submit attempt, or — under `validateOn: 'change'` — once it changed. Server errors
 * always show. The submit, server and scoped-gate cases run under both mounted Vue adapters. The
 * blur / change-time cases are house-only: the tanstack facade mounts no TanStack field instances, so
 * its `validateField` blur / change pass is a no-op and only submit and `validate()` populate errors.
 */

interface SignUp {
  readonly email: string;
  readonly password: string;
  readonly confirm: string;
}

const fields = ['email', 'password', 'confirm'] as const;
const wrappers: VueWrapper[] = [];

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});

async function settle(): Promise<void> {
  for (let index = 0; index < 30; index += 1) await Promise.resolve();
  await nextTick();
}

/** Required email + password, plus a cross-field rule that lands on `confirm`. */
const schema: StandardSchemaV1<SignUp, SignUp> = {
  '~standard': {
    version: 1,
    vendor: 'test',
    validate: (value) => {
      const input = value as SignUp;
      const issues: { path: string[]; message: string }[] = [];
      if (input.email === '') issues.push({ path: ['email'], message: 'Email is required' });
      if (input.password === '') issues.push({ path: ['password'], message: 'Password is required' });
      if (input.confirm !== input.password) issues.push({ path: ['confirm'], message: 'Passwords differ' });
      return issues.length > 0 ? { issues } : { value: input };
    },
  },
};

interface Mounted {
  readonly form: AppForm<SignUp>;
  readonly api: Record<(typeof fields)[number], AppFieldApi<string>>;
  /** The error text rendered under one field — empty when nothing displays. */
  readonly shown: (name: (typeof fields)[number]) => string;
}

function mountForm(engine: FormEngine, options: Partial<AppFormOptions<SignUp>> = {}): Mounted {
  let form!: AppForm<SignUp>;
  const api = {} as Record<(typeof fields)[number], AppFieldApi<string>>;
  const wrapper = mount(
    defineComponent({
      setup() {
        form = engine.useAppForm<SignUp>({
          defaultValues: { email: '', password: '', confirm: '' },
          schema,
          onSubmit: async () => ResultExtensions.ok(undefined),
          ...options,
        });
        return () =>
          h(
            'div',
            fields.map((name) =>
              h(
                form.Field as unknown as Component,
                { name, key: name },
                {
                  default: (field: AppFieldApi<string>) => {
                    api[name] = field;
                    return h('p', { 'data-error': name }, field.errors.join('|'));
                  },
                },
              ),
            ),
          );
      },
    }),
  );
  wrappers.push(wrapper);
  const shown = (name: (typeof fields)[number]): string => wrapper.get(`[data-error=${name}]`).text();
  return { form, api, shown };
}

for (const [name, engine] of [
  ['house', houseFormEngine],
  ['tanstack', tanstackFormEngine],
] as const) {
  describe(`${name} per-field error display`, () => {
    it('a submit attempt shows every error', async () => {
      const view = mountForm(engine, { validateOn: 'blur' });
      view.api.confirm.setValue('y');
      expect(await view.form.handleSubmit()).toBe(false);
      await settle();
      expect(view.shown('email')).toBe('Email is required');
      expect(view.shown('password')).toBe('Password is required');
      expect(view.shown('confirm')).toBe('Passwords differ');
    });

    it('a server error on an untouched field is visible', async () => {
      const view = mountForm(engine, { validateOn: 'blur' });
      view.form.setFieldErrors({ email: ['Already taken'] });
      await settle();
      expect(view.shown('email')).toBe('Already taken');
      expect(view.shown('password')).toBe('');
      expect(view.form.state.isValid).toBe(false);
    });

    it('a scoped validate() touches only the selected fields', async () => {
      const view = mountForm(engine);
      expect(await view.form.validate({ fields: ['email'] })).toBe(false);
      await settle();
      expect(view.shown('email')).toBe('Email is required');
      expect(view.api.email.isTouched).toBe(true);
      expect(view.api.password.isTouched).toBe(false);
      expect(view.shown('password')).toBe('');
    });
  });
}

describe('house blur and change-time error display', () => {
  const engine = houseFormEngine;

  it("validateOn 'blur': blurring one field shows only that field's error", async () => {
    const view = mountForm(engine, { validateOn: 'blur' });
    view.api.email.onBlur();
    await settle();
    expect(view.shown('email')).toBe('Email is required');
    expect(view.shown('password')).toBe('');
    expect(view.shown('confirm')).toBe('');
    expect(view.api.password.isTouched).toBe(false);
    expect(view.form.state.isValid).toBe(false);
  });

  it("validateOn 'blur': a change waits for its own blur, and fixing a touched field clears it", async () => {
    const view = mountForm(engine, { validateOn: 'blur' });
    view.api.email.onBlur();
    await settle();
    view.api.password.setValue('x');
    await settle();
    expect(view.shown('password')).toBe('');
    expect(view.shown('confirm')).toBe('');
    view.api.confirm.onBlur();
    await settle();
    expect(view.shown('confirm')).toBe('Passwords differ');
    expect(view.shown('password')).toBe('');
    view.api.email.setValue('a@b.c');
    await settle();
    expect(view.shown('email')).toBe('');
  });

  it("validateOn 'blur': a submit attempt after a single blur shows the rest", async () => {
    const view = mountForm(engine, { validateOn: 'blur' });
    view.api.email.onBlur();
    await settle();
    expect(view.shown('password')).toBe('');
    expect(await view.form.handleSubmit()).toBe(false);
    await settle();
    expect(view.shown('password')).toBe('Password is required');
  });

  it("validateOn 'change': only the changed field shows its error", async () => {
    const view = mountForm(engine, { validateOn: 'change' });
    view.api.email.setValue('a');
    await settle();
    view.api.email.setValue('');
    await settle();
    expect(view.shown('email')).toBe('Email is required');
    expect(view.shown('password')).toBe('');
    expect(view.shown('confirm')).toBe('');
    view.api.password.setValue('p');
    await settle();
    expect(view.shown('password')).toBe('');
    expect(view.shown('confirm')).toBe('');
    expect(view.api.email.isTouched).toBe(false);
  });

  it("validateOn 'submit' (default): nothing shows before the attempt", async () => {
    const view = mountForm(engine);
    view.api.email.onBlur();
    await settle();
    expect(view.shown('email')).toBe('');
    view.api.password.setValue('p');
    await settle();
    expect(view.shown('password')).toBe('');
    expect(view.shown('confirm')).toBe('');
    await view.form.handleSubmit();
    await settle();
    expect(view.shown('email')).toBe('Email is required');
    expect(view.shown('confirm')).toBe('Passwords differ');
  });

  it('a server error shows alone until the field with a hidden client error is reached', async () => {
    const view = mountForm(engine, { validateOn: 'blur' });
    view.api.password.onBlur();
    await settle();
    view.form.setFieldErrors({ email: ['Already taken'] });
    await settle();
    expect(view.shown('email')).toBe('Already taken');
    view.api.email.onBlur();
    await settle();
    expect(view.shown('email')).toBe('Email is required|Already taken');
  });

  it('validateOnMount seeds validity without displaying any field error', async () => {
    const view = mountForm(engine, { validateOnMount: true, validateOn: 'blur' });
    await settle();
    expect(view.form.state.isValid).toBe(false);
    for (const field of fields) expect(view.shown(field)).toBe('');
  });

  it('reset() hides errors again', async () => {
    const view = mountForm(engine, { validateOn: 'blur' });
    view.api.email.onBlur();
    await settle();
    expect(view.shown('email')).toBe('Email is required');
    view.form.reset();
    await settle();
    expect(view.api.email.isTouched).toBe(false);
    expect(view.shown('email')).toBe('');
  });
});
