import { parse, stringify } from 'lossless-json';
import { ExactNumber } from '../../../numbers';

/** Keys have already been encoded to avoid the vendor's special object properties. */
export function parseJson(text: string, number: (token: string) => ExactNumber): unknown {
  return parse(text, undefined, { parseNumber: number });
}

/** Special number serialization runs before ExactNumber's deliberately throwing toJSON. */
export function stringifyJson(value: unknown, space = 0): string {
  const text = stringify(value, undefined, space, [
    {
      test: ExactNumber.isExactNumber,
      stringify: (number) => {
        if (!ExactNumber.isExactNumber(number)) throw new Error('Exact number serialization invariant failed.');
        return number.toString();
      },
    },
  ]);
  if (text === undefined) throw new Error('JSON serialization invariant failed.');
  return text;
}
