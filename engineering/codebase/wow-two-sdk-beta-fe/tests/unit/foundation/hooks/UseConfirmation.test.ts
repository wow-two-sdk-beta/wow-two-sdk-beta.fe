import { effectScope, type EffectScope } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';
import { useConfirmation } from '@src/foundation/hooks';

const scopes: EffectScope[] = [];

afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop();
});

describe('useConfirmation', () => {
  it('resolves and clears an accepted request', async () => {
    const scope = effectScope();
    scopes.push(scope);
    const confirmation = scope.run(() => useConfirmation<{ id: string }>())!;
    const result = confirmation.confirm({ id: 'saved-look' });

    expect(confirmation.request.value).toEqual({ id: 'saved-look' });
    confirmation.accept();

    await expect(result).resolves.toBe(true);
    expect(confirmation.request.value).toBeNull();
  });

  it('cancels superseded and disposed requests', async () => {
    const scope = effectScope();
    scopes.push(scope);
    const confirmation = scope.run(() => useConfirmation<string>())!;
    const superseded = confirmation.confirm('first');
    const active = confirmation.confirm('second');

    await expect(superseded).resolves.toBe(false);
    expect(confirmation.request.value).toBe('second');
    scope.stop();
    await expect(active).resolves.toBe(false);
  });
});
