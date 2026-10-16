import { afterEach, expect, it, vi } from 'vitest';
import { downloadBlob, downloadJson } from '@src/foundation/files';
import { ExactNumber } from '@src/foundation/numbers';

afterEach(() => {
  vi.restoreAllMocks();
});

it('downloads exact numeric JSON and releases the object URL', async () => {
  const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  const exact = ExactNumber.parse('9223372036854775807');
  if (!exact.ok) throw new Error('fixture');
  expect(downloadJson({ id: exact.value }, 'report.json')).toBe(true);
  const blob = create.mock.calls[0]?.[0];
  expect(blob).toBeInstanceOf(Blob);
  expect(await (blob as Blob).text()).toBe('{\n  "id": 9223372036854775807\n}');
  expect(click).toHaveBeenCalledOnce();
  expect(document.querySelector('a[download]')).toBeNull();
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(revoke).toHaveBeenCalledWith('blob:test');
});

it('cleans up the anchor and URL when dispatch throws', async () => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:failed');
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
    throw new Error('blocked');
  });
  expect(() => downloadBlob(new Blob(['data']), 'data.txt')).toThrow('blocked');
  expect(document.querySelector('a[download]')).toBeNull();
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(revoke).toHaveBeenCalledWith('blob:failed');
});
