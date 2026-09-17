import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {
  createPublishPlan,
  parseVersion,
  publishedMetadata,
  publishPrepared,
  publishTag,
  readChangesetStatus,
  readWorkspaces,
  validateRelease,
  validatePreparedVersionPR,
  canAdvanceTag,
} from '../publishing-contract.mjs';
import {releaseAlignmentChangeset, versionWithPostbump, withReleaseConfig} from '../changeset-version-with-postbump.mts';
import {isCurrentHead} from '../check-version-head.mjs';
import {runCheck} from '../change.mts';

const core = 'react-native-macos';
const lists = '@react-native-macos/virtualized-lists';
const branch = '0.83-stable';
const clean = {changesets: [], releases: []};
const require = createRequire(import.meta.url);
const metadata = (versions = [], tags = {}) => ({versions, tags});

function graph(version = '0.83.2') {
  return [
    {name: core, version, dependencies: {[lists]: 'workspace:*', '@react-native/codegen': '0.83.1'}},
    {name: lists, version},
    {name: '@react-native/codegen', version: '0.83.1', private: true},
    {name: '@react-native-macos/internal', version: '1000.0.0', private: true},
    {name: 'react-native-macos-init', version: '2.1.3'},
    {name: '@react-native/unrelated', version: '0.83.0'},
  ];
}

function plan(overrides = {}) {
  return createPublishPlan({workspaces: graph(), branch, status: clean,
    getMetadata: async () => metadata(), ...overrides});
}

test('pending normal, empty, and release-only Changesets skip registry and publication', async () => {
  for (const status of [
    {changesets: [{id: 'fix', releases: [{name: core, type: 'patch'}]}], releases: []},
    {changesets: [{id: 'empty', releases: []}], releases: []},
    {changesets: [], releases: [{name: core, newVersion: '0.83.3'}]},
  ]) {
    const result = await plan({status, workspaces: graph('1000.0.0'),
      getMetadata: () => assert.fail('Registry queried with pending Changesets')});
    publishPrepared(result, () => assert.fail('Published with pending Changesets'));
    assert.deepEqual(result.packages, []);
  }
});

test('only unpublished coupled packages publish, in runtime dependency order', async () => {
  const queried = [];
  const result = await plan({getMetadata: async name => {
    queried.push(name);
    return metadata(['0.83.1']);
  }});
  assert.deepEqual(queried, [core, lists]);
  assert.deepEqual(result.packages, [{name: lists, version: '0.83.2', tag: 'latest'}, {name: core, version: '0.83.2', tag: 'latest'}]);
  const calls = [];
  publishPrepared(result, (...args) => calls.push(args));
  assert.deepEqual(calls.map(([command, args]) => [command, args]), [lists, core].map(name => [
    'yarn', ['workspace', name, 'npm', 'publish', '--provenance', '--tag', 'latest', '--tolerate-republish'],
  ]));
});

test('partial publication retries only the missing package with one publish-time tag', async () => {
  const result = await plan({getMetadata: async name => metadata(name === lists ? ['0.83.2'] : [])});
  assert.deepEqual(result.packages, [{name: core, version: '0.83.2', tag: 'latest'}]);
  const calls = [];
  publishPrepared(result, (command, args) => calls.push([command, args]));
  assert.deepEqual(calls, [['yarn', ['workspace', core, 'npm', 'publish', '--provenance', '--tag', 'latest', '--tolerate-republish']]]);
  const complete = await plan({getMetadata: async () => metadata(['0.83.2'], {latest: '0.83.2'})});
  publishPrepared(complete, () => assert.fail('Republished an existing version'));
  assert.deepEqual(complete, {packages: [], tag: 'latest'});
});

test('registry failures prevent all publication, including a failure on the last package', async () => {
  await assert.rejects(plan({getMetadata: async name => {
    if (name === lists) throw new Error('Registry unavailable');
    return metadata();
  }}), /Registry unavailable/);
});

test('invalid Changesets status fails before registry access', async () => {
  await assert.rejects(plan({status: {},
    getMetadata: () => assert.fail('Queried registry without Changesets status')}), /Invalid Changesets status/);
});

test('tag selection uses actual versions and published stable lines, not next or latest aliases', () => {
  assert.equal(publishTag('0.83.0', branch, ['0.82.9', '0.84.0-rc.1']), 'latest');
  assert.equal(publishTag('0.83.2', branch, ['0.83.1']), 'latest');
  assert.equal(publishTag('0.83.2', branch, ['0.84.0']), branch);
  assert.equal(publishTag('0.83.2-rc.1', branch, ['0.84.0']), 'next');
  assert.equal(publishTag('0.83.2+build.1', branch, []), 'latest');
  assert.equal(publishTag('1.0.0', '1.0-stable', ['0.999.0']), 'latest');
});

test('placeholder, malformed, branch-mismatched, and package-mismatched versions fail before registry access', async () => {
  for (const version of ['1000.0.0', '1000.0.0-rc.1', '0.83', '0.83.01', '0.83.1-01', '0.84.0']) {
    await assert.rejects(plan({workspaces: graph(version),
      getMetadata: () => assert.fail('Queried invalid release')}), /version|match/i);
  }
  const workspaces = graph();
  workspaces[1].version = '0.83.1';
  assert.throws(() => validateRelease(workspaces, branch), /does not match/);
  assert.throws(() => validateRelease(graph(), 'main'), /stable branch/);
  assert.throws(() => validateRelease(graph().slice(1), branch), /Missing public/);
  assert.throws(() => parseVersion('garbage'), /Invalid release/);
});

test('runtime private/local dependencies fail; explicit upstream registry ranges and private dev dependencies pass', () => {
  for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
    for (const range of ['workspace:*', 'workspace:^', 'workspace:0.83.1', 'file:../codegen', 'link:../codegen', '1000.0.0']) {
      const workspaces = graph();
      workspaces[0][field] = {'@react-native/codegen': range};
      assert.throws(() => validateRelease(workspaces, branch), /runtime|unreleasable/);
    }
  }
  const workspaces = graph();
  workspaces[0].devDependencies = {'@react-native/codegen': 'workspace:*'};
  assert.equal(validateRelease(workspaces, branch).length, 2);
  workspaces[0].optionalDependencies = {'@react-native-macos/internal': '0.83.2'};
  assert.throws(() => validateRelease(workspaces, branch), /private runtime dependency/);
  delete workspaces[0].optionalDependencies;
  workspaces[0].dependencies[lists] = '0.83.1';
  assert.throws(() => validateRelease(workspaces, branch), /mismatched runtime dependency/);
});

test('runtime graph cycles fail before publish', async () => {
  const workspaces = graph();
  workspaces[1].dependencies = {[core]: 'workspace:*'};
  await assert.rejects(plan({workspaces}), /cycle/);
});

test('registry adapter distinguishes missing packages from auth, network, and malformed responses', async () => {
  const result = await publishedMetadata(lists, async url => {
    assert.equal(url, 'https://registry.npmjs.org/%40react-native-macos%2Fvirtualized-lists');
    return Response.json({versions: {'0.83.1': {}}, 'dist-tags': {latest: '0.82.0', next: '0.84.0-rc.1'}});
  });
  assert.deepEqual(result, metadata(['0.83.1'], {latest: '0.82.0', next: '0.84.0-rc.1'}));
  assert.deepEqual(await publishedMetadata(core, async () => new Response(null, {status: 404})), metadata());
  for (const status of [401, 403, 429, 500]) {
    await assert.rejects(publishedMetadata(core, async () => new Response(null, {status})), /Registry query failed/);
  }
  for (const metadata of [{}, {versions: []}, {versions: 'invalid'}]) {
    await assert.rejects(publishedMetadata(core, async () => Response.json(metadata)), /Invalid registry metadata/);
  }
  await assert.rejects(publishedMetadata(core, async () => {throw new Error('offline');}), /offline/);
});

function releaseFixture(t, {versionPrivatePackages = false, workspaces = graph(), config: policy} = {}) {
  const root = mkdtempSync(join(tmpdir(), 'rnm-release-api-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  mkdirSync(join(root, '.changeset'));
  writeFileSync(join(root, 'package.json'), JSON.stringify({name: 'release-fixture', private: true, workspaces: ['packages/*']}));
  // Keep the synthetic graph independent of branch-specific release configuration.
  const config = policy ?? {
    access: 'public', baseBranch: 'origin/nonexistent',
    changelog: require.resolve('@changesets/cli/changelog'), commit: false,
    fixed: [], linked: [], ignore: [],
    bumpVersionsWithWorkspaceProtocolOnly: true,
    privatePackages: {version: versionPrivatePackages, tag: false},
  };
  writeFileSync(join(root, '.changeset/config.json'), JSON.stringify(config));
  for (const [index, pkg] of workspaces.entries()) {
    mkdirSync(join(root, `packages/p${index}`), {recursive: true});
    writeFileSync(join(root, `packages/p${index}/package.json`), JSON.stringify(pkg));
  }
  return {root, workspaces};
}

const repositoryRoot = new URL('../../../', import.meta.url).pathname;
const releasePolicy = JSON.parse(readFileSync(join(repositoryRoot, '.changeset/config.json'), 'utf8'));
const getReleasePlan = require('@changesets/get-release-plan').default;
const semver = require('semver');

test('repository Changesets policy disables private versions and tags and fixes core with lists', () => {
  assert.deepEqual(releasePolicy.privatePackages, {version: false, tag: false});
  assert.deepEqual(releasePolicy.fixed, [[core, lists]]);
});

test('repository Changesets policy follows the actual public and private workspace graph', async t => {
  const workspaces = readWorkspaces(repositoryRoot);
  const corePackage = workspaces.find(pkg => pkg.name === core);
  const listsPackage = workspaces.find(pkg => pkg.name === lists);
  assert.ok(corePackage && !corePackage.private, 'Missing public core workspace');
  assert.ok(listsPackage, 'Missing lists workspace');
  const publicPackages = listsPackage.private ? [corePackage] : [corePackage, listsPackage];
  // Derive expectations from manifests, never from the policy or release-plan output.
  const nextVersion = semver.inc(publicPackages.map(pkg => pkg.version).sort(semver.rcompare)[0], 'patch');
  const expected = publicPackages.map(pkg => [pkg.name, nextVersion]).sort();
  const {root} = releaseFixture(t, {workspaces, config: releasePolicy});
  assert.deepEqual((await getReleasePlan(root)).releases, []);
  for (const changed of [core, lists]) {
    writeFileSync(join(root, '.changeset/fix.md'), `---\n"${changed}": patch\n---\n\nFix package.\n`);
    const bumped = (await getReleasePlan(root)).releases.filter(pkg => pkg.type !== 'none');
    assert.deepEqual(bumped.map(pkg => [pkg.name, pkg.newVersion]).sort(),
      changed === lists && listsPackage.private ? [] : expected);
  }
});

test('repository Changesets policy accepts a private lists fixture and skips its release', async t => {
  const workspaces = graph('1000.0.0');
  workspaces[1].private = true;
  // A public package can use skipped private packages as development dependencies.
  workspaces[0].devDependencies = {[lists]: workspaces[0].dependencies[lists]};
  delete workspaces[0].dependencies[lists];
  const {root} = releaseFixture(t, {workspaces, config: releasePolicy});
  assert.deepEqual((await getReleasePlan(root)).releases, []);
  writeFileSync(join(root, '.changeset/fix.md'), `---\n"${core}": patch\n---\n\nFix core.\n`);
  const bumped = (await getReleasePlan(root)).releases.filter(pkg => pkg.type !== 'none');
  assert.deepEqual(bumped.map(pkg => [pkg.name, pkg.newVersion]), [[core, '1000.0.1']]);
  writeFileSync(join(root, '.changeset/fix.md'), `---\n"${lists}": patch\n---\n\nFix private lists.\n`);
  assert.deepEqual((await getReleasePlan(root)).releases, []);
});

test('repository Changesets policy couples public stable packages without registry or private release edges', async t => {
  const {root, workspaces} = releaseFixture(t, {config: releasePolicy});
  for (const changed of [core, lists, '@react-native/codegen', 'react-native-macos-init']) {
    writeFileSync(join(root, '.changeset/fix.md'), `---\n"${changed}": patch\n---\n\nFix package.\n`);
    const releases = (await getReleasePlan(root)).releases.map(pkg => [pkg.name, pkg.newVersion]).sort();
    assert.deepEqual(releases, changed === 'react-native-macos-init'
      ? [[changed, '2.1.4']]
      : changed === '@react-native/codegen' ? [] : [[core, '0.83.3'], [lists, '0.83.3']].sort());
  }
  // A consumer outside the fixed group proves that only workspace edges propagate.
  writeFileSync(join(root, '.changeset/fix.md'), `---\n"${lists}": patch\n---\n\nFix lists.\n`);
  for (const range of ['0.83.2', 'workspace:*']) {
    writeFileSync(join(root, 'packages/p4/package.json'), JSON.stringify({
      ...workspaces[4], dependencies: {[lists]: range},
    }));
    const release = (await getReleasePlan(root)).releases.find(pkg => pkg.name === 'react-native-macos-init');
    assert.equal(release?.newVersion, range === 'workspace:*' ? '2.1.4' : undefined);
  }
});

test('real Yarn constraints preserve private upstream versions, align public versions, and preserve workspace fork edges', t => {
  for (const main of [true, false]) {
    const workspaces = graph(main ? '1000.0.0' : '0.83.2');
    workspaces[1].private = main;
    workspaces[1].version = '0.82.0';
    workspaces[2].version = '0.82.7';
    workspaces[3].version = '0.82.0';
    for (const index of [0, 1, 3]) {
      for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
        workspaces[index][field] = {'@react-native/codegen': '*'};
        if (index !== 1) workspaces[index][field][lists] = '*';
      }
    }
    if (!main) workspaces[0].peerDependencies['react-native'] = '0.83.1';
    const {root} = releaseFixture(t, {workspaces});
    writeFileSync(join(root, 'yarn.lock'), '');
    writeFileSync(join(root, 'yarn.config.cjs'), `module.exports = require(${JSON.stringify(join(repositoryRoot, 'yarn.config.cjs'))});\n`);
    const yarn = args => execFileSync(process.execPath, [join(repositoryRoot, '.yarn/releases/yarn-4.12.0.cjs'), ...args], {
      cwd: root, encoding: 'utf8', env: {...process.env, YARN_IGNORE_PATH: '1',
        YARN_ENABLE_NETWORK: '0', YARN_ENABLE_IMMUTABLE_INSTALLS: '0', YARN_ENABLE_SCRIPTS: '0'},
    });
    yarn(['install']);
    yarn(['constraints', '--fix']);
    yarn(['constraints']);
    const actual = workspaces.map((_, index) => JSON.parse(readFileSync(join(root, `packages/p${index}/package.json`), 'utf8')));
    assert.equal(actual[0].version, workspaces[0].version);
    assert.equal(actual[1].version, main ? '1000.0.0' : '0.83.2');
    assert.equal(actual[2].private, true);
    assert.equal(actual[2].version, '0.82.7');
    assert.equal(actual[3].version, '1000.0.0');
    assert.equal(actual[5].private, true);
    assert.equal(actual[5].version, main ? '0.83.0' : '0.83.1');
    for (const index of [0, 1, 3]) {
      for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
        assert.equal(actual[index][field]['@react-native/codegen'], main || index === 3 ? 'workspace:*' : '0.83.1');
        if (index !== 1) assert.equal(actual[index][field][lists], 'workspace:*');
      }
    }
  }
});

test('real get-release-plan reads a prepared graph without a Git base or pending changesets', async t => {
  const {root, workspaces} = releaseFixture(t);
  const status = await readChangesetStatus(root);
  assert.deepEqual(status.changesets, []);
  assert.deepEqual(status.releases, []);
  assert.equal((await plan({workspaces, status})).packages.length, 2);
  writeFileSync(join(root, '.changeset/empty.md'), '---\n{}\n---\n');
  const pending = await readChangesetStatus(root);
  assert.equal(pending.changesets.length, 1);
  assert.deepEqual((await plan({workspaces, status: pending})).packages, []);
});

for (const changed of [core, lists]) {
  test(`real Changesets version aligns both changelogs for a ${changed}-only patch`, async t => {
    const {root, workspaces} = releaseFixture(t);
    writeFileSync(join(root, '.changeset/fix.md'), `---\n"${changed}": patch\n---\n\nFix release fixture.\n`);
    const status = await readChangesetStatus(root);
    const alignment = releaseAlignmentChangeset(workspaces, status);
    if (alignment) writeFileSync(join(root, '.changeset/align.md'), alignment);
    const aligned = await readChangesetStatus(root);
    for (const name of [core, lists]) {
      assert.equal(aligned.releases.find(pkg => pkg.name === name).newVersion, '0.83.3');
    }
    const originalConfig = readFileSync(join(root, '.changeset/config.json'), 'utf8');
    await withReleaseConfig(() => {
      execFileSync(process.execPath, [require.resolve('@changesets/cli/bin.js'), 'version'], {
        cwd: root, encoding: 'utf8', env: {...process.env, CI: 'true'},
      });
    }, root);
    assert.equal(readFileSync(join(root, '.changeset/config.json'), 'utf8'), originalConfig);
    for (const index of [0, 1]) {
      const pkg = JSON.parse(readFileSync(join(root, `packages/p${index}/package.json`), 'utf8'));
      assert.equal(pkg.version, '0.83.3');
      assert.match(readFileSync(join(root, `packages/p${index}/CHANGELOG.md`), 'utf8'), /^## 0\.83\.3$/m);
    }
    assert.equal(JSON.parse(readFileSync(join(root, 'packages/p4/package.json'), 'utf8')).version, '2.1.3');
    assert.deepEqual((await readChangesetStatus(root)).changesets, []);
  });
}

test('workspace discovery follows Yarn metadata, including workspaces outside packages/', t => {
  const root = mkdtempSync(join(tmpdir(), 'rnm-package-graph-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const packages = graph();
  const locations = packages.map((pkg, index) => `tools/workspace-${index}`);
  for (const [index, location] of locations.entries()) {
    mkdirSync(join(root, location), {recursive: true});
    writeFileSync(join(root, location, 'package.json'), JSON.stringify(packages[index]));
  }
  assert.deepEqual(readWorkspaces(root, (command, args) => {
    assert.equal(command, 'yarn');
    assert.deepEqual(args, ['workspaces', 'list', '--json']);
    return locations.map(location => JSON.stringify({location})).join('\n') + '\n';
  }), packages);
});

test('new public coupled workspaces receive one upload tag; init/private/upstream packages stay excluded', async () => {
  const workspaces = graph();
  workspaces.push({name: '@react-native-macos/new-package', version: '0.83.2'});
  const result = await plan({workspaces});
  assert.deepEqual(result.packages, [
    {name: lists, version: '0.83.2', tag: 'latest'},
    {name: core, version: '0.83.2', tag: 'latest'},
    {name: '@react-native-macos/new-package', version: '0.83.2', tag: 'latest'},
  ]);
});

test('postbump applies shared constraints before artifacts and lockfile', async () => {
  let workspaces = graph('0.83.1');
  const events = [];
  await versionWithPostbump({branch, getWorkspaces: () => workspaces,
    withConfig: callback => callback(),
    prepareAlignment: () => () => {},
    run: (command, args) => {
      events.push(args.join(' '));
      if (args[0] === 'changeset') workspaces = graph('0.83.2');
    },
    updateArtifacts: async version => {events.push(`artifacts ${version}`);},
  });
  assert.deepEqual(events, ['changeset version', 'constraints --fix', 'artifacts 0.83.2', 'install --mode update-lockfile']);
});

test('postbump rejects an invalid graph before artifacts or lockfile', async () => {
  await assert.rejects(versionWithPostbump({branch, getWorkspaces: () => graph('1000.0.0'),
    withConfig: callback => callback(),
    prepareAlignment: () => () => {},
    run: (command, args) => assert.notEqual(args[0], 'install'),
    updateArtifacts: () => assert.fail('Updated artifacts with an invalid graph'),
  }), /Invalid release version/);
});

test('an init-only bump does not regenerate React Native artifacts', async () => {
  const workspaces = graph();
  await versionWithPostbump({branch, getWorkspaces: () => workspaces,
    withConfig: callback => callback(),
    prepareAlignment: () => () => {},
    run: (command, args) => {
      if (args[0] === 'changeset') workspaces.find(pkg => pkg.name === 'react-native-macos-init').version = '2.1.4';
    },
    updateArtifacts: () => assert.fail('Updated artifacts for init'),
  });
});

test('CLI skips main and pull requests without installed dependencies or registry access', () => {
  const script = new URL('../../../.ado/scripts/configure-publish.mts', import.meta.url);
  for (const env of [{GITHUB_REF_NAME: 'main'}, {GITHUB_REF_NAME: branch, GITHUB_BASE_REF: branch}]) {
    const output = execFileSync(process.execPath, [script.pathname, '--publish'], {
      env: {...process.env, ...env, GITHUB_OUTPUT: '', TF_BUILD: ''}, encoding: 'utf8',
    });
    assert.match(output, /Publication disabled/);
  }
});

test('patch alignment includes every coupled package; stable minor and major bumps fail', () => {
  for (const name of [core, lists]) {
    assert.match(releaseAlignmentChangeset(graph(), {releases: [{name, type: 'patch'}]}),
      new RegExp(`"${name === core ? lists : core}": patch`));
    for (const type of ['minor', 'major']) {
      assert.throws(() => releaseAlignmentChangeset(graph(), {releases: [{name, type}]}), /only patch/);
    }
  }
  for (const releases of [
    [],
    [{name: core, type: 'patch'}, {name: lists, type: 'patch'}],
    [{name: 'react-native-macos-init', type: 'major'}],
    [{name: '@react-native-macos/internal', type: 'major'}],
  ]) {
    assert.equal(releaseAlignmentChangeset(graph(), {releases}), undefined);
  }
});

test('postbump removes its temporary core Changeset if Changesets fails', async () => {
  let cleaned = false;
  await assert.rejects(versionWithPostbump({branch, getWorkspaces: graph,
    withConfig: callback => callback(),
    prepareAlignment: () => () => {cleaned = true;},
    run: () => {throw new Error('Changesets failed');},
    updateArtifacts: () => assert.fail('Updated artifacts after failure'),
  }), /Changesets failed/);
  assert.equal(cleaned, true);
});

test('ADO stage and reusable job both retain a hard-false publication condition', () => {
  for (const path of ['../../../.ado/publish.yml', '../../../.ado/jobs/npm-publish.yml']) {
    assert.match(readFileSync(new URL(path, import.meta.url), 'utf8'), /^\s+condition: false$/m);
  }
});

test('full SemVer prevents tag regression by patch, prerelease number, line, and current pointer', async () => {
  for (const [version, tag, versions, tags] of [
    ['0.83.2', 'latest', ['0.83.10'], {}],
    ['0.83.2', branch, ['0.83.3', '0.84.0'], {}],
    ['0.83.2-rc.2', 'next', ['0.83.2-rc.10'], {}],
    ['0.83.2-rc.10', 'next', ['0.84.0-rc.1'], {}],
    ['0.83.2-rc.2', 'next', [], {next: '0.83.2'}],
    ['0.83.2', 'latest', ['0.83.1'], {latest: '0.83.3'}],
  ]) {
    assert.equal(canAdvanceTag(version, tag, metadata(versions, tags)), false);
  }
  assert.equal(canAdvanceTag('0.83.2-rc.10', 'next', metadata(['0.83.2-rc.2'])), true);
  assert.equal(canAdvanceTag('0.83.2+build.2', 'latest', metadata(['0.83.2+build.1'])), true);
  assert.equal(canAdvanceTag('0.83.2', branch, metadata(['0.84.0'])), true);
  for (const version of ['0.83.2', '0.83.2-rc.2']) {
    await assert.rejects(plan({workspaces: graph(version), getMetadata: async name =>
      metadata(name === lists ? [version.includes('-') ? '0.83.2-rc.10' : '0.83.10'] : [])}), /non-monotonic/);
  }
});

test('tag choice is per package when a partial newer-line publication exists', async () => {
  const result = await plan({getMetadata: async name => metadata(name === lists ? ['0.84.0'] : ['0.82.0'])});
  assert.deepEqual(result.packages.map(pkg => [pkg.name, pkg.tag]), [[lists, branch], [core, 'latest']]);
});

test('existing old versions neither republish nor regress any tag', async () => {
  const result = await plan({getMetadata: async () => metadata(['0.83.2', '0.83.10'], {latest: '0.83.10', [branch]: '0.83.10'})});
  assert.deepEqual(result.packages, []);
  publishPrepared(result, () => assert.fail('Mutated an existing old version'));
});

test('existing versions skip cleanly with absent, older, or different tag pointers', async () => {
  for (const tags of [{}, {latest: '0.83.1'}, {next: '0.83.2'}, {latest: '0.84.0'}]) {
    const state = metadata(['0.83.2'], tags);
    const before = structuredClone(state);
    const result = await plan({getMetadata: async () => state});
    publishPrepared(result, () => assert.fail('Published or retagged an existing version'));
    assert.deepEqual(result, {packages: [], tag: 'latest'});
    assert.deepEqual(state, before);
  }
});

test('newest stable, old-line patch, and prerelease each use one publish call without separate tag mutations', async () => {
  for (const [version, versions, tag] of [
    ['0.83.0', ['0.82.9'], 'latest'],
    ['0.83.2', ['0.83.0', '0.84.0'], branch],
    ['0.83.3-rc.1', ['0.83.2'], 'next'],
  ]) {
    const result = await plan({workspaces: graph(version), getMetadata: async () => metadata(versions)});
    const calls = [];
    publishPrepared(result, (command, args) => calls.push([command, args]));
    assert.deepEqual(calls, [lists, core].map(name => [
      'yarn', ['workspace', name, 'npm', 'publish', '--provenance', '--tag', tag, '--tolerate-republish'],
    ]));
    assert.equal(result.tag, tag);
  }
});

test('postbump rejects incomplete alignment before constraints and rejects later version overrides', async () => {
  for (const override of [false, true]) {
    let workspaces = graph();
    await assert.rejects(versionWithPostbump({branch, getWorkspaces: () => workspaces,
      withConfig: callback => callback(), prepareAlignment: () => () => {},
      run: (command, args) => {
        if (args[0] === 'changeset') {
          if (override) workspaces = graph('0.83.3');
          else workspaces[0].version = '0.83.3';
        }
        if (args[0] === 'constraints') {
          assert.equal(override, true, 'Constraints hid incomplete Changesets alignment');
          workspaces = graph('0.83.4');
        }
        assert.notEqual(args[0], 'install');
      }, updateArtifacts: () => assert.fail('Generated inconsistent artifacts'),
    }), /does not match|Constraints changed/);
  }
});

test('temporary Changesets config restores original bytes on failure', async t => {
  const {root} = releaseFixture(t);
  const path = join(root, '.changeset/config.json');
  const original = readFileSync(path, 'utf8');
  await assert.rejects(withReleaseConfig(() => {throw new Error('failure');}, root), /failure/);
  assert.equal(readFileSync(path, 'utf8'), original);
});

test('stale-head check accepts only the event SHA on the same stable branch and fails closed', () => {
  const env = {GITHUB_REF: 'refs/heads/0.83-stable', GITHUB_SHA: 'a'.repeat(40)};
  assert.equal(isCurrentHead(env, (command, args) => {
    assert.equal(command, 'git');
    assert.deepEqual(args, ['ls-remote', '--exit-code', 'origin', env.GITHUB_REF]);
    return `${env.GITHUB_SHA}\t${env.GITHUB_REF}\n`;
  }), true);
  assert.equal(isCurrentHead(env, () => `${'b'.repeat(40)}\t${env.GITHUB_REF}`), false);
  assert.equal(isCurrentHead({...env, GITHUB_REF: 'refs/heads/main'}, () => assert.fail()), false);
  assert.throws(() => isCurrentHead(env, () => {throw new Error('network');}), /network/);
});

function preparedFixture(t, {
  oldVersion = '0.83.1', version = '0.83.2', target = branch,
  privateLists = false, head = 'arbitrary-release-name',
  editBase = () => {}, editHead = () => {},
} = {}) {
  // Let the real Changesets API inspect invalid private links without rejecting
  // skipped dependencies first. The contract must still reject those links.
  const {root} = releaseFixture(t, {versionPrivatePackages: true});
  const git = args => execFileSync('git', args, {
    cwd: root, encoding: 'utf8',
    env: {...process.env, GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.com',
      GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.com'},
  });
  const writePackage = (index, pkg) => writeFileSync(join(root, `packages/p${index}/package.json`), JSON.stringify(pkg));
  const writeChangelog = (index, text) => writeFileSync(join(root, `packages/p${index}/CHANGELOG.md`), text);
  const old = graph(oldVersion);
  old[1].private = privateLists;
  old.forEach((pkg, index) => writePackage(index, pkg));
  for (const index of [0, 1]) writeChangelog(index, `# Changelog\n\n## ${oldVersion}\n\nOld release.\n`);
  writeFileSync(join(root, '.changeset/bootstrap.md'), `---\n"${core}": patch\n---\n\nPrepare release.\n`);
  editBase({root, workspaces: old, writePackage, writeChangelog});
  git(['init', '-q', '-b', target]);
  const commit = () => {
    git(['add', '.']);
    git(['-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'Fixture state']);
  };
  commit();
  const base = git(['rev-parse', 'HEAD']).trim();
  git(['switch', '-qc', head]);
  const workspaces = graph(version);
  const locations = workspaces.map((pkg, index) => `packages/p${index}`);
  workspaces.forEach((pkg, index) => writePackage(index, pkg));
  for (const index of [0, 1]) {
    writeChangelog(index, `# Changelog\n\n## ${version}\n\n### Patch Changes\n\n- Prepare release.\n\n## ${oldVersion}\n\nOld release.\n`);
  }
  rmSync(join(root, '.changeset/bootstrap.md'));
  editHead({root, workspaces, locations, writePackage, writeChangelog});
  commit();
  const run = (command, args, options) => {
    if (command === 'git') return execFileSync(command, args, options);
    assert.equal(command, 'yarn');
    assert.deepEqual(args, ['workspaces', 'list', '--json']);
    assert.equal(options.cwd, root);
    return locations.map(location => JSON.stringify({location})).join('\n');
  };
  const validate = (overrides = {}) => validatePreparedVersionPR({root, baseBranch: target, run, ...overrides});
  return {root, git, commit, base, validate, run, writePackage, writeChangelog};
}

test('prepared bootstrap accepts every current public package, including private-to-public lists, on matching stable lines', async t => {
  for (const minor of [81, 83, 84]) {
    const fixture = preparedFixture(t, {oldVersion: '1000.0.0', version: `0.${minor}.0`,
      target: `0.${minor}-stable`, privateLists: true});
    assert.equal(await fixture.validate(), true);
  }
});

test('prepared patch validates real merge-base evidence when the target advances independently', async t => {
  const fixture = preparedFixture(t);
  fixture.git(['switch', '-q', branch]);
  for (const index of [0, 1]) {
    fixture.writePackage(index, graph('0.83.9')[index]);
    fixture.writeChangelog(index, '# Changelog\n\n## 0.83.2\n\nUnrelated target history.\n');
  }
  fixture.commit();
  fixture.git(['switch', '-q', 'arbitrary-release-name']);
  assert.equal(fixture.git(['merge-base', branch, 'HEAD']).trim(), fixture.base);
  assert.equal(await fixture.validate(), true);
});

test('prepared transitions require an increase or the exact bootstrap version', async t => {
  for (const [oldVersion, version, target] of [
    ['0.83.2', '0.83.2', branch],
    ['0.83.3', '0.83.2', branch],
    ['0.83.2+build.1', '0.83.2+build.2', branch],
    ['1000.0.0', '0.83.1', branch],
    ['1000.0.0', '0.83.0-rc.1', branch],
    ['1000.0.0', '0.83.0+build.1', branch],
    ['1000.0.1', '0.83.0', branch],
    ['1000.0.0-rc.1', '0.83.0', branch],
    ['1000.0.0', '1.0.0', '1.0-stable'],
    ['1000.0.0', '0.84.0', branch],
  ]) {
    const fixture = preparedFixture(t, {oldVersion, version, target});
    await assert.rejects(fixture.validate(), /Version must increase|Invalid release version|does not match/);
  }
  const fixture = preparedFixture(t, {oldVersion: '0.83.2-rc.1', version: '0.83.2'});
  assert.equal(await fixture.validate(), true);
});

test('every changed public package needs its own new nonempty version section', async t => {
  for (const index of [0, 1]) {
    for (const text of [
      undefined,
      '# Changelog\n\n## 0.83.1\n\nOld release.\n',
      '# Changelog\n\n## 0.83.2\n\n### Patch Changes\n\n<!-- no release text -->\n\n## 0.83.1\n\nOld release.\n',
      '# Changelog\n\n## 0.83.2\n\nOne.\n\n## 0.83.2\n\nTwo.\n',
    ]) {
      const fixture = preparedFixture(t, {editHead: ({root, writeChangelog}) => {
        if (text === undefined) rmSync(join(root, `packages/p${index}/CHANGELOG.md`));
        else writeChangelog(index, text);
      }});
      await assert.rejects(fixture.validate(), /changelog section|CHANGELOG\.md/i);
    }
    const fixture = preparedFixture(t, {editBase: ({writeChangelog}) => {
      writeChangelog(index, '# Changelog\n\n## 0.83.2\n\nExisting release.\n');
    }});
    await assert.rejects(fixture.validate(), /new changelog section/);
  }
});

test('a new changelog file is valid, but an absent base manifest is not a version transition', async t => {
  const fixture = preparedFixture(t, {editBase: ({root}) => {
    for (const index of [0, 1]) rmSync(join(root, `packages/p${index}/CHANGELOG.md`));
  }});
  assert.equal(await fixture.validate(), true);
  const missing = preparedFixture(t, {editBase: ({root}) => {
    rmSync(join(root, 'packages/p1/package.json'));
  }});
  await assert.rejects(missing.validate(), /Missing merge-base version/);
});

test('private-to-public lists cannot reuse the old version or omit their release notes', async t => {
  for (const mode of ['same-version', 'missing-notes']) {
    const fixture = preparedFixture(t, {privateLists: true, editHead: ({writePackage, writeChangelog}) => {
      if (mode === 'same-version') writePackage(1, graph('0.83.1')[1]);
      else writeChangelog(1, '# Changelog\n');
    }});
    await assert.rejects(fixture.validate(), /does not match|new changelog section/);
  }
  const fixture = preparedFixture(t, {privateLists: true, editBase: ({writePackage}) => {
    writePackage(1, {...graph('0.83.2')[1], private: true});
  }});
  await assert.rejects(fixture.validate(), /Version must increase for @react-native-macos\/virtualized-lists/);
});

test('prepared PR rejects mismatched releases and invalid private or out-of-scope runtime links', async t => {
  for (const [edit, message] of [
    [pkg => {pkg.version = '0.83.3';},
      `${lists}@0.83.2 does not match 0.83.3`],
    [pkg => {pkg.private = true;},
      'Missing public react-native-macos workspace'],
    [pkg => {pkg.dependencies = {'@react-native/codegen': 'workspace:*'};},
      `${core} has a private or out-of-scope runtime workspace dependency: @react-native/codegen`],
    [pkg => {pkg.optionalDependencies = {'@react-native-macos/internal': '0.83.2'};},
      `${core} has a private runtime dependency: @react-native-macos/internal`],
    [pkg => {pkg.peerDependencies = {'react-native-macos-init': 'workspace:*'};},
      `${core} has a private or out-of-scope runtime workspace dependency: react-native-macos-init`],
  ]) {
    const fixture = preparedFixture(t, {editHead: ({workspaces, writePackage}) => {
      edit(workspaces[0]);
      writePackage(0, workspaces[0]);
    }});
    const status = await readChangesetStatus(fixture.root);
    assert.deepEqual(status.changesets, []);
    assert.deepEqual(status.releases, []);
    await assert.rejects(fixture.validate(), {name: 'Error', message});
  }
});

test('all changed public packages must belong to the release group, including source-only changes', async t => {
  for (const index of [4, 5]) {
    const fixture = preparedFixture(t, {editHead: ({root}) => {
      writeFileSync(join(root, `packages/p${index}/source.js`), 'export const changed = true;\n');
    }});
    await assert.rejects(fixture.validate(), /outside the release group/);
  }
  const fixture = preparedFixture(t, {editHead: ({root}) => {
    writeFileSync(join(root, 'packages/p3/source.js'), 'export const privateChange = true;\n');
  }});
  assert.equal(await fixture.validate(), true);
});

test('source-only public changes cannot use a prepared-looking head name as an exemption', async t => {
  const fixture = preparedFixture(t, {head: 'changeset-release/0.83-stable', editHead: ({root, writePackage, writeChangelog}) => {
    for (const index of [0, 1]) {
      writePackage(index, {...graph('0.83.1')[index], ...(index === 1 ? {private: false} : {})});
      writeChangelog(index, '# Changelog\n\n## 0.83.1\n\nOld release.\n');
    }
    writeFileSync(join(root, 'packages/p0/source.js'), 'export const changed = true;\n');
  }});
  await assert.rejects(fixture.validate(), /Version must increase/);
  assert.equal(await fixture.validate({branch: 'main'}), false);
});

test('pending API state always uses the normal check, including empty Changesets and release-only state', async t => {
  const fixture = preparedFixture(t);
  for (const status of [
    {changesets: [{id: 'pending', releases: [{name: core, type: 'patch'}]}], releases: []},
    {changesets: [{id: 'empty', releases: []}], releases: []},
    {changesets: [], releases: [{name: core, type: 'patch'}]},
  ]) {
    let normalChecks = 0;
    await runCheck(branch, {
      validatePrepared: () => fixture.validate({
        run: () => assert.fail('Inspected Git or packages with pending Changesets'),
        getStatus: root => readChangesetStatus(root, async (actualRoot, sinceRef, config) => {
          assert.equal(actualRoot, fixture.root);
          assert.equal(sinceRef, undefined);
          assert.deepEqual(config, {bumpVersionsWithWorkspaceProtocolOnly: true});
          return status;
        }),
      }),
      getStatus: async baseBranch => {
        assert.equal(baseBranch, branch);
        normalChecks++;
        return {data: {releases: [], changesets: []}, exitCode: 0};
      },
    });
    assert.equal(normalChecks, 1);
  }
  writeFileSync(join(fixture.root, '.changeset/empty.md'), '---\n{}\n---\n');
  assert.equal(await fixture.validate(), false);
});

test('prepared check shares validation with the CLI and propagates API and Git errors', async t => {
  const fixture = preparedFixture(t);
  const getStatus = () => assert.fail('Ran normal check after prepared success or error');
  await runCheck(branch, {validatePrepared: () => fixture.validate(), getStatus});
  for (const overrides of [
    {getStatus: () => {throw new Error('release API failed');}},
    {getStatus: () => ({})},
    {baseBranch: 'missing/0.83-stable'},
    {run: () => {throw new Error('command failed');}},
  ]) {
    await assert.rejects(runCheck(branch, {validatePrepared: () => fixture.validate(overrides), getStatus}),
      /release API failed|Invalid Changesets status|Not a valid object name|command failed/);
  }
  await assert.rejects(runCheck(branch, {validatePrepared: async () => false,
    getStatus: async () => {throw new Error('normal check failed');}}), /normal check failed/);
});

test('normal check still rejects missing Changesets and major bumps', async t => {
  t.mock.method(process, 'exit', code => {throw new Error(`Exit ${code}`);});
  for (const result of [
    {data: {releases: [], changesets: []}, exitCode: 1},
    {data: {releases: [{name: core, type: 'major', changesets: ['breaking']}], changesets: ['breaking']}, exitCode: 0},
  ]) {
    await assert.rejects(runCheck(branch, {validatePrepared: async () => false,
      getStatus: async () => result}), /Exit 1/);
  }
});

test('no changed public package uses the normal check', async t => {
  const fixture = preparedFixture(t, {editHead: ({writePackage, writeChangelog}) => {
    for (const index of [0, 1]) {
      writePackage(index, {...graph('0.83.1')[index], ...(index === 1 ? {private: false} : {})});
      writeChangelog(index, '# Changelog\n\n## 0.83.1\n\nOld release.\n');
    }
  }});
  assert.equal(await fixture.validate(), false);
});

test('a valid prepared bump cannot hide a deleted unrelated public workspace', async t => {
  for (const index of [4, 5]) {
    const fixture = preparedFixture(t, {editHead: ({root, locations}) => {
      rmSync(join(root, `packages/p${index}`), {recursive: true});
      locations.splice(index, 1);
    }});
    await assert.rejects(fixture.validate(), /Deleted or moved public workspace/);
  }
});

test('a valid prepared bump cannot hide a public workspace moved into another workspace or to a new location', async t => {
  for (const destination of ['packages/p0/fixtures/moved', 'packages/moved']) {
    const fixture = preparedFixture(t, {editHead: ({root, locations}) => {
      mkdirSync(join(root, 'packages/p0/fixtures'), {recursive: true});
      renameSync(join(root, 'packages/p4'), join(root, destination));
      if (destination === 'packages/moved') locations[4] = destination;
      else locations.splice(4, 1);
    }});
    await assert.rejects(fixture.validate(), /Deleted or moved public workspace: react-native-macos-init/);
  }
});

test('base workspace membership detects a public package excluded only at HEAD', async t => {
  const fixture = preparedFixture(t, {editHead: ({root, locations}) => {
    const path = join(root, 'package.json');
    const pkg = JSON.parse(readFileSync(path, 'utf8'));
    pkg.workspaces.push('!packages/p4');
    writeFileSync(path, JSON.stringify(pkg));
    locations.splice(4, 1);
  }});
  await assert.rejects(fixture.validate(), /Deleted or moved public workspace: react-native-macos-init/);
});

test('deleted private workspaces and non-workspace fixture manifests do not invalidate a prepared bump', async t => {
  const extras = ['fixtures/public', 'packages/p0/fixtures/public', 'packages/p0/node_modules/public',
    'packages/excluded', 'tools/node_modules/public'];
  for (const objectConfig of [false, true]) {
    const fixture = preparedFixture(t, {
      editBase: ({root}) => {
        const path = join(root, 'package.json');
        const pkg = JSON.parse(readFileSync(path, 'utf8'));
        const patterns = ['packages/*', 'tools/**', '!packages/excluded'];
        pkg.workspaces = objectConfig ? {packages: patterns} : patterns;
        writeFileSync(path, JSON.stringify(pkg));
        for (const location of extras) {
          mkdirSync(join(root, location), {recursive: true});
          // Invalid JSON proves the validator does not read unrelated manifests.
          writeFileSync(join(root, location, 'package.json'), 'not a workspace manifest');
        }
      },
      editHead: ({root, locations}) => {
        rmSync(join(root, 'packages/p3'), {recursive: true});
        locations.splice(3, 1);
        for (const location of extras) rmSync(join(root, location), {recursive: true});
      },
    });
    assert.equal(await fixture.validate(), true);
  }
});

test('base workspace manifest and tree command errors propagate', async t => {
  const fixture = preparedFixture(t);
  for (const fail of [
    args => args[0] === 'ls-tree',
    args => args[0] === 'show' && args[1] === `${fixture.base}:package.json`,
    args => args[0] === 'show' && args[1] === `${fixture.base}:packages/p4/package.json`,
  ]) {
    const error = new Error('Base workspace Git failure');
    await assert.rejects(fixture.validate({run: (command, args, options) => {
      if (command === 'git' && fail(args)) throw error;
      return fixture.run(command, args, options);
    }}), actual => actual === error);
  }
});
