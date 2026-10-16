import { describe, expect, it, vi } from 'vitest';
import { ApiError, ApiFailureFactory, type ApiFailure } from '@src/foundation/http';
import { createFeedbackBus, NoticeTone } from '@src/feedback';
import {
  BreadcrumbCategory,
  BreadcrumbLevel,
  createReporter,
  describeError,
  httpReportSink,
  memoryReportSink,
  ReportDeliveryError,
  templatePath,
  toTraceId,
  type IncidentReport,
  type NavigationSource,
  type ReportSink,
} from '@src/reporting';

/*
 * `unit` project (node): no `window`, `document` or `location`, so the page and client blocks stay empty and
 * the capture paths that guard for them are exercised as they run under SSR. The DOM trackers live in the
 * `.dom` suite.
 */

const App = { name: 'wheelhouse', version: '0.3.0' } as const;

const clock = (start = Date.UTC(2026, 8, 29, 10, 0, 0)) => {
  let current = start;
  return { now: () => current, advance: (ms: number) => (current += ms) };
};

const failureWithRequest = (status: number, problem: Record<string, unknown> | null): ApiFailure => ({
  ...ApiFailureFactory.create('http', { status, headers: new Headers() }, problem),
  request: { method: 'POST', url: '/api/servers/42/deploy' },
});

const respond = (status: number, headers: Record<string, string> = {}) =>
  vi.fn<typeof fetch>(async () => new Response(status === 204 ? null : '{}', { status, headers }));

describe('the trail', () => {
  it('keeps the newest breadcrumbs up to its limit and redacts their data', () => {
    const reporter = createReporter({ app: App, sink: memoryReportSink(), maxBreadcrumbs: 2 });
    reporter.record({ message: 'one' });
    reporter.record({ message: 'two', data: { password: 'p', nested: { token: 't', keep: 1 } } });
    reporter.record({ message: 'three', category: BreadcrumbCategory.Navigation, level: BreadcrumbLevel.Warning });

    const trail = reporter.breadcrumbs();
    expect(trail.map((crumb) => crumb.message)).toEqual(['two', 'three']);
    expect(trail[0]!.data).toEqual({ password: '[redacted]', nested: { token: '[redacted]', keep: 1 } });
    expect(trail[0]!.category).toBe(BreadcrumbCategory.Custom);
    expect(trail[1]).toMatchObject({ category: 'navigation', level: 'warning' });
  });

  it('records requests through the wrapped fetch without their bodies or credentials', async () => {
    const time = clock();
    const reporter = createReporter({ app: App, sink: memoryReportSink(), now: time.now });
    const inner = vi.fn<typeof fetch>(async () => {
      time.advance(120);
      return new Response('{}', { status: 502, headers: { 'x-request-id': 'req-9' } });
    });
    const recorded = reporter.wrapFetch(inner);

    const response = await recorded('/api/orders?token=secret', { method: 'post', body: '{"card":"4111"}' });

    expect(response.status).toBe(502);
    expect(inner).toHaveBeenCalledWith('/api/orders?token=secret', { method: 'post', body: '{"card":"4111"}' });
    const [crumb] = reporter.breadcrumbs();
    expect(crumb).toMatchObject({
      category: 'request',
      level: 'error',
      message: 'POST /api/orders?token=[redacted] → 502',
      data: { durationMs: 120, requestId: 'req-9' },
    });
    expect(JSON.stringify(reporter.breadcrumbs())).not.toContain('4111');
  });

  it('records a request that never got a response, then rethrows', async () => {
    const reporter = createReporter({ app: App, sink: memoryReportSink() });
    const offline = reporter.wrapFetch(async () => {
      throw new TypeError('Failed to fetch');
    });
    const aborted = reporter.wrapFetch(async () => {
      throw new DOMException('The operation was aborted.', 'AbortError');
    });

    await expect(offline('/api/a')).rejects.toThrow('Failed to fetch');
    await expect(aborted('/api/b')).rejects.toThrow('aborted');

    expect(reporter.breadcrumbs().map((crumb) => crumb.message)).toEqual([
      'GET /api/a → network',
      'GET /api/b → aborted',
    ]);
  });

  it('follows the router and the notices it is wired to', () => {
    const reporter = createReporter({ app: App, sink: memoryReportSink() });
    let hook: Parameters<NavigationSource['afterEach']>[0] | undefined;
    const router: NavigationSource = {
      afterEach: (next) => {
        hook = next;
        return () => (hook = undefined);
      },
    };
    const bus = createFeedbackBus();
    const stopRouter = reporter.trackRouter(router);
    reporter.trackNotices(bus);

    hook!({ fullPath: '/servers/42?token=t' }, { fullPath: '/' });
    hook!({ fullPath: '/blocked' }, { fullPath: '/' }, { type: 4 });
    bus.notify({ tone: NoticeTone.Warning, title: 'Disk almost full' });
    stopRouter();

    expect(hook).toBeUndefined();
    expect(reporter.breadcrumbs()).toMatchObject([
      { category: 'navigation', message: '/servers/42?token=[redacted]', data: { from: '/' } },
      { category: 'notice', level: 'warning', message: 'Disk almost full' },
    ]);
  });
});

describe('capture', () => {
  it('freezes the trail, names the request behind the failure and reads its ids', async () => {
    const time = clock();
    const sink = memoryReportSink();
    const reporter = createReporter({ app: App, sink, now: time.now });
    reporter.setUser({ id: 'u-1' });
    reporter.setTag('tenant', 'acme');
    const api = reporter.wrapFetch(respond(500));
    await api('/api/servers/42/deploy?dryRun=false', { method: 'POST' });
    const failure = failureWithRequest(500, {
      title: 'Deploy failed',
      traceId: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      requestId: '0HN4:00000002',
      secret: 'shh',
    });

    const incident = reporter.capture(failure);
    reporter.record({ message: 'after the failure' });
    time.advance(4000);
    await incident.send({ note: '  clicked deploy twice  ' });

    const [report] = sink.reports as IncidentReport[];
    expect(report).toMatchObject({
      schema: 1,
      id: incident.id,
      occurredAt: '2026-09-29T10:00:00.000Z',
      reportedAt: '2026-09-29T10:00:04.000Z',
      app: App,
      user: { id: 'u-1' },
      tags: { tenant: 'acme' },
      note: 'clicked deploy twice',
      error: {
        name: 'ApiFailure',
        type: 'unexpected',
        code: 'http',
        status: 500,
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        requestId: '0HN4:00000002',
        problem: { title: 'Deploy failed', secret: '[redacted]' },
      },
      request: { method: 'POST', url: '/api/servers/42/deploy?dryRun=false', status: 500 },
      fingerprint: ['wheelhouse', 'unexpected', 'http', 'POST /api/servers/{id}/deploy'],
    });
    expect(report!.breadcrumbs.map((crumb) => crumb.message)).toEqual([
      'POST /api/servers/42/deploy?dryRun=false → 500',
    ]);
    expect(reporter.breadcrumbs().at(-2)).toMatchObject({ category: 'error', data: { incident: incident.id } });
  });

  it('names the request from the failure alone when nothing was recorded', async () => {
    const sink = memoryReportSink();
    const reporter = createReporter({ app: App, sink });
    await reporter.report(new ApiError(failureWithRequest(503, null)));
    expect(sink.reports[0]!.request).toMatchObject({ method: 'POST', url: '/api/servers/42/deploy', status: 503 });
    expect(sink.reports[0]!.error!.stack).toBeTypeOf('string');
  });

  it('delivers an incident once, however often it is sent, and retries only after a failure', async () => {
    const send = vi.fn<ReportSink['send']>();
    send.mockRejectedValueOnce(new ReportDeliveryError(503)).mockResolvedValue({ id: 'FB-7' });
    const reporter = createReporter({ app: App, sink: { send } });
    const incident = reporter.capture(new Error('boom'));

    await expect(incident.send()).rejects.toBeInstanceOf(ReportDeliveryError);
    const [first, second] = [incident.send(), incident.send()];
    expect(first).toBe(second);
    await expect(first).resolves.toEqual({ id: 'FB-7' });
    await expect(incident.send()).resolves.toEqual({ id: 'FB-7' });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("applies the app's last redaction pass and fails closed when it throws", async () => {
    const sink = memoryReportSink();
    const scrubbed = createReporter({
      app: App,
      sink,
      redact: (report) => ({ ...report, user: undefined, tags: {} }),
    });
    scrubbed.setUser({ email: 'a@b.test' });
    await scrubbed.report(new Error('x'));
    expect(sink.reports[0]!.user).toBeUndefined();

    const broken = createReporter({
      app: App,
      sink,
      redact: () => {
        throw new Error('scrubber bug');
      },
    });
    await expect(broken.report(new Error('y'))).rejects.toThrow('scrubber bug');
    expect(sink.reports).toHaveLength(1);
  });

  it('attaches a screenshot, and sends without one when capture fails or runs out of time', async () => {
    vi.useFakeTimers();
    try {
      const sink = memoryReportSink();
      const onError = vi.fn();
      const withShot = createReporter({
        app: App,
        sink,
        screenshot: async () => 'data:image/png;base64,iVBORw0KGgo=',
      });
      await withShot.report();
      expect(sink.reports[0]!.screenshot).toEqual({ type: 'image/png', dataUrl: 'data:image/png;base64,iVBORw0KGgo=' });

      const failing = createReporter({
        app: App,
        sink,
        onError,
        screenshot: () => Promise.reject(new Error('tainted canvas')),
      });
      await failing.report();
      expect(sink.reports[1]!.screenshot).toBeUndefined();
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'tainted canvas' }));

      const hanging = createReporter({
        app: App,
        sink,
        screenshotTimeoutMs: 50,
        screenshot: () => new Promise(() => undefined),
      });
      const pending = hanging.report();
      await vi.advanceTimersByTimeAsync(50);
      await pending;
      expect(sink.reports[2]!.screenshot).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('never throws from capture, whatever was thrown', () => {
    const reporter = createReporter({ app: App, sink: memoryReportSink() });
    const hostile = new Proxy(
      {},
      {
        get: () => {
          throw new Error('trap');
        },
      },
    );
    expect(() => reporter.capture(hostile)).not.toThrow();
    expect(() => reporter.capture(undefined)).not.toThrow();
  });
});

describe('describeError', () => {
  it('keeps a thrown error’s stack and cause chain', () => {
    const described = describeError(new Error('outer', { cause: new RangeError('inner') }), []);
    expect(described).toMatchObject({ name: 'Error', message: 'outer', cause: { name: 'RangeError' } });
    expect(described.stack).toContain('outer');
  });

  it('reads request and trace ids from response headers when the problem has none', () => {
    const failure = ApiFailureFactory.create('http', {
      status: 502,
      headers: new Headers({
        'x-correlation-id': 'corr-1',
        traceresponse: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
      }),
    });
    expect(describeError(failure, [])).toMatchObject({
      requestId: 'corr-1',
      traceId: '0af7651916cd43dd8448eb211c80319c',
    });
  });

  it('describes a thrown string or value', () => {
    expect(describeError('nope', [])).toEqual({ name: 'Error', message: 'nope' });
    expect(toTraceId(' abc ')).toBe('abc');
  });
});

describe('templatePath', () => {
  it('replaces record ids so one route groups as one issue', () => {
    expect(templatePath('https://api.test/v1/orders/1234/items/0190a3b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b?x=1')).toBe(
      '/v1/orders/{id}/items/{id}',
    );
    expect(templatePath('/files/aB3dE5fG7hJ9kL1mN3pQ/download')).toBe('/files/{id}/download');
    expect(templatePath('/settings/notifications')).toBe('/settings/notifications');
  });
});

describe('httpReportSink', () => {
  const report = (): IncidentReport => ({
    schema: 1,
    id: '0190a3b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b',
    occurredAt: '2026-09-29T10:00:00.000Z',
    reportedAt: '2026-09-29T10:00:01.000Z',
    fingerprint: ['wheelhouse'],
    app: App,
    tags: {},
    breadcrumbs: [],
  });

  it('posts the report as JSON with the ingest headers and reads back the receipt', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () => new Response(JSON.stringify({ id: 'FB-12', url: 'https://feedbacks.test/i/12' }), { status: 201 }),
    );
    const sink = httpReportSink({ endpoint: '/ingest', headers: { 'x-ingest-key': 'k' }, fetch });

    await expect(sink.send(report())).resolves.toEqual({ id: 'FB-12', url: 'https://feedbacks.test/i/12' });
    const [url, init] = fetch.mock.calls[0]!;
    const headers = new Headers(init!.headers);
    expect(url).toBe('/ingest');
    expect(init).toMatchObject({ method: 'POST', keepalive: true });
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.get('x-ingest-key')).toBe('k');
    expect(JSON.parse(init!.body as string)).toMatchObject({ id: report().id });
  });

  it('falls back to the report id, and rejects a refusal or an unreachable ingest', async () => {
    const accepted = httpReportSink({ endpoint: '/ingest', fetch: respond(204) });
    await expect(accepted.send(report())).resolves.toEqual({ id: report().id });

    const refused = httpReportSink({ endpoint: '/ingest', fetch: respond(413) });
    await expect(refused.send(report())).rejects.toMatchObject({ name: 'ReportDeliveryError', status: 413 });

    const offline = httpReportSink({
      endpoint: '/ingest',
      fetch: async () => {
        throw new TypeError('Failed to fetch');
      },
    });
    await expect(offline.send(report())).rejects.toMatchObject({ status: 0 });
  });
});
