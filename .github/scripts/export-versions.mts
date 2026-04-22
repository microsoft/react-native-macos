#!/usr/bin/env node
/**
 * Export react and react-native version information from packages/react-native/package.json.
 *
 * Outputs (written to $GITHUB_OUTPUT):
 *   react_version         – the React peer dependency version (e.g. "19.0.0")
 *   react_native_version  – the coerced major.minor React Native version (e.g. "0.79")
 */
import * as fs from "node:fs";
import { URL } from "node:url";

function coerce(version: string): string {
  const [major, minor = "0"] = version.split("-")[0].split(".");
  return `${major}.${minor}`;
}

function exportValue(name: string, value: string): void {
  const githubOutput = process.env.GITHUB_OUTPUT;
  if (githubOutput) {
    fs.appendFileSync(githubOutput, `${name}=${value}\n`);
  } else {
    // Fallback: print to stdout for local debugging
    console.log(`${name}=${value}`);
  }
}

const manifestPath = new URL(
  "../../packages/react-native/package.json",
  import.meta.url
);
const json = fs.readFileSync(manifestPath, { encoding: "utf-8" });
const { dependencies, peerDependencies } = JSON.parse(json);

exportValue("react_version", peerDependencies["react"]);
exportValue("react_native_version", coerce(dependencies["@react-native/codegen"]));
