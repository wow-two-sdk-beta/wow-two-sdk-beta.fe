import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

/** Earlier npm names of the fe sdk; their published versions stay in its patch sequence. */
export const PREVIOUS_NAMES = ["@wow-two-beta/ui-vue"];

const PATCH = /^0\.0\.(0|[1-9]\d*)$/;

const isPatch = (version) => PATCH.exec(version)?.[0] === version;

/**
 * Beta-forever patch sequence: one past the highest of the local version and every version published
 * under any of the package's npm names, so neither a rename nor a failed Git update restarts or reuses it.
 */
export function nextFeVersion(localVersion, publishedVersionLists) {
  if (!isPatch(localVersion))
    throw new Error("Expected a 0.0.y fe package version.");
  if (
    !Array.isArray(publishedVersionLists) ||
    publishedVersionLists.some(
      (versions) =>
        !Array.isArray(versions) ||
        versions.some((version) => typeof version !== "string"),
    )
  )
    throw new Error("Expected one npm version list per package name.");
  let patch = BigInt(localVersion.slice(4));
  for (const version of publishedVersionLists.flat()) {
    if (!isPatch(version)) continue;
    const candidate = BigInt(version.slice(4));
    if (candidate > patch) patch = candidate;
  }
  return `0.0.${patch + 1n}`;
}

function npmView(name) {
  return execFileSync("npm", ["view", name, "versions", "--json"], {
    encoding: "utf8",
    timeout: 60000,
  });
}

function npmErrorCode(output) {
  try {
    return JSON.parse(output)?.error?.code;
  } catch {
    return undefined;
  }
}

/** Versions published under one npm name; only npm's E404 reads as a name never published. */
export function publishedVersions(name, view = npmView) {
  let output;
  try {
    output = view(name);
  } catch (error) {
    if (npmErrorCode(error?.stdout) === "E404") return [];
    throw error;
  }
  const published = JSON.parse(output);
  return typeof published === "string" ? [published] : published;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const manifest = JSON.parse(readFileSync("package.json", "utf8"));
  const names = [
    manifest.name,
    ...PREVIOUS_NAMES.filter((name) => name !== manifest.name),
  ];
  console.log(
    nextFeVersion(
      manifest.version,
      names.map((name) => publishedVersions(name)),
    ),
  );
}
