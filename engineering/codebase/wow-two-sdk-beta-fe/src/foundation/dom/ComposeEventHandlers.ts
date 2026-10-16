/**
 * Chain two event handlers. The first handler runs, then the second — unless
 * the first called `event.preventDefault()`, in which case the second is skipped.
 * Use when overriding a default handler from a parent while still allowing
 * the consumer to provide their own.
 */
export function composeEventHandlers<E extends Event>(
  theirHandler: ((event: E) => void) | undefined,
  ourHandler: (event: E) => void,
  { checkForDefaultPrevented = true }: { checkForDefaultPrevented?: boolean } = {},
): (event: E) => void {
  return (event) => {
    theirHandler?.(event);
    if (!checkForDefaultPrevented || !event.defaultPrevented) {
      ourHandler(event);
    }
  };
}
