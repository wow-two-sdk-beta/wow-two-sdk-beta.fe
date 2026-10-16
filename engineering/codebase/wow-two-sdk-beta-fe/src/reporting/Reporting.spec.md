# Reporting

Headless incident reporting — the trail of what the user did, frozen when something fails, and delivered as an `IncidentReport` in one click.

Source: [CreateReporter.ts](CreateReporter.ts) · [IncidentReport.ts](IncidentReport.ts) · [ReportSink.ts](ReportSink.ts).

Public import: `import { createReporter, httpReportSink } from '@wow-two-beta/ui-vue/reporting';`.

## Wiring

```ts
const reporter = createReporter({
  app: { name: 'wheelhouse', version: '0.3.0', environment: import.meta.env.MODE },
  sink: httpReportSink({ endpoint: '/api/reports' }),
  // screenshot: () => import('modern-screenshot').then(({ domToPng }) => domToPng(document.body)),
});
reporter.trackRouter(router);
reporter.trackNotices(feedbackBus);
reporter.captureClicks();
reporter.captureErrors();

const api = createApiClient({ baseUrl: '/api', fetch: reporter.wrapFetch() });
const queryClient = createQueryClient({ onError: feedbackQueryErrors(feedbackBus, { reporter }) });
```

A failed query then shows a danger toast with a Report action; one click delivers the incident. Code outside the query layer calls `reporter.capture(error)` and puts `incident.send` on its own toast (`report`) or notice.

## Contract

- Nothing records until the app wires a tracker or calls `record`, and nothing leaves the device until an incident is sent.
- `record`, `capture`, the recording fetch and every tracker never throw; their own failures reach `onError`. Only `send` rejects — with `ReportDeliveryError` from the HTTP sink — so a surface can offer a retry.
- The trail keeps the newest `maxBreadcrumbs` (default 50) steps, oldest first.
- `capture(error)` freezes the incident: the trail so far, the request behind the failure, the page, the user and the tags. The note and the screenshot are taken at `send`.
- `send` delivers once per incident — the same promise while in flight or after success; a failed delivery clears, so the next `send` retries.
- The request behind a failure is the latest recorded request at the endpoint an `ApiFailure.request` names (method, URL without its query, same status); without one, the latest recorded request with the failure's status; else none.
- The recording fetch keeps method, redacted URL, status, duration and the response's request/trace ids — never a body, never a request header. It rethrows transport failures after recording them (`status: 0`, `outcome: 'aborted' | 'network'`).
- Every URL passes `redactUrl`; every structured field (breadcrumb data, problem details, `AppError` metadata) passes `redactContext`; the `redact` hook is the app's last pass, and a throw there fails the send closed.
- Click capture records only interactive controls, named by `data-report-label`, `aria-label`, a form label, then their text (`isTextNamed: false` drops text). `data-report-ignore` removes a subtree; input values are never read.
- The screenshot is app-supplied (`screenshot`), awaited for at most `screenshotTimeoutMs` (default 3000); a failure or timeout sends without one.

## IncidentReport (schema 1)

- `schema`, `id` (UUID v7), `occurredAt`, `reportedAt` — ISO 8601.
- `fingerprint` — app, failure type or name, code, and the templated request (`POST /api/servers/{id}/deploy`) or page route.
- `app` `{ name, version?, environment? }` · `page` `{ url, title? }` · `client` `{ userAgent, language, timeZone, viewport, isOnline }` · `user?` · `tags`.
- `error` `{ name, message, type?, code?, status?, traceId?, requestId?, problem?, metadata?, stack?, cause? }` — ids read from the problem details (`traceId`, `requestId`, as the backend SDK writes them), then the response headers (`traceresponse`, `x-trace-id`, `x-request-id`, `request-id`, `x-correlation-id`).
- `request` `{ at, method, url, status, durationMs?, requestId?, traceId?, outcome? }` · `breadcrumbs[]` `{ at, category, level, message, data? }` · `note?` · `screenshot?` `{ type, dataUrl }`.

## Sinks

| Sink                  | Delivers                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `httpReportSink`      | `POST` JSON to an ingest; reads back `{ id, url }`; `keepalive` under 60 KB               |
| `memoryReportSink`    | keeps reports in memory — tests, previews                                                 |
| `consoleReportSink`   | prints each report — local development before an ingest exists                            |

## Verification

- [reporting.test.ts](../../tests/unit/reporting/reporting.test.ts) (node) · [ReportCapture.dom.test.ts](../../tests/unit/reporting/ReportCapture.dom.test.ts) (happy-dom) · [ReportAction.dom.test.ts](../../tests/unit/presentation/feedback/ReportAction.dom.test.ts) (query failure → toast → delivered report).
