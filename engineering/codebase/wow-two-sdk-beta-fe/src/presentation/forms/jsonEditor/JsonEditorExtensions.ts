/* Internal helpers for the JSON editor subviews — not exported from the folder barrel. */

/** Addresses a node inside the edited document. */
export type JsonPath = Array<string | number>;

/** Extends the edited JSON document with the path / type / serialization reads its subviews share. */
export const JsonEditorExtensions = {
  /** Names the JSON kind of a value — `null`, `array`, or its `typeof`. */
  describeType(v: unknown): string {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    return typeof v;
  },

  /** Renders a path as its dotted / bracketed source form — `items[0].name`. */
  pathToString(path: JsonPath): string {
    return path.map((p, i) => (typeof p === 'number' ? `[${p}]` : i === 0 ? p : `.${p}`)).join('');
  },

  /** Returns a copy of `root` with the node at `path` replaced by `next`. */
  setAtPath(root: unknown, path: JsonPath, next: unknown): unknown {
    if (path.length === 0) return next;
    const [head, ...rest] = path;
    if (Array.isArray(root)) {
      const idx = head as number;
      const copy = root.slice();
      copy[idx] = JsonEditorExtensions.setAtPath(root[idx], rest, next);
      return copy;
    }
    if (root && typeof root === 'object') {
      const key = head as string;
      return {
        ...(root as Record<string, unknown>),
        [key]: JsonEditorExtensions.setAtPath((root as Record<string, unknown>)[key], rest, next),
      };
    }
    return root;
  },

  /** `JSON.stringify` at `indent` spaces, falling back to an empty string on a cyclic value. */
  safeStringify(value: unknown, indent: number): string {
    try {
      return JSON.stringify(value, null, indent);
    } catch {
      return '';
    }
  },
} as const;
