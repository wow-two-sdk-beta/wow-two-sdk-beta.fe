// The reporter every app talks to. One contract dominates: CAPTURE NEVER THROWS. `record`, `capture`, the
// recording fetch and every tracker run inside request paths, click handlers and error handlers — a failure
// raised out of one would mask the error being reported, or break the request being recorded. Their own
// failures route to `onError`. Only `send` rejects, because a surface must offer a retry when delivery fails.
//
// Decisions worth stating:
//
// - **An incident freezes at capture, not at send.** The trail, the request, the page and the user are copied
//   when the failure happens; the screenshot and the note are taken when the user clicks Report. A user who
//   reads the toast for five seconds must not push the steps that led to the failure out of the trail.
// - **One delivery per incident.** `send` hands back the same promise while it is in flight or once it
//   succeeded, so a double click never files the incident twice; a failed delivery clears, so Retry sends again.
// - **Redaction on the way in.** Every URL passes `redactUrl` and every structured field `redactContext` before
//   it is stored; the `redact` hook is the app's last pass over the finished report, and a throw there fails
//   the send closed rather than shipping an unscrubbed report.
// - **Nothing is wired automatically.** `wrapFetch`, `trackRouter`, `trackNotices`, `captureClicks` and
//   `captureErrors` are each an explicit opt-in the app states (GWDNBM); with none, the trail holds only what
//   the app records itself.

import { isAbortError } from '../foundation/errors';
import { Guid } from '../foundation/identifiers';
import { DefaultRedactKeys, DefaultRedactUrlParams, redactContext, redactUrl } from '../foundation/logger';
import { describeError, failureRequest, readRequestId, readTraceId } from './DescribeError';
import { describeClickTarget, type ClickCaptureOptions } from './DescribeTarget';
import {
  BreadcrumbCategory,
  BreadcrumbLevel,
  IncidentReportSchema,
  type Breadcrumb,
  type BreadcrumbInput,
  type IncidentReport,
  type RecordedRequest,
  type ReportApp,
  type ReportClient,
  type ReportedError,
  type ReportPage,
  type ReportReceipt,
  type ReportScreenshot,
  type ReportSend,
  type ReportSendOptions,
  type ReportUser,
} from './IncidentReport';
import type { ReportSink } from './ReportSink';

/** Provides how many breadcrumbs the trail keeps before the oldest fall off. */
export const DefaultMaxBreadcrumbs = 50;

/** Provides how long a report waits for its screenshot before it goes without one. */
export const DefaultScreenshotTimeoutMs = 3000;

/** How many recorded requests are kept for matching a failure to its request. */
const MaxRecordedRequests = 20;
/** The longest breadcrumb message kept. */
const MaxMessageLength = 300;
/** The longest note kept. */
const MaxNoteLength = 2000;

/** A path segment that identifies a record rather than a route — digits, a GUID, or a long token with a digit. */
const IdSegment = /^(?:\d+|[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}|(?=[\w-]*\d)[\w-]{16,})$/iu;

/** A screenshot as an app's capture function returns it — a `data:` URL or an image blob. */
export type ScreenshotCapture = () => Promise<Blob | string | null | undefined>;

/** Defines the router shape `trackRouter` hooks — `vue-router`'s `Router` satisfies it. */
export interface NavigationSource {
  afterEach(
    hook: (to: { readonly fullPath: string }, from: { readonly fullPath: string }, failure?: unknown) => unknown,
  ): () => void;
}

/** Defines the notice shape `trackNotices` subscribes to — `/feedback`'s `FeedbackBus` satisfies it. */
export interface NoticeSource {
  subscribe(listener: (notice: { readonly tone: string; readonly title: unknown }) => void): () => void;
}

/** Defines the options for {@link createReporter}. */
export interface ReporterOptions {
  /** The application every report names. */
  readonly app: ReportApp;
  /** Where reports go — `httpReportSink` to an ingest, `memoryReportSink` in tests. */
  readonly sink: ReportSink;
  /** How many breadcrumbs the trail keeps. Default {@link DefaultMaxBreadcrumbs}. */
  readonly maxBreadcrumbs?: number;
  /** The structured keys masked at any depth. Default `DefaultRedactKeys` from `foundation/logger`. */
  readonly redactKeys?: ReadonlyArray<string>;
  /** The URL parameters masked in every recorded URL. Default `DefaultRedactUrlParams`. */
  readonly redactUrlParams?: ReadonlyArray<string>;
  /** The app's last pass over a finished report; a throw fails the send rather than shipping it unscrubbed. */
  readonly redact?: (report: IncidentReport) => IncidentReport;
  /**
   * Captures the screen when the user sends a report — the browser has no native DOM capture, so the app
   * supplies one (a DOM-to-image library, lazily imported). Omitted, reports carry no screenshot.
   */
  readonly screenshot?: ScreenshotCapture;
  /** How long a send waits for the screenshot. Default {@link DefaultScreenshotTimeoutMs}. */
  readonly screenshotTimeoutMs?: number;
  /** Receives the reporter's own failures — capture never throws, so this is where they surface. */
  readonly onError?: (error: unknown) => void;
  /** Supplies the clock (epoch ms) — injectable for deterministic tests. Default `Date.now`. */
  readonly now?: () => number;
}

/** Defines an incident frozen at capture — its id, when it happened, and the one-click send. */
export interface CapturedIncident {
  /** The report id — the reference the user sees until the ingest returns its own. */
  readonly id: string;
  /** When the failure was captured, ISO 8601. */
  readonly occurredAt: string;
  /** Builds and delivers the report; one delivery per incident, retried only after a failure. */
  readonly send: ReportSend;
  /** Builds the report without delivering it — for a preview, or a test. */
  readonly build: (options?: ReportSendOptions) => Promise<IncidentReport>;
}

/** Defines the reporter — the trail, the trackers that feed it, and the incident capture. */
export interface Reporter {
  /** Appends a step to the trail. Never throws. */
  record(crumb: BreadcrumbInput): void;
  /** Freezes an incident for a failure — the trail so far, the request behind it, the page and the user. */
  capture(error?: unknown): CapturedIncident;
  /** Captures and sends in one call — for a report the app files itself. */
  report(error?: unknown, options?: ReportSendOptions): Promise<ReportReceipt>;
  /**
   * Wraps a fetch so every request lands on the trail — method, redacted URL, status, duration and the server's
   * ids; never a body or a request header. Pass it to `createApiClient({ fetch })`. Default `globalThis.fetch`,
   * read once here, so a wrapped fetch installed globally never calls itself.
   */
  wrapFetch(fetch?: typeof globalThis.fetch): typeof globalThis.fetch;
  /** Records every completed navigation; returns the unhook. */
  trackRouter(router: NavigationSource): () => void;
  /** Records every notice the user is shown; returns the unsubscribe. */
  trackNotices(source: NoticeSource): () => void;
  /** Records clicks on interactive elements, in the capture phase; returns the stop. */
  captureClicks(options?: ClickCaptureOptions): () => void;
  /** Records uncaught errors and unhandled rejections; returns the stop. */
  captureErrors(target?: Window): () => void;
  /** Sets the user every later capture is attributed to; `null` clears it. */
  setUser(user: ReportUser | null): void;
  /** Sets a tag every later capture carries; `null` removes it. */
  setTag(key: string, value: string | null): void;
  /** Reads the trail, oldest first. */
  breadcrumbs(): ReadonlyArray<Breadcrumb>;
}

function truncate(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

/** A URL without its query or fragment — how an `ApiFailure` names its request. */
function endpoint(url: string): string {
  return url.split(/[?#]/u)[0] ?? url;
}

/** Replaces the record ids in a URL's path with `{id}`, so one route groups as one issue. */
export function templatePath(url: string): string {
  const withoutOrigin = url.replace(/^(?:[a-z][a-z\d+.-]*:)?\/\/[^/?#]*/iu, '');
  const path = withoutOrigin.split(/[?#]/u)[0] || '/';
  return path
    .split('/')
    .map((segment) => (IdSegment.test(segment) ? '{id}' : segment))
    .join('/');
}

/** The page's route path — the pathname, or a hash router's path when the pathname is only the shell. */
function pageRoute(page: ReportPage | undefined): string {
  if (!page) return '';
  const hash = page.url.indexOf('#/');
  return hash !== -1 ? templatePath(page.url.slice(hash + 1)) : templatePath(page.url);
}

function readPage(urlParams: ReadonlyArray<string>): ReportPage | undefined {
  if (typeof location === 'undefined') return undefined;
  const title = typeof document === 'undefined' ? '' : document.title;
  return { url: redactUrl(location.href, urlParams), ...(title ? { title } : {}) };
}

function readClient(): ReportClient | undefined {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return undefined;
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    isOnline: navigator.onLine,
  };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('The screenshot could not be read.'));
    reader.readAsDataURL(blob);
  });
}

function readMethod(input: RequestInfo | URL, init: RequestInit | undefined): string {
  const fromRequest = typeof Request !== 'undefined' && input instanceof Request ? input.method : undefined;
  return (init?.method ?? fromRequest ?? 'GET').toUpperCase();
}

function readUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function requestLevel(status: number): BreadcrumbLevel {
  if (status === 0 || status >= 500) return BreadcrumbLevel.Error;
  return status >= 400 ? BreadcrumbLevel.Warning : BreadcrumbLevel.Info;
}

/**
 * Creates the app's reporter. Nothing is recorded until the app wires a tracker or calls `record`, and nothing
 * leaves the device until a captured incident is sent.
 */
export function createReporter(options: ReporterOptions): Reporter {
  const now = options.now ?? Date.now;
  const redactKeys = options.redactKeys ?? DefaultRedactKeys;
  const urlParams = options.redactUrlParams ?? DefaultRedactUrlParams;
  const maxBreadcrumbs = Math.max(1, options.maxBreadcrumbs ?? DefaultMaxBreadcrumbs);
  const trail: Breadcrumb[] = [];
  const requests: RecordedRequest[] = [];
  const tags: Record<string, string> = {};
  let user: ReportUser | undefined;

  const iso = (ms: number): string => new Date(ms).toISOString();

  /** Routes the reporter's own failure to `onError`; a handler that throws has nowhere left to report. */
  const fail = (error: unknown): void => {
    try {
      options.onError?.(error);
    } catch {
      // Swallowed: capture must never throw.
    }
  };

  const record = (input: BreadcrumbInput): void => {
    try {
      trail.push({
        at: iso(now()),
        category: input.category ?? BreadcrumbCategory.Custom,
        level: input.level ?? BreadcrumbLevel.Info,
        message: truncate(String(input.message), MaxMessageLength),
        ...(input.data ? { data: redactContext(input.data, redactKeys) } : {}),
      });
      if (trail.length > maxBreadcrumbs) trail.splice(0, trail.length - maxBreadcrumbs);
    } catch (error) {
      fail(error);
    }
  };

  const noteRequest = (request: RecordedRequest): void => {
    requests.push(request);
    if (requests.length > MaxRecordedRequests) requests.splice(0, requests.length - MaxRecordedRequests);
    record({
      category: BreadcrumbCategory.Request,
      level: requestLevel(request.status),
      message: `${request.method} ${request.url} → ${request.status || request.outcome || 'no response'}`,
      data: {
        ...(request.durationMs !== undefined ? { durationMs: request.durationMs } : {}),
        ...(request.requestId ? { requestId: request.requestId } : {}),
      },
    });
  };

  /**
   * The request behind a failure — the latest recorded one at the endpoint the failure names (a failure names
   * no query), else the latest with its status.
   */
  const matchRequest = (error: unknown, described: ReportedError): RecordedRequest | undefined => {
    const named = failureRequest(error);
    const latest = [...requests].reverse();
    if (named) {
      const seen = latest.find(
        (request) =>
          request.method === named.method &&
          endpoint(request.url) === endpoint(named.url) &&
          (described.status === undefined || request.status === described.status),
      );
      return seen ?? { at: iso(now()), method: named.method, url: named.url, status: described.status ?? 0 };
    }
    return described.status === undefined ? undefined : latest.find((request) => request.status === described.status);
  };

  const takeScreenshot = async (): Promise<ReportScreenshot | undefined> => {
    if (!options.screenshot) return undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<undefined>((resolve) => {
        timer = setTimeout(() => resolve(undefined), options.screenshotTimeoutMs ?? DefaultScreenshotTimeoutMs);
      });
      const shot = await Promise.race([options.screenshot(), timeout]);
      if (!shot) return undefined;
      if (typeof shot === 'string') {
        const type = /^data:([^;,]+)/u.exec(shot)?.[1];
        return type ? { type, dataUrl: shot } : undefined;
      }
      return { type: shot.type || 'image/png', dataUrl: await blobToDataUrl(shot) };
    } catch (error) {
      fail(error);
      return undefined;
    } finally {
      clearTimeout(timer);
    }
  };

  const capture = (error?: unknown): CapturedIncident => {
    const occurredMs = now();
    let id: string;
    try {
      id = Guid.createV7(occurredMs);
    } catch {
      id = Guid.createV4();
    }
    const occurredAt = iso(occurredMs);
    const frozenTrail = [...trail];
    const frozenTags = { ...tags };
    const frozenUser = user;
    const described = error === undefined ? undefined : describeError(error, redactKeys);
    let request: RecordedRequest | undefined;
    let page: ReportPage | undefined;
    let client: ReportClient | undefined;
    try {
      request = described ? matchRequest(error, described) : undefined;
      page = readPage(urlParams);
      client = readClient();
    } catch (failure) {
      fail(failure);
    }
    if (described) {
      record({
        category: BreadcrumbCategory.Error,
        level: BreadcrumbLevel.Error,
        message: described.message,
        data: { incident: id },
      });
    }

    const fingerprint = [
      options.app.name,
      described ? (described.type ?? described.name) : 'report',
      described?.code === undefined ? '' : String(described.code),
      request ? `${request.method} ${templatePath(request.url)}` : pageRoute(page),
    ].filter((part) => part !== '');

    const build = async (sendOptions: ReportSendOptions = {}): Promise<IncidentReport> => {
      const note = sendOptions.note?.trim();
      const screenshot = await takeScreenshot();
      const report: IncidentReport = {
        schema: IncidentReportSchema,
        id,
        occurredAt,
        reportedAt: iso(now()),
        fingerprint,
        app: options.app,
        ...(page ? { page } : {}),
        ...(client ? { client } : {}),
        ...(frozenUser ? { user: frozenUser } : {}),
        tags: frozenTags,
        ...(described ? { error: described } : {}),
        ...(request ? { request } : {}),
        breadcrumbs: frozenTrail,
        ...(note ? { note: truncate(note, MaxNoteLength) } : {}),
        ...(screenshot ? { screenshot } : {}),
      };
      return options.redact ? options.redact(report) : report;
    };

    let delivery: Promise<ReportReceipt> | undefined;
    const send: ReportSend = (sendOptions) => {
      if (delivery) return delivery;
      const attempt = build(sendOptions).then((report) => options.sink.send(report));
      delivery = attempt;
      attempt.catch(() => {
        if (delivery === attempt) delivery = undefined;
      });
      return attempt;
    };

    return { id, occurredAt, send, build };
  };

  const wrapFetch = (fetch?: typeof globalThis.fetch): typeof globalThis.fetch => {
    const target = fetch ?? globalThis.fetch;
    return async (input, init) => {
      const startedMs = now();
      let method = 'GET';
      let url = '';
      try {
        method = readMethod(input, init);
        url = redactUrl(readUrl(input), urlParams);
      } catch (error) {
        fail(error);
      }
      let response: Response;
      try {
        response = await target(input, init);
      } catch (error) {
        try {
          noteRequest({
            at: iso(startedMs),
            method,
            url,
            status: 0,
            durationMs: now() - startedMs,
            outcome: isAbortError(error) ? 'aborted' : 'network',
          });
        } catch (failure) {
          fail(failure);
        }
        throw error;
      }
      try {
        const headers = Object.fromEntries(response.headers);
        const requestId = readRequestId(headers);
        const traceId = readTraceId(headers);
        noteRequest({
          at: iso(startedMs),
          method,
          url,
          status: response.status,
          durationMs: now() - startedMs,
          ...(requestId ? { requestId } : {}),
          ...(traceId ? { traceId } : {}),
        });
      } catch (error) {
        fail(error);
      }
      return response;
    };
  };

  const trackRouter = (router: NavigationSource): (() => void) =>
    router.afterEach((to, from, failure) => {
      if (failure) return;
      record({
        category: BreadcrumbCategory.Navigation,
        message: redactUrl(to.fullPath, urlParams),
        data: { from: redactUrl(from.fullPath, urlParams) },
      });
    });

  const trackNotices = (source: NoticeSource): (() => void) =>
    source.subscribe((notice) => {
      record({
        category: BreadcrumbCategory.Notice,
        level:
          notice.tone === 'danger'
            ? BreadcrumbLevel.Error
            : notice.tone === 'warning'
              ? BreadcrumbLevel.Warning
              : BreadcrumbLevel.Info,
        message: typeof notice.title === 'string' ? notice.title : '(notice)',
        data: { tone: notice.tone },
      });
    });

  const captureClicks = (clickOptions: ClickCaptureOptions = {}): (() => void) => {
    if (typeof document === 'undefined') return () => undefined;
    const onClick = (event: MouseEvent): void => {
      const description = describeClickTarget(event.target, clickOptions);
      if (description) record({ category: BreadcrumbCategory.Click, message: description });
    };
    document.addEventListener('click', onClick, { capture: true, passive: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  };

  const captureErrors = (target?: Window): (() => void) => {
    const source = target ?? (typeof window === 'undefined' ? undefined : window);
    if (!source) return () => undefined;
    const onError = (event: ErrorEvent): void => {
      record({
        category: BreadcrumbCategory.Error,
        level: BreadcrumbLevel.Error,
        message: event.message || describeError(event.error, redactKeys).message,
        ...(event.filename ? { data: { source: redactUrl(event.filename, urlParams), line: event.lineno } } : {}),
      });
    };
    const onRejection = (event: PromiseRejectionEvent): void => {
      record({
        category: BreadcrumbCategory.Error,
        level: BreadcrumbLevel.Error,
        message: `Unhandled rejection: ${describeError(event.reason, redactKeys).message}`,
      });
    };
    source.addEventListener('error', onError);
    source.addEventListener('unhandledrejection', onRejection);
    return () => {
      source.removeEventListener('error', onError);
      source.removeEventListener('unhandledrejection', onRejection);
    };
  };

  return {
    record,
    capture,
    report: (error, sendOptions) => capture(error).send(sendOptions),
    wrapFetch,
    trackRouter,
    trackNotices,
    captureClicks,
    captureErrors,
    setUser(next) {
      user = next ?? undefined;
    },
    setTag(key, value) {
      if (value === null) delete tags[key];
      else tags[key] = value;
    },
    breadcrumbs: () => [...trail],
  };
}
