import { feedbackBus, NoticeTone, type FeedbackBus, type FeedbackNotice } from './FeedbackBus';

/** The single neutral notice an expired session publishes; its fixed id replaces a repeat instead of stacking. */
export const SessionExpiredNotice: FeedbackNotice = Object.freeze({
  id: 'session-expired',
  tone: NoticeTone.Info,
  title: 'Signed out — sign in again',
});

/** Creates the `bridge.subscribeExpired` listener that publishes one neutral notice per expiry. */
export function feedbackSessionExpiry(
  bus: FeedbackBus = feedbackBus,
  notice: FeedbackNotice = SessionExpiredNotice,
): () => void {
  return () => {
    bus.notify(notice);
  };
}
