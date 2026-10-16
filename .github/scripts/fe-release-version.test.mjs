import { strict as assert } from "node:assert";
import { test } from "node:test";
import { nextFeVersion, publishedVersions } from "./fe-release-version.mjs";

test("advances beyond an already published version after a failed Git update", () => {
  assert.equal(nextFeVersion("0.0.5", [["0.0.4", "0.0.6"]]), "0.0.7");
  assert.equal(nextFeVersion("0.0.8", [["0.0.5", "0.0.6"]]), "0.0.9");
  assert.equal(nextFeVersion("0.0.5", [[]]), "0.0.6");
});
test("continues after the highest version under the current or the previous npm name", () => {
  // `@wow-two-beta/fe@0.0.18` published by hand after `@wow-two-beta/ui-vue@0.0.17`.
  const uiVue = Array.from({ length: 17 }, (_, index) => `0.0.${index + 1}`);
  assert.equal(nextFeVersion("0.0.18", [["0.0.18"], uiVue]), "0.0.19");
  assert.equal(nextFeVersion("0.0.1", [["0.0.18"], uiVue]), "0.0.19");
  assert.equal(nextFeVersion("0.0.18", [[], uiVue]), "0.0.19");
  assert.equal(nextFeVersion("0.0.17", [["0.0.20"], uiVue]), "0.0.21");
});
test("keeps prereleases and other version lines outside the patch sequence", () => {
  assert.equal(
    nextFeVersion("0.0.5", [["0.1.0", "0.0.10-beta.1", "0.0.9"]]),
    "0.0.10",
  );
});
test("fails on malformed registry data rather than guessing a version", () => {
  assert.throws(() => nextFeVersion("1.0.0", [[]]));
  assert.throws(() => nextFeVersion("0.0.5", { error: "registry failure" }));
  assert.throws(() => nextFeVersion("0.0.5", [{ error: "registry failure" }]));
  assert.throws(() => nextFeVersion("0.0.5", ["0.0.6"]));
});
test("reads a never-published name as empty and fails on any other registry error", () => {
  const failing = (stdout) => () => {
    throw Object.assign(new Error("npm view failed"), { stdout });
  };
  const notFound = JSON.stringify({ error: { code: "E404" } });
  assert.deepEqual(publishedVersions("@wow-two-beta/fe", failing(notFound)), []);
  assert.throws(() =>
    publishedVersions("@wow-two-beta/fe", failing(JSON.stringify({ error: { code: "E500" } }))),
  );
  assert.throws(() => publishedVersions("@wow-two-beta/fe", failing("")));
  assert.deepEqual(publishedVersions("@wow-two-beta/fe", () => '"0.0.18"'), ["0.0.18"]);
  assert.deepEqual(
    publishedVersions("@wow-two-beta/fe", () => '["0.0.18","0.0.19"]'),
    ["0.0.18", "0.0.19"],
  );
});
