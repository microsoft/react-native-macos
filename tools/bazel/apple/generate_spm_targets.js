#!/usr/bin/env node
/**
 * Copyright (c) Microsoft Corporation.
 *
 * @format
 * @noflow
 */

const {spawnSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../..');
const packageRoot = path.join(repoRoot, 'packages/react-native');
const outputPath = path.join(packageRoot, 'bazel/spm_targets.bzl');
const checkOnly = process.argv.includes('--check');

const result = spawnSync(
  'swift',
  ['package', 'dump-package', '--package-path', packageRoot],
  {cwd: repoRoot, encoding: 'utf8'},
);
if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

const manifest = JSON.parse(result.stdout);
const targetNames = new Set(manifest.targets.map(target => target.name));

function sanitizeName(name) {
  return name.replace(/[^A-Za-z0-9_]/g, '_');
}

function dependencyName(dependency) {
  const value = dependency.byName ?? dependency.target ?? dependency.product;
  return Array.isArray(value) ? value[0] : value;
}

function settingValue(setting) {
  const kind = setting.kind;
  const value = kind[Object.keys(kind)[0]]?._0;
  return Array.isArray(value) ? value : [value];
}

function appliesToMacOS(setting) {
  const platforms = setting.condition?.platformNames ?? [];
  return platforms.length === 0 || platforms.includes('macos');
}

function normalizeSearchPath(targetPath, searchPath) {
  return path.posix.normalize(path.posix.join(targetPath ?? '', searchPath));
}

function sourcePatterns(target, extensions) {
  const roots = target.sources?.length ? target.sources : [''];
  return roots.flatMap(root => {
    const absolute = path.join(packageRoot, target.path ?? '', root);
    const relative = path.posix.join(target.path ?? '', root);
    if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) {
      return extensions.includes(path.extname(relative)) ? [relative] : [];
    }
    return extensions.map(extension =>
      path.posix.join(relative, `**/*${extension}`),
    );
  });
}

function excludePatterns(target) {
  return (target.exclude ?? []).flatMap(exclude => {
    const relative = path.posix
      .normalize(path.posix.join(target.path ?? '', exclude))
      .replace(/\/+$/, '');
    return [relative, `${relative}/**`];
  });
}

function normalizeTarget(target) {
  const settings = (target.settings ?? []).filter(appliesToMacOS);
  const defines = [];
  const debugDefines = [];
  const releaseDefines = [];
  const copts = [];
  const includes = [];
  const sdkFrameworks = [];

  for (const setting of settings) {
    const kind = Object.keys(setting.kind)[0];
    const values = settingValue(setting).filter(value => value != null);
    if (setting.tool === 'cxx' && kind === 'define') {
      const config = setting.condition?.config;
      (config === 'debug'
        ? debugDefines
        : config === 'release'
          ? releaseDefines
          : defines
      ).push(...values);
    } else if (setting.tool === 'cxx' && kind === 'unsafeFlags') {
      copts.push(...values);
    } else if (setting.tool === 'cxx' && kind === 'headerSearchPath') {
      includes.push(
        ...values.map(value => normalizeSearchPath(target.path, value)),
      );
    } else if (setting.tool === 'linker' && kind === 'linkedFramework') {
      sdkFrameworks.push(...values);
    }
  }

  return {
    bazel_name: `spm_${sanitizeName(target.name)}`,
    type: target.type,
    path: target.path ?? '',
    deps: (target.dependencies ?? [])
      .map(dependencyName)
      .filter(name => targetNames.has(name))
      .sort(),
    srcs:
      target.type === 'regular'
        ? sourcePatterns(target, ['.c', '.cc', '.cpp', '.m', '.mm'])
        : [],
    hdrs:
      target.type === 'regular'
        ? sourcePatterns(target, ['.def', '.h', '.hh', '.hpp', '.inc'])
        : [],
    excludes: excludePatterns(target),
    copts: [...new Set(copts)].sort(),
    defines: [...new Set(defines)].sort(),
    debug_defines: [...new Set(debugDefines)].sort(),
    release_defines: [...new Set(releaseDefines)].sort(),
    includes: [...new Set(includes)].sort(),
    sdk_frameworks: [...new Set(sdkFrameworks)].sort(),
  };
}

const targets = Object.fromEntries(
  [...manifest.targets]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map(target => [target.name, normalizeTarget(target)]),
);

function toStarlark(value, indent = 0) {
  const prefix = ' '.repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    return `[\n${value
      .map(item => `${' '.repeat(indent + 4)}${toStarlark(item, indent + 4)},`)
      .join('\n')}\n${prefix}]`;
  }
  if (value != null && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return '{}';
    }
    return `{\n${entries
      .map(
        ([key, item]) =>
          `${' '.repeat(indent + 4)}${JSON.stringify(key)}: ${toStarlark(
            item,
            indent + 4,
          )},`,
      )
      .join('\n')}\n${prefix}}`;
  }
  if (value === null) {
    return 'None';
  }
  if (typeof value === 'boolean') {
    return value ? 'True' : 'False';
  }
  return JSON.stringify(value);
}

const output = `# @generated by //tools/bazel/apple:generate_spm_targets
# Source of truth: //packages/react-native:Package.swift
# Regenerate with: node tools/bazel/apple/generate_spm_targets.js

SPM_TARGETS = ${toStarlark(targets)}
`;

if (checkOnly) {
  const current = fs.existsSync(outputPath)
    ? fs.readFileSync(outputPath, 'utf8')
    : '';
  if (current !== output) {
    console.error(
      'Generated SwiftPM Bazel graph is stale. Run: node tools/bazel/apple/generate_spm_targets.js',
    );
    process.exit(1);
  }
} else {
  fs.mkdirSync(path.dirname(outputPath), {recursive: true});
  fs.writeFileSync(outputPath, output);
  console.log(
    `Wrote ${path.relative(repoRoot, outputPath)} (${manifest.targets.length} targets)`,
  );
}
