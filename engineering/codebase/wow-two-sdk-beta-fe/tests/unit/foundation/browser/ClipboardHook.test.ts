import { effectScope } from 'vue';
import { afterEach, expect, it, vi } from 'vitest';
import { useClipboard } from '@src/foundation/clipboard';

afterEach(() => vi.unstubAllGlobals());

it('returns unsupported failure while preserving the copied/error controls', async () => {
  vi.stubGlobal('navigator', {});
  const scope = effectScope();
  const controls = scope.run(() => useClipboard({ resetAfter: 0 }))!;
  try {
    expect(await controls.copy('text')).toEqual({ ok: false, failure: { status: 'unsupported' } });
    expect(controls.copied.value).toBe(false);
    expect(controls.error.value?.message).toBe('Clipboard is unavailable.');
  } finally {
    scope.stop();
  }
});

it('returns the operation result but ignores completion after reset or disposal', async () => {
  let finish!: () => void;
  vi.stubGlobal('navigator', {
    clipboard: { writeText: vi.fn(() => new Promise<void>((resolve) => (finish = resolve))) },
  });
  const scope = effectScope();
  const controls = scope.run(() => useClipboard({ resetAfter: 0 }))!;
  const pending = controls.copy('old');
  controls.reset();
  finish();
  expect(await pending).toEqual({ ok: true, value: undefined });
  expect(controls.copied.value).toBe(false);
  const disposed = controls.copy('later');
  scope.stop();
  finish();
  expect(await disposed).toEqual({ ok: true, value: undefined });
  expect(controls.copied.value).toBe(false);
});

it('keeps the latest concurrent copy outcome in reactive controls', async () => {
  let finish!: () => void;
  const denied = new DOMException('Denied', 'NotAllowedError');
  vi.stubGlobal('navigator', {
    clipboard: {
      writeText: vi
        .fn()
        .mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)))
        .mockRejectedValueOnce(denied),
    },
  });
  const scope = effectScope();
  const controls = scope.run(() => useClipboard({ resetAfter: 0 }))!;
  try {
    const earlier = controls.copy('first');
    expect((await controls.copy('second')).ok).toBe(false);
    finish();
    expect((await earlier).ok).toBe(true);
    expect(controls.copied.value).toBe(false);
    expect(controls.error.value).toBe(denied);
  } finally {
    scope.stop();
  }
});
