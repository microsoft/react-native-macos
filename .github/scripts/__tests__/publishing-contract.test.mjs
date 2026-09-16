import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
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
  canAdvanceTag,
} from '../publishing-contract.mjs';
import {releaseAlignmentChangeset, versionWithPostbump, withReleaseConfig} from '../changeset-version-with-postbump.mts';
import {isCurrentHead} from '../check-version-head.mjs';

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

function releaseFixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'rnm-release-api-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  mkdirSync(join(root, '.changeset'));
  writeFileSync(join(root, 'package.json'), JSON.stringify({name: 'release-fixture', private: true, workspaces: ['packages/*']}));
  const config = JSON.parse(readFileSync(new URL('../../../.changeset/config.json', import.meta.url), 'utf8'));
  config.baseBranch = 'origin/nonexistent';
  config.changelog = require.resolve('@changesets/cli/changelog');
  writeFileSync(join(root, '.changeset/config.json'), JSON.stringify(config));
  const workspaces = graph();
  for (const [index, pkg] of workspaces.entries()) {
    mkdirSync(join(root, `packages/p${index}`), {recursive: true});
    writeFileSync(join(root, `packages/p${index}/package.json`), JSON.stringify(pkg));
  }
  return {root, workspaces};
}

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
