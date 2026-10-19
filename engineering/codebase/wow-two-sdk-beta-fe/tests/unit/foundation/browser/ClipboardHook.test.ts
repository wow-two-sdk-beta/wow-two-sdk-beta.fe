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

it('clears a failure after the reset window and keeps it when the window is 0', async () => {
  vi.stubGlobal('navigator', {});
  const scope = effectScope();
  const brief = scope.run(() => useClipboard({ resetAfter: 40 }))!;
  const held = scope.run(() => useClipboard({ resetAfter: 0 }))!;
  try {
    await brief.copy('text');
    await held.copy('text');
    expect(brief.error.value?.message).toBe('Clipboard is unavailable.');
    await vi.waitFor(() => expect(brief.error.value).toBeNull());
    expect(held.error.value?.message).toBe('Clipboard is unavailable.');
  } finally {
    scope.stop();
  }
});

it('retries a refused write through the legacy path by default and stays on the API when told to', async () => {
  const denied = Object.assign(new Error('Denied'), { name: 'NotAllowedError' });
  const execCommand = vi.fn(() => true);
  const textarea = {
    style: {} as Record<string, string>,
    setAttribute: vi.fn(),
    focus: vi.fn(),
    select: vi.fn(),
    setSelectionRange: vi.fn(),
    remove: vi.fn(),
    value: '',
  };
  vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(denied) } });
  vi.stubGlobal('document', {
    body: { appendChild: vi.fn() },
    activeElement: null,
    createElement: () => textarea,
    getSelection: () => null,
    execCommand,
  });
  const scope = effectScope();
  const standard = scope.run(() => useClipboard({ resetAfter: 0, legacyFallback: false }))!;
  const resilient = scope.run(() => useClipboard({ resetAfter: 0 }))!;
  try {
    expect((await standard.copy('text')).ok).toBe(false);
    expect(execCommand).not.toHaveBeenCalled();
    expect(await resilient.copy('text')).toEqual({ ok: true, value: undefined });
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(resilient.copied.value).toBe(true);
  } finally {
    scope.stop();
  }
});
