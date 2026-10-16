import { describe, expect, it, vi } from 'vitest';
import { createCommandRegistry, CommandRunFailureCode } from '@src/foundation/commands';
import { AppErrorFactory, ResultExtensions } from '@src/foundation/results';

describe('command operation results', () => {
  it('distinguishes missing and unavailable commands without running handlers', async () => {
    const registry = createCommandRegistry();
    expect(await registry.run('missing')).toEqual({
      ok: false,
      failure: { code: CommandRunFailureCode.NotFound },
    });
    const run = vi.fn();
    registry.register({ id: 'blocked', title: 'Blocked', enabled: false, run });
    expect(await registry.run('blocked')).toEqual({
      ok: false,
      failure: { code: CommandRunFailureCode.Unavailable },
    });
    expect(run).not.toHaveBeenCalled();
  });

  it('accepts total handlers and explicit successful outcomes', async () => {
    const registry = createCommandRegistry();
    const run = vi.fn();
    registry.register({ id: 'total', title: 'Total', run });
    registry.register({ id: 'result', title: 'Result', run: async () => ResultExtensions.ok(undefined) });
    expect(await registry.run('total', 'context')).toEqual({ ok: true, value: undefined });
    expect(run).toHaveBeenCalledWith('context');
    expect(await registry.run('result')).toEqual({ ok: true, value: undefined });
  });

  it('preserves a handler expected failure for the caller', async () => {
    const registry = createCommandRegistry();
    const error = AppErrorFactory.validation();
    registry.register({ id: 'save', title: 'Save', run: () => ResultExtensions.fail(error) });
    expect(await registry.run('save')).toEqual({
      ok: false,
      failure: { code: CommandRunFailureCode.Failed, error },
    });
  });

  it('reports and preserves programmer exceptions from handlers and predicates', async () => {
    const onError = vi.fn();
    const registry = createCommandRegistry({ onError });
    const error = new Error('Broken invariant');
    const broken = (): never => {
      throw error;
    };
    const command = { id: 'bug', title: 'Bug', run: broken };
    registry.register(command);
    await expect(registry.run('bug')).rejects.toBe(error);
    expect(onError).toHaveBeenLastCalledWith(error, command);
    const predicate = { id: 'predicate', title: 'Predicate', run: vi.fn(), when: broken };
    registry.register(predicate);
    await expect(registry.run('predicate')).rejects.toBe(error);
    expect(predicate.run).not.toHaveBeenCalled();
    expect(onError).toHaveBeenLastCalledWith(error, predicate);
  });
});
