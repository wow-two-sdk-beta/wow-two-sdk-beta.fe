import { ResultExtensions } from '@src/foundation/results';
import { AuthProvider } from '@src/auth';
import { FlagsProvider } from '@src/flags';
import { ProgressProvider } from '@src/router';
import { smokeCase, type SmokeCase } from '../../support/Smoke';

/* The narrowest strategy that satisfies the contract: one required delegate, resolving signed
   out. `canResolveOnMount: false` keeps the smoke case from depending on a promise settling. */
const signedOutStrategy = {
  resolveUser: () => Promise.resolve(ResultExtensions.ok(null)),
};

/**
 * The three module-level providers that ship as SFCs rather than composables — `auth`, `flags`,
 * and `router`'s navigation-progress host.
 *
 * They sit outside `presentation/`, so nothing in the group sweeps reaches them, and each one is
 * the root a consuming app mounts once at the top of its tree: if a provider cannot survive SSR,
 * every route under it fails rather than one component.
 */
export const providersCases: readonly SmokeCase[] = [
  smokeCase('AuthProvider', AuthProvider, { strategy: signedOutStrategy, canResolveOnMount: false }, { slot: true }),
  smokeCase('FlagsProvider', FlagsProvider, {}, { slot: true }),
  smokeCase('ProgressProvider', ProgressProvider, {}, { slot: true }),
];
