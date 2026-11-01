import { ApiFailureFactory, type ApiFailure } from '../foundation/http';
import { ResultExtensions, type Result } from '../foundation/results';

/** Defines the signed-in person a BFF session names. */
export interface BffPerson {
  /** The stable subject id — the identity key, never the display name. */
  readonly sub: string;
  readonly name: string | null;
  readonly email: string | null;
  readonly phoneNumber: string | null;
}

/** Defines the organization the session acts in, and the person's role there. */
export interface BffOrganization {
  readonly id: string;
  readonly role: string;
}

/**
 * Defines the user a BFF session resolves to. The CSRF token is deliberately absent: it never renders, so the
 * strategy keeps it and the HTTP layer echoes it.
 */
export interface BffUser {
  readonly person: BffPerson;
  /** `null` for a person acting in no organization. */
  readonly organization: BffOrganization | null;
  readonly permissions: readonly string[];
  /** When the session ends (ISO 8601); `null` when the server sent none that parses. */
  readonly expiresAt: string | null;
}

/** Defines one decoded `GET {prefix}/session` response. */
export interface BffSessionSnapshot {
  /** `null` while signed out. */
  readonly user: BffUser | null;
  /** The token unsafe requests echo; `null` while signed out. */
  readonly csrfToken: string | null;
}

/** Defines one decoded `POST {prefix}/logout` response. */
export interface BffLogout {
  /** Where the page navigates to end the identity provider's session. */
  readonly endSessionUrl: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === 'string' && value !== '';
/** Reads an optional text field; anything but text reads as absent. */
const optionalText = (value: unknown): string | null => (typeof value === 'string' ? value : null);
const protocol = (): ApiFailure => ApiFailureFactory.create('protocol');

/** Decodes the session response; a payload that breaks the contract is a `protocol` failure. */
export function decodeBffSession(value: unknown): Result<BffSessionSnapshot, ApiFailure> {
  if (!isRecord(value) || typeof value['isAuthenticated'] !== 'boolean') return ResultExtensions.fail(protocol());
  if (!value['isAuthenticated']) return ResultExtensions.ok({ user: null, csrfToken: null });

  const person = value['person'];
  const organization = value['organization'];
  const permissions = value['permissions'] ?? [];
  const expiresAt = value['expiresAt'];
  if (!isRecord(person) || !isText(person['sub']) || !isText(value['csrfToken'])) {
    return ResultExtensions.fail(protocol());
  }
  if (organization != null && (!isRecord(organization) || !isText(organization['id']))) {
    return ResultExtensions.fail(protocol());
  }
  if (!Array.isArray(permissions) || !permissions.every(isText)) return ResultExtensions.fail(protocol());

  return ResultExtensions.ok({
    csrfToken: value['csrfToken'],
    user: {
      person: {
        sub: person['sub'],
        name: optionalText(person['name']),
        email: optionalText(person['email']),
        phoneNumber: optionalText(person['phoneNumber']),
      },
      organization: isRecord(organization)
        ? { id: organization['id'] as string, role: optionalText(organization['role']) ?? '' }
        : null,
      permissions: Object.freeze([...(permissions as string[])]),
      expiresAt: typeof expiresAt === 'string' && Number.isFinite(Date.parse(expiresAt)) ? expiresAt : null,
    },
  });
}

/** Whether a page may navigate to `url` to end the provider session: a local path, or an absolute http(s) URL. */
function isNavigable(url: string): boolean {
  if (url.startsWith('/')) return !url.startsWith('//') && !url.includes('\\');
  try {
    const { protocol: scheme } = new URL(url);
    return scheme === 'https:' || scheme === 'http:';
  } catch {
    return false;
  }
}

/** Decodes the logout response; an end-session URL the page may not navigate to is a `protocol` failure. */
export function decodeBffLogout(value: unknown): Result<BffLogout, ApiFailure> {
  if (!isRecord(value) || !isText(value['endSessionUrl']) || !isNavigable(value['endSessionUrl'])) {
    return ResultExtensions.fail(protocol());
  }
  return ResultExtensions.ok({ endSessionUrl: value['endSessionUrl'] });
}

/** Extends a {@link BffUser} with the checks a screen and a bridge need. */
export const BffSessionExtensions = {
  /** Whether the user holds `permission`; `false` while signed out. */
  hasPermission(user: BffUser | null | undefined, permission: string): boolean {
    return user?.permissions.includes(permission) ?? false;
  },

  /**
   * The stable user-and-organization key: pass it as `createAuthBridge({ getIdentity })` so a refreshed session
   * keeps its caches and a person or organization switch drops them.
   */
  identity(user: BffUser): string {
    return `${user.person.sub}\u0000${user.organization?.id ?? ''}`;
  },

  /** The session end as epoch milliseconds; `null` when the server sent none that parses. */
  expiresAtMs(user: BffUser): number | null {
    return user.expiresAt === null ? null : Date.parse(user.expiresAt);
  },
} as const;
