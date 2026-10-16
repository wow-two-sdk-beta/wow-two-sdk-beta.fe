import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { resolveSourcePath, indexCaseMismatches } from './source-paths.mjs';

test('Linux-style import resolution rejects a casing mismatch on any host', () => {
  const files = new Set(['/src/PdfViewer.vue', '/src/forms/index.ts']);
  assert.equal(resolveSourcePath('/src/PDFViewer.vue', files), undefined);
  assert.equal(resolveSourcePath('/src/PdfViewer.vue', files), '/src/PdfViewer.vue');
  assert.equal(resolveSourcePath('/src/Forms', files), undefined);
  assert.equal(resolveSourcePath('/src/forms', files), '/src/forms/index.ts');
});

test('Git index must record case-only renames and must not retain both names', () => {
  const disk = ['/src/JsonEditor.ts'];
  assert.deepEqual(indexCaseMismatches(['/src/JSONEditor.ts'], disk), ['/src/JSONEditor.ts']);
  assert.deepEqual(indexCaseMismatches(['/src/JSONEditor.ts', '/src/JsonEditor.ts'], disk), ['/src/JSONEditor.ts']);
  assert.deepEqual(indexCaseMismatches(['/src/JsonEditor.ts'], disk), []);
});
