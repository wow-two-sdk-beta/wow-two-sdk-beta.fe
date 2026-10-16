// @wow-two-beta/ui-vue/reporting — headless incident reporting. The app keeps a trail of what the user did
// (`wrapFetch` requests, `trackRouter` navigations, `captureClicks` clicks, `trackNotices` notices,
// `captureErrors` uncaught errors, its own `record` steps); when something fails, `capture(error)` freezes an
// incident — the trail so far, the request behind the failure with its trace and request ids, the page and the
// user — and its `send` delivers an `IncidentReport` through a `ReportSink` in one call. A toast binds that send
// to a Report action (`ToastOptions.report`), and `feedbackQueryErrors(bus, { reporter })` wires it for every
// failed query. GWDNBM: nothing records until a tracker is wired, and nothing leaves the device until a user or
// the app sends an incident. Peer-free and presentation-free: `foundation` only.

// Wire contract — the report, the trail, and what a delivery hands back
export {
  IncidentReportSchema,
  BreadcrumbCategory,
  BreadcrumbLevel,
  type Breadcrumb,
  type BreadcrumbInput,
  type RecordedRequest,
  type ReportedError,
  type ReportApp,
  type ReportUser,
  type ReportPage,
  type ReportClient,
  type ReportScreenshot,
  type IncidentReport,
  type ReportReceipt,
  type ReportSendOptions,
  type ReportSend,
} from './IncidentReport';

// Reporter — the trail, its trackers, and incident capture
export {
  createReporter,
  templatePath,
  DefaultMaxBreadcrumbs,
  DefaultScreenshotTimeoutMs,
  type Reporter,
  type ReporterOptions,
  type CapturedIncident,
  type NavigationSource,
  type NoticeSource,
  type ScreenshotCapture,
} from './CreateReporter';

// Error normalization — what a report says about the failure
export { describeError, toTraceId } from './DescribeError';

// Click naming — what a click breadcrumb says about the control
export { describeClickTarget, type ClickCaptureOptions } from './DescribeTarget';

// Sinks — the delivery seam and its built-in destinations
export {
  httpReportSink,
  memoryReportSink,
  consoleReportSink,
  ReportDeliveryError,
  type ReportSink,
  type HttpReportSinkOptions,
  type MemoryReportSink,
} from './ReportSink';
