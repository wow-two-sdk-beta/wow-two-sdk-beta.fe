import type { Result } from '../../results';
import type { NotificationFailure } from './NotificationFailure';

/** The completed operation, carrying either its value or its typed failure. */
export type NotificationShowResult = Result<Notification, NotificationFailure>;
