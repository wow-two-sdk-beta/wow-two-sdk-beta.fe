/** Defines an RFC 7807 problem-details error body, with an index signature for extension members. */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  [key: string]: unknown;
}
