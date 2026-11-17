// @wow-two-beta/fe/feedback — headless feedback bus: publishers call `notify`, a presentation adapter renders.

// Bus — notice model, hub factory, default singleton
export {
  NoticeTone,
  NoticePriority,
  NoticePriorityRank,
  NoticeCategory,
  createFeedbackBus,
  feedbackBus,
  notify,
  type NoticeNode,
  type NoticeCompactCopy,
  type NoticeGroup,
  type NoticeProgress,
  type NoticeReminderRequest,
  type FeedbackReminderOptions,
  type FeedbackNotice,
  type PublishedNotice,
  type RetainedSeed,
  type NoticeListener,
  type RetainedNoticeListener,
  type NoticeDismissListener,
  type ToastPauseUntil,
  type FeedbackNotificationState,
  type NotificationStateListener,
  type FeedbackBus,
  type FeedbackTrackNotices,
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

// Session expiry — one neutral notice for `bridge.subscribeExpired`; a 401 never becomes an error toast
export { feedbackSessionExpiry, SessionExpiredNotice } from './FeedbackSessionExpiry';
