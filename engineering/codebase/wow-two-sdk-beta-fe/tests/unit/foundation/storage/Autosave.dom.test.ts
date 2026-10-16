import { describe, expect, it, vi } from 'vitest';
import { effectScope, ref, type EffectScope } from 'vue';
import { useAutosave, type AutosaveControls } from '@src/foundation/storage/hooks/UseAutosave';
import { AppErrorType, ResultExtensions, type AppError } from '@src/foundation/results';

const scopes: EffectScope[] = [];
function autosaveTest(name: string, run: () => Promise<void>): void {
  it(name, async () => {
    vi.useFakeTimers();
    try {
      await run();
    } finally {
      for (const scope of scopes.splice(0)) scope.stop();
      vi.useRealTimers();
      vi.restoreAllMocks();
    }
  });
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function setup(save: Parameters<typeof useAutosave<string>>[1], options?: Parameters<typeof useAutosave>[2]) {
  const value = ref('initial');
  const scope = effectScope();
  scopes.push(scope);
  let controls!: AutosaveControls;
  scope.run(() => {
    controls = useAutosave(value, save, { delayMs: 20, ...options });
  });
  return { value, scope, controls };
}

const settle = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe('autosave queue and current-intent state', () => {
  autosaveTest('skips initial state and debounces synchronous writes to the latest edit', async () => {
    const persisted: string[] = [];
    const { value, controls } = setup((next) => {
      persisted.push(next);
    });
    await vi.advanceTimersByTimeAsync(100);
    expect(persisted).toEqual([]);
    value.value = 'first';
    await vi.advanceTimersByTimeAsync(10);
    value.value = 'latest';
    await vi.advanceTimersByTimeAsync(19);
    expect(controls.status.value).toBe('pending');
    expect(persisted).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(persisted).toEqual(['latest']);
    expect(controls.status.value).toBe('saved');
    expect(controls.lastSavedAt.value).not.toBeNull();
  });

  autosaveTest('serializes overlap and persists only the newest trailing value after the active write', async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    const persisted: string[] = [];
    let active = 0;
    let maximumActive = 0;
    const save = vi.fn(async (next: string) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await (save.mock.calls.length === 1 ? first.promise : second.promise);
      persisted.push(next);
      active -= 1;
    });
    const { value, controls } = setup(save);
    value.value = 'old';
    await vi.advanceTimersByTimeAsync(20);
    value.value = 'intermediate';
    await vi.advanceTimersByTimeAsync(20);
    controls.flush();
    value.value = 'newest';
    controls.flush();
    expect(save).toHaveBeenCalledTimes(1);
    expect(controls.status.value).toBe('pending');
    first.resolve();
    await settle();
    expect(save.mock.calls.map(([next]) => next)).toEqual(['old', 'newest']);
    expect(persisted).toEqual(['old']);
    expect(controls.status.value).toBe('saving');
    second.resolve();
    await settle();
    expect(persisted).toEqual(['old', 'newest']);
    expect(maximumActive).toBe(1);
    expect(controls.status.value).toBe('saved');
  });

  autosaveTest('does not let old success overwrite a newer edit still awaiting its debounce', async () => {
    const first = deferred<void>();
    const save = vi.fn(() => first.promise);
    const { value, controls } = setup(save);
    value.value = 'old';
    await vi.advanceTimersByTimeAsync(20);
    value.value = 'new';
    first.resolve();
    await settle();
    expect(controls.status.value).toBe('pending');
    expect(controls.lastSavedAt.value).toBeNull();
    expect(save).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(20);
    expect(save).toHaveBeenCalledTimes(2);
    expect(controls.status.value).toBe('saved');
  });

  autosaveTest(
    'observes stale failures without replacing the newer intent or reporting an obsolete error',
    async () => {
      const first = deferred<void>();
      const onError = vi.fn();
      const save = vi.fn().mockReturnValueOnce(first.promise).mockReturnValue(undefined);
      const { value, controls } = setup(save, { onError });
      value.value = 'old';
      await vi.advanceTimersByTimeAsync(20);
      value.value = 'new';
      first.reject(new Error('obsolete failure'));
      await settle();
      expect(controls.status.value).toBe('pending');
      expect(controls.error.value).toBeNull();
      expect(onError).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(20);
      expect(controls.status.value).toBe('saved');
    },
  );

  autosaveTest('supports foreign thenables rather than relying on instanceof Promise', async () => {
    const pending = deferred<void>();
    const thenable: PromiseLike<void> = { then: pending.promise.then.bind(pending.promise) };
    const { value, controls } = setup(() => thenable);
    value.value = 'edit';
    controls.flush();
    expect(controls.status.value).toBe('saving');
    pending.resolve();
    await settle();
    expect(controls.status.value).toBe('saved');
  });
});

describe('autosave cancellation and disposal', () => {
  autosaveTest('drops the queued trailing write and invalidates the active completion when cancelled', async () => {
    const first = deferred<void>();
    const save = vi.fn(() => first.promise);
    const { value, controls } = setup(save);
    value.value = 'first';
    controls.flush();
    value.value = 'drop';
    await vi.advanceTimersByTimeAsync(20);
    controls.cancel();
    first.resolve();
    await settle();
    await vi.advanceTimersByTimeAsync(100);
    expect(save).toHaveBeenCalledTimes(1);
    expect(controls.status.value).toBe('idle');
    expect(controls.lastSavedAt.value).toBeNull();
  });

  autosaveTest('disables pending work immediately and reenables the latest value after debounce', async () => {
    const enabled = ref(true);
    const first = deferred<void>();
    const save = vi.fn().mockReturnValueOnce(first.promise).mockReturnValue(undefined);
    const { value, controls } = setup(save, { enabled });
    value.value = 'first';
    controls.flush();
    value.value = 'queued';
    enabled.value = false;
    expect(controls.status.value).toBe('idle');
    value.value = 'latest while disabled';
    controls.flush();
    first.resolve();
    await settle();
    expect(controls.status.value).toBe('idle');
    expect(controls.lastSavedAt.value).toBeNull();
    enabled.value = true;
    await vi.advanceTimersByTimeAsync(20);
    expect(save.mock.calls.map(([next]) => next)).toEqual(['first', 'latest while disabled']);
    expect(controls.status.value).toBe('saved');
  });

  autosaveTest('keeps a cancelled active sink serialized ahead of a later new edit', async () => {
    const first = deferred<void>();
    const save = vi.fn().mockReturnValueOnce(first.promise).mockReturnValue(undefined);
    const { value, controls } = setup(save);
    value.value = 'active';
    controls.flush();
    controls.cancel();
    value.value = 'new session';
    controls.flush();
    expect(save).toHaveBeenCalledTimes(1);
    first.resolve();
    await settle();
    expect(save.mock.calls.map(([next]) => next)).toEqual(['active', 'new session']);
    expect(controls.status.value).toBe('saved');
  });

  autosaveTest('starts no hidden write on disposal and makes retained controls inert', async () => {
    const save = vi.fn();
    const { value, controls, scope } = setup(save);
    value.value = 'pending';
    scope.stop();
    controls.flush();
    value.value = 'after disposal';
    await vi.advanceTimersByTimeAsync(100);
    expect(save).not.toHaveBeenCalled();
    expect(controls.status.value).toBe('idle');
  });

  autosaveTest(
    'observes an active rejection after disposal without callbacks, new writes or state changes',
    async () => {
      const active = deferred<void>();
      const save = vi.fn(() => active.promise);
      const onError = vi.fn();
      const { value, controls, scope } = setup(save, { onError });
      value.value = 'active';
      controls.flush();
      value.value = 'queued';
      scope.stop();
      active.reject(new Error('late failure'));
      await settle();
      await vi.advanceTimersByTimeAsync(100);
      expect(save).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
      expect(controls.status.value).toBe('idle');
      expect(controls.error.value).toBeNull();
      expect(controls.lastSavedAt.value).toBeNull();
    },
  );
});

describe('autosave sink failures', () => {
  autosaveTest('honors Result failures and clears failure state on the next successful edit', async () => {
    const failure: AppError = { type: AppErrorType.Unexpected, message: 'Storage unavailable' };
    const onError = vi.fn();
    const save = vi
      .fn()
      .mockReturnValueOnce(ResultExtensions.fail(failure))
      .mockReturnValue(ResultExtensions.ok(undefined));
    const { value, controls } = setup(save, { onError });
    value.value = 'fails';
    controls.flush();
    await settle();
    expect(controls.status.value).toBe('error');
    expect(controls.error.value).toBe(failure);
    expect(controls.lastSavedAt.value).toBeNull();
    expect(onError).toHaveBeenCalledWith(failure);
    value.value = 'succeeds';
    expect(controls.error.value).toBeNull();
    controls.flush();
    await settle();
    expect(controls.status.value).toBe('saved');
  });

  autosaveTest('reports the original thrown exception without converting it to an expected failure', async () => {
    const failure = new TypeError('bad sink');
    const onError = vi.fn();
    const { value, controls } = setup(
      () => {
        throw failure;
      },
      { onError },
    );
    value.value = 'edit';
    controls.flush();
    await settle();
    expect(controls.status.value).toBe('error');
    expect(controls.error.value).toBe(failure);
    expect(onError).toHaveBeenCalledExactlyOnceWith(failure);
  });

  autosaveTest('observes a rejected async error observer instead of leaking its rejection', async () => {
    const observerFailure = new Error('observer failed');
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { value } = setup(
      () => {
        throw new Error('sink failed');
      },
      { onError: () => Promise.reject(observerFailure) },
    );
    value.value = 'edit';
    await vi.advanceTimersByTimeAsync(20);
    expect(diagnostic).toHaveBeenCalledWith('Autosave onError callback failed', observerFailure);
  });
});
