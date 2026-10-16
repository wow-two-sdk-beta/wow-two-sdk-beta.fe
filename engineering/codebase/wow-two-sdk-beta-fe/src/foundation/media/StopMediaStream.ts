/**
 * Stops every track on a stream, releasing the underlying camera / microphone.
 *
 * Idempotent and total: a `null` / `undefined` stream, an already-stopped stream, and an object that is not a
 * stream at all are all no-ops. Never throws — it is called from cleanup paths (`finally`, a scope disposal)
 * where a throw would mask the original failure or abort the rest of the teardown.
 *
 * @param stream The stream to release. Nullable so a caller can pass state without a guard of its own.
 */
export function stopMediaStream(stream: MediaStream | null | undefined): void {
  if (stream === null || stream === undefined) return;

  let tracks: ReadonlyArray<MediaStreamTrack> = [];
  try {
    const result: unknown = stream.getTracks();
    if (!Array.isArray(result)) return;
    tracks = result as readonly MediaStreamTrack[];
  } catch {
    // No usable `getTracks` — not a stream, or one from a torn-down realm. Nothing to release.
    return;
  }

  for (const track of tracks) {
    try {
      track.stop();
    } catch {
      // This track refused to stop. Swallowed on purpose: the remaining tracks still hold live devices, and
      // they are the ones this loop must reach.
    }
  }
}
