// A click breadcrumb names what the user pressed — `button "Save"`, `link "Settings"` — the way a person would
// retell the steps. Only interactive elements are recorded: a click on bare text or a backdrop says nothing
// about the flow. Values are never read — a checkbox is named by its label, never by its state or an input's
// content — and `data-report-ignore` drops a subtree while `data-report-label` names an element explicitly.

/** The elements a click is recorded on — the native controls and the ARIA widget roles. */
const Interactive = [
  'button',
  'a[href]',
  'summary',
  'select',
  'input[type="checkbox"]',
  'input[type="radio"]',
  'input[type="submit"]',
  'input[type="button"]',
  'input[type="reset"]',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="tab"]',
  '[role="option"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="treeitem"]',
].join(', ');

/** The longest name a click breadcrumb keeps. */
const MaxNameLength = 40;

/** Defines the options for `Reporter.captureClicks`. */
export interface ClickCaptureOptions {
  /**
   * Names a control by its visible text when it has no `aria-label` or `data-report-label`. Turn it off when
   * button and link text can carry personal data. Default `true`.
   */
  readonly isTextNamed?: boolean;
}

/** The role a control plays — its explicit `role`, else its element's implicit one. */
function roleOf(element: Element): string {
  const explicit = element.getAttribute('role');
  if (explicit) return explicit;
  const tag = element.tagName.toLowerCase();
  if (tag === 'a') return 'link';
  if (tag === 'select') return 'combobox';
  if (tag === 'input') {
    const type = (element as HTMLInputElement).type;
    return type === 'checkbox' || type === 'radio' ? type : 'button';
  }
  return tag;
}

/** Collapses whitespace and cuts the name to its budget. */
function tidy(text: string | null | undefined): string {
  const collapsed = (text ?? '').replace(/\s+/gu, ' ').trim();
  return collapsed.length > MaxNameLength ? `${collapsed.slice(0, MaxNameLength - 1)}…` : collapsed;
}

/** The control's name — an explicit report label, its ARIA label, its form label, then (optionally) its text. */
function nameOf(element: Element, isTextNamed: boolean): string {
  const explicit = element.getAttribute('data-report-label') ?? element.getAttribute('aria-label');
  if (explicit) return tidy(explicit);
  if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) {
    const label = element.labels?.[0];
    return label && isTextNamed ? tidy(label.textContent) : '';
  }
  return isTextNamed ? tidy(element.textContent) : tidy(element.getAttribute('title'));
}

/**
 * Describes the interactive element a click landed in — `button "Save"` — or `undefined` when the click hit no
 * control or landed under `data-report-ignore`. Never throws.
 */
export function describeClickTarget(target: EventTarget | null, options: ClickCaptureOptions = {}): string | undefined {
  try {
    if (typeof Element === 'undefined' || !(target instanceof Element)) return undefined;
    const control = target.closest(Interactive);
    if (!control || control.closest('[data-report-ignore]')) return undefined;
    const name = nameOf(control, options.isTextNamed ?? true);
    return name ? `${roleOf(control)} "${name}"` : roleOf(control);
  } catch {
    return undefined;
  }
}
