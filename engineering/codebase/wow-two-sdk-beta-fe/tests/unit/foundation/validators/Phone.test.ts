import { describe, expect, it } from 'vitest';
import { createMessageResolver, object, phone, ValidationCodes } from '@src/foundation/validators';

function issueOf(result: ReturnType<ReturnType<typeof phone>['validate']>) {
  expect(result.ok).toBe(false);
  return result.ok ? undefined : result.failure.issues[0];
}

describe('phone()', () => {
  it('speaks a shared rule code', () => {
    expect(ValidationCodes).toContain('phone');
  });

  it('accepts an E.164 number with its country’s digit count', () => {
    expect(phone().validate('+998996632582')).toEqual({ ok: true, value: '+998996632582' });
    expect(phone().validate('+14155550123').ok).toBe(true);
  });

  it('rejects a short or overlong national number with the expected length', () => {
    for (const value of ['+998234234', '+9989966325821']) {
      expect(issueOf(phone().validate(value))).toEqual({
        path: [],
        message: 'must have 9 digits after +998',
        code: 'phone',
        params: { country: 'UZ', dial: '+998', length: 9 },
      });
    }
  });

  it('bounds a country without a fixed length by E.164', () => {
    expect(phone().validate('+4930123456').ok).toBe(true);
    expect(issueOf(phone().validate('+49301'))).toMatchObject({
      code: 'phone',
      message: 'must have 4 to 13 digits after +49',
      params: { country: 'DE', dial: '+49', min: 4, max: 13 },
    });
  });

  it('rejects a value that is not a plus and digits, or from a country outside the list', () => {
    for (const value of ['998996632582', '+998 99 663 25 82', '+0123', 'phone']) {
      expect(issueOf(phone().validate(value))).toEqual({
        path: [],
        message: 'must be a valid phone number',
        code: 'phone',
      });
    }
    expect(issueOf(phone({ countries: ['UZ'] }).validate('+77011234567'))?.code).toBe('phone');
    expect(phone({ countries: ['UZ', 'KZ'] }).validate('+77011234567').ok).toBe(true);
  });

  it('fails an empty value as required unless optional', () => {
    expect(issueOf(phone().validate(''))).toMatchObject({ code: 'required', message: 'is required' });
    expect(phone({ isOptional: true }).validate('').ok).toBe(true);
    expect(issueOf(phone().validate(42))?.code).toBe('type');
  });

  it('addresses the issue to its form path and renders through the catalogue', () => {
    const result = object({ phone: phone() }).validate({ phone: '+998234234' });
    const issue = result.ok ? undefined : result.failure.issues[0];
    expect(issue?.path).toEqual(['phone']);
    // A server failure with the same code and operands renders in the client's voice, label first.
    const resolve = createMessageResolver(undefined, { phone: 'Phone number' });
    expect(resolve({ message: 'The phone is invalid.', code: issue!.code, params: issue!.params }, 'phone')).toBe(
      'Phone number must have 9 digits after +998',
    );
    const custom = createMessageResolver({ phone: (context) => `needs ${String(context.params.length)} digits` });
    expect(custom({ message: issue!.message, code: issue!.code, params: issue!.params }, 'phone')).toBe(
      'needs 9 digits',
    );
  });
});
