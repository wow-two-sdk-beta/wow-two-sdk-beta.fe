import { AppErrorFactory, ResultExtensions } from '@src/foundation/results';
import { describe, expect, it } from 'vitest';
import { effectScope } from 'vue';
import {
  defaultMapFieldPath,
  formatPath,
  getPath,
  hasPath,
  parsePath,
  resolveSubmitFailure,
  setPath,
  toSubmitError,
  useFieldArray,
} from '@src/formsEngine';
import { houseFormEngine, useAppForm } from '@src/formsEngine/adapters/house';
import { tanstackFormEngine } from '@src/formsEngine/adapters/tanstack';

/*
 * Smoke depth, `unit` project (node — Vue's reactivity is environment-free, so the house engine
 * runs here without a renderer). Every form is built inside an `effectScope` and disposed, which
 * is what `useAppForm`'s `onScopeDispose` expects and what stops a `submitOn: 'change'` timer
 * outliving its case.
 *
 * The pinned contract is the DIRTY BASELINE: a form seeds from `defaultValues`, a write makes it
 * dirty, and `reset(next)` re-seeds the baseline so the prefilled values read CLEAN. An edit
 * screen that re-seeds without moving the baseline shows "unsaved changes" the moment it loads.
 */

interface Values {
  readonly title: string;
  readonly tags: readonly string[];
}

/** Builds a house form inside a disposable scope, so nothing leaks between cases. */
function withForm<T>(run: (form: ReturnType<typeof useAppForm<Values>>) => T): T {
  const scope = effectScope();
  try {
    return scope.run(() =>
      run(
        useAppForm<Values>({
          defaultValues: { title: 'seed', tags: ['a'] },
          onSubmit: () => Promise.resolve(ResultExtensions.ok(undefined)),
        }),
      ),
    ) as T;
  } finally {
    scope.stop();
  }
}

describe('path helpers', () => {
  it('round-trips a dotted / indexed path', () => {
    expect(parsePath('rules[0].destination')).toEqual(['rules', 0, 'destination']);
    expect(formatPath(parsePath('rules[0].destination'))).toBe('rules[0].destination');
  });

  it('reads and writes through a nested path without mutating the source', () => {
    const source = { rules: [{ destination: 'a' }] };
    const next = setPath(source, 'rules[0].destination', 'b');

    expect(getPath(next, 'rules[0].destination')).toBe('b');
    expect(source.rules[0]?.destination).toBe('a');
  });

  it('distinguishes an absent path from one holding undefined', () => {
    expect(hasPath({ a: undefined }, 'a')).toBe(true);
    expect(hasPath({ a: undefined }, 'b')).toBe(false);
  });
});

describe('the house form', () => {
  it('seeds its values from defaultValues, clean', () => {
    withForm((form) => {
      expect(form.values).toEqual({ title: 'seed', tags: ['a'] });
      expect(form.state.isDirty).toBe(false);
    });
  });

  it('goes dirty on a write and clean again on a bare reset', () => {
    withForm((form) => {
      form.setValue('title', 'edited');
      expect(form.values.title).toBe('edited');
      expect(form.state.isDirty).toBe(true);

      form.reset();
      expect(form.values.title).toBe('seed');
      expect(form.state.isDirty).toBe(false);
    });
  });

  it('re-seeds the dirty baseline on reset(next)', () => {
    withForm((form) => {
      form.reset({ title: 'loaded from server', tags: ['x'] });

      expect(form.values).toEqual({ title: 'loaded from server', tags: ['x'] });
      // The point: the prefilled values ARE the new baseline, so nothing reads as unsaved.
      expect(form.state.isDirty).toBe(false);

      form.setValue('title', 'edited again');
      expect(form.state.isDirty).toBe(true);
    });
  });

  it('applies array operations through the array facade', () => {
    withForm((form) => {
      form.array('tags').push('b');
      expect(form.values.tags).toEqual(['a', 'b']);

      form.array('tags').remove(0);
      expect(form.values.tags).toEqual(['b']);
    });
  });

  it('accepts server-side field errors and clears the submit error', () => {
    withForm((form) => {
      form.setFieldErrors({ title: ['Already taken'] });
      expect(form.state.isValid).toBe(false);

      expect(() => form.clearSubmitError()).not.toThrow();
    });
  });
});

describe('server-error mapping', () => {
  it('camelCases each server path segment onto its form path', () => {
    expect(defaultMapFieldPath('Rules[0].Destination')).toBe('rules[0].destination');
  });

  it('normalizes unexpected throws without leaking their messages', () => {
    expect(toSubmitError(new Error('secret')).message).toBe(AppErrorFactory.unexpected().message);
    expect(toSubmitError('secret').message).toBe(AppErrorFactory.unexpected().message);
    expect(toSubmitError(null).message).toBe(AppErrorFactory.unexpected().message);
  });

  it('lands a matched path on the field and leaves no form-level remainder', () => {
    const resolution = resolveSubmitFailure(
      AppErrorFactory.validation(),
      () => ({ Title: ['Already taken'] }),
      defaultMapFieldPath,
      (path) => path === 'title',
    );

    expect(resolution.fieldErrors).toEqual({ title: ['Already taken'] });
    expect(resolution.submitError).toBeNull();
  });

  /* The rule the slice exists for: a message that matches NO field must still surface, or the
     server's reason for rejecting the form disappears with nothing rendered anywhere. */
  it('keeps an unplaceable message as the form-level submit error', () => {
    const resolution = resolveSubmitFailure(
      AppErrorFactory.validation(),
      () => ({ NotAField: ['Something is off'] }),
      defaultMapFieldPath,
      () => false,
    );

    expect(resolution.fieldErrors).toEqual({});
    expect(resolution.submitError).not.toBeNull();
  });
});

describe('the engine contract', () => {
  it('both adapters expose the same facade entry point', () => {
    expect(houseFormEngine.useAppForm).toBeTypeOf('function');
    expect(tanstackFormEngine.useAppForm).toBeTypeOf('function');
  });
});

describe('discriminated field arrays', () => {
  type Rule = { kind: 'fallback'; destination: string } | { kind: 'country'; country: string; destination: string };
  interface RuleValues {
    readonly rules: readonly Rule[];
  }

  it('narrows a branch only while its runtime guard matches', () => {
    const scope = effectScope();
    try {
      scope.run(() => {
        const form = useAppForm<RuleValues>({
          defaultValues: { rules: [{ kind: 'country', country: 'UZ', destination: '/uz' }] },
          onSubmit: () => Promise.resolve(ResultExtensions.ok(undefined)),
        });
        const rules = useFieldArray<Rule>(form, 'rules');
        const countries = rules.variant((rule): rule is Extract<Rule, { kind: 'country' }> => rule.kind === 'country');
        expect(countries.matches(0)).toBe(true);
        form.setValue('rules[0]', { kind: 'fallback', destination: '/' });
        expect(countries.matches(0)).toBe(false);
        expect(countries.matches(1)).toBe(false);
      });
    } finally {
      scope.stop();
    }
  });
});
