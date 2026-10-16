import { computed, defineComponent, h, type Component, type PublicProps, type Ref, type VNode } from 'vue';

import type { AppArrayApi, AppFieldApi, AppFieldProps, AppFormState } from './AppForm';
import { getPath } from './Paths';

/** Typed, engine-free row rendering over the form's canonical array identity. */

/** The slice of the `AppForm` contract the helper consumes — every engine's `AppForm` satisfies it. */
export interface FieldArrayForm {
  /** Field wrapper — rendered per cell at the row's element path (`${path}[${index}].${name}`). */
  readonly Field: FieldArrayGlueField;
  /** Array ops at a path — the helper's ops delegate here (never reimplemented). */
  readonly array: (path: string) => AppArrayApi;
  /** Selector-subscribed form state — used for typed field values. */
  readonly useFormState: <TSlice>(
    selector: (state: AppFormState<unknown>) => TSlice,
    isEqual?: (a: TSlice, b: TSlice) => boolean,
  ) => Readonly<Ref<TSlice>>;
}

/**
 * The loose (engine-free `AppFieldComponent`) props shape a `form.Field` accepts at a dynamic
 * path — DERIVED from the contract's own props at `TPath = string`, never a second copy of them.
 * A hand-written twin drifts silently and the failure lands on the consumer, as
 * `useFieldArray(form, path)` no longer accepting an `AppForm` at all.
 */
export type FieldArrayGlueFieldProps = AppFieldProps<string>;

/**
 * `form.Field` seen loosely — a dynamic path, an untyped cell payload. The slot signature is
 * deliberately `never`-parametered so that an `AppFieldComponent<TValues>` is assignable here for
 * ANY `TValues`, which is what lets one helper serve both adapters; the row cell's real payload
 * type is restored below, on {@link FieldArrayFieldProps}.
 */
export interface FieldArrayGlueField {
  new (props: FieldArrayGlueFieldProps): {
    $props: FieldArrayGlueFieldProps & PublicProps;
    $slots: { default?: (...args: never[]) => VNode[] };
  };
}

/** One rendered row — a stable `key` for `v-for` (survives reorder) plus its live array index. */
export interface FieldArrayRow {
  readonly key: string;
  readonly index: number;
}

/** Props for the typed row-field accessor — binds `${path}[${index}].${name}`, `f.value` typed as `TItem[name]`. */
export interface FieldArrayFieldProps<TItem extends object, TName extends keyof TItem & string> {
  /** The row's current array index (from `row.index`). */
  readonly index: number;
  /** The element field key — one level deep into `TItem`. */
  readonly name: TName;
  readonly isDisabled?: boolean;
  readonly isRequired?: boolean;
  readonly isReadOnly?: boolean;
}

/** The typed row-field accessor — one level deep (`keyof TItem`), no recursion, no vendor deep-path types. */
export interface FieldArrayField<TItem extends object> {
  new <TName extends keyof TItem & string>(
    props: FieldArrayFieldProps<TItem, TName>,
  ): {
    $props: FieldArrayFieldProps<TItem, TName> & PublicProps;
    /** `field.value` / `field.setValue` are typed as `TItem[name]` — no cast, and `v-model="f.value"` binds. */
    $slots: { default?: (field: AppFieldApi<TItem[TName]>) => VNode[] };
  };
}

/** A runtime-checked view of one discriminated-union branch. */
export interface FieldArrayVariant<TItem extends object> {
  /** Tests the current row value with the supplied type guard. */
  readonly matches: (index: number) => boolean;
  /** The row-field accessor narrowed to the guarded branch. */
  readonly Field: FieldArrayField<TItem>;
}

/** What `useFieldArray` returns — reactive rows + stable keys, a typed row-field accessor, and element-typed ops. */
export interface FieldArray<TItem extends object> {
  /** The current rows — `{ key, index }`; render with `:key="row.key"` so a cell keeps identity through reorder. */
  readonly rows: ReadonlyArray<FieldArrayRow>;
  /** The current row count. */
  readonly length: number;
  /** The typed row-field accessor — `<array.Field :index="row.index" name="destination">`. */
  readonly Field: FieldArrayField<TItem>;
  /** Appends a row (typed to the element — a mistyped push is a compile error). Delegates to `form.array`. */
  readonly push: (value: TItem) => void;
  /** Inserts a row at `index`. Delegates to `form.array`. */
  readonly insert: (index: number, value: TItem) => void;
  /** Removes the row at `index`. Delegates to `form.array`. */
  readonly remove: (index: number) => void;
  /** Swaps two rows. Delegates to `form.array`. */
  readonly swap: (indexA: number, indexB: number) => void;
  /** Moves a row. Delegates to `form.array`. */
  readonly move: (fromIndex: number, toIndex: number) => void;
  /** Creates a runtime-checked field view for one discriminated-union branch. */
  readonly variant: <TVariant extends TItem>(guard: (item: TItem) => item is TVariant) => FieldArrayVariant<TVariant>;
}

/**
 * Row-render helper for the array at `path`. `TItem` is the row element type; row fields bind
 * one level deep (`keyof TItem`), typed, cast-free. Reuses `form.array(path)` for the ops
 * (row + error/touched reindexing stays in the adapter) and subscribes to its canonical row keys,
 * so containers re-render on structural changes but not on per-row field edits —
 * each `array.Field` owns its own value subscription. Works identically on `house` + `tanstack`.
 *
 * `rows` / `length` are live getters, so `v-for="row in array.rows"` reads the current rows on
 * every render; destructuring the returned object takes a snapshot of both.
 */
export function useFieldArray<TItem extends object>(form: FieldArrayForm, path: string): FieldArray<TItem> {
  const ops = form.array(path);

  const rows = computed<ReadonlyArray<FieldArrayRow>>(() => ops.keys.map((key, index) => ({ key, index })));

  const Field = defineComponent({
    name: 'FieldArrayField',
    props: {
      index: { type: Number, required: true },
      name: { type: String, required: true },
      // `default: undefined` per optional boolean — an undefaulted `Boolean` prop is cast to `false`.
      isDisabled: { type: Boolean, default: undefined },
      isRequired: { type: Boolean, default: undefined },
      isReadOnly: { type: Boolean, default: undefined },
    },
    setup(props, { slots }) {
      // The contract's `Field` is typed as a constructor for `TPath` inference; `h` wants the
      // runtime component behind it. One cast, at the one seam that needs it.
      const GlueField = form.Field as unknown as Component;
      return () =>
        h(
          GlueField,
          {
            name: `${path}[${props.index}].${props.name}`,
            isDisabled: props.isDisabled,
            isRequired: props.isRequired,
            isReadOnly: props.isReadOnly,
          },
          {
            // The one `unknown → element` cast — sound by construction (`${path}[${index}].${name}` is `TItem[name]`).
            default: (field: AppFieldApi<unknown>) =>
              slots.default?.(field as AppFieldApi<TItem[keyof TItem & string]>),
          },
        );
    },
  }) as unknown as FieldArrayField<TItem>;

  const variant = <TVariant extends TItem>(guard: (item: TItem) => item is TVariant): FieldArrayVariant<TVariant> => {
    const items = form.useFormState((state) => {
      const value = getPath(state.values, path);
      return Array.isArray(value) ? value : [];
    });
    return {
      matches: (index) => {
        const item = items.value[index];
        return typeof item === 'object' && item !== null && guard(item as TItem);
      },
      Field: Field as unknown as FieldArrayField<TVariant>,
    };
  };

  return {
    get rows() {
      return rows.value;
    },
    get length() {
      return rows.value.length;
    },
    Field,
    push: ops.push,
    insert: ops.insert,
    remove: ops.remove,
    swap: ops.swap,
    move: ops.move,
    variant,
  };
}
