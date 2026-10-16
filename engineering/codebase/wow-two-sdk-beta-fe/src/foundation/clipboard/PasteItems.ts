/** What a paste carried, normalized to the three representations a consumer acts on. */
export interface PasteItems {
  /** The `text/plain` representation, or `undefined` when the paste carried none (a bare image paste). */
  readonly text: string | undefined;

  /** The `text/html` representation, or `undefined`. Present from a rich source — sanitize before rendering. */
  readonly html: string | undefined;

  /** Files on the paste — a screenshot, an image, a document. Empty when the paste was text only. */
  readonly files: ReadonlyArray<File>;
}

/** Reads a member off an object, guarded — a throwing getter reads as `undefined`. */
function member(source: object, key: string): unknown {
  try {
    return (source as Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
}

/** Reads one MIME representation as a string. Absent, blank, and throwing all read as `undefined`. */
function readData(data: DataTransfer, type: string): string | undefined {
  try {
    const getData = member(data, 'getData');
    if (typeof getData !== 'function') return undefined;

    const value: unknown = (getData as (type: string) => unknown).call(data, type);
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Collects files from `DataTransfer.items`, skipping non-file entries and any entry that refuses to resolve. */
function filesFromItems(data: DataTransfer): File[] {
  const files: File[] = [];
  try {
    const list = member(data, 'items');
    if (typeof list !== 'object' || list === null) return files;

    const length = member(list, 'length');
    if (typeof length !== 'number') return files;

    const items = list as DataTransferItemList;
    for (let index = 0; index < length; index++) {
      try {
        const item = items[index];
        if (item === undefined || item === null) continue;
        if (item.kind !== 'file' || typeof item.getAsFile !== 'function') continue;

        const file = item.getAsFile();
        if (file !== null) files.push(file);
      } catch {
        // One malformed entry does not invalidate the others.
      }
    }
  } catch {
    // No usable item list. `files` is the fallback.
  }
  return files;
}

/** Collects files from `DataTransfer.files` — the `FileList` fallback when the item list yielded nothing. */
function filesFromFileList(data: DataTransfer): File[] {
  const files: File[] = [];
  try {
    const list = member(data, 'files');
    if (typeof list !== 'object' || list === null) return files;

    const length = member(list, 'length');
    if (typeof length !== 'number') return files;

    const fileList = list as FileList;
    for (let index = 0; index < length; index++) {
      const file = fileList[index];
      if (file !== undefined && file !== null) files.push(file);
    }
  } catch {
    // Nothing readable here either. An empty file list is a valid answer.
  }
  return files;
}

/**
 * Extracts the text, HTML, and files a `paste` event carried.
 *
 * Needs no permission and no user gesture — the event IS the user's authorization — and works in every engine,
 * including the ones that withhold `navigator.clipboard.read`. This is the path to build "paste an image"
 * features on.
 *
 * Does not call `preventDefault`: suppressing the browser's own paste is the consumer's decision, and a handler
 * that reads the payload for a side effect usually wants the default insert to happen too. `usePasteHandler`
 * exposes it as an option.
 *
 * Never throws — a malformed or partial event yields `{ text: undefined, html: undefined, files: [] }`.
 *
 * @param event The `paste` event, from a `@paste` binding or a native listener.
 */
export function getPasteItems(event: ClipboardEvent): PasteItems {
  const empty: PasteItems = { text: undefined, html: undefined, files: [] };

  try {
    if (typeof event !== 'object' || event === null) return empty;

    const transfer = member(event, 'clipboardData');
    if (typeof transfer !== 'object' || transfer === null) return empty;

    const data = transfer as DataTransfer;
    const fromItems = filesFromItems(data);

    return {
      text: readData(data, 'text/plain'),
      html: readData(data, 'text/html'),
      files: fromItems.length > 0 ? fromItems : filesFromFileList(data),
    };
  } catch {
    return empty;
  }
}
