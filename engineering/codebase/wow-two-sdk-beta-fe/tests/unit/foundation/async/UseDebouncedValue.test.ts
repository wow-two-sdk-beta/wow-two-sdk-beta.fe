import { effectScope, nextTick, ref } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useDebouncedValue } from '@src/foundation/async';

describe('useDebouncedValue', () => {
  afterEach(() => vi.useRealTimers());

  it('mirrors the first value at once and later values after a pause', async () => {
    vi.useFakeTimers();
    const source = ref('a');
    const scope = effectScope();
    const settled = scope.run(() => useDebouncedValue(source, 250))!;
    expect(settled.value).toBe('a');

    source.value = 'ab';
    await nextTick();
    vi.advanceTimersByTime(200);
    source.value = 'abc';
    await nextTick();
    vi.advanceTimersByTime(200);
    expect(settled.value).toBe('a');

    vi.advanceTimersByTime(50);
    expect(settled.value).toBe('abc');
    scope.stop();
  });

  it('drops a pending update when its scope stops', async () => {
    vi.useFakeTimers();
    const source = ref(1);
    const scope = effectScope();
    const settled = scope.run(() => useDebouncedValue(source, 100))!;
    source.value = 2;
    await nextTick();
    scope.stop();
    vi.advanceTimersByTime(100);
    expect(settled.value).toBe(1);
  });
});
