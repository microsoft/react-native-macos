import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {getBaseBranch} from '../change.mts';

const repository = {url: 'git+https://github.com/microsoft/react-native-macos.git'};

function fixture(t, {baseBranch = 'origin/main', rootRepository, coreRepository = repository,
  remotes = {origin: 'https://github.com/contributor/react-native-macos.git',
    upstream: 'git@github.com:microsoft/react-native-macos.git'}} = {}) {
  const root = mkdtempSync(join(tmpdir(), 'rnm-change-base-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const baseRef = process.env.GITHUB_BASE_REF;
  t.after(() => {
    if (baseRef === undefined) delete process.env.GITHUB_BASE_REF;
    else process.env.GITHUB_BASE_REF = baseRef;
  });
  delete process.env.GITHUB_BASE_REF;
  mkdirSync(join(root, '.changeset'));
  mkdirSync(join(root, 'packages/react-native'), {recursive: true});
  writeFileSync(join(root, 'package.json'), JSON.stringify({repository: rootRepository}));
  writeFileSync(join(root, 'packages/react-native/package.json'), JSON.stringify({repository: coreRepository}));
  writeFileSync(join(root, '.changeset/config.json'), JSON.stringify({baseBranch}));
  const git = args => execFileSync('git', args, {cwd: root, encoding: 'utf8'});
  git(['init', '-q']);
  for (const [name, url] of Object.entries(remotes)) git(['remote', 'add', name, url]);
  return root;
}

for (const branch of ['main', '0.83-stable', 'release/0.83']) {
  test(`local ${branch} uses core metadata to remap a fork origin to upstream`, async t => {
    const root = fixture(t, {baseBranch: `origin/${branch}`});
    assert.equal(await getBaseBranch(root), `upstream/${branch}`);
  });
}

test('root repository metadata takes precedence and remote matching is exact', async t => {
  const root = fixture(t, {rootRepository: {url: 'https://github.com/example/project.git'},
    remotes: {origin: 'https://github.com/example/project-extra.git',
      canonical: 'git@github.com:Example/Project.git', upstream: repository.url}});
  assert.equal(await getBaseBranch(root), 'canonical/main');
});

test('a normal Microsoft origin honors main and the configured stable branch', async t => {
  const root = fixture(t, {remotes: {origin: repository.url}});
  assert.equal(await getBaseBranch(root), 'origin/main');
  writeFileSync(join(root, '.changeset/config.json'), JSON.stringify({baseBranch: 'origin/0.83-stable'}));
  assert.equal(await getBaseBranch(root), 'origin/0.83-stable');
});

test('an empty root URL falls back to string core metadata and an arbitrary remote name', async t => {
  const root = fixture(t, {rootRepository: '', coreRepository: repository.url,
    baseBranch: 'origin/0.83-stable', remotes: {canonical: repository.url}});
  assert.equal(await getBaseBranch(root), 'canonical/0.83-stable');
});

test('an explicit configured remote or local branch remains authoritative', async t => {
  const root = fixture(t, {remotes: {origin: repository.url, review: 'https://github.com/contributor/react-native-macos.git'}});
  for (const baseBranch of ['review/0.83-stable', 'main', 'release/0.83']) {
    writeFileSync(join(root, '.changeset/config.json'), JSON.stringify({baseBranch}));
    assert.equal(await getBaseBranch(root), baseBranch);
  }
});

test('GITHUB_BASE_REF takes precedence over local config for forks and CI checkouts', async t => {
  const root = fixture(t, {baseBranch: 'review/main'});
  process.env.GITHUB_BASE_REF = '0.83-stable';
  assert.equal(await getBaseBranch(root), 'upstream/0.83-stable');
  execFileSync('git', ['remote', 'remove', 'upstream'], {cwd: root});
  execFileSync('git', ['remote', 'set-url', 'origin', repository.url], {cwd: root});
  assert.equal(await getBaseBranch(root), 'origin/0.83-stable');
});

test('missing repository metadata retains the origin fallback', async t => {
  const root = fixture(t, {baseBranch: 'origin/0.83-stable', coreRepository: {}});
  assert.equal(await getBaseBranch(root), 'origin/0.83-stable');
  rmSync(join(root, 'packages/react-native/package.json'));
  assert.equal(await getBaseBranch(root), 'origin/0.83-stable');
});

test('manifest, config, and Git errors propagate from the public resolver', async t => {
  const root = fixture(t);
  const config = join(root, '.changeset/config.json');
  writeFileSync(config, '{');
  await assert.rejects(getBaseBranch(root), SyntaxError);
  writeFileSync(config, JSON.stringify({baseBranch: 'origin/main'}));
  writeFileSync(join(root, 'packages/react-native/package.json'), '{');
  await assert.rejects(getBaseBranch(root), SyntaxError);
  writeFileSync(join(root, 'packages/react-native/package.json'), JSON.stringify({repository}));
  rmSync(join(root, '.git'), {recursive: true});
  await assert.rejects(getBaseBranch(root), /not a git repository/);
});
