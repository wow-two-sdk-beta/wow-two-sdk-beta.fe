import type { ScreenFailure } from './models/ScreenFailure';

export type { ScreenFailure } from './models/ScreenFailure';
export type { ScreenRequestResult } from './models/ScreenRequestResult';

/** The `status` discriminant of a {@link ScreenRequestResult} — for a consumer's own status→copy map. */
export type ScreenStatus = 'ok' | ScreenFailure['status'];
