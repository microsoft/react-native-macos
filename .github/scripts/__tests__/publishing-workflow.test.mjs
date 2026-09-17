import assert from 'node:assert/strict';
import {execFileSync, fork} from 'node:child_process';
import {once} from 'node:events';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {test} from 'node:test';

const require = createRequire(import.meta.url);
const {load} = createRequire(require.resolve('eslint'))('js-yaml');
// An optional root lets the shared test check an equivalent release worktree.
const repositoryRoot = resolve(process.env.PUBLISH_WORKFLOW_ROOT ?? new URL('../../../', import.meta.url).pathname);
const yarnPath = join(repositoryRoot, '.yarn/releases/yarn-4.12.0.cjs');
const core = 'react-native-macos';
const lists = '@react-native-macos/virtualized-lists';
const workflow = name => load(readFileSync(join(repositoryRoot, `.github/workflows/${name}.yml`), 'utf8'));
const publishSteps = workflow('microsoft-npm-publish').jobs.publish.steps;
const dryRunSteps = workflow('microsoft-pr').jobs['npm-publish-dry-run'].steps;

async function fixture(t, {eligible = '1', fail = '', privateLists = false} = {}) {
  const root = mkdtempSync(join(tmpdir(), 'rnm-publish-workflow-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const write = (path, contents) => {
    mkdirSync(dirname(join(root, path)), {recursive: true});
    writeFileSync(join(root, path), contents);
  };
  const json = (path, value) => write(path, JSON.stringify(value));
  json('package.json', {name: 'fixture', private: true, workspaces: ['packages/*'], scripts: {
    build: 'node fixture.cjs tooling', 'build-types': 'node fixture.cjs types',
  }});
  for (const [directory, name, isPrivate] of [
    ['core', core, false], ['lists', lists, privateLists],
    ['codegen', '@react-native/codegen', true],
    ['init', 'react-native-macos-init', false], ['upstream', '@react-native/unrelated', false],
    ['internal', '@react-native-macos/internal', true],
  ]) {
    json(`packages/${directory}/package.json`, {name, version: '1.0.0', private: isPrivate,
      files: ['types_generated'],
      ...(name === core ? {dependencies: {[lists]: 'workspace:*'}} : {}),
      scripts: name === '@react-native/codegen' ? {build: 'node ../../fixture.cjs codegen'}
        : {prepack: `node ../../fixture.cjs pack ${directory}`},
    });
  }
  write('snapshot', 'checked-in API\n');
  write('yarn.lock', '');
  // --tolerate-republish queries metadata even during a dry run. A local
  // registry returns 404 and rejects any attempted upload.
  write('registry.cjs', `
    require('node:http').createServer((req, res) => {
      if (req.method !== 'GET') {
        require('node:fs').writeFileSync(__dirname + '/upload-attempt', req.method);
      }
      res.writeHead(req.method === 'GET' ? 404 : 500);
      res.end('{}');
    }).listen(0, '127.0.0.1', function () { process.send(this.address().port); });
  `);
  const registry = fork(join(root, 'registry.cjs'), [], {stdio: ['ignore', 'ignore', 'inherit', 'ipc']});
  t.after(() => registry.kill());
  const [port] = await once(registry, 'message');
  write('.fixture-yarnrc.yml', `npmRegistryServer: "http://127.0.0.1:${port}"\nunsafeHttpWhitelist:\n  - 127.0.0.1\n`);
  // Synthetic build outputs isolate workflow sequencing from the full compiler.
  // Real Yarn runs the workspace selector, prepack hooks, and package dry run.
  write('fixture.cjs', `
    const assert = require('node:assert/strict');
    const fs = require('node:fs');
    const path = require('node:path');
    const root = __dirname;
    const [command, arg] = process.argv.slice(2);
    const has = file => fs.existsSync(path.join(root, file));
    const record = value => fs.appendFileSync(path.join(root, 'events'), value + '\\n');
    assert.notEqual(command, process.env.FAIL, 'Injected build failure');
    if (command === 'tooling' || command === 'codegen') {
      fs.writeFileSync(path.join(root, command), 'built');
      record(command);
    } else if (command === 'types') {
      assert.ok(has('tooling') && has('codegen'), 'Types ran before local builds');
      assert.equal(arg, '--validate', 'Snapshot must be validated');
      assert.equal(fs.readFileSync(path.join(root, 'snapshot'), 'utf8'), 'checked-in API\\n');
      for (const pkg of ['core', 'lists']) {
        const output = path.join(root, 'packages', pkg, 'types_generated');
        fs.mkdirSync(output);
        fs.writeFileSync(path.join(output, 'index.d.ts'), 'export {};');
      }
      record('types');
    } else if (command === 'pack') {
      assert.ok(['core', 'lists'].includes(arg), 'Packed an unrelated package');
      assert.ok(has('tooling') && has('codegen'), 'Packed without local builds');
      assert.ok(has('packages/' + arg + '/types_generated/index.d.ts'), 'Packed without generated types');
      record('pack ' + arg);
    } else {
      assert.fail('Unexpected fixture command: ' + command);
    }
  `);
  // The contract suite covers eligibility semantics. Here its output exercises
  // the actual workflow conditions, including skipped and failed preparation.
  write('.ado/scripts/configure-publish.mts', `
    import assert from 'node:assert/strict';
    import {appendFileSync, existsSync} from 'node:fs';
    const publish = process.argv.includes('--publish');
    appendFileSync('events', publish ? 'publish\\n' : 'preview\\n');
    if (publish) {
      assert.equal(process.env.ELIGIBLE, '1');
      for (const pkg of ['core', 'lists']) {
        assert.ok(existsSync('packages/' + pkg + '/types_generated/index.d.ts'));
      }
    } else {
      appendFileSync(process.env.GITHUB_OUTPUT, 'publish_react_native_macos=' + process.env.ELIGIBLE + '\\n');
    }
  `);
  const env = {...process.env, ELIGIBLE: eligible, FAIL: fail,
    GITHUB_OUTPUT: join(root, 'outputs'), YARN_IGNORE_PATH: '1',
    YARN_RC_FILENAME: '.fixture-yarnrc.yml', YARN_ENABLE_NETWORK: '1', YARN_ENABLE_IMMUTABLE_INSTALLS: '0',
    YARN_ENABLE_HARDENED_MODE: '0', YARN_NPM_AUTH_TOKEN: 'fixture-only',
    YARN_NPM_REGISTRY_SERVER: `http://127.0.0.1:${port}`,
    YARN_NPM_PUBLISH_REGISTRY: `http://127.0.0.1:${port}`,
  };
  const run = command => execFileSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c',
    `yarn() { ${JSON.stringify(process.execPath)} ${JSON.stringify(yarnPath)} "$@"; }\n${command}`],
  {cwd: root, env, encoding: 'utf8', stdio: 'pipe'});
  run('yarn install');
  const events = () => existsSync(join(root, 'events')) ? readFileSync(join(root, 'events'), 'utf8').trim().split('\n') : [];
  const execute = steps => {
    for (const step of steps) {
      if (step.if) {
        assert.equal(step.if, "steps.configure-publish.outputs.publish_react_native_macos == '1'");
        assert.ok(existsSync(env.GITHUB_OUTPUT), 'Preparation ran before eligibility');
        if (!readFileSync(env.GITHUB_OUTPUT, 'utf8').includes('publish_react_native_macos=1\n')) continue;
      }
      const output = run(step.run);
      if (step.run.includes('npm publish')) {
        assert.match(step.run, /--dry-run\b/);
        for (const name of privateLists ? [core] : [lists, core]) {
          assert.ok(output.includes(`[${name}]: ➤ YN0000: types_generated/index.d.ts`),
            `Dry-run package omitted generated types: ${name}`);
        }
      }
    }
    assert.equal(existsSync(join(root, 'upload-attempt')), false, 'Dry run attempted an upload');
  };
  assert.equal(existsSync(join(root, 'packages/core/types_generated')), false);
  return {root, events, execute};
}

const releasePreparation = publishSteps.slice(publishSteps.findIndex(step => step.id === 'configure-publish'));
const dryRunPreparation = dryRunSteps.slice(dryRunSteps.findIndex(step => step.run === 'yarn build'));

test('publish workflow previews eligibility, builds local tools and validated types, then publishes', async t => {
  const f = await fixture(t);
  f.execute(releasePreparation);
  assert.deepEqual(f.events(), ['preview', 'tooling', 'codegen', 'types', 'publish']);
  assert.equal(readFileSync(join(f.root, 'snapshot'), 'utf8'), 'checked-in API\n');
});

test('ineligible publication skips every build and the publish command', async t => {
  const f = await fixture(t, {eligible: '0'});
  f.execute(releasePreparation);
  assert.deepEqual(f.events(), ['preview']);
});

test('build and snapshot validation failures stop release and dry-run publication', async t => {
  for (const steps of [releasePreparation, dryRunPreparation]) {
    for (const fail of ['tooling', 'codegen', 'types']) {
      const f = await fixture(t, {fail});
      assert.throws(() => f.execute(steps), /Injected build failure/);
      assert.ok(f.events().every(event => event !== 'publish' && !event.startsWith('pack ')));
    }
  }
});

test('PR dry run packs only public coupled workspaces with generated types from a clean fixture', async t => {
  for (const privateLists of [false, true]) {
    const f = await fixture(t, {privateLists});
    f.execute(dryRunPreparation);
    assert.deepEqual(f.events(), ['tooling', 'codegen', 'types',
      ...(privateLists ? [] : ['pack lists']), 'pack core']);
    assert.equal(readFileSync(join(f.root, 'snapshot'), 'utf8'), 'checked-in API\n');
  }
});
