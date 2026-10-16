import type { TextInputProps } from '@src/presentation/forms/textInput';
import type { EmailInputProps } from '@src/presentation/forms/emailInput';
import type { TelInputProps } from '@src/presentation/forms/telInput';
import type { UrlInputProps } from '@src/presentation/forms/urlInput';
import type { PasswordInputProps } from '@src/presentation/forms/passwordInput';
import type { SearchInputProps } from '@src/presentation/forms/searchInput';
import type { NumberInputProps } from '@src/presentation/forms/numberInput';
import type { TextAreaInputProps } from '@src/presentation/forms/textAreaInput';
import type { DateInputProps } from '@src/presentation/forms/dateInput';
import type { TimeInputProps } from '@src/presentation/forms/timeInput';
import type { DateTimeInputProps } from '@src/presentation/forms/dateTimeInput';

/** Compiled by vue-tsc: native attrs/listeners remain accepted alongside the canonical model. */
const native = {
  name: 'title',
  form: 'editor',
  autocomplete: 'off',
  'aria-label': 'Title',
  onBlur: (event: FocusEvent): void => void event,
  onInput: (event: Event): void => void event,
  onKeydown: (event: KeyboardEvent): void => void event,
};
const text = { ...native, modelValue: 'draft', size: 'md' } satisfies TextInputProps;
const email = { ...native, modelValue: 'a@example.test' } satisfies EmailInputProps;
const tel = { ...native, modelValue: '+123' } satisfies TelInputProps;
const url = { ...native, modelValue: 'https://example.test' } satisfies UrlInputProps;
const password = { ...native, modelValue: 'secret' } satisfies PasswordInputProps;
const search = { ...native, modelValue: 'query' } satisfies SearchInputProps;
const number = { ...native, modelValue: 12, min: 0, max: 100, step: 0.5 } satisfies NumberInputProps;
const textarea = { ...native, modelValue: 'body', rows: 4, maxlength: 200 } satisfies TextAreaInputProps;
const date = { ...native, modelValue: null } satisfies DateInputProps;
const time = { ...native, modelValue: null } satisfies TimeInputProps;
const datetime = { ...native, modelValue: null } satisfies DateTimeInputProps;
void [text, email, tel, url, password, search, number, textarea, date, time, datetime];
