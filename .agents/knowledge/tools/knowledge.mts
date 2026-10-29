#!/usr/bin/env node
/**
 * Validates and generates the react-native-macos agent knowledge system.
 * Conventions: .claude/skills/rnmacos-organize-knowledge/references/conventions.md
 *
 * Usage: node .agents/knowledge/tools/knowledge.mts <command> [options]
 *   find <terms...>                 Search knowledge homes, including dot folders.
 *   preview [--base <ref>]          Show planned knowledge changes. Never writes.
 *   index [--write]                 Check or regenerate index tables and path pointers.
 *   check [--ci] [--json]           Run knowledge checks KC-01 to KC-14.
 *   report [--stale] [--budget] [--similar] [--online]
 *
 * @format
 */

import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {YAML} from 'zx';

export const PATHS = {
  knowledge: '.agents/knowledge',
  taxonomy: '.agents/knowledge/taxonomy.yaml',
  index: '.agents/knowledge/index.md',
  agents: 'AGENTS.md',
  copilot: '.github/copilot-instructions.md',
  instructions: '.github/instructions',
  claude: 'CLAUDE.md',
};

const PRAGMA = '<!-- @format -->';
const FORK_OPEN = '<!-- [macOS -->';
const FORK_CLOSE = '<!-- macOS] -->';
const FORK_LINE = '<!-- [macOS] -->';
const TOPIC_REQUIRED = [
  'id',
  'summary',
  'kind',
  'status',
  'load_when',
  'sources',
  'verified',
];
const TOPIC_OPTIONAL = [
  'branch_scope',
  'requires',
  'related',
  'rules',
  'watch',
  'asserts',
];
const YARN_BUILTINS = new Set(
  'add bin cache config constraints dedupe dlx exec explain info init install link node npm pack patch plugin rebuild remove run search set stage unlink unplug up version why workspace workspaces'.split(
    ' ',
  ),
);
const ID_RE = /^([a-z0-9]+)\.([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const RULE_BULLET_RE =
  /^\s*[-*]\s+\*\*([a-z0-9]+\.[a-z0-9-]+\.[a-z0-9-]+):\*\*/;

export type Severity = 'error' | 'warning' | 'advice';
export type Issue = {
  check: string;
  severity: Severity;
  file: string;
  line?: number;
  message: string;
};
type Budget = {lines?: number; bytes?: number};
type Route = {
  name: string;
  description: string;
  applyTo: string[];
  topics: string[];
};
export type Taxonomy = {
  version: number;
  audited: string;
  kinds: string[];
  statuses: string[];
  domains: Record<string, string>;
  skills: {root: string; prefix: string; frontmatter: string[]};
  budgets: Record<string, any>;
  skill_budgets?: Record<string, Budget>;
  checks?: Record<string, Severity>;
  freshness: {verified_days: number; draft_days: number; audit_days: number};
  ownership: {upstream_owned: string[]};
  homes: string[];
  routes: Route[];
  redirects: Record<string, string>;
  retired_ids: string[];
  yarn_allow?: string[];
  absent_paths?: string[];
};
type Role =
  | 'agents'
  | 'pointer'
  | 'index'
  | 'topic'
  | 'skill'
  | 'reference'
  | 'asset'
  | 'instructions';
export type Doc = {
  file: string;
  role: Role;
  text: string;
  fm: Record<string, any> | null;
  fmError?: string;
  body: string;
  bodyLine: number;
};
export type Repo = {
  root: string;
  ci: boolean;
  files: string[];
  fileSet: Set<string>;
  taxonomy: Taxonomy;
  docs: Doc[];
};

// ---------------------------------------------------------------------------
// Loading

function git(root: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 512 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

// CI checks tracked files only; local runs also see untracked, non-ignored files.
export function listFiles(root: string, ci: boolean): string[] {
  const args = ci
    ? ['ls-files', '-z']
    : ['ls-files', '-z', '--cached', '--others', '--exclude-standard'];
  const files = git(root, args).split('\0').filter(Boolean);
  return [...new Set(files)]
    .filter(f => fs.existsSync(path.join(root, f)))
    .sort();
}

export function parseDoc(file: string, role: Role, text: string): Doc {
  const lines = text.split('\n');
  if (lines[0] !== '---') {
    return {file, role, text, fm: null, body: text, bodyLine: 1};
  }
  const end = lines.indexOf('---', 1);
  if (end === -1) {
    return {
      file,
      role,
      text,
      fm: null,
      fmError: 'unterminated frontmatter',
      body: text,
      bodyLine: 1,
    };
  }
  let fm: Record<string, any> | null = null;
  let fmError: string | undefined;
  try {
    fm = YAML.parse(lines.slice(1, end).join('\n')) ?? {};
  } catch (e) {
    fmError = (e as Error).message.split('\n')[0];
  }
  return {
    file,
    role,
    text,
    fm,
    fmError,
    body: lines.slice(end + 1).join('\n'),
    bodyLine: end + 2,
  };
}

function classify(file: string, tax: Taxonomy): Role | null {
  const k = PATHS.knowledge + '/';
  const skills = tax.skills.root + '/' + tax.skills.prefix;
  if (file === PATHS.agents) return 'agents';
  if (file === PATHS.copilot) return 'pointer';
  if (file === PATHS.index) return 'index';
  if (file.startsWith(k) && /^[a-z0-9]+\/[^/]+\.md$/.test(file.slice(k.length)))
    return 'topic';
  if (
    file.startsWith(PATHS.instructions + '/' + tax.skills.prefix) &&
    file.endsWith('.instructions.md')
  )
    return 'instructions';
  if (file.startsWith(skills) && file.endsWith('.md')) {
    const rest = file.slice(tax.skills.root.length + 1).split('/');
    if (rest.length === 2 && rest[1] === 'SKILL.md') return 'skill';
    if (rest[1] === 'assets') return 'asset';
    return 'reference';
  }
  return null;
}

export function loadRepo(root: string, opts: {ci?: boolean} = {}): Repo {
  const ci = Boolean(opts.ci);
  const files = listFiles(root, ci);
  const taxonomy = YAML.parse(
    fs.readFileSync(path.join(root, PATHS.taxonomy), 'utf8'),
  ) as Taxonomy;
  taxonomy.routes ??= [];
  taxonomy.redirects ??= {};
  taxonomy.retired_ids ??= [];
  const docs: Doc[] = [];
  for (const file of files) {
    const role = classify(file, taxonomy);
    if (role) {
      docs.push(
        parseDoc(file, role, fs.readFileSync(path.join(root, file), 'utf8')),
      );
    }
  }
  return {root, ci, files, fileSet: new Set(files), taxonomy, docs};
}

const topicsOf = (repo: Repo) =>
  repo.docs.filter(
    d => d.role === 'topic' && d.fm && typeof d.fm.id === 'string',
  );
const skillsOf = (repo: Repo) => repo.docs.filter(d => d.role === 'skill');
const skillName = (d: Doc) => d.file.split('/').at(-2) as string;

// ---------------------------------------------------------------------------
// Markdown helpers

// Blanks fenced code so line numbers stay stable.
export function proseLines(body: string): string[] {
  const out: string[] = [];
  let fence: string | null = null;
  for (const line of body.split('\n')) {
    const m = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fence) {
      out.push('');
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length)
        fence = null;
      continue;
    }
    if (m) {
      fence = m[1];
      out.push('');
      continue;
    }
    out.push(line);
  }
  return out;
}

const stripInlineCode = (line: string) => line.replace(/(`+)[\s\S]*?\1/g, '');

function codeSnippets(body: string): {text: string; line: number}[] {
  const out: {text: string; line: number}[] = [];
  const prose = proseLines(body);
  body.split('\n').forEach((line, i) => {
    if (prose[i] === '' && line !== '') {
      out.push({text: line, line: i});
      return;
    }
    for (const m of line.matchAll(/(`+)([\s\S]*?)\1/g)) {
      out.push({text: m[2], line: i});
    }
  });
  return out;
}

export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

function headings(body: string): {level: number; text: string; line: number}[] {
  const out: {level: number; text: string; line: number}[] = [];
  proseLines(body).forEach((line, i) => {
    const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) out.push({level: m[1].length, text: m[2], line: i});
  });
  return out;
}

export function anchorsOf(body: string): Set<string> {
  const seen = new Map<string, number>();
  const out = new Set<string>();
  for (const h of headings(body)) {
    const base = slugify(h.text);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    out.add(n === 0 ? base : `${base}-${n}`);
  }
  return out;
}

const LINK_RE =
  /!?\[(?:[^\]\\]|\\.)*\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^)]*["'])?\s*\)/g;

function linksOf(body: string): {target: string; line: number}[] {
  const out: {target: string; line: number}[] = [];
  proseLines(body).forEach((line, i) => {
    for (const m of stripInlineCode(line).matchAll(LINK_RE)) {
      out.push({target: m[1], line: i});
    }
  });
  return out;
}

const isExternal = (target: string) => /^[a-z][a-z0-9+.-]*:/i.test(target);

function measure(text: string): {lines: number; bytes: number} {
  const lines = text === '' ? 0 : text.replace(/\n$/, '').split('\n').length;
  return {lines, bytes: Buffer.byteLength(text)};
}

function forkBlock(text: string): string | null {
  const start = text.indexOf(FORK_OPEN);
  const end = text.indexOf(FORK_CLOSE);
  return start === -1 || end < start
    ? null
    : text.slice(start, end + FORK_CLOSE.length);
}

export function globToRegExp(glob: string): RegExp {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      const slash = glob[i + 2] === '/';
      re += slash ? '(?:.*/)?' : '.*';
      i += slash ? 2 : 1;
    } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

const docLine = (d: Doc, bodyIndex: number) => d.bodyLine + bodyIndex;

// ---------------------------------------------------------------------------
// Generation

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\|/g, '\\|')
    .trim();

const rel = (from: string, to: string) =>
  path.posix.relative(path.posix.dirname(from), to);

function firstSentence(text: string): string {
  const m = /^(.+?[.!?])(\s|$)/.exec(text.trim());
  return m ? m[1] : text.trim();
}

function generatedSections(repo: Repo): Record<string, string> {
  const topics = topicsOf(repo)
    .filter(t => t.fm!.status !== 'deprecated')
    .sort((a, b) => String(a.fm!.id).localeCompare(String(b.fm!.id)));
  const topicRows = [
    '| Topic | Load when | Summary |',
    '| --- | --- | --- |',
    ...topics.map(t => {
      const draft = t.fm!.status === 'draft' ? ' (draft)' : '';
      return `| [${t.fm!.id}](${rel(PATHS.index, t.file)})${draft} | ${esc(t.fm!.load_when)} | ${esc(t.fm!.summary)} |`;
    }),
  ];
  const skills = skillsOf(repo).sort((a, b) =>
    skillName(a).localeCompare(skillName(b)),
  );
  const skillRows = skills.length
    ? [
        '| Skill | Use when |',
        '| --- | --- |',
        ...skills.map(
          s =>
            `| [\`${skillName(s)}\`](${rel(PATHS.index, s.file)}) | ${esc(firstSentence(String(s.fm?.description ?? '')))} |`,
        ),
      ]
    : ['No skills yet.'];
  const routes = repo.taxonomy.routes;
  const routeRows = routes.length
    ? [
        '| Pointer | Applies to | Topics |',
        '| --- | --- | --- |',
        ...routes.map(
          r =>
            `| [${r.name}](${rel(PATHS.index, pointerPath(repo, r))}) | ${esc(r.applyTo.map(g => `\`${g}\``).join(', '))} | ${esc(r.topics.join(', '))} |`,
        ),
      ]
    : ['No path routes yet.'];
  return {
    topics: topicRows.join('\n'),
    skills: skillRows.join('\n'),
    routes: routeRows.join('\n'),
  };
}

const pointerPath = (repo: Repo, r: Route) =>
  `${PATHS.instructions}/${repo.taxonomy.skills.prefix}${r.name}.instructions.md`;

function renderPointer(repo: Repo, r: Route): string {
  const file = pointerPath(repo, r);
  const byId = new Map(topicsOf(repo).map(t => [t.fm!.id, t.file]));
  const links = r.topics.map(id => {
    const target =
      byId.get(id) ?? `${PATHS.knowledge}/${id.replace('.', '/')}.md`;
    return `[${id}](${rel(file, target)})`;
  });
  return [
    '---',
    `applyTo: '${r.applyTo.join(',')}'`,
    '---',
    '',
    `# ${r.description}`,
    '',
    `<!-- Generated from ${PATHS.taxonomy} routes by knowledge.mts index --write. Do not edit. -->`,
    '',
    `Before you change these files, read ${links.join(', ')}.`,
    '',
  ].join('\n');
}

export function generate(repo: Repo): Map<string, string> {
  const out = new Map<string, string>();
  const indexPath = path.join(repo.root, PATHS.index);
  if (fs.existsSync(indexPath)) {
    let text = fs.readFileSync(indexPath, 'utf8');
    for (const [name, content] of Object.entries(generatedSections(repo))) {
      const re = new RegExp(
        `(<!-- BEGIN GENERATED: ${name} -->)[\\s\\S]*?(<!-- END GENERATED: ${name} -->)`,
      );
      text = text.replace(re, (_m, a, b) => `${a}\n\n${content}\n\n${b}`);
    }
    out.set(PATHS.index, text);
  }
  for (const r of repo.taxonomy.routes)
    out.set(pointerPath(repo, r), renderPointer(repo, r));
  return out;
}

export function drift(repo: Repo): {file: string; reason: string}[] {
  const out: {file: string; reason: string}[] = [];
  const indexPath = path.join(repo.root, PATHS.index);
  if (fs.existsSync(indexPath)) {
    const text = fs.readFileSync(indexPath, 'utf8');
    for (const name of ['topics', 'skills', 'routes']) {
      const begin = text.split(`<!-- BEGIN GENERATED: ${name} -->`).length - 1;
      const end = text.split(`<!-- END GENERATED: ${name} -->`).length - 1;
      if (begin !== 1 || end !== 1)
        out.push({
          file: PATHS.index,
          reason: `missing or repeated ${name} markers`,
        });
    }
  }
  const expected = generate(repo);
  for (const [file, text] of expected) {
    const p = path.join(repo.root, file);
    if (!fs.existsSync(p)) out.push({file, reason: 'missing'});
    else if (fs.readFileSync(p, 'utf8') !== text)
      out.push({file, reason: 'stale'});
  }
  for (const d of repo.docs) {
    if (d.role === 'instructions' && !expected.has(d.file)) {
      out.push({file: d.file, reason: 'no matching route'});
    }
  }
  return out;
}

export function writeGenerated(repo: Repo): string[] {
  const written: string[] = [];
  for (const [file, text] of generate(repo)) {
    const p = path.join(repo.root, file);
    if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== text) {
      fs.mkdirSync(path.dirname(p), {recursive: true});
      fs.writeFileSync(p, text);
      written.push(file);
    }
  }
  for (const {file, reason} of drift(repo)) {
    if (reason === 'no matching route') {
      fs.rmSync(path.join(repo.root, file));
      written.push(`${file} (removed)`);
    }
  }
  return written;
}

// ---------------------------------------------------------------------------
// Checks

export function runChecks(repo: Repo): Issue[] {
  const issues: Issue[] = [];
  const sev = (check: string, fallback: Severity = 'error'): Severity =>
    repo.taxonomy.checks?.[check] ?? fallback;
  const add = (
    check: string,
    file: string,
    message: string,
    line?: number,
    severity: Severity = sev(check),
  ) => issues.push({check, severity, file, line, message});
  const tax = repo.taxonomy;
  const topics = topicsOf(repo);
  const ids = new Map<string, Doc>();
  const fileExists = (f: string) =>
    repo.fileSet.has(f) ||
    repo.files.some(x => x.startsWith(f.replace(/\/$/, '') + '/'));

  // KC-01 structure and frontmatter
  for (const d of repo.docs) {
    if (d.fmError) add('KC-01', d.file, `invalid frontmatter: ${d.fmError}`, 1);
    if (d.fm && 'title' in d.fm) {
      add(
        'KC-01',
        d.file,
        'frontmatter must not contain `title` (MD025 single-title)',
        1,
      );
    }
    const wantsFm = ['topic', 'skill', 'instructions', 'asset'].includes(
      d.role,
    );
    if (d.fm && !wantsFm)
      add('KC-01', d.file, 'frontmatter is not allowed in this file', 1);
    if (
      !d.fm &&
      !d.fmError &&
      ['topic', 'skill', 'instructions'].includes(d.role)
    ) {
      add('KC-01', d.file, 'frontmatter must start on line 1', 1);
    }
    const firstBody = d.body.split('\n').findIndex(l => l.trim() !== '');
    const hasPragma = d.body.includes(PRAGMA) || d.text.includes('@format');
    if (['agents', 'index', 'instructions'].includes(d.role)) {
      if (hasPragma)
        add('KC-01', d.file, 'must not contain a Prettier @format pragma');
    } else if (d.body.split('\n')[firstBody]?.trim() !== PRAGMA) {
      add(
        'KC-01',
        d.file,
        `first line after any frontmatter must be ${PRAGMA}`,
        docLine(d, Math.max(firstBody, 0)),
      );
    }
    const h1 = headings(d.body).filter(h => h.level === 1);
    if (h1.length !== 1)
      add('KC-01', d.file, `expected exactly one H1, found ${h1.length}`);
    if (d.role !== 'topic' || !d.fm) continue;
    for (const key of TOPIC_REQUIRED) {
      if (d.fm[key] === undefined)
        add('KC-01', d.file, `missing required frontmatter key \`${key}\``, 1);
    }
    for (const key of Object.keys(d.fm)) {
      if (
        !TOPIC_REQUIRED.includes(key) &&
        !TOPIC_OPTIONAL.includes(key) &&
        key !== 'title'
      ) {
        add('KC-01', d.file, `unknown frontmatter key \`${key}\``, 1);
      }
    }
    if (d.fm.kind && !tax.kinds.includes(d.fm.kind))
      add('KC-01', d.file, `kind must be one of ${tax.kinds.join(', ')}`, 1);
    if (d.fm.status && !tax.statuses.includes(d.fm.status))
      add(
        'KC-01',
        d.file,
        `status must be one of ${tax.statuses.join(', ')}`,
        1,
      );
    if (typeof d.fm.summary === 'string' && d.fm.summary.length > 160)
      add('KC-01', d.file, 'summary exceeds 160 characters', 1);
    if (typeof d.fm.load_when === 'string' && d.fm.load_when.length > 120)
      add('KC-01', d.file, 'load_when exceeds 120 characters', 1);
    if (!Array.isArray(d.fm.sources) || d.fm.sources.length === 0)
      add('KC-01', d.file, '`sources` must be a non-empty list', 1);
    if (d.fm.verified !== undefined && !DATE_RE.test(String(d.fm.verified)))
      add('KC-01', d.file, '`verified` must be YYYY-MM-DD', 1);
    for (const key of [
      'branch_scope',
      'requires',
      'related',
      'rules',
      'watch',
      'asserts',
    ]) {
      if (d.fm[key] !== undefined && !Array.isArray(d.fm[key]))
        add('KC-01', d.file, `\`${key}\` must be a list`, 1);
    }
    const lines = d.body.split('\n');
    const h1Line = h1[0]?.line ?? -1;
    const next = lines.slice(h1Line + 1).find(l => l.trim() !== '');
    if (h1Line >= 0 && !next?.startsWith('Use when:')) {
      add(
        'KC-01',
        d.file,
        'the first paragraph after the H1 must start with "Use when:"',
        docLine(d, h1Line),
      );
    }
  }

  // KC-02 identity
  const ruleIds = new Map<string, string>();
  for (const t of topics) {
    const id = String(t.fm!.id);
    const m = ID_RE.exec(id);
    if (!m)
      add('KC-02', t.file, `id \`${id}\` must look like domain.topic-name`, 1);
    else if (!(m[1] in tax.domains))
      add(
        'KC-02',
        t.file,
        `domain \`${m[1]}\` is not registered in taxonomy.yaml`,
        1,
      );
    else if (t.file !== `${PATHS.knowledge}/${m[1]}/${m[2]}.md`) {
      add(
        'KC-02',
        t.file,
        `id \`${id}\` must match the file path ${PATHS.knowledge}/${m[1]}/${m[2]}.md`,
        1,
      );
    }
    if (ids.has(id))
      add(
        'KC-02',
        t.file,
        `duplicate id \`${id}\` (also ${ids.get(id)!.file})`,
        1,
      );
    ids.set(id, t);
    if (tax.retired_ids.includes(id))
      add('KC-02', t.file, `id \`${id}\` is retired and must not be reused`, 1);
    if (id in tax.redirects)
      add('KC-02', t.file, `id \`${id}\` is also a redirect source`, 1);
    const declared = new Set<string>();
    for (const slug of (Array.isArray(t.fm!.rules)
      ? t.fm!.rules
      : []) as string[]) {
      if (!SLUG_RE.test(String(slug)))
        add('KC-02', t.file, `rule slug \`${slug}\` must be kebab-case`, 1);
      declared.add(`${id}.${slug}`);
    }
    const found = new Map<string, number>();
    proseLines(t.body).forEach((line, i) => {
      const r = RULE_BULLET_RE.exec(line);
      if (!r) return;
      if (found.has(r[1]))
        add('KC-02', t.file, `rule \`${r[1]}\` appears twice`, docLine(t, i));
      found.set(r[1], i);
      if (!declared.has(r[1]))
        add(
          'KC-02',
          t.file,
          `rule \`${r[1]}\` is not declared in frontmatter \`rules\``,
          docLine(t, i),
        );
      const owner = ruleIds.get(r[1]);
      if (owner && owner !== t.file)
        add(
          'KC-02',
          t.file,
          `rule \`${r[1]}\` is also defined in ${owner}`,
          docLine(t, i),
        );
      ruleIds.set(r[1], t.file);
    });
    for (const r of declared)
      if (!found.has(r))
        add('KC-02', t.file, `declared rule \`${r}\` has no bullet`, 1);
  }
  for (const [from, to] of Object.entries(tax.redirects)) {
    if (!ids.has(to))
      add(
        'KC-02',
        PATHS.taxonomy,
        `redirect ${from} -> ${to} targets an unknown id`,
      );
  }
  for (const t of topics) {
    for (const key of ['requires', 'related']) {
      for (const ref of (Array.isArray(t.fm![key])
        ? t.fm![key]
        : []) as string[]) {
        if (ids.has(ref)) continue;
        if (ref in tax.redirects)
          add(
            'KC-02',
            t.file,
            `\`${key}\` uses redirected id \`${ref}\`; use \`${tax.redirects[ref]}\``,
            1,
          );
        else
          add(
            'KC-02',
            t.file,
            `\`${key}\` references unknown id \`${ref}\``,
            1,
          );
      }
    }
  }
  const agentsDoc = repo.docs.find(d => d.role === 'agents');
  if (agentsDoc) {
    const seen = new Set<string>();
    proseLines(agentsDoc.body).forEach((line, i) => {
      const m = /^\s*[-*]\s+\*\*(I\d+)\b/.exec(line);
      if (!m) return;
      if (seen.has(m[1]))
        add(
          'KC-02',
          agentsDoc.file,
          `fork rule ${m[1]} is duplicated`,
          docLine(agentsDoc, i),
        );
      seen.add(m[1]);
    });
  }

  // KC-03 generated files
  for (const {file, reason} of drift(repo)) {
    add(
      'KC-03',
      file,
      `generated content is ${reason}; run knowledge.mts index --write`,
    );
  }

  // KC-04 links and anchors
  for (const d of repo.docs) {
    if (d.role === 'asset') continue;
    for (const {target, line} of linksOf(d.body)) {
      if (isExternal(target)) continue;
      const [rawPath, anchor] = target.split('#');
      const targetFile = rawPath
        ? path.posix.normalize(
            path.posix.join(
              path.posix.dirname(d.file),
              decodeURIComponent(rawPath),
            ),
          )
        : d.file;
      if (targetFile.startsWith('..')) {
        add(
          'KC-04',
          d.file,
          `link \`${target}\` leaves the repository`,
          docLine(d, line),
        );
        continue;
      }
      if (!fileExists(targetFile)) {
        add('KC-04', d.file, `broken link \`${target}\``, docLine(d, line));
        continue;
      }
      if (
        anchor &&
        targetFile.endsWith('.md') &&
        repo.fileSet.has(targetFile)
      ) {
        const text = fs.readFileSync(path.join(repo.root, targetFile), 'utf8');
        const body = parseDoc(targetFile, 'reference', text).body;
        if (!anchorsOf(body).has(anchor))
          add(
            'KC-04',
            d.file,
            `missing anchor \`#${anchor}\` in ${targetFile}`,
            docLine(d, line),
          );
      }
    }
  }

  // KC-05 cited paths exist
  const topLevel = new Set(repo.files.map(f => f.split('/')[0]));
  const absent = new Set(tax.absent_paths ?? []);
  for (const t of topics) {
    for (const src of (Array.isArray(t.fm!.sources)
      ? t.fm!.sources
      : []) as string[]) {
      const s = String(src);
      if (isExternal(s)) continue;
      const m =
        /^([^#:@\s]+)(?::(\d+)(?:-(\d+))?)?(?:@[0-9a-f]+)?(?:#(.+))?$/.exec(s);
      if (!m) {
        add('KC-05', t.file, `cannot parse source \`${s}\``, 1);
        continue;
      }
      if (!fileExists(m[1])) {
        add('KC-05', t.file, `source path \`${m[1]}\` does not exist`, 1);
        continue;
      }
      if (!repo.fileSet.has(m[1])) continue;
      const content = fs.readFileSync(path.join(repo.root, m[1]), 'utf8');
      const last = Number(m[3] ?? m[2] ?? 0);
      if (last && last > measure(content).lines)
        add('KC-05', t.file, `source \`${s}\` is past the end of the file`, 1);
      if (m[4] && !content.includes(m[4]))
        add('KC-05', t.file, `symbol \`${m[4]}\` not found in ${m[1]}`, 1);
    }
  }
  for (const d of repo.docs) {
    if (d.role === 'asset') continue;
    proseLines(d.body).forEach((line, i) => {
      for (const m of line.matchAll(/`([^`\s]+)`/g)) {
        const token = m[1].replace(/:\d+(-\d+)?$/, '').replace(/#.*$/, '');
        if (!token.includes('/') || /[*?{}<>$]|\.\.\.|^\.?\.\//.test(token))
          continue;
        if (!topLevel.has(token.split('/')[0])) continue;
        if (absent.has(token.replace(/\/$/, ''))) continue;
        if (!fileExists(token))
          add(
            'KC-05',
            d.file,
            `path \`${token}\` does not exist`,
            docLine(d, i),
          );
      }
    });
  }

  // KC-06 yarn commands resolve
  const scripts = readJson(repo.root, 'package.json')?.scripts ?? {};
  const bins = rootBins(repo.root);
  const allowed = new Set(tax.yarn_allow ?? []);
  for (const d of repo.docs) {
    if (d.role === 'asset') continue;
    for (const {text, line} of codeSnippets(d.body)) {
      for (const m of text.matchAll(
        /(?:^|[\s;&|(])yarn\s+(?:--?[\w-]+(?:[ =]\S+)?\s+)*([a-z@][\w:./@-]*)/g,
      )) {
        const cmd = m[1];
        const hasArgs = /^[ \t]+[^\s;&|]/.test(
          text.slice((m.index ?? 0) + m[0].length),
        );
        const script = String(scripts[cmd] ?? '').trim();
        if (hasArgs && bins.has(cmd) && script && script !== cmd) {
          add(
            'KC-06',
            d.file,
            `\`yarn ${cmd}\` runs the root script (\`${script.slice(0, 60)}\`), not the ${cmd} binary; use \`yarn exec ${cmd}\``,
            docLine(d, line),
          );
          continue;
        }
        if (
          cmd in scripts ||
          YARN_BUILTINS.has(cmd) ||
          bins.has(cmd) ||
          allowed.has(cmd)
        )
          continue;
        add(
          'KC-06',
          d.file,
          `\`yarn ${cmd}\` is not a root script, root dependency binary, or Yarn built-in`,
          docLine(d, line),
        );
      }
    }
  }

  // KC-07 budgets
  for (const b of budgetRows(repo)) {
    if (b.ratio > 1)
      add('KC-07', b.file, `${b.label} over budget: ${b.detail}`);
    else if (b.ratio >= (tax.budgets.warn_ratio ?? 0.8))
      add(
        'KC-07',
        b.file,
        `${b.label} near budget: ${b.detail}`,
        undefined,
        'warning',
      );
  }

  // KC-08 skills
  const agentsText = agentsDoc?.text ?? '';
  for (const s of skillsOf(repo)) {
    const name = skillName(s);
    const fm = s.fm ?? {};
    if (fm.name !== name)
      add(
        'KC-08',
        s.file,
        `frontmatter name \`${fm.name}\` must equal folder name \`${name}\``,
        1,
      );
    if (
      !new RegExp(`^${tax.skills.prefix}[a-z0-9]+(?:-[a-z0-9]+)*$`).test(
        name,
      ) ||
      name.length > 64
    ) {
      add(
        'KC-08',
        s.file,
        `skill name must match ${tax.skills.prefix}<verb>-<object>, lowercase, at most 64 characters`,
        1,
      );
    }
    const desc = typeof fm.description === 'string' ? fm.description : '';
    const dLimit = tax.budgets.skill_description ?? {warn: 400, max: 1024};
    if (!desc) add('KC-08', s.file, 'description is required', 1);
    if (desc.length > dLimit.max)
      add('KC-08', s.file, `description exceeds ${dLimit.max} characters`, 1);
    else if (desc.length > dLimit.warn)
      add(
        'KC-08',
        s.file,
        `description exceeds ${dLimit.warn} characters`,
        1,
        'warning',
      );
    if (/[<>]/.test(desc))
      add('KC-08', s.file, 'description must not contain angle brackets', 1);
    for (const key of Object.keys(fm)) {
      if (!tax.skills.frontmatter.includes(key))
        add('KC-08', s.file, `frontmatter key \`${key}\` is not allowed`, 1);
    }
    if (
      /\b(bash|shell|powershell|sh)\b/i.test(
        JSON.stringify(fm['allowed-tools'] ?? ''),
      )
    ) {
      add(
        'KC-08',
        s.file,
        '`allowed-tools` must not pre-approve shell access',
        1,
      );
    }
    const dir = path.posix.dirname(s.file);
    const linked = new Set(
      linksOf(s.body).map(l =>
        path.posix.normalize(path.posix.join(dir, l.target.split('#')[0])),
      ),
    );
    for (const f of repo.files.filter(f => f.startsWith(dir + '/'))) {
      const parts = f.slice(dir.length + 1).split('/');
      if (parts.length > 2)
        add(
          'KC-08',
          f,
          'skill files must be at most one level below the skill folder',
        );
      if (parts[0] === 'references' && parts.length === 2 && !linked.has(f)) {
        add(
          'KC-08',
          f,
          'reference is not linked from SKILL.md',
          undefined,
          'warning',
        );
      }
    }
    if (!agentsText.includes(`(${s.file})`))
      add('KC-08', s.file, `skill is not listed in ${PATHS.agents}`);
  }

  // KC-09 pointers
  const pointer = repo.docs.find(d => d.role === 'pointer');
  if (pointer) {
    const links = linksOf(pointer.body);
    const prose = pointer.body
      .split('\n')
      .filter(l => l.trim() && l.trim() !== PRAGMA && !l.startsWith('#'))
      .join(' ');
    if (
      links.length !== 1 ||
      path.posix.normalize(path.posix.join('.github', links[0].target)) !==
        PATHS.agents
    ) {
      add(
        'KC-09',
        pointer.file,
        `must contain exactly one link, to ${PATHS.agents}`,
      );
    }
    if (prose.length > 300)
      add(
        'KC-09',
        pointer.file,
        'pointer prose must stay under 300 characters',
      );
  }
  for (const d of repo.docs.filter(x => x.role === 'instructions')) {
    const applyTo = String(d.fm?.applyTo ?? '');
    if (!applyTo) add('KC-09', d.file, '`applyTo` is required', 1);
    for (const g of applyTo
      .split(',')
      .map(x => x.trim())
      .filter(Boolean)) {
      if (/[{}]/.test(g))
        add('KC-09', d.file, `applyTo glob \`${g}\` must not use braces`, 1);
      const re = globToRegExp(g);
      if (!repo.files.some(f => re.test(f)))
        add('KC-09', d.file, `applyTo glob \`${g}\` matches no files`, 1);
    }
  }

  // KC-10 no @ imports
  for (const d of repo.docs) {
    proseLines(d.body).forEach((line, i) => {
      if (
        /(^|\s)@(?:\.{0,2}\/)?[\w.-]+(?:\/[\w.-]+)*\.(md|mdc|txt|ya?ml)\b/.test(
          stripInlineCode(line),
        )
      ) {
        add(
          'KC-10',
          d.file,
          '`@path` imports load files into every session; use a Markdown link',
          docLine(d, i),
        );
      }
    });
  }

  // KC-11a exact duplicate bullets
  const bullets = new Map<string, {file: string; line: number}>();
  for (const d of repo.docs) {
    if (d.role === 'asset' || d.role === 'index' || d.role === 'instructions')
      continue;
    proseLines(d.body).forEach((line, i) => {
      const norm = normalizeBullet(line);
      if (!norm || norm.length < 40) return;
      const prev = bullets.get(norm);
      if (prev)
        add(
          'KC-11a',
          d.file,
          `duplicate bullet; also at ${prev.file}:${prev.line}`,
          docLine(d, i),
        );
      else bullets.set(norm, {file: d.file, line: docLine(d, i)});
    });
  }

  // KC-12 merge safety
  if (agentsDoc) {
    const text = agentsDoc.text;
    const opens = text.split(FORK_OPEN).length - 1;
    const closes = text.split(FORK_CLOSE).length - 1;
    if (opens !== 1 || closes !== 1 || !forkBlock(text)) {
      add(
        'KC-12',
        agentsDoc.file,
        `expected one ${FORK_OPEN} ... ${FORK_CLOSE} block, found ${opens} openers and ${closes} closers`,
      );
    }
    if (!text.startsWith('# React Native\n'))
      add(
        'KC-12',
        agentsDoc.file,
        "first line must stay upstream's `# React Native` heading",
        1,
      );
  } else {
    add('KC-12', PATHS.agents, 'AGENTS.md is missing');
  }
  const claude = path.join(repo.root, PATHS.claude);
  if (
    fs.existsSync(claude) &&
    fs.readFileSync(claude, 'utf8') !== '@AGENTS.md\n'
  ) {
    add(
      'KC-12',
      PATHS.claude,
      'CLAUDE.md, if present, must be exactly "@AGENTS.md" plus a newline',
    );
  }
  const owned = tax.ownership.upstream_owned.map(globToRegExp);
  for (const f of repo.files) {
    if (!owned.some(re => re.test(f)) || !/\.(md|mjs|js|ya?ml)$/.test(f))
      continue;
    const text = fs.readFileSync(path.join(repo.root, f), 'utf8');
    if (/\[macOS|macOS\]|rnmacos-|\.agents\/knowledge/.test(text))
      add('KC-12', f, 'upstream-owned file contains fork content');
  }

  // KC-13 reachability
  if (agentsDoc && !agentsDoc.text.includes(`(${PATHS.index})`)) {
    add('KC-13', agentsDoc.file, `must link to ${PATHS.index}`);
  }
  for (const r of tax.routes) {
    if (!SLUG_RE.test(r.name))
      add(
        'KC-13',
        PATHS.taxonomy,
        `route name \`${r.name}\` must be kebab-case`,
      );
    for (const id of r.topics) {
      if (ids.get(id)?.fm?.status !== 'active')
        add(
          'KC-13',
          PATHS.taxonomy,
          `route ${r.name} targets \`${id}\`, which is not an active topic`,
        );
    }
  }
  for (const t of topics) {
    for (const ref of (Array.isArray(t.fm!.requires)
      ? t.fm!.requires
      : []) as string[]) {
      if (ids.get(ref)?.fm?.status === 'deprecated')
        add('KC-13', t.file, `requires deprecated topic \`${ref}\``, 1);
    }
  }

  // KC-14 asserts
  for (const t of topics) {
    for (const a of (Array.isArray(t.fm!.asserts)
      ? t.fm!.asserts
      : []) as any[]) {
      const msg = checkAssert(repo.root, a);
      if (msg) add('KC-14', t.file, msg, 1);
    }
  }

  return issues;
}

function normalizeBullet(line: string): string | null {
  const m = /^\s*(?:[-*+]|\d+\.)\s+(.*)$/.exec(line);
  if (!m) return null;
  return m[1]
    .replace(/^\*\*[^*]+:\*\*\s*/, '')
    .toLowerCase()
    .replace(/[*_`[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[.;:,]+$/, '')
    .trim();
}

function readJson(root: string, file: string): any {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  } catch {
    return null;
  }
}

function rootBins(root: string): Set<string> {
  const pkg = readJson(root, 'package.json') ?? {};
  const bins = new Set<string>();
  for (const dep of Object.keys({
    ...pkg.dependencies,
    ...pkg.devDependencies,
  })) {
    const meta = readJson(root, `node_modules/${dep}/package.json`);
    if (typeof meta?.bin === 'string') bins.add(dep.split('/').at(-1)!);
    else if (meta?.bin) Object.keys(meta.bin).forEach(b => bins.add(b));
  }
  return bins;
}

function lookup(obj: any, key: string): unknown {
  return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function checkAssert(root: string, a: any): string | null {
  const file = String(a?.file ?? '');
  const p = path.join(root, file);
  if (!file || !fs.existsSync(p))
    return `assert file \`${file}\` does not exist`;
  const text = fs.readFileSync(p, 'utf8');
  if (a.contains !== undefined) {
    return text.includes(String(a.contains))
      ? null
      : `assert: ${file} does not contain \`${a.contains}\``;
  }
  const key = a.json ?? a.yaml;
  if (!key) return 'assert needs `contains`, `json`, or `yaml`';
  let value: unknown;
  try {
    value = lookup(a.json ? JSON.parse(text) : YAML.parse(text), String(key));
  } catch (e) {
    return `assert: cannot parse ${file}: ${(e as Error).message}`;
  }
  if (a.equals !== undefined && value !== a.equals)
    return `assert: ${file} ${key} is \`${value}\`, expected \`${a.equals}\``;
  if (
    a.matches !== undefined &&
    !new RegExp(String(a.matches)).test(String(value))
  ) {
    return `assert: ${file} ${key} is \`${value}\`, expected to match /${a.matches}/`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Budgets and reports

type BudgetRow = {file: string; label: string; ratio: number; detail: string};

export function budgetRows(repo: Repo): BudgetRow[] {
  const b = repo.taxonomy.budgets;
  const rows: BudgetRow[] = [];
  const row = (
    file: string,
    label: string,
    text: string,
    limit: Budget | undefined,
  ) => {
    if (!limit) return;
    const m = measure(text);
    const parts: string[] = [];
    let ratio = 0;
    if (limit.lines) {
      ratio = Math.max(ratio, m.lines / limit.lines);
      parts.push(`${m.lines}/${limit.lines} lines`);
    }
    if (limit.bytes) {
      ratio = Math.max(ratio, m.bytes / limit.bytes);
      parts.push(`${m.bytes}/${limit.bytes} bytes`);
    }
    rows.push({file, label, ratio, detail: parts.join(', ')});
  };
  let tier0 = 0;
  for (const d of repo.docs) {
    switch (d.role) {
      case 'agents': {
        row(d.file, 'AGENTS.md', d.text, b.agents_total);
        const block = forkBlock(d.text);
        if (block) row(d.file, 'fork block', block, b.agents_fork_block);
        tier0 += measure(d.text).bytes;
        break;
      }
      case 'pointer':
        row(d.file, 'pointer', d.text, b.copilot_pointer);
        tier0 += measure(d.text).bytes;
        break;
      case 'index':
        row(d.file, 'index', d.text, b.index);
        break;
      case 'topic':
        row(d.file, 'topic', d.text, b.topic);
        break;
      case 'skill': {
        const own = repo.taxonomy.skill_budgets?.[skillName(d)] ?? {};
        row(d.file, 'SKILL.md', d.text, {...b.skill, ...own});
        tier0 += Buffer.byteLength(
          String(d.fm?.name ?? '') + String(d.fm?.description ?? ''),
        );
        break;
      }
      case 'reference':
        row(d.file, 'reference', d.text, b.reference);
        break;
      case 'instructions':
        row(d.file, 'path pointer', d.text, b.instructions_pointer);
        break;
    }
  }
  if (b.tier0?.bytes) {
    rows.push({
      file: '(tier 0)',
      label: 'always-loaded context',
      ratio: tier0 / b.tier0.bytes,
      detail: `${tier0}/${b.tier0.bytes} bytes`,
    });
  }
  return rows;
}

const daysSince = (date: string, now: Date) =>
  Math.floor(
    (now.getTime() - new Date(`${date}T00:00:00Z`).getTime()) / 86_400_000,
  );

export function staleRows(
  repo: Repo,
  opts: {online?: boolean; now?: Date} = {},
): string[] {
  const now = opts.now ?? new Date();
  const f = repo.taxonomy.freshness;
  const out: string[] = [];
  const audited = daysSince(String(repo.taxonomy.audited), now);
  if (audited > f.audit_days)
    out.push(
      `taxonomy: last audit ${audited} days ago (limit ${f.audit_days})`,
    );
  for (const t of topicsOf(repo)) {
    const id = t.fm!.id;
    const verified = String(t.fm!.verified ?? '');
    if (!DATE_RE.test(verified)) continue;
    const age = daysSince(verified, now);
    if (age > f.verified_days) out.push(`${id}: verified ${age} days ago`);
    if (t.fm!.status === 'draft' && age > f.draft_days)
      out.push(`${id}: draft for ${age} days`);
    const paths = ((t.fm!.sources ?? []) as string[])
      .map(s => String(s).split(/[#:@]/)[0])
      .filter(p => p && !isExternal(p) && repo.fileSet.has(p));
    if (paths.length) {
      const changed = git(repo.root, [
        'log',
        '--format=%h %cs',
        `--since=${verified}T23:59:59`,
        '--',
        ...paths,
      ]).trim();
      if (changed)
        out.push(
          `${id}: sources changed since ${verified} (${changed.split('\n').length} commits)`,
        );
    }
    if (opts.online) {
      for (const w of (t.fm!.watch ?? []) as string[]) {
        const m = /^([\w.-]+\/[\w.-]+)#(\d+)$/.exec(String(w));
        if (!m) continue;
        try {
          const state = execFileSync(
            'gh',
            [
              'pr',
              'view',
              m[2],
              '--repo',
              m[1],
              '--json',
              'state',
              '-q',
              '.state',
            ],
            {encoding: 'utf8'},
          ).trim();
          if (state !== 'OPEN')
            out.push(`${id}: watched ${w} is ${state}; re-verify`);
        } catch {
          out.push(`${id}: could not read watched ${w}`);
        }
      }
    }
  }
  return out;
}

export function similarRows(repo: Repo, threshold = 0.6): string[] {
  const items: {
    file: string;
    line: number;
    text: string;
    grams: Set<string>;
  }[] = [];
  const collect = (file: string, body: string, offset: number) => {
    proseLines(body).forEach((line, i) => {
      const norm = normalizeBullet(line);
      if (!norm || norm.length < 60) return;
      const words = norm.split(' ');
      const grams = new Set<string>();
      for (let j = 0; j + 2 < words.length; j++)
        grams.add(words.slice(j, j + 3).join(' '));
      items.push({file, line: offset + i, text: norm, grams});
    });
  };
  for (const d of repo.docs) {
    if (!['asset', 'index', 'instructions'].includes(d.role))
      collect(d.file, d.body, d.bodyLine);
  }
  for (const f of repo.files.filter(
    x => x.startsWith('docsite/docs/') && x.endsWith('.md'),
  )) {
    collect(f, fs.readFileSync(path.join(repo.root, f), 'utf8'), 1);
  }
  const out: string[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (a.file === b.file || !a.grams.size || !b.grams.size) continue;
      let inter = 0;
      for (const g of a.grams) if (b.grams.has(g)) inter++;
      const score = inter / (a.grams.size + b.grams.size - inter);
      if (score >= threshold)
        out.push(
          `${score.toFixed(2)} ${a.file}:${a.line} ~ ${b.file}:${b.line}`,
        );
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// find and preview

export function find(
  repo: Repo,
  terms: string[],
): {file: string; id?: string; score: number; hits: string[]}[] {
  const lower = terms.map(t => t.toLowerCase());
  const homes = repo.taxonomy.homes;
  const ids = new Map(topicsOf(repo).map(t => [t.file, String(t.fm!.id)]));
  const results: {file: string; id?: string; score: number; hits: string[]}[] =
    [];
  for (const file of repo.files) {
    if (!/\.(md|ya?ml)$/.test(file)) continue;
    if (!homes.some(h => file === h || file.startsWith(h + '/'))) continue;
    const lines = fs
      .readFileSync(path.join(repo.root, file), 'utf8')
      .split('\n');
    const matched = new Set<string>();
    const hits: string[] = [];
    lines.forEach((line, i) => {
      const l = line.toLowerCase();
      const found = lower.filter(t => l.includes(t));
      if (!found.length) return;
      found.forEach(t => matched.add(t));
      if (hits.length < 3) hits.push(`${i + 1}: ${line.trim().slice(0, 160)}`);
    });
    if (matched.size)
      results.push({file, id: ids.get(file), score: matched.size, hits});
  }
  return results.sort(
    (a, b) => b.score - a.score || a.file.localeCompare(b.file),
  );
}

const MANAGED = [
  PATHS.agents,
  PATHS.copilot,
  PATHS.claude,
  PATHS.instructions + '/',
  '.agents/',
  '.claude/',
];

export function preview(repo: Repo, base?: string): string {
  const out: string[] = [];
  const ref = base ?? defaultBase(repo.root);
  const isManaged = (f: string) =>
    MANAGED.some(m => (m.endsWith('/') ? f.startsWith(m) : f === m));
  const changed = git(repo.root, ['diff', '--name-status', ref, '--'])
    .split('\n')
    .filter(Boolean)
    .map(l => l.split('\t'))
    .filter(p => isManaged(p.at(-1)!))
    .map(p => `${p[0]} ${p.slice(1).join(' -> ')}`);
  const untracked = git(repo.root, [
    'ls-files',
    '--others',
    '--exclude-standard',
  ])
    .split('\n')
    .filter(f => f && isManaged(f))
    .map(f => `? ${f}`);
  out.push(`Base: ${ref}`, '', 'Changed knowledge files:');
  out.push(
    ...[...changed, ...untracked].map(l => `  ${l}`),
    ...(changed.length + untracked.length ? [] : ['  (none)']),
  );

  const baseIds = new Map<string, string>();
  const listing = git(repo.root, [
    'ls-tree',
    '-r',
    '--name-only',
    ref,
    '--',
    PATHS.knowledge,
  ]).split('\n');
  for (const f of listing) {
    if (classify(f, repo.taxonomy) !== 'topic') continue;
    const doc = parseDoc(f, 'topic', git(repo.root, ['show', `${ref}:${f}`]));
    if (doc.fm?.id) baseIds.set(String(doc.fm.id), f);
  }
  const nowIds = new Map(topicsOf(repo).map(t => [String(t.fm!.id), t.file]));
  const idLines: string[] = [];
  for (const [id, f] of nowIds) {
    if (!baseIds.has(id)) idLines.push(`  + ${id} (${f})`);
    else if (baseIds.get(id) !== f)
      idLines.push(`  > ${id} moved ${baseIds.get(id)} -> ${f}`);
  }
  for (const [id, f] of baseIds) {
    if (nowIds.has(id)) continue;
    const fate = repo.taxonomy.redirects[id]
      ? `redirects to ${repo.taxonomy.redirects[id]}`
      : repo.taxonomy.retired_ids.includes(id)
        ? 'retired'
        : 'NEEDS a redirect or retired_ids entry';
    idLines.push(`  - ${id} (${f}) ${fate}`);
  }
  out.push(
    '',
    'Topic IDs:',
    ...(idLines.length ? idLines : ['  (no changes)']),
  );

  const d = drift(repo);
  out.push(
    '',
    'Generated files `index --write` would update:',
    ...(d.length ? d.map(x => `  ${x.file} (${x.reason})`) : ['  (none)']),
  );

  const touched = new Set(
    [...changed, ...untracked].map(l => l.split(' ').at(-1)!),
  );
  const budgets = budgetRows(repo).filter(
    r => touched.has(r.file) || r.file.startsWith('('),
  );
  out.push(
    '',
    'Budgets for changed files:',
    ...budgets.map(
      r => `  ${(r.ratio * 100).toFixed(0)}% ${r.file} ${r.label}: ${r.detail}`,
    ),
  );

  const issues = runChecks(repo);
  const count = (s: Severity) => issues.filter(i => i.severity === s).length;
  out.push(
    '',
    `Checks: ${count('error')} errors, ${count('warning')} warnings`,
  );
  out.push(
    ...issues
      .filter(i => i.severity === 'error')
      .slice(0, 20)
      .map(i => `  ${formatIssue(i)}`),
  );
  return out.join('\n');
}

function defaultBase(root: string): string {
  try {
    return git(root, ['merge-base', 'HEAD', 'origin/main']).trim();
  } catch {
    return 'HEAD';
  }
}

// ---------------------------------------------------------------------------
// CLI

export function formatIssue(i: Issue): string {
  return `${i.severity.toUpperCase()} ${i.check} ${i.file}${i.line ? `:${i.line}` : ''} ${i.message}`;
}

function repoRoot(): string {
  return git(process.cwd(), ['rev-parse', '--show-toplevel']).trim();
}

export function main(argv: string[]): number {
  const [command, ...rest] = argv;
  const {values, positionals} = parseArgs({
    args: rest,
    allowPositionals: true,
    options: {
      ci: {type: 'boolean'},
      json: {type: 'boolean'},
      write: {type: 'boolean'},
      base: {type: 'string'},
      stale: {type: 'boolean'},
      budget: {type: 'boolean'},
      similar: {type: 'boolean'},
      online: {type: 'boolean'},
    },
  });
  const repo = loadRepo(repoRoot(), {ci: values.ci});
  switch (command) {
    case 'find': {
      if (!positionals.length) {
        console.error('usage: knowledge.mts find <terms...>');
        return 2;
      }
      for (const r of find(repo, positionals).slice(0, 15)) {
        console.log(
          `${r.file}${r.id ? ` [${r.id}]` : ''} (${r.score}/${positionals.length} terms)`,
        );
        r.hits.forEach(h => console.log(`  ${h}`));
      }
      return 0;
    }
    case 'preview':
      console.log(preview(repo, values.base));
      return 0;
    case 'index': {
      if (values.write) {
        const written = writeGenerated(repo);
        console.log(
          written.length
            ? written.map(f => `wrote ${f}`).join('\n')
            : 'Generated files are up to date.',
        );
        return 0;
      }
      const d = drift(repo);
      d.forEach(x => console.log(`${x.file}: ${x.reason}`));
      if (!d.length) console.log('Generated files are up to date.');
      return d.length ? 1 : 0;
    }
    case 'check': {
      const issues = runChecks(repo);
      if (values.json) console.log(JSON.stringify(issues, null, 2));
      else {
        for (const i of issues) {
          if (values.ci && i.severity !== 'advice') {
            console.log(
              `::${i.severity === 'error' ? 'error' : 'warning'} file=${i.file}${i.line ? `,line=${i.line}` : ''},title=${i.check}::${i.message}`,
            );
          }
          console.log(formatIssue(i));
        }
        const errors = issues.filter(i => i.severity === 'error').length;
        console.log(
          `${repo.docs.length} files checked: ${errors} errors, ${issues.length - errors} warnings.`,
        );
      }
      return issues.some(i => i.severity === 'error') ? 1 : 0;
    }
    case 'report': {
      const all = !values.stale && !values.budget && !values.similar;
      if (all || values.budget) {
        console.log('Budgets:');
        for (const r of budgetRows(repo).sort((a, b) => b.ratio - a.ratio)) {
          console.log(
            `  ${(r.ratio * 100).toFixed(0).padStart(3)}% ${r.file} ${r.label}: ${r.detail}`,
          );
        }
      }
      if (all || values.stale) {
        const rows = staleRows(repo, {online: values.online});
        console.log(
          'Freshness:',
          ...(rows.length ? rows.map(r => `\n  ${r}`) : [' nothing stale']),
        );
      }
      if (all || values.similar) {
        const rows = similarRows(repo);
        console.log(
          'Similar text (advisory, KC-11b):',
          ...(rows.length ? rows.map(r => `\n  ${r}`) : [' none']),
        );
      }
      return 0;
    }
    default:
      console.error(
        'usage: knowledge.mts <find|preview|index|check|report> [options]',
      );
      return 2;
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  process.exitCode = main(process.argv.slice(2));
}
