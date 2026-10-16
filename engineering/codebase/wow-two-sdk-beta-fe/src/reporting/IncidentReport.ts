import type { SerializedError } from '../foundation/errors';

/** Provides the wire-schema version an `IncidentReport` carries — it bumps when a field changes meaning. */
export const IncidentReportSchema = 1;

/** Defines the kind of step a breadcrumb records on the trail leading to a failure. */
export const BreadcrumbCategory = {
  /** Refers to a route change. */
  Navigation: 'navigation',
  /** Refers to an HTTP request and its outcome. */
  Request: 'request',
  /** Refers to a click on an interactive element. */
  Click: 'click',
  /** Refers to a notice the user was shown. */
  Notice: 'notice',
  /** Refers to an uncaught error, an unhandled rejection, or a captured incident. */
  Error: 'error',
  /** Refers to a step the app recorded itself. */
  Custom: 'custom',
} as const;

export type BreadcrumbCategory = (typeof BreadcrumbCategory)[keyof typeof BreadcrumbCategory];

/** Defines how much a breadcrumb matters when a reader scans the trail. */
export const BreadcrumbLevel = {
  /** Refers to an ordinary step. */
  Info: 'info',
  /** Refers to a degraded step — a 4xx response, a warning notice. */
  Warning: 'warning',
  /** Refers to a failed step — a 5xx or dropped request, an error. */
  Error: 'error',
} as const;

export type BreadcrumbLevel = (typeof BreadcrumbLevel)[keyof typeof BreadcrumbLevel];

/** Defines one step on the trail — what happened, when, and how much it mattered. */
export interface Breadcrumb {
  /** When it happened, ISO 8601. */
  readonly at: string;
  readonly category: BreadcrumbCategory;
  readonly level: BreadcrumbLevel;
  /** The one-line description — `GET /api/orders → 500`, `button "Save"`. */
  readonly message: string;
  /** The structured detail, redacted on the way in. */
  readonly data?: Readonly<Record<string, unknown>>;
}

/** Defines a breadcrumb as the app records it — the reporter stamps the time and fills the defaults. */
export interface BreadcrumbInput {
  /** Default `BreadcrumbCategory.Custom`. */
  readonly category?: BreadcrumbCategory;
  /** Default `BreadcrumbLevel.Info`. */
  readonly level?: BreadcrumbLevel;
  readonly message: string;
  readonly data?: Readonly<Record<string, unknown>>;
}

/** Defines an HTTP request as the recording fetch saw it — never a body, never a request header. */
export interface RecordedRequest {
  /** When it was sent, ISO 8601. */
  readonly at: string;
  /** The upper-case HTTP method. */
  readonly method: string;
  /** The URL with credentials redacted. */
  readonly url: string;
  /** The response status; `0` when no response arrived. */
  readonly status: number;
  /** How long the request took, when the recording fetch timed it. */
  readonly durationMs?: number;
  /** The server's request id, read from the response headers. */
  readonly requestId?: string;
  /** The W3C trace id, read from the response headers. */
  readonly traceId?: string;
  /** Why no response arrived — `aborted` or `network`. Present only when `status` is `0`. */
  readonly outcome?: string;
}

/** Defines the failure a report is about — normalized from an `ApiFailure`, an `AppError` or a thrown value. */
export interface ReportedError {
  /** The error kind — `ApiFailure`, `AppError`, or the thrown error's `name`. */
  readonly name: string;
  /** The display-safe message. */
  readonly message: string;
  /** The `AppError` category, when the failure had one. */
  readonly type?: string;
  /** The machine-readable code — an `ApiFailureCode` or the thrown error's `code`. */
  readonly code?: string | number;
  /** The HTTP status, when the failure came from a response. */
  readonly status?: number;
  /** The W3C trace id the server stamped on its problem details or response. */
  readonly traceId?: string;
  /** The server's request id — the key to its log lines. */
  readonly requestId?: string;
  /** The response's problem details, redacted. */
  readonly problem?: Readonly<Record<string, unknown>>;
  /** The `AppError` diagnostics, redacted. */
  readonly metadata?: Readonly<Record<string, unknown>>;
  /** The thrown error's stack trace. */
  readonly stack?: string;
  /** The thrown error's `cause` chain. */
  readonly cause?: SerializedError;
}

/** Defines the application a report comes from. */
export interface ReportApp {
  /** The stable app name the triage side groups by — `wheelhouse`, `secrets-vault`. */
  readonly name: string;
  /** The running version, as the app's status endpoint reports it. */
  readonly version?: string;
  /** The deployment environment — `development`, `staging`, `production`. */
  readonly environment?: string;
}

/** Defines the user a report is attributed to — only what the app chooses to pass. */
export interface ReportUser {
  readonly id?: string;
  readonly name?: string;
  readonly email?: string;
}

/** Defines the page the user was on when they sent the report. */
export interface ReportPage {
  /** The page URL with credentials redacted. */
  readonly url: string;
  readonly title?: string;
}

/** Defines the browser the report came from. */
export interface ReportClient {
  readonly userAgent: string;
  readonly language: string;
  /** The IANA time zone — `Asia/Tashkent`. */
  readonly timeZone: string;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly isOnline: boolean;
}

/** Defines a screenshot attached to a report. */
export interface ReportScreenshot {
  /** The image media type — `image/png`, `image/jpeg`. */
  readonly type: string;
  /** The image as a `data:` URL. */
  readonly dataUrl: string;
}

/**
 * Defines the incident report — the wire payload a sink delivers and the triage app ingests. The trail,
 * the request and the error are frozen when the incident is captured; the page, the note and the
 * screenshot are taken when the user sends it.
 */
export interface IncidentReport {
  readonly schema: typeof IncidentReportSchema;
  /** The client-generated id (UUID v7) — the reference the user sees until the ingest returns its own. */
  readonly id: string;
  /** When the failure was captured, ISO 8601. */
  readonly occurredAt: string;
  /** When the user sent the report, ISO 8601. */
  readonly reportedAt: string;
  /** The grouping hint — app, failure kind and code, and the templated request or page path. */
  readonly fingerprint: ReadonlyArray<string>;
  readonly app: ReportApp;
  readonly page?: ReportPage;
  readonly client?: ReportClient;
  readonly user?: ReportUser;
  readonly tags: Readonly<Record<string, string>>;
  readonly error?: ReportedError;
  /** The request behind the failure, when one can be named. */
  readonly request?: RecordedRequest;
  /** The trail up to the failure, oldest first. */
  readonly breadcrumbs: ReadonlyArray<Breadcrumb>;
  /** The user's own words, when a surface asked for them. */
  readonly note?: string;
  readonly screenshot?: ReportScreenshot;
}

/** Defines what a delivered report hands back — the reference a surface shows the user. */
export interface ReportReceipt {
  /** The ingest's id for the report, or the report's own id when the ingest returned none. */
  readonly id: string;
  /** A link to the report in the triage app, when the ingest returned one. */
  readonly url?: string;
}

/** Defines the options a surface passes when it sends a captured incident. */
export interface ReportSendOptions {
  /** The user's own words about what they were doing. */
  readonly note?: string;
}

/**
 * Defines the one-click send a surface binds to its Report action. Resolves with the receipt; rejects when
 * delivery fails, so the surface can offer a retry.
 */
export type ReportSend = (options?: ReportSendOptions) => Promise<ReportReceipt>;
