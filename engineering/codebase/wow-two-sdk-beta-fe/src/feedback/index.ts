// @wow-two-beta/fe/feedback — headless feedback bus. App code publishes notices
// (`notify({ tone, title })` on the default bus, or `createFeedbackBus()` for isolation) and a
// presentation adapter renders them — `<FeedbackToastHost/>` (`/presentation/feedback`) forwards each
// notice into the imperative `toastHost.toast()` API. `feedbackQueryErrors()` produces the callback
// for a global query error seam (`createQueryClient({ onError: feedbackQueryErrors() })`), coercing
// `ApiError` → danger notice with the problem-details title; the bridge lives HERE so `/query`
// never depends on the bus. Given a `/reporting` reporter, the bridge captures each reportable
// failure and puts the incident's one-click send on the notice (`report`). GWDNBM: pure
// transient pub/sub plus explicit retained history; nothing auto-subscribes or persists. This
// subpath carries NO peer dependency (the `VNode` type, `foundation` and `/reporting` only) and NO
// UI — mirrors `/auth`'s standalone, presentation-free shape.

// Bus — notice model, hub factory, default singleton
export {
  NoticeTone,
  NoticeCategory,
  createFeedbackBus,
  feedbackBus,
  notify,
  type NoticeNode,
  type FeedbackNotice,
  type PublishedNotice,
  type NoticeListener,
  type RetainedNoticeListener,
  type NoticeDismissListener,
  type FeedbackBus,
  type FeedbackBusOptions,
  type FeedbackErrorContext,
  type FeedbackErrorHandler,
} from './FeedbackBus';

// Query bridge — plugs the bus into `createQueryClient({ onError })`, optionally with one-click reports
export {
  feedbackQueryErrors,
  toErrorNotice,
  DefaultReportableErrorTypes,
  type FeedbackQueryErrorsOptions,
} from './FeedbackQueryErrors';
