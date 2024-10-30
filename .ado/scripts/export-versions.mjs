// @ts-check
import * as fs from "node:fs";
import { URL } from "node:url";

/**
 * @param {string} version
 * @returns {string}
 */
function coerce(version) {
  const [major, minor = 0] = version.split("-")[0].split(".");
  return `${major}.${minor}`;
}

/**
 * @param {string} name
 * @param {unknown} value
 */
function exportValue(name, value) {
  console.log(`##vso[task.setvariable variable=${name}]${value}`);
}

const manifestPath = new URL("../../packages/react-native/package.json", import.meta.url);
const json = fs.readFileSync(manifestPath, { encoding: "utf-8" });
const { dependencies, peerDependencies } = JSON.parse(json);

exportValue("react_version", peerDependencies["react"]);
exportValue("react_native_version", coerce(dependencies["@react-native/codegen"]));
