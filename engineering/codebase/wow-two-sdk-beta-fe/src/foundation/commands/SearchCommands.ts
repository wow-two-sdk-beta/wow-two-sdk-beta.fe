// Search + ranking — the pure half of a palette's filter box. Kept out of the registry so any list can be ranked
// (a static array, a scoped subset, an app set merged with the SDK's) without owning a registry, and so the
// ranking is testable without mounting anything.
//
// Non-obvious decisions:
// - Matching covers `title`, `keywords`, and `group` only. `description` is deliberately excluded: a sentence-long
//   description matches almost any short query, which floods the list and destroys the ranking.
// - Ranking is tiered, not fuzzy. Fuzzy scoring reorders rows unpredictably as the user types; four ordered tiers
//   (title prefix → title substring → keyword → group) stay legible and cheap.
// - Ties keep the caller's original order — the sort is explicitly stabilized on the source index rather than
//   relying on engine sort stability, so a palette's rows never reshuffle between keystrokes.
// - An empty (or whitespace-only) query returns the SAME array reference it was given, so a `useMemo`d caller
//   doesn't churn on the common "nothing typed yet" path.

import type { Command } from './Command';

/** The rank of a command the query excludes — compare against this to test a match. */
export const NoMatch = Number.POSITIVE_INFINITY;

/** The tier a match landed in — lower sorts first. Exported so a surface can label or style a match by its origin. */
export const CommandMatchRank = {
  /** The title starts with the query — the strongest signal. */
  TitlePrefix: 0,
  /** The title contains the query somewhere after the start. */
  TitleSubstring: 1,
  /** One of the `keywords` contains the query. */
  Keyword: 2,
  /** The `group` label contains the query — the weakest signal. */
  Group: 3,
} as const;

export type CommandMatchRank = (typeof CommandMatchRank)[keyof typeof CommandMatchRank];

/**
 * Scores one command against a query — a {@link CommandMatchRank} when it matches, {@link NoMatch} when it
 * doesn't. Case-insensitive; the query is trimmed. An empty query matches everything at the best rank.
 */
export function rankCommand(command: Command, query: string): number {
  const needle = query.trim().toLowerCase();
  if (needle === '') return CommandMatchRank.TitlePrefix;

  const title = command.title.toLowerCase();
  if (title.startsWith(needle)) return CommandMatchRank.TitlePrefix;
  if (title.includes(needle)) return CommandMatchRank.TitleSubstring;

  const keywords = command.keywords;
  if (keywords !== undefined && keywords.some((keyword) => keyword.toLowerCase().includes(needle))) {
    return CommandMatchRank.Keyword;
  }

  const group = command.group;
  if (group !== undefined && group.toLowerCase().includes(needle)) return CommandMatchRank.Group;

  return NoMatch;
}

/**
 * Filters and ranks commands for a palette's search box. Non-matching commands are dropped; matches sort by
 * {@link CommandMatchRank}, ties keeping their original relative order. An empty / whitespace-only query returns
 * the input untouched (same reference, original order).
 *
 * Availability is NOT applied here — pass `registry.available()` when the palette should hide blocked commands.
 */
export function searchCommands(commands: ReadonlyArray<Command>, query: string): ReadonlyArray<Command> {
  if (query.trim() === '') return commands;

  const matches: { readonly command: Command; readonly rank: number; readonly index: number }[] = [];
  commands.forEach((command, index) => {
    const rank = rankCommand(command, query);
    if (rank !== NoMatch) matches.push({ command, rank, index });
  });

  matches.sort((left, right) => left.rank - right.rank || left.index - right.index);
  return matches.map((match) => match.command);
}
