import { inject, type InjectionKey, type ShallowRef } from 'vue';

/**
 * The seam between `EditableInput` and its `EditableInputPreview` / `EditableInputInput` /
 * `EditableInputSubmit` / `EditableInputCancel` children.
 *
 * React attached those as `EditableInput.Preview` / `.Input` / `.Submit` / `.Cancel` statics over a
 * `createContext`. An SFC's generated default export cannot carry statics cleanly, so they ship
 * as sibling components and share state through provide/inject instead.
 *
 * Every field but the setters is a live getter — read them off the object, don't destructure.
 */
export interface EditableInputContextValue {
  /** The committed value. */
  readonly value: string;
  /** The in-flight edit buffer. */
  readonly draft: string;
  setDraft: (value: string) => void;
  /** Whether the input is showing instead of the preview. */
  readonly isEditing: boolean;
  setEditing: (editing: boolean) => void;
  /** Commits the draft and leaves edit mode. */
  submit: () => void;
  /** Discards the draft and leaves edit mode. */
  cancel: () => void;
  /** The preview text shown when the value is empty. */
  readonly placeholder: string;
  readonly isDisabled: boolean;
  readonly isReadOnly: boolean;
  readonly canSubmitOnBlur: boolean;
  readonly canSubmitOnEnter: boolean;
  readonly canCancelOnEscape: boolean;
  /** Holds the DOM node of the inner input — the focus/caret effect reads it. */
  inputEl: ShallowRef<HTMLInputElement | null>;
}

export const EditableInputKey: InjectionKey<EditableInputContextValue> = Symbol('wow-two.editable');

/** Reads the surrounding editable context; throws when used outside an `<EditableInput>`. */
export function useEditableContext(): EditableInputContextValue {
  const context = inject(EditableInputKey, null);
  if (!context) throw new Error('EditableInput.* must be used inside <EditableInput>');
  return context;
}
