import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSpeechRecognizer, type SpeechRecognitionLike } from '@src/foundation/speech';

function installRecognition(): SpeechRecognitionLike {
  const instance: SpeechRecognitionLike = {
    lang: '',
    continuous: false,
    interimResults: false,
    maxAlternatives: 1,
    onresult: null,
    onerror: null,
    onstart: null,
    onend: null,
    start: vi.fn(),
    stop: vi.fn(),
    abort: vi.fn(),
  };
  vi.stubGlobal('SpeechRecognition', function () {
    return instance;
  });
  return instance;
}

beforeEach(() => {
  vi.stubGlobal('SpeechRecognition', undefined);
  vi.stubGlobal('webkitSpeechRecognition', undefined);
});
afterEach(() => vi.unstubAllGlobals());

describe('recognition startup outcomes', () => {
  it('returns an expected unsupported failure without a recognition engine', () => {
    const recognizer = createSpeechRecognizer();
    expect(recognizer.supported).toBe(false);
    expect(recognizer.start()).toEqual({ ok: false, failure: { status: 'unsupported' } });
  });

  it('preserves constructor failures instead of reporting missing support', () => {
    const error = new Error('Recognition blocked by browser policy');
    vi.stubGlobal('SpeechRecognition', function () {
      throw error;
    });
    const recognizer = createSpeechRecognizer();
    expect(recognizer.supported).toBe(false);
    const result = recognizer.start();
    expect(result.ok).toBe(false);
    if (result.ok || result.failure.status !== 'failed') throw new Error('Expected a startup failure');
    expect(result.failure.error).toBe(error);
  });

  it('treats repeated starts as successful while the same session starts and listens', () => {
    const native = installRecognition();
    const recognizer = createSpeechRecognizer();
    expect(recognizer.start()).toEqual({ ok: true, value: undefined });
    expect(recognizer.start()).toEqual({ ok: true, value: undefined });
    expect(recognizer.listening).toBe(false);
    native.onstart?.();
    expect(recognizer.listening).toBe(true);
    expect(recognizer.start()).toEqual({ ok: true, value: undefined });
    expect(native.start).toHaveBeenCalledTimes(1);
    native.onend?.();
    expect(recognizer.listening).toBe(false);
    expect(recognizer.start()).toEqual({ ok: true, value: undefined });
    expect(native.start).toHaveBeenCalledTimes(2);
  });

  it('returns native start failures and permits a later retry', () => {
    const native = installRecognition();
    const error = new Error('Microphone permission denied');
    vi.mocked(native.start).mockImplementationOnce(() => {
      throw error;
    });
    const recognizer = createSpeechRecognizer();
    const result = recognizer.start();
    expect(result.ok).toBe(false);
    if (result.ok || result.failure.status !== 'failed') throw new Error('Expected a startup failure');
    expect(result.failure.error).toBe(error);
    expect(recognizer.listening).toBe(false);
    expect(recognizer.start()).toEqual({ ok: true, value: undefined });
    expect(native.start).toHaveBeenCalledTimes(2);
  });
});
