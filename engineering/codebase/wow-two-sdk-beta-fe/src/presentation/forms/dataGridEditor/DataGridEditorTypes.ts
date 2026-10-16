/**
 * Shared vocabulary for the DataGridEditor folder.
 *
 * React kept these next to the component in `DataGridEditor.tsx`, where the private
 * `CellEditor` could close over them. Here `CellEditor` is its own SFC, so the
 * enums live in a sibling module both files import — the same split `table/`
 * uses for `TableContext.ts`. `DataGridEditorMove` stays out of the folder barrel,
 * exactly as it was module-private in React.
 */

/** Defines the editable data type of a DataGridEditor cell. */
export const DataGridEditorCellType = {
  /** Refers to a free-text cell. */
  Text: 'text',
  /** Refers to a numeric cell. */
  Number: 'number',
  /** Refers to a single-select cell. */
  Select: 'select',
  /** Refers to a boolean (checkbox) cell. */
  Boolean: 'boolean',
} as const;

export type DataGridEditorCellType = (typeof DataGridEditorCellType)[keyof typeof DataGridEditorCellType];

/** Defines the horizontal text alignment of a DataGridEditor column. */
export const DataGridEditorColumnAlign = {
  /** Refers to left alignment. */
  Left: 'left',
  /** Refers to right alignment. */
  Right: 'right',
  /** Refers to centered alignment. */
  Center: 'center',
} as const;

export type DataGridEditorColumnAlign = (typeof DataGridEditorColumnAlign)[keyof typeof DataGridEditorColumnAlign];

/** Defines the cursor advance after a DataGridEditor cell edit commits. */
export const DataGridEditorMove = {
  /** Refers to advancing to the cell on the right. */
  Right: 'right',
  /** Refers to advancing to the cell below. */
  Down: 'down',
} as const;

export type DataGridEditorMove = (typeof DataGridEditorMove)[keyof typeof DataGridEditorMove];

export interface DataGridEditorColumn<T> {
  readonly key: string;
  /**
   * The header label. React took a `ReactNode`; a column is an array entry and
   * cannot become its own slot, so the scalar stays here and the `header`
   * scoped slot is the rich override.
   */
  readonly header: string | number;
  /** Returns the cell's underlying value. */
  readonly accessor: (row: T) => unknown;

  /**
   * Optional custom cell renderer for read mode. Returns a value rendered as
   * text; for rich markup use the `cell` scoped slot, which receives
   * `{ row, column, rowIndex, colIndex }`.
   */
  readonly cell?: (row: T) => unknown;
  readonly type?: DataGridEditorCellType;
  /** The choices for a `select` cell. `label` is rendered as `<option>` text. */
  readonly options?: Array<{ value: string | number; label: string | number }>;
  readonly isEditable?: boolean;
  readonly width?: string;
  readonly align?: DataGridEditorColumnAlign;
}
