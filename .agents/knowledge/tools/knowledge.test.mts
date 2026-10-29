/**
 * Tests for knowledge.mts. Run: node --test .agents/knowledge/tools/knowledge.test.mts
 *
 * @format
 */

import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {
  type Issue,
  loadRepo,
  preview,
  runChecks,
  writeGenerated,
} from './knowledge.mts';

const TAXONOMY = `version: 1
audited: 2026-10-28
kinds: [rules, reference, procedure, decision, eval]
statuses: [draft, active, deprecated]
domains: {fork: Fork model, tooling: Tooling}
skills: {root: .claude/skills, prefix: rnmacos-, frontmatter: [name, description, license]}
budgets: {warn_ratio: 0.8, topic: {lines: 150, bytes: 8192}}
freshness: {verified_days: 180, draft_days: 30, audit_days: 45}
ownership: {upstream_owned: ['**/__docs__/**']}
homes: [AGENTS.md, .agents/knowledge, .claude/skills]
routes: []
redirects: {}
retired_ids: []
`;

const AGENTS = `# React Native

<!-- [macOS -->

## Fork

- **I1** Keep merges clean ([fork.alpha](.agents/knowledge/fork/alpha.md)).

Start at the [index](.agents/knowledge/index.md).

- [\`rnmacos-do-thing\`](.claude/skills/rnmacos-do-thing/SKILL.md): does a thing.

<!-- macOS] -->
`;

const POINTER = `<!-- @format -->

# Copilot instructions

Follow [AGENTS.md](../AGENTS.md).
`;

const INDEX = `# Knowledge

<!-- BEGIN GENERATED: topics -->
<!-- END GENERATED: topics -->

<!-- BEGIN GENERATED: skills -->
<!-- END GENERATED: skills -->

<!-- BEGIN GENERATED: routes -->
<!-- END GENERATED: routes -->
`;

const DUPLICATE =
  'Always keep this bullet long enough to count as a duplicate candidate.';

function topic(id: string, extra = '', body = ''): string {
  return `---
id: ${id}
summary: Summary of ${id}.
kind: rules
status: active
load_when: Testing ${id}
sources:
  - package.json#scripts
verified: 2026-10-28
rules: [first-rule]
${extra}---

<!-- @format -->

# ${id}

Use when: testing. Not for: production.

## Rules

- **${id}.first-rule:** ${DUPLICATE}

## Facts

- The \`yarn test\` command runs Jest. See [the fork rules](../../../AGENTS.md#fork).
${body}`;
}

const SKILL = `---
name: rnmacos-do-thing
description: Do a thing in the fixture. Use when testing.
---

<!-- @format -->

# Do thing

Read [the reference](references/ref.md).
`;

const REF = `<!-- @format -->

# Reference

Plain text.
`;

type Files = Record<string, string>;

function baseFiles(): Files {
  return {
    'package.json': JSON.stringify({scripts: {test: 'jest'}}),
    '.agents/knowledge/taxonomy.yaml': TAXONOMY,
    '.agents/knowledge/index.md': INDEX,
    '.agents/knowledge/fork/alpha.md': topic('fork.alpha'),
    'AGENTS.md': AGENTS,
    '.github/copilot-instructions.md': POINTER,
    '.claude/skills/rnmacos-do-thing/SKILL.md': SKILL,
    '.claude/skills/rnmacos-do-thing/references/ref.md': REF,
  };
}

function write(root: string, files: Files) {
  for (const [file, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
    fs.writeFileSync(path.join(root, file), text);
  }
}

const git = (root: string, ...args: string[]) =>
  execFileSync('git', args, {cwd: root, stdio: 'pipe', encoding: 'utf8'});

function fixture(
  t: {after: (fn: () => void) => void},
  mutate: (files: Files) => void = () => {},
): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const files = baseFiles();
  write(root, files);
  git(root, 'init', '-q');
  writeGenerated(loadRepo(root));
  git(root, 'add', '-A');
  git(
    root,
    '-c',
    'user.name=t',
    '-c',
    'user.email=t@t',
    'commit',
    '-qm',
    'base',
  );
  const before = {...files};
  mutate(files);
  write(
    root,
    Object.fromEntries(
      Object.entries(files).filter(([f, v]) => before[f] !== v),
    ),
  );
  for (const f of Object.keys(before)) {
    if (!(f in files)) fs.rmSync(path.join(root, f));
  }
  git(root, 'add', '-A');
  return root;
}

const errors = (issues: Issue[]) => issues.filter(i => i.severity === 'error');
const has = (issues: Issue[], check: string, text?: string) =>
  issues.some(i => i.check === check && (!text || i.message.includes(text)));

test('a clean fixture has no issues', t => {
  const issues = runChecks(loadRepo(fixture(t), {ci: true}));
  assert.deepEqual(issues, []);
});

test('index --write is idempotent', t => {
  const root = fixture(t);
  assert.deepEqual(writeGenerated(loadRepo(root)), []);
});

const failures: [string, string, (f: Files) => void, string?][] = [
  [
    'title in frontmatter',
    'KC-01',
    f => {
      f['.agents/knowledge/fork/alpha.md'] = topic(
        'fork.alpha',
        'title: Alpha\n',
      );
    },
    'title',
  ],
  [
    'duplicate topic id',
    'KC-02',
    f => {
      f['.agents/knowledge/fork/beta.md'] = topic('fork.alpha');
    },
    'duplicate id',
  ],
  [
    'id that does not match its path',
    'KC-02',
    f => {
      f['.agents/knowledge/fork/beta.md'] = topic('fork.gamma');
    },
    'must match the file path',
  ],
  [
    'stale index',
    'KC-03',
    f => {
      f['.agents/knowledge/fork/alpha.md'] = topic('fork.alpha').replace(
        'Summary of',
        'Changed',
      );
    },
  ],
  [
    'broken anchor',
    'KC-04',
    f => {
      f['.agents/knowledge/fork/alpha.md'] = topic('fork.alpha').replace(
        '#fork',
        '#missing',
      );
    },
    'missing anchor',
  ],
  [
    'missing source',
    'KC-05',
    f => {
      f['.agents/knowledge/fork/alpha.md'] = topic('fork.alpha').replace(
        'package.json#scripts',
        'nope.json',
      );
    },
  ],
  [
    'unknown yarn command',
    'KC-06',
    f => {
      f['.agents/knowledge/fork/alpha.md'] = topic(
        'fork.alpha',
        '',
        'Run `yarn not-a-script` first.\n',
      );
    },
  ],
  [
    'yarn script that shadows a binary',
    'KC-06',
    f => {
      f['package.json'] = JSON.stringify({
        scripts: {test: 'jest', prettier: 'prettier --write .'},
        devDependencies: {prettier: '*'},
      });
      f['node_modules/prettier/package.json'] = JSON.stringify({
        bin: {prettier: 'bin.js'},
      });
      f['.agents/knowledge/fork/alpha.md'] = topic(
        'fork.alpha',
        '',
        'Run `yarn prettier --check a.md` first.\n',
      );
    },
    'runs the root script',
  ],
  [
    '@ import',
    'KC-10',
    f => {
      f['.agents/knowledge/fork/alpha.md'] = topic(
        'fork.alpha',
        '',
        '@docs/other.md\n',
      );
    },
  ],
  [
    'duplicate bullet',
    'KC-11a',
    f => {
      f['.claude/skills/rnmacos-do-thing/references/ref.md'] =
        `${REF}\n- ${DUPLICATE}\n`;
    },
  ],
  [
    'pragma in AGENTS.md',
    'KC-01',
    f => {
      f['AGENTS.md'] = AGENTS.replace(
        '<!-- [macOS -->',
        '<!-- @format -->\n\n<!-- [macOS -->',
      );
    },
    'pragma',
  ],
  [
    'second fork block in AGENTS.md',
    'KC-12',
    f => {
      f['AGENTS.md'] =
        `${AGENTS}\n<!-- [macOS -->\n\nMore.\n\n<!-- macOS] -->\n`;
    },
  ],
  [
    'fork content in an upstream-owned file',
    'KC-12',
    f => {
      f['pkg/__docs__/notes.md'] = '# Notes\n\nA [macOS] change.\n';
    },
    'upstream-owned',
  ],
  [
    'skill missing from AGENTS.md',
    'KC-08',
    f => {
      f['.claude/skills/rnmacos-other-thing/SKILL.md'] = SKILL.replace(
        /do-thing/g,
        'other-thing',
      );
    },
    'not listed',
  ],
  [
    'pointer with extra links',
    'KC-09',
    f => {
      f['.github/copilot-instructions.md'] =
        `${POINTER}\nSee [the index](../.agents/knowledge/index.md).\n`;
    },
  ],
  [
    'failing assert',
    'KC-14',
    f => {
      f['.agents/knowledge/fork/alpha.md'] = topic(
        'fork.alpha',
        'asserts:\n  - {file: package.json, json: scripts.test, equals: mocha}\n',
      );
    },
  ],
];

for (const [name, check, mutate, text] of failures) {
  test(`fails on ${name} (${check})`, t => {
    const issues = runChecks(loadRepo(fixture(t, mutate), {ci: true}));
    assert.ok(has(issues, check, text), JSON.stringify(issues, null, 2));
  });
}

test('passing asserts produce no issues', t => {
  const root = fixture(t, f => {
    f['.agents/knowledge/fork/alpha.md'] = topic(
      'fork.alpha',
      'asserts:\n  - {file: package.json, json: scripts.test, equals: jest}\n',
    );
  });
  writeGenerated(loadRepo(root));
  assert.deepEqual(runChecks(loadRepo(root)), []);
});

test('local runs see untracked files; CI runs do not', t => {
  const root = fixture(t);
  write(root, {'.agents/knowledge/tooling/beta.md': topic('tooling.beta')});
  const ids = (ci: boolean) =>
    loadRepo(root, {ci})
      .docs.filter(d => d.role === 'topic')
      .map(d => d.fm?.id);
  assert.deepEqual(ids(false), ['fork.alpha', 'tooling.beta']);
  assert.deepEqual(ids(true), ['fork.alpha']);
  assert.ok(has(runChecks(loadRepo(root)), 'KC-03'));
  assert.equal(errors(runChecks(loadRepo(root, {ci: true}))).length, 0);
});

test('preview reports changes and writes nothing', t => {
  const root = fixture(t, f => {
    delete f['.agents/knowledge/fork/alpha.md'];
    f['.agents/knowledge/tooling/beta.md'] = topic('tooling.beta');
  });
  const snapshot = () =>
    git(root, 'ls-files', '-s', '--others', '--cached', '--exclude-standard') +
    git(root, 'status', '--porcelain') +
    fs.readFileSync(path.join(root, '.agents/knowledge/index.md'), 'utf8');
  const before = snapshot();
  const out = preview(loadRepo(root), 'HEAD');
  assert.equal(snapshot(), before);
  assert.match(out, /\+ tooling\.beta/);
  assert.match(out, /- fork\.alpha .*NEEDS a redirect/);
  assert.match(out, /index\.md \(stale\)/);
});
