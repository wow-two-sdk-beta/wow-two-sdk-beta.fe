import { describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  ApiFailureExtensions,
  ApiFailureFactory,
  ProblemDetailsExtensions,
  createApiClient,
  type ApiFailure,
} from '@src/foundation/http';
import { AppErrorFactory } from '@src/foundation/results';

const problem = (body: unknown, status = 400) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/problem+json' } });

/** Sends one request against a canned answer and returns its failure, as an app's integration call would. */
async function failureOf(response: Response | Error): Promise<ApiFailure> {
  const fetch = response instanceof Error ? vi.fn().mockRejectedValue(response) : vi.fn().mockResolvedValue(response);
  const result = await createApiClient({ fetch }).post('/api/deployments', { body: {}, response: 'empty' });
  if (result.ok) throw new Error('expected a failure');
  return result.failure;
}

describe('ApiFailureExtensions.reason', () => {
  it('reads the first field message of the wow-two errors array, labelled when the caller names it', async () => {
    const failure = await failureOf(
      problem({
        title: 'One or more validation errors occurred.',
        errors: [
          { property: 'Target', message: 'Target is required.', code: 'NotEmptyValidator' },
          { property: 'Release', message: 'Release is required.' },
        ],
      }),
    );
    expect(ApiFailureExtensions.reason(failure)).toBe('Target is required.');
    expect(ApiFailureExtensions.reason(failure, { labels: { Target: 'Environment' } })).toBe(
      'Environment: Target is required.',
    );
    expect(ApiFailureExtensions.reason(failure, { fields: false })).toBe('One or more validation errors occurred.');
  });

  it('reads the ASP.NET errors map too', async () => {
    const failure = await failureOf(problem({ errors: { Name: ['Name is too long.'] }, title: 'Bad request' }));
    expect(ApiFailureExtensions.reason(failure)).toBe('Name is too long.');
  });

  it('prefers detail over title and strips control characters, bidi overrides and a declared prefix', async () => {
    const failure = await failureOf(
      problem({ title: 'Conflict', detail: 'Deployment rejected: ‮target\u0007 is locked\n' }, 409),
    );
    expect(ApiFailureExtensions.reason(failure)).toBe('Deployment rejected: target is locked');
    expect(ApiFailureExtensions.reason(failure, { strip: /^Deployment (?:rejected|step failed): / })).toBe(
      'target is locked',
    );
  });

  it('skips text past the length budget as diagnostics and falls back', async () => {
    const failure = await failureOf(problem({ detail: 'x'.repeat(301), title: 'Server error' }, 500));
    expect(ApiFailureExtensions.reason(failure)).toBe('Server error');
    expect(ApiFailureExtensions.reason(failure, { maxLength: 5 })).toBe('The operation could not be completed.');
    expect(ApiFailureExtensions.reason(failure, { maxLength: 5, fallback: 'Deploy failed.' })).toBe('Deploy failed.');
  });

  it('uses the fallback, then the display-safe message, when no problem text came back', async () => {
    const offline = await failureOf(new TypeError('Failed to fetch'));
    expect(offline.code).toBe('transport');
    expect(ApiFailureExtensions.reason(offline)).toBe('The operation is unavailable.');
    expect(ApiFailureExtensions.reason(offline, { fallback: 'Wheelhouse is unreachable.' })).toBe(
      'Wheelhouse is unreachable.',
    );
    const bare = await failureOf(new Response('<html>oops</html>', { status: 502 }));
    expect(ApiFailureExtensions.reason(bare)).toBe('The operation could not be completed.');
  });

  it('reads an ApiError, a plain AppError and nothing', () => {
    const error = new ApiError(404, { detail: 'No such target.' });
    expect(ApiFailureExtensions.reason(error)).toBe('No such target.');
    expect(ApiFailureExtensions.reason(AppErrorFactory.conflict())).toBe(
      'The operation conflicts with the current state.',
    );
    expect(ApiFailureExtensions.reason(null)).toBe('');
    expect(ApiFailureExtensions.reason(undefined, { fallback: 'Try again.' })).toBe('Try again.');
  });
});

describe('ProblemDetailsExtensions', () => {
  it('reads the problem a failure carries, never a non-object one', () => {
    expect(ProblemDetailsExtensions.of(ApiFailureFactory.create('http', undefined, { title: 'Gone' }))).toEqual({
      title: 'Gone',
    });
    expect(ProblemDetailsExtensions.of(ApiFailureFactory.create('protocol'))).toBeNull();
    expect(ProblemDetailsExtensions.of({ problem: ['x'] })).toBeNull();
    expect(ProblemDetailsExtensions.of('detail')).toBeNull();
  });

  it('returns undefined when no candidate is readable', () => {
    expect(ProblemDetailsExtensions.text({ detail: '   ', title: 42 as unknown as string })).toBeUndefined();
    expect(ProblemDetailsExtensions.text({ errors: [{ property: 'A', message: '\u0000' }] })).toBeUndefined();
    expect(ProblemDetailsExtensions.text(null)).toBeUndefined();
  });

  it('skips an unreadable field message for the next one', () => {
    expect(
      ProblemDetailsExtensions.text({
        errors: [
          { property: 'A', message: 'y'.repeat(400) },
          { property: 'B', message: 'B is invalid.' },
        ],
      }),
    ).toBe('B is invalid.');
  });
});
