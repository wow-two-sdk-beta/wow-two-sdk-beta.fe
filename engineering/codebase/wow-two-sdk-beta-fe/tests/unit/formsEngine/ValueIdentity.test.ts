import { describe, expect, it } from 'vitest';
import { deepEqual } from '@src/formsEngine/DeepEqual';
import { snapshotFormValues } from '@src/formsEngine/FormSnapshot';
import { getPath, hasPath, setPath, resultToFieldErrors, resolveSubmitFailure } from '@src/formsEngine';
import { AppErrorFactory, ResultExtensions } from '@src/foundation/results';
import { createHouseFormEngine } from '@src/formsEngine/adapters/house/HouseFormCore';

describe('form value identity', () => {
  it('compares snapshot cycles without losing unequal leaves', () => {
    const value: { title: string; self?: unknown } = { title: 'original' };
    value.self = value;
    const copy = snapshotFormValues(value);
    expect(deepEqual(value, copy)).toBe(true);
    copy.title = 'changed';
    expect(deepEqual(value, copy)).toBe(false);
  });

  it('includes enumerable symbols and sparse array slots', () => {
    const key = Symbol('value');
    expect(deepEqual({ [key]: 1 }, { [key]: 2 })).toBe(false);
    expect(deepEqual(new Array(1), ['changed'])).toBe(false);
    expect(deepEqual(new Array(1), new Array(1))).toBe(true);
  });

  it('marks replacement files dirty even when their metadata matches', () => {
    const first = new File(['abc'], 'draft.txt', { lastModified: 1 });
    const second = new File(['xyz'], 'draft.txt', { lastModified: 1 });
    expect(deepEqual(first, first)).toBe(true);
    expect(deepEqual(first, second)).toBe(false);
    const form = createHouseFormEngine(() => ({
      defaultValues: { file: first },
      onSubmit: async () => ResultExtensions.ok(undefined),
    }));
    form.setValue('file', second);
    expect(form.getFormState().isDirty).toBe(true);
    form.dispose();
  });
});

describe('form data keys', () => {
  it('reads only owned paths and writes prototype-named keys as data', () => {
    expect(hasPath({}, 'constructor')).toBe(false);
    expect(hasPath({ rows: new Array(1) }, 'rows[0]')).toBe(false);
    expect(getPath({}, '__proto__')).toBeUndefined();
    const value = setPath({}, '__proto__.title', 'kept');
    expect(Object.getPrototypeOf(value)).toBe(Object.prototype);
    expect(Object.hasOwn(value, '__proto__')).toBe(true);
    expect(getPath(value, '__proto__.title')).toBe('kept');
  });

  it('preserves validation and server messages for prototype-named fields', () => {
    const errors = resultToFieldErrors({
      issues: [
        { path: ['constructor'], message: 'required' },
        { path: ['__proto__'], message: 'invalid' },
      ],
    });
    expect(errors.constructor).toEqual(['required']);
    expect(errors.__proto__).toEqual(['invalid']);
    const resolved = resolveSubmitFailure(
      AppErrorFactory.validation(),
      () => errors,
      (path) => path,
      () => true,
    );
    expect(resolved.fieldErrors.constructor).toEqual(['required']);
    const form = createHouseFormEngine(() => ({
      defaultValues: { constructor: 'value' },
      onSubmit: async () => ResultExtensions.ok(undefined),
    }));
    expect(form.getFieldState('constructor').errors).toEqual([]);
    form.setFieldErrors(errors);
    expect(form.getFieldState('constructor').errors).toEqual(['required']);
    expect(form.getFieldState('__proto__').errors).toEqual(['invalid']);
    form.dispose();
  });
});
