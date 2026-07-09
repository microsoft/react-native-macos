#!/usr/bin/env node
// Generate the boilerplate `:pkg` BUILD.bazel files for first-party workspace
// packages, so they don't have to be hand-written/maintained.
//
// This is a small, repo-specific analog of `bazel run //:gazelle` (see the
// artifacts research report): it reads the workspace globs from the root
// package.json and, for every workspace package, writes a one-line BUILD.bazel
// that calls the rn_workspace_package() macro.
//
// Ownership / safety (mirrors Gazelle's `# gazelle:` and Nx's project.json
// override model): a BUILD.bazel is only (re)written when it is *generator-owned*
// -- it either carries the @generated marker below, or it is the pure legacy
// `:pkg` boilerplate (a single npm_package with no other target kinds). Any file
// that declares other targets (objc_library, cc_library, first_party,
// macos_application, rn_codegen, ...) is treated as hand-owned and left untouched.
//
// Usage:
//   node tools/bazel/js/gen_package_builds.mjs           # refresh owned files
//   node tools/bazel/js/gen_package_builds.mjs --all     # also create missing ones
//   node tools/bazel/js/gen_package_builds.mjs --check    # non-zero exit if stale (CI)

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const MARKER = '# @generated-by: tools/bazel/js/gen_package_builds.mjs';

const CONTENT = [
  MARKER,
  '# Edit the generator or the macro, not this file. Regenerate with:',
  '#   node tools/bazel/js/gen_package_builds.mjs',
  'load("//tools/bazel/js:workspace_package.bzl", "rn_workspace_package")',
  '',
  'rn_workspace_package()',
  '',
].join('\n');

// Any of these target kinds mark a BUILD.bazel as hand-owned (never overwrite).
const HAND_OWNED_TOKENS = [
  'objc_library(', 'cc_library(', 'swift_library(', 'macos_application(',
  'ios_application(', 'apple_', 'js_library(', 'js_binary(', 'js_run_binary(',
  'ts_project(', 'filegroup(', 'genrule(', 'rn_codegen(', 'first_party',
  'sample_turbo_modules(', 'rntester_extra', 'prebuilt_xcframeworks',
];

function isGeneratorOwned(text) {
  // A generated file becomes hand-owned as soon as a contributor adds another
  // target kind. Never let the marker authorize clobbering local overrides.
  if (HAND_OWNED_TOKENS.some((token) => text.includes(token))) return false;
  if (text.includes(MARKER)) return true;
  // Legacy pure boilerplate: has an npm_package but no other target kinds.
  return text.includes('npm_package(');
}

// Expand the root package.json "workspaces" globs (supports `dir/*` and `!neg`).
function workspaceDirs() {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  const patterns = pkg.workspaces || [];
  const positive = patterns.filter((p) => !p.startsWith('!'));
  const negated = new Set(patterns.filter((p) => p.startsWith('!')).map((p) => p.slice(1)));
  const dirs = new Set();
  for (const pattern of positive) {
    if (pattern.endsWith('/*')) {
      const base = pattern.slice(0, -2);
      const baseAbs = path.join(repoRoot, base);
      if (!fs.existsSync(baseAbs)) continue;
      for (const entry of fs.readdirSync(baseAbs, {withFileTypes: true})) {
        if (!entry.isDirectory()) continue;
        const rel = base + '/' + entry.name;
        if (negated.has(rel)) continue;
        if (fs.existsSync(path.join(repoRoot, rel, 'package.json'))) dirs.add(rel);
      }
    } else if (!negated.has(pattern)) {
      if (fs.existsSync(path.join(repoRoot, pattern, 'package.json'))) dirs.add(pattern);
    }
  }
  return [...dirs].sort();
}

const args = new Set(process.argv.slice(2));
const createMissing = args.has('--all');
const checkOnly = args.has('--check');

const created = [];
const updated = [];
const skipped = [];
let stale = false;

for (const dir of workspaceDirs()) {
  const buildPath = path.join(repoRoot, dir, 'BUILD.bazel');
  if (!fs.existsSync(buildPath)) {
    if (!createMissing) continue;
    if (checkOnly) { stale = true; created.push(dir); continue; }
    fs.writeFileSync(buildPath, CONTENT);
    created.push(dir);
    continue;
  }
  const current = fs.readFileSync(buildPath, 'utf8');
  if (!isGeneratorOwned(current)) { skipped.push(dir); continue; }
  if (current === CONTENT) continue; // already up to date
  if (checkOnly) { stale = true; updated.push(dir); continue; }
  fs.writeFileSync(buildPath, CONTENT);
  updated.push(dir);
}

const log = (label, list) => { if (list.length) console.log(label + ' (' + list.length + '): ' + list.join(', ')); };
log('created', created);
log(checkOnly ? 'stale' : 'updated', updated);
log('skipped (hand-owned)', skipped);
if (checkOnly && stale) {
  console.error('BUILD.bazel files are stale. Run: node tools/bazel/js/gen_package_builds.mjs');
  process.exit(1);
}
if (!checkOnly) console.log('Done.');
