/** Defines a branded alias for a raw ISO-8601 date-time string (`2026-07-04T12:00:00Z`) on a wire DTO. */
export type IsoDateTime = string & { readonly __brand: 'IsoDateTime' };

/** Defines a branded alias for a raw ISO-8601 calendar-date string (`2026-07-04`) on a wire DTO. */
export type IsoDate = string & { readonly __brand: 'IsoDate' };
