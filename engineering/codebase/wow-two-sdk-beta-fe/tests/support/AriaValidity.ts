import axe from 'axe-core';

/** The ARIA rules a control must pass: role, attribute and value validity, required parts and names. */
const AriaRules = [
  'aria-allowed-attr',
  'aria-allowed-role',
  'aria-conditional-attr',
  'aria-required-attr',
  'aria-required-children',
  'aria-required-parent',
  'aria-roles',
  'aria-valid-attr',
  'aria-valid-attr-value',
  'aria-input-field-name',
  'aria-toggle-field-name',
  'button-name',
  'label',
];

/** Runs the ARIA validity rules over a subtree; each entry names the rule, the element and the reason. */
export async function ariaViolations(root: Element): Promise<string[]> {
  const result = await axe.run(root, { runOnly: { type: 'rule', values: AriaRules }, resultTypes: ['violations'] });
  return result.violations.flatMap((violation) =>
    violation.nodes.map((node) => `${violation.id}: ${node.target.join(' ')} — ${node.failureSummary ?? ''}`.trim()),
  );
}
