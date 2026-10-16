import { effectScope } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText, readText, useClipboardCopy } from '@src/foundation/clipboard';
import { share, shareOrCopy, useShare } from '@src/foundation/share';
import { requestMediaStream, useMediaStream } from '@src/foundation/media';
import { notify } from '@src/foundation/notifications';
import { enterFullscreen, requestWakeLock, lockOrientation } from '@src/foundation/screen';
import { getCurrentPosition, watchPosition } from '@src/foundation/geolocation';
import { speak } from '@src/foundation/speech';
import { runInWorker } from '@src/foundation/workers';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}

function mediaStream() {
  const stop = vi.fn();
  return { stream: { getTracks: () => [{ stop }] } as unknown as MediaStream, stop };
}

describe('browser operation results', () => {
  it('reports unsupported capabilities without DOM globals', async () => {
    expect(await copyText('x')).toEqual({ ok: false, failure: { status: 'unsupported' } });
    expect(await readText()).toEqual({ ok: false, failure: { status: 'unsupported' } });
    expect(await share({ text: 'x' })).toEqual({ ok: false, failure: { status: 'unsupported' } });
    expect(await requestMediaStream({ video: true })).toEqual({ ok: false, failure: { status: 'unsupported' } });
    expect(notify('x')).toEqual({ ok: false, failure: { status: 'unsupported' } });
    expect(await enterFullscreen()).toEqual({ ok: false, failure: { status: 'unsupported' } });
    expect(await requestWakeLock()).toEqual({ ok: false, failure: { status: 'unsupported' } });
    expect(await lockOrientation('portrait')).toEqual({ ok: false, failure: { status: 'unsupported' } });
    expect(await getCurrentPosition()).toEqual({ ok: false, failure: { status: 'unsupported' } });
    expect(await speak('x')).toEqual({ ok: false, failure: { status: 'unsupported' } });
    expect(await runInWorker((x: number) => x + 1, [1])).toEqual({
      ok: false,
      failure: { status: 'unsupported' },
    });
  });

  it('keeps an empty clipboard read successful and classifies permission refusal', async () => {
    const denied = Object.assign(new Error('diagnostic only'), { name: 'NotAllowedError' });
    const reporter = vi.fn(() => {
      throw new Error('reporter failure');
    });
    vi.stubGlobal('navigator', {
      clipboard: { readText: vi.fn().mockResolvedValue(''), writeText: vi.fn().mockRejectedValue(denied) },
    });
    expect(await readText()).toEqual({ ok: true, value: '' });
    expect(await copyText('x', { onError: reporter })).toEqual({
      ok: false,
      failure: { status: 'denied', error: denied },
    });
    expect(reporter).toHaveBeenCalledOnce();
  });

  it('does not copy when the user dismisses sharing', async () => {
    const writeText = vi.fn();
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(Object.assign(new Error('cancelled'), { name: 'AbortError' })),
      canShare: () => true,
      clipboard: { writeText },
    });
    expect(await shareOrCopy({ text: 'x' })).toEqual({ ok: false, failure: { status: 'dismissed' } });
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies when native sharing is unsupported', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    expect(await shareOrCopy({ text: 'x' })).toEqual({ ok: true, value: 'copied' });
    expect(writeText).toHaveBeenCalledWith('x');
  });

  it('preserves reset while a clipboard operation is pending', async () => {
    const pending = deferred<void>();
    vi.stubGlobal('navigator', { clipboard: { writeText: () => pending.promise } });
    const scope = effectScope();
    const clipboard = scope.run(() => useClipboardCopy())!;
    try {
      const copy = clipboard.copy('x');
      clipboard.reset();
      pending.resolve();
      expect(await copy).toEqual({ ok: true, value: undefined });
      expect(clipboard.status.value).toBe('idle');
    } finally {
      scope.stop();
    }
  });

  it('keeps sharing pending until overlapping operations settle', async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    vi.stubGlobal('navigator', {
      share: vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise),
    });
    const scope = effectScope();
    const sharing = scope.run(() => useShare())!;
    try {
      const old = sharing.share({ text: 'first' });
      const current = sharing.share({ text: 'second' });
      second.resolve();
      await current;
      expect(sharing.sharing.value).toBe(true);
      sharing.reset();
      first.resolve();
      await old;
      expect(sharing.result.value).toBeNull();
      expect(sharing.sharing.value).toBe(false);
    } finally {
      scope.stop();
    }
  });

  it('keeps capture permission denial separate from a missing device', async () => {
    const capture = vi
      .fn()
      .mockRejectedValueOnce({ name: 'NotAllowedError' })
      .mockRejectedValueOnce({ name: 'NotFoundError' });
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: capture } });
    expect(await requestMediaStream({ video: true })).toEqual({ ok: false, failure: { status: 'denied' } });
    expect(await requestMediaStream({ video: true })).toEqual({ ok: false, failure: { status: 'unavailable' } });
  });

  it('releases stale capture completions without replacing the latest stream', async () => {
    const first = deferred<MediaStream>();
    const second = deferred<MediaStream>();
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise) },
    });
    const scope = effectScope();
    const controls = scope.run(() => useMediaStream())!;
    const old = mediaStream();
    const current = mediaStream();
    try {
      const firstRequest = controls.start();
      const secondRequest = controls.start();
      second.resolve(current.stream);
      await secondRequest;
      first.resolve(old.stream);
      expect(await firstRequest).toEqual({ ok: false, failure: { status: 'cancelled' } });
      expect(controls.stream.value).toBe(current.stream);
      expect(old.stop).toHaveBeenCalledOnce();
      expect(current.stop).not.toHaveBeenCalled();
      controls.stop();
      expect(current.stop).toHaveBeenCalledOnce();
    } finally {
      scope.stop();
    }
  });

  it('releases capture resolving after stop', async () => {
    const pending = deferred<MediaStream>();
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: () => pending.promise } });
    const scope = effectScope();
    const controls = scope.run(() => useMediaStream())!;
    const late = mediaStream();
    try {
      const request = controls.start();
      controls.stop();
      pending.resolve(late.stream);
      expect(await request).toEqual({ ok: false, failure: { status: 'cancelled' } });
      expect(late.stop).toHaveBeenCalledOnce();
      expect(controls.stream.value).toBeNull();
      expect(controls.status.value).toBe('idle');
    } finally {
      scope.stop();
    }
  });

  it('returns notification handles only when permission is granted', () => {
    class FakeNotification {
      static permission = 'granted';
      addEventListener = vi.fn();
    }
    vi.stubGlobal('Notification', FakeNotification);
    const result = notify('Ready');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeInstanceOf(FakeNotification);
    FakeNotification.permission = 'denied';
    expect(notify('Ready')).toEqual({ ok: false, failure: { status: 'denied' } });
  });

  it('settles cancelled speech without relying on a browser end event', async () => {
    expect(await speak('')).toEqual({ ok: true, value: undefined });
    class FakeUtterance {
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
    }
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
    vi.stubGlobal('speechSynthesis', { speak: vi.fn(), cancel: vi.fn() });
    const utterance = speak('Pending');
    utterance.cancel();
    expect(await utterance).toEqual({ ok: false, failure: { status: 'cancelled' } });
  });

  it('releases worker resources when posting arguments throws', async () => {
    vi.useFakeTimers();
    const terminate = vi.fn();
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    class FakeWorker {
      addEventListener = vi.fn();
      terminate = terminate;
      postMessage() {
        throw new Error('cannot clone');
      }
    }
    vi.stubGlobal('Worker', FakeWorker);
    try {
      const result = await runInWorker((x: number) => x, [1], { timeoutMs: 1000 });
      expect(result.ok).toBe(false);
      expect(terminate).toHaveBeenCalledOnce();
      expect(revoke).toHaveBeenCalledWith('blob:test');
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns geolocation values and ignores watch events after disposal', async () => {
    const raw = {
      coords: {
        latitude: 41,
        longitude: 69,
        accuracy: 1,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: 10,
    };
    let emit!: (value: unknown) => void;
    const clearWatch = vi.fn();
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (success: (value: unknown) => void) => success(raw),
        watchPosition: (success: (value: unknown) => void) => {
          emit = success;
          return 7;
        },
        clearWatch,
      },
    });
    const position = await getCurrentPosition();
    expect(position.ok).toBe(true);
    if (position.ok) expect(position.value.latitude).toBe(41);
    const listener = vi.fn();
    const stop = watchPosition(listener);
    emit(raw);
    stop();
    emit(raw);
    expect(listener).toHaveBeenCalledOnce();
    expect(clearWatch).toHaveBeenCalledWith(7);
  });
});
