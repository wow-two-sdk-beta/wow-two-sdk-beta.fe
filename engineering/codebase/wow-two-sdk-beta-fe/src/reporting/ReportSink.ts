import type { IncidentReport, ReportReceipt } from './IncidentReport';

/** Defines where a report goes — the seam between capture and a transport the app chooses. */
export interface ReportSink {
  /** Delivers one report; resolves with the receipt, rejects when the destination refuses or is unreachable. */
  send(report: IncidentReport): Promise<ReportReceipt>;
}

/** Represents a report the destination refused or never received — `status` is `0` when no response arrived. */
export class ReportDeliveryError extends Error {
  readonly status: number;

  constructor(status: number, options?: ErrorOptions) {
    super(
      status === 0 ? 'The report could not reach its destination.' : `The report was refused (${status}).`,
      options,
    );
    this.name = 'ReportDeliveryError';
    this.status = status;
    Object.setPrototypeOf(this, ReportDeliveryError.prototype);
  }
}

/** Defines the options for {@link httpReportSink}. */
export interface HttpReportSinkOptions {
  /** The ingest URL the report is `POST`ed to as JSON. */
  readonly endpoint: string;
  /** Extra request headers — an ingest key, for one. */
  readonly headers?: HeadersInit;
  /** The credentials mode; set `include` when the ingest authenticates the user by cookie. */
  readonly credentials?: RequestCredentials;
  /** The fetch to send with. Default `globalThis.fetch` — keep it unwrapped, or the delivery lands on the trail. */
  readonly fetch?: typeof globalThis.fetch;
}

/** The body size under which a report travels `keepalive` and survives the page closing — browsers cap it at 64 KiB. */
const KeepaliveLimit = 60_000;

/** Reads the ingest's `{ id, url }` answer, tolerating any other body. */
async function readReceipt(response: Response, fallbackId: string): Promise<ReportReceipt> {
  try {
    const body: unknown = await response.json();
    if (body !== null && typeof body === 'object') {
      const { id, url } = body as { id?: unknown; url?: unknown };
      return {
        id: typeof id === 'string' && id !== '' ? id : fallbackId,
        ...(typeof url === 'string' && url !== '' ? { url } : {}),
      };
    }
  } catch {
    // An empty or non-JSON success still means the report arrived.
  }
  return { id: fallbackId };
}

/**
 * Creates a sink that `POST`s each report as JSON to an ingest endpoint and reads back `{ id, url }`. A report
 * without a screenshot usually fits the `keepalive` budget, so it still arrives when the user leaves the page.
 */
export function httpReportSink(options: HttpReportSinkOptions): ReportSink {
  return {
    async send(report) {
      const body = JSON.stringify(report);
      const headers = new Headers(options.headers);
      headers.set('Content-Type', 'application/json');
      let response: Response;
      try {
        response = await (options.fetch ?? globalThis.fetch)(options.endpoint, {
          method: 'POST',
          headers,
          body,
          keepalive: body.length < KeepaliveLimit,
          ...(options.credentials !== undefined ? { credentials: options.credentials } : {}),
        });
      } catch (error) {
        throw new ReportDeliveryError(0, { cause: error });
      }
      if (!response.ok) throw new ReportDeliveryError(response.status);
      return readReceipt(response, report.id);
    },
  };
}

/** Defines the in-memory sink — every delivered report, kept for assertions and previews. */
export interface MemoryReportSink extends ReportSink {
  /** The delivered reports, oldest first. */
  readonly reports: ReadonlyArray<IncidentReport>;
  /** Forgets every delivered report. */
  clear(): void;
}

/** Creates a sink that keeps every report in memory — the test double, and a preview before an ingest exists. */
export function memoryReportSink(): MemoryReportSink {
  let reports: IncidentReport[] = [];
  return {
    get reports() {
      return reports;
    },
    send(report) {
      reports = [...reports, report];
      return Promise.resolve({ id: report.id });
    },
    clear() {
      reports = [];
    },
  };
}

/** Creates a sink that prints each report to the console — local development before an ingest exists. */
export function consoleReportSink(): ReportSink {
  return {
    send(report) {
      console.info(`[report] ${report.id}`, report);
      return Promise.resolve({ id: report.id });
    },
  };
}
