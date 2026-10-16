// files — foundation seam. Client-side file handling: `accept`-attribute matching (`matchesAccept` for a real
// `File`, `matchesAcceptType` for the advisory pre-drop check), file-name parsing (`fileExtension`/`fileBaseName`/
// `safeFileName`), promise-wrapped `FileReader` reads, and object-URL downloads that always revoke. No Vue —
// the `FileUpload` / `FilePicker` components are consumers, not owners, of these rules. Pair with
// `foundation/formatters`'s `formatBytes` to render sizes.

export {
  type FileLike,
  type MatchesAcceptTypeOptions,
  parseAcceptTokens,
  matchesAccept,
  matchesAcceptType,
} from './Accept';

export { type SafeFileNameOptions, fileExtension, fileBaseName, safeFileName } from './FileName';

export { readFileAsText, readFileAsDataUrl, readFileAsArrayBuffer } from './ReadFile';

export { downloadBlob, downloadText, downloadJson } from './DownloadFile';
