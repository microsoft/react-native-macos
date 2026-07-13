#!/usr/bin/env node
/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Berry (Yarn v2+) `yarn.lock` -> pnpm `pnpm-lock.yaml` (lockfileVersion 9.0) converter.
 *
 * aspect-build/rules_js `npm_translate_lock` normalizes every input lockfile to an
 * internal pnpm-lock model. For `yarn_lock`/`npm_package_lock` inputs it shells out to
 * `pnpm import`, which does NOT understand the Berry `yarn.lock` format (pnpm #2991).
 *
 * This tool fills that one gap: it parses the Berry lock (its own strict YAML subset,
 * "Syml") and emits a pnpm-lock.yaml v9 that rules_js's parser (npm/private/pnpm.bzl)
 * accepts, so the Berry `yarn.lock` can stay the single source of truth (no committed
 * second lockfile). It is invoked by our rules_js patch inside the repository rule, so
 * it must run under a bare Node with no external dependencies.
 *
 * Usage: node berry_to_pnpm_lock.mjs <path/to/yarn.lock> <path/to/out/pnpm-lock.yaml>
 */

import fs from 'node:fs';
import path from 'node:path';

const REGISTRY = 'https://registry.npmjs.org';

// ---------------------------------------------------------------------------
// Syml (Berry yarn.lock) parser
// ---------------------------------------------------------------------------

/**
 * Parse a Berry `yarn.lock` (Syml) into a plain nested object.
 * Syml is an indentation-based YAML subset: 2-space indents, `key: value` or
 * `key:` followed by an indented block, `#` comments, and quoted/bare scalars.
 */
function parseSyml(text) {
  const root = {};
  // Stack of {indent, container}. container is the object we add children to.
  const stack = [{indent: -1, container: root}];
  const lines = text.split(/\r?\n/);

  for (let raw of lines) {
    if (raw.trim() === '' || raw.trim().startsWith('#')) {
      continue;
    }
    const indent = raw.length - raw.trimStart().length;
    const line = raw.trimStart();

    // Pop to the parent whose indent is smaller than this line's indent.
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].container;

    const {key, rest} = splitKey(line);
    if (rest === null || rest === '') {
      // `key:` opening a nested block.
      const child = {};
      parent[key] = child;
      stack.push({indent, container: child});
    } else {
      // `key: value` scalar.
      parent[key] = unquote(rest);
    }
  }
  return root;
}

/** Split a line into its (possibly quoted) key and the remainder after the colon. */
function splitKey(line) {
  if (line.startsWith('"')) {
    // Quoted key: find the closing quote (Syml keys don't contain escaped quotes
    // in practice for yarn.lock, but handle doubled backslash-escaped just in case).
    let i = 1;
    for (; i < line.length; i++) {
      if (line[i] === '\\') {
        i++;
        continue;
      }
      if (line[i] === '"') {
        break;
      }
    }
    const key = unquote(line.slice(0, i + 1));
    let after = line.slice(i + 1);
    // after should start with ':'
    const colon = after.indexOf(':');
    const rest = after.slice(colon + 1).trim();
    return {key, rest: rest === '' ? null : rest};
  }
  // Bare key up to first colon.
  const colon = line.indexOf(':');
  const key = line.slice(0, colon).trim();
  const rest = line.slice(colon + 1).trim();
  return {key, rest: rest === '' ? null : rest};
}

function unquote(s) {
  s = s.trim();
  if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) {
    return s
      .slice(1, -1)
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
  return s;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Split an `ident@range` descriptor into [ident, range], accounting for scopes. */
function splitDescriptor(descriptor) {
  const at = descriptor.indexOf('@', descriptor.startsWith('@') ? 1 : 0);
  return [descriptor.slice(0, at), descriptor.slice(at + 1)];
}

/** Parse Berry `conditions: "os=darwin & cpu=x64"` into {os, cpu} arrays. */
function parseConditions(conditions) {
  const out = {};
  if (!conditions) {
    return out;
  }
  for (const clause of conditions.split('&')) {
    const m = clause.trim().match(/^(os|cpu|libc)=(.+)$/);
    if (m) {
      (out[m[1]] = out[m[1]] || []).push(m[2].trim());
    }
  }
  return out;
}

/** Compute the deterministic npm registry tarball URL for a package. */
function registryTarballUrl(ident, version, registry) {
  const base = registry.replace(/\/+$/, '');
  const unscoped = ident.startsWith('@') ? ident.slice(ident.indexOf('/') + 1) : ident;
  return `${base}/${ident}/-/${unscoped}-${version}.tgz`;
}

/** Strip the `npm:` protocol prefix from a specifier range for display. */
function cleanSpecifier(range) {
  if (range.startsWith('npm:') && !range.slice(4).includes('@')) {
    return range.slice(4);
  }
  return range;
}

/** POSIX relative path from importer dir `from` to workspace dir `to`. */
function relPath(from, to) {
  const a = from === '.' ? [] : from.split('/');
  const b = to === '.' ? [] : to.split('/');
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) {
    i++;
  }
  const up = a.slice(i).map(() => '..');
  const down = b.slice(i);
  const parts = [...up, ...down];
  return parts.length ? parts.join('/') : '.';
}

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

function convert(syml, resolutions) {
  // Map every descriptor string -> its resolved entry.
  const descriptorToEntry = new Map();
  // Canonical package key `ident@version` -> entry (npm packages only).
  const packageEntries = new Map();
  // ident -> [entries] (for single-version fallback resolution).
  const nameToEntries = new Map();
  // Workspace entries: importer path -> entry.
  const workspaceByPath = new Map();

  // Yarn `resolutions` overrides. Berry rewrites matching descriptors, but dependency
  // entries keep their original ranges, so we must apply resolutions when resolving.
  const globalRes = new Map(); // ident -> override value (e.g. ">=3.1.0")
  const specificRes = new Map(); // "ident@range" -> override value
  for (const [k, v] of Object.entries(resolutions || {})) {
    const at = k.indexOf('@', k.startsWith('@') ? 1 : 0);
    if (at > 0) {
      specificRes.set(k, v);
    } else {
      globalRes.set(k, v);
    }
  }
  const normalizeResValue = v => (/^[a-z]+:/.test(v) ? v : 'npm:' + v);
  let droppedCount = 0;

  const entries = [];
  for (const [rawKey, value] of Object.entries(syml)) {
    if (rawKey === '__metadata') {
      continue;
    }
    const descriptors = rawKey.split(',').map(s => s.trim());
    const resolution = value.resolution || '';
    const entry = {descriptors, resolution, value};
    entries.push(entry);
    for (const d of descriptors) {
      descriptorToEntry.set(d, entry);
    }
  }

  // Classify entries.
  for (const entry of entries) {
    const {resolution, value} = entry;
    const [ident, reference] = splitDescriptor(resolution);
    entry.ident = ident;
    if (reference.startsWith('workspace:')) {
      const wsPath = reference.slice('workspace:'.length);
      entry.kind = 'workspace';
      entry.path = wsPath === '.' ? '.' : wsPath;
      workspaceByPath.set(entry.path, entry);
    } else if (reference.startsWith('npm:')) {
      entry.kind = 'npm';
      entry.version = value.version;
      entry.pkgKey = `${ident}@${value.version}`;
      if (!packageEntries.has(entry.pkgKey)) {
        packageEntries.set(entry.pkgKey, entry);
      }
    } else {
      // patch:, portal:, link:, exec:, git, https tarball, file: ...
      // Best-effort: treat anything with a concrete version as an npm-like package
      // keyed by version so cross-references still resolve.
      entry.kind = 'other';
      entry.version = value.version;
      if (value.version) {
        entry.pkgKey = `${ident}@${value.version}`;
        if (!packageEntries.has(entry.pkgKey)) {
          packageEntries.set(entry.pkgKey, entry);
        }
      }
    }
    if (entry.version || entry.kind === 'workspace') {
      if (!nameToEntries.has(ident)) {
        nameToEntries.set(ident, []);
      }
      nameToEntries.get(ident).push(entry);
    }
  }

  // Resolve a `depName: rangeDescriptor` reference to either a snapshot key
  // (`name@version`) or a `link:<relpath>` for workspace deps. Handles Yarn
  // `resolutions` overrides and falls back to a single resolved version.
  function resolveDep(fromPath, depName, rangeDescriptor) {
    // Yarn descriptors can carry insignificant trailing whitespace; normalize so a
    // dependency range like "npm:^3.1.0 " matches the trimmed descriptor key.
    rangeDescriptor = String(rangeDescriptor).trim();
    let target = descriptorToEntry.get(`${depName}@${rangeDescriptor}`);
    if (!target) {
      const specific = specificRes.get(`${depName}@${rangeDescriptor}`);
      if (specific != null) {
        target = descriptorToEntry.get(`${depName}@${normalizeResValue(specific)}`);
      }
    }
    if (!target && globalRes.has(depName)) {
      target = descriptorToEntry.get(`${depName}@${normalizeResValue(globalRes.get(depName))}`);
    }
    if (!target) {
      // Single-version fallback: if the package resolves to exactly one version in the
      // lock (common once resolutions/dedup collapse ranges), use it.
      const list = nameToEntries.get(depName);
      if (list && list.length === 1) {
        target = list[0];
      }
    }
    if (!target) {
      droppedCount++;
      return null;
    }
    if (target.kind === 'workspace') {
      return {link: `link:${relPath(fromPath, target.path)}`};
    }
    if (target.version) {
      return {
        version: `${target.ident}@${target.version}`,
        plain: target.version,
        ident: target.ident,
      };
    }
    droppedCount++;
    return null;
  }

  // Build `packages` and `snapshots`.
  const packages = {};
  const snapshots = {};
  for (const entry of packageEntries.values()) {
    const {value, pkgKey, ident} = entry;
    const pkg = {};
    // NOTE: Berry's `checksum` is Yarn's own content hash of the package, NOT the
    // npm tarball's sha512 integrity that rules_js/pnpm expect, so we cannot derive a
    // valid `resolution.integrity` from the Berry lock. rules_js requires either an
    // `integrity` or a `tarball`; we emit the deterministic npm registry tarball URL
    // (downloaded without integrity verification). A production-grade version should
    // source real integrities (one-time npm registry fetch or a Yarn plugin export) —
    // tracked in docs/bazel.md.
    pkg.resolution = {tarball: registryTarballUrl(ident, entry.version, REGISTRY)};
    const conds = parseConditions(value.conditions);
    if (conds.os) {
      pkg.os = conds.os;
    }
    if (conds.cpu) {
      pkg.cpu = conds.cpu;
    }
    if (value.bin && typeof value.bin === 'object') {
      pkg.hasBin = true;
    }
    if (value.peerDependencies && typeof value.peerDependencies === 'object') {
      pkg.peerDependencies = {};
      for (const [pn, pv] of Object.entries(value.peerDependencies)) {
        pkg.peerDependencies[pn] = typeof pv === 'string' ? pv : '*';
      }
    }
    packages[pkgKey] = pkg;

    const snap = {};
    const deps = value.dependencies;
    if (deps && typeof deps === 'object') {
      const meta = value.dependenciesMeta || {};
      const depMap = {};
      const optMap = {};
      for (const [dn, dr] of Object.entries(deps)) {
        const resolved = resolveDep('.', dn, dr);
        if (!resolved) {
          continue;
        }
        const target = resolved.link || resolved.version;
        const isOptional = meta[dn] && meta[dn].optional === 'true';
        if (isOptional) {
          optMap[dn] = target;
        } else {
          depMap[dn] = target;
        }
      }
      if (Object.keys(depMap).length) {
        snap.dependencies = depMap;
      }
      if (Object.keys(optMap).length) {
        snap.optionalDependencies = optMap;
      }
    }
    snapshots[pkgKey] = snap;
  }

  // Build `importers` from workspace entries.
  const importers = {};
  for (const entry of workspaceByPath.values()) {
    const importPath = entry.path;
    const deps = {};
    const src = entry.value.dependencies;
    if (src && typeof src === 'object') {
      for (const [dn, dr] of Object.entries(src)) {
        const resolved = resolveDep(importPath, dn, dr);
        if (!resolved) {
          continue;
        }
        deps[dn] = {
          specifier: cleanSpecifier(dr),
          version:
            resolved.link ||
            (resolved.ident === dn ? resolved.plain : resolved.version),
        };
      }
    }
    importers[importPath] = {dependencies: deps};
  }

  return {importers, packages, snapshots, droppedCount};
}

// ---------------------------------------------------------------------------
// Minimal YAML emitter (maps, string scalars, booleans, flow string arrays)
// ---------------------------------------------------------------------------

function needsQuote(s) {
  return !/^[A-Za-z0-9_./-]+$/.test(s) || s === '' || /^(true|false|null|~|yes|no)$/i.test(s);
}

function q(s) {
  s = String(s);
  if (!needsQuote(s)) {
    return s;
  }
  return `'${s.replace(/'/g, "''")}'`;
}

function emit(obj, indent, lines) {
  const pad = '  '.repeat(indent);
  const keys = Object.keys(obj);
  for (const k of keys) {
    const v = obj[k];
    if (Array.isArray(v)) {
      lines.push(`${pad}${q(k)}: [${v.map(q).join(', ')}]`);
    } else if (v && typeof v === 'object') {
      if (Object.keys(v).length === 0) {
        lines.push(`${pad}${q(k)}: {}`);
      } else {
        lines.push(`${pad}${q(k)}:`);
        emit(v, indent + 1, lines);
      }
    } else if (typeof v === 'boolean') {
      lines.push(`${pad}${q(k)}: ${v ? 'true' : 'false'}`);
    } else {
      lines.push(`${pad}${q(k)}: ${q(v)}`);
    }
  }
}

function toYaml({importers, packages, snapshots}) {
  const lines = [];
  lines.push("lockfileVersion: '9.0'");
  lines.push('');
  lines.push('settings:');
  lines.push('  autoInstallPeers: true');
  lines.push('  excludeLinksFromLockfile: false');
  lines.push('');
  lines.push('importers:');
  emit(importers, 1, lines);
  lines.push('');
  lines.push('packages:');
  emit(packages, 1, lines);
  lines.push('');
  lines.push('snapshots:');
  emit(snapshots, 1, lines);
  lines.push('');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Validation (mirrors rules_js npm/private/pnpm.bzl consistency checks)
// ---------------------------------------------------------------------------

function validate({importers, packages, snapshots}) {
  const snapKeys = new Set(Object.keys(snapshots));
  const pkgKeys = new Set(Object.keys(packages));
  const dangling = [];

  const resolvable = (name, version) => {
    if (typeof version !== 'string') {
      return false;
    }
    if (version.startsWith('link:')) {
      return true;
    }
    if (snapKeys.has(version)) {
      return true;
    }
    if (snapKeys.has(`${name}@${version}`)) {
      return true;
    }
    return false;
  };

  for (const [path, importer] of Object.entries(importers)) {
    for (const kind of ['dependencies', 'devDependencies', 'optionalDependencies']) {
      for (const [name, attr] of Object.entries(importer[kind] || {})) {
        if (!resolvable(name, attr.version)) {
          dangling.push(`importer ${path} -> ${name}@${attr.version}`);
        }
      }
    }
  }
  for (const [snapKey, snap] of Object.entries(snapshots)) {
    const staticKey = snapKey.includes('(') ? snapKey.slice(0, snapKey.indexOf('(')) : snapKey;
    if (!pkgKeys.has(staticKey)) {
      dangling.push(`snapshot ${snapKey} has no package ${staticKey}`);
    }
    for (const kind of ['dependencies', 'optionalDependencies']) {
      for (const [name, version] of Object.entries(snap[kind] || {})) {
        if (!resolvable(name, version)) {
          dangling.push(`snapshot ${snapKey} -> ${name}@${version}`);
        }
      }
    }
  }

  if (dangling.length) {
    console.error(`berry_to_pnpm_lock: ${dangling.length} dangling reference(s):`);
    for (const d of dangling.slice(0, 25)) {
      console.error(`  - ${d}`);
    }
    if (dangling.length > 25) {
      console.error(`  ... and ${dangling.length - 25} more`);
    }
  } else {
    console.error('berry_to_pnpm_lock: model is internally consistent');
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const [, , inPath, outPath] = process.argv;
  if (!inPath || !outPath) {
    console.error('Usage: berry_to_pnpm_lock.mjs <yarn.lock> <pnpm-lock.yaml>');
    process.exit(2);
  }
  const text = fs.readFileSync(inPath, 'utf8');
  const syml = parseSyml(text);

  // Load Yarn `resolutions` from the root package.json next to yarn.lock so we can
  // apply them (Berry rewrites matching descriptors but keeps original dep ranges).
  let resolutions = {};
  try {
    const rootPkgPath = path.join(path.dirname(path.resolve(inPath)), 'package.json');
    if (fs.existsSync(rootPkgPath)) {
      resolutions = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8')).resolutions || {};
    }
  } catch (_) {
    // best effort
  }

  const model = convert(syml, resolutions);
  validate(model);
  fs.writeFileSync(outPath, toYaml(model));
  const nImporters = Object.keys(model.importers).length;
  const nPackages = Object.keys(model.packages).length;
  if (model.droppedCount) {
    console.error(
      `berry_to_pnpm_lock: WARNING ${model.droppedCount} dependency edge(s) could not be resolved and were dropped`,
    );
  }
  console.error(
    `berry_to_pnpm_lock: wrote ${outPath} (${nImporters} importers, ${nPackages} packages)`,
  );
}

main();
