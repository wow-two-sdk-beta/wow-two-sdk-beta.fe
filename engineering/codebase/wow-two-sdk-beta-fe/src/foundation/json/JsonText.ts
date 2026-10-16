import { JsonLimits } from './JsonLimits';
import { JsonFailureCode } from './JsonFailureCode';
import type { JsonFailure } from './models/JsonFailure';

/** Internal control-flow error translated only at the codec boundary. */
export class JsonOperationError extends Error {
  constructor(readonly failure: JsonFailure) {
    super(failure.message);
  }
}
export function rejectJson(code: JsonFailureCode, message: string): never {
  throw new JsonOperationError({ code, message });
}

/** Lexical resource/key pass only. The vendor remains responsible for the complete JSON grammar. */
export function rewriteJsonKeys(text: string, key: (value: string, seen: Set<string>) => string): string {
  if (text.length > JsonLimits.maxCharacters) rejectJson(JsonFailureCode.ResourceLimit, 'The JSON text is too large.');
  const stack: Array<Set<string> | null> = [];
  const chunks: string[] = [];
  let start = 0,
    tokens = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if (char === '"') {
      const begin = i;
      for (i++; i < text.length; i++) {
        if (text[i] === '\\') i++;
        else if (text[i] === '"') break;
      }
      const end = i + 1;
      let next = end;
      while (next < text.length && /[ \t\r\n]/.test(text[next]!)) next++;
      const seen = stack.at(-1);
      if (text[next] === ':' && seen instanceof Set) {
        const decoded: unknown = JSON.parse(text.slice(begin, end));
        if (typeof decoded !== 'string') throw new Error('JSON key invariant failed.');
        chunks.push(text.slice(start, begin), JSON.stringify(key(decoded, seen)));
        start = end;
      }
      tokens++;
    } else if (char === '{' || char === '[') {
      stack.push(char === '{' ? new Set<string>() : null);
      if (stack.length > JsonLimits.maxDepth)
        rejectJson(JsonFailureCode.ResourceLimit, 'The JSON nesting is too deep.');
      tokens++;
    } else if (char === '}' || char === ']') {
      stack.pop();
    } else if (!/[ \t\r\n,:]/.test(char)) {
      while (i + 1 < text.length && !/[\s,:[\]{}"]/.test(text[i + 1]!)) i++;
      tokens++;
    }
    if (tokens > JsonLimits.maxTokens) rejectJson(JsonFailureCode.ResourceLimit, 'The JSON token budget was exceeded.');
  }
  chunks.push(text.slice(start));
  return chunks.join('');
}

/** Counts JSON string escaping without allocating the escaped representation. */
export function jsonStringLength(text: string, remaining: number): number {
  if (text.length + 2 > remaining) rejectJson(JsonFailureCode.ResourceLimit, 'The JSON string budget was exceeded.');
  let size = 2;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code === 34 || code === 92 || [8, 9, 10, 12, 13].includes(code)) size += 2;
    else if (code < 32) size += 6;
    else if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        size += 2;
        i++;
      } else size += 6;
    } else if (code >= 0xdc00 && code <= 0xdfff) size += 6;
    else size++;
    if (size > remaining) rejectJson(JsonFailureCode.ResourceLimit, 'The JSON string budget was exceeded.');
  }
  return size;
}
