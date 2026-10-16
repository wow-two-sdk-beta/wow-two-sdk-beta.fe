// Promise wrappers over `FileReader`. The browser API is event-based and easy to get subtly wrong (an `abort`
// that never settles, an error surfaced as `null`); these settle exactly once and reject with a real `Error`.
// `readFileAsText` takes an encoding, which is the one thing `Blob.text()` cannot express.

/** Runs one `FileReader` operation as a promise that always settles — resolve on load, reject on error or abort. */
function readWith<T extends string | ArrayBuffer>(blob: Blob, start: (reader: FileReader) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result as T);
    reader.onerror = () => reject(reader.error ?? new Error('File read failed'));
    reader.onabort = () => reject(new Error('File read aborted'));

    try {
      start(reader);
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

/** Reads a blob/file as text. `encoding` defaults to the browser's UTF-8 (pass e.g. `windows-1251` for legacy data). */
export function readFileAsText(blob: Blob, encoding?: string): Promise<string> {
  return readWith<string>(blob, (reader) => reader.readAsText(blob, encoding));
}

/** Reads a blob/file as a `data:` URL — the form an `<img src>` or a JSON payload can carry inline. */
export function readFileAsDataUrl(blob: Blob): Promise<string> {
  return readWith<string>(blob, (reader) => reader.readAsDataURL(blob));
}

/** Reads a blob/file as an `ArrayBuffer` — for binary inspection (magic bytes, hashing, parsing). */
export function readFileAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return readWith<ArrayBuffer>(blob, (reader) => reader.readAsArrayBuffer(blob));
}
