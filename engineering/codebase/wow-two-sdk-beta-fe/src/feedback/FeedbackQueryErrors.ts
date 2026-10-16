import { AppErrorType, type AppError } from '../foundation/results';
import type { Reporter } from '../reporting';
import { feedbackBus, NoticeTone, type FeedbackBus, type FeedbackNotice } from './FeedbackBus';

/**
 * Provides the failure types that offer a one-click report by default — the ones that point at a defect or an
 * outage. Validation, auth, not-found and conflict failures are the user's to fix, so a report would be noise.
 */
export const DefaultReportableErrorTypes: ReadonlyArray<AppErrorType> = Object.freeze([
  AppErrorType.Unexpected,
  AppErrorType.Unavailable,
  AppErrorType.Timeout,
]);

/** Defines the options for {@link feedbackQueryErrors}. */
export interface FeedbackQueryErrorsOptions {
  /**
   * Captures each reportable failure as an incident and offers its one-click send on the notice. Omitted,
   * notices carry no Report action.
   */
  readonly reporter?: Pick<Reporter, 'capture'>;
  /** Decides which failures offer a report. Default: the type is in {@link DefaultReportableErrorTypes}. */
  readonly isReportable?: (error: AppError) => boolean;
}

/** Maps the catalog's display-safe message without exposing raw exception or server diagnostics. */
export function toErrorNotice(error: AppError): FeedbackNotice {
  return { tone: NoticeTone.Danger, title: error.message };
}

/**
 * Creates the explicit query failure-to-notice adapter; cancellation stays quiet. With a `reporter`, a
 * reportable failure is captured the moment it happens — freezing the trail and the request behind it — and
 * the notice carries the incident's send, so the user reports it with one click.
 */
export function feedbackQueryErrors(
  bus: FeedbackBus = feedbackBus,
  options: FeedbackQueryErrorsOptions = {},
): (error: AppError) => void {
  const { reporter } = options;
  const isReportable = options.isReportable ?? ((error: AppError) => DefaultReportableErrorTypes.includes(error.type));
  return (error) => {
    if (error.type === AppErrorType.Cancelled) return;
    const notice = toErrorNotice(error);
    bus.notify(reporter && isReportable(error) ? { ...notice, report: reporter.capture(error).send } : notice);
  };
}
