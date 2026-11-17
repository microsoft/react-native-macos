import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, it} from 'node:test';

import {
  checkPublishedTarballs,
  filterPublishedTarballs,
  getHasPackagesToPublishCommand,
  getPublishableWorkspaces,
  getRegistryStatus,
  packWorkspaces,
  safeTarballName,
  type CommandRunner,
} from '../npm-pack.mts';

const temporaryDirectory = () => mkdtemp(join(tmpdir(), 'rnm-npm-pack-'));

describe('npm-pack', () => {
  it('emits the Azure package availability variable', () => {
    assert.equal(
      getHasPackagesToPublishCommand(1),
      '##vso[task.setvariable variable=HasPackagesToPublish]true',
    );
    assert.equal(
      getHasPackagesToPublishCommand(0),
      '##vso[task.setvariable variable=HasPackagesToPublish]false',
    );
  });

  it('selects only public workspaces and creates safe names', async () => {
    const root = await temporaryDirectory();
    for (const [directory, manifest] of [
      ['private', {name: 'private-package', private: true, version: '1.0.0'}],
      ['public', {name: '@scope/public-package', version: '1.2.3'}],
    ] as const) {
      await mkdir(join(root, 'packages', directory), {recursive: true});
      await writeFile(join(root, 'packages', directory, 'package.json'), JSON.stringify(manifest));
    }
    const run: CommandRunner = async () => ({
      stderr: '',
      stdout:
        '{"location":"packages/private"}\n' +
        '{"location":"packages/public"}\n',
    });

    assert.deepEqual(await getPublishableWorkspaces(root, run), [
      {name: '@scope/public-package', version: '1.2.3'},
    ]);
    assert.equal(safeTarballName('@scope/public-package', '1.2.3'), 'scope-public-package-1.2.3.tgz');

    const calls: string[][] = [];
    const pack: CommandRunner = async (_command, args) => {
      calls.push(args);
      return args[0] === 'workspaces'
        ? run(_command, args)
        : {stderr: '', stdout: ''};
    };
    await packWorkspaces(root, join(root, 'output'), pack);
    assert.deepEqual(calls.at(-1), [
      'workspace',
      '@scope/public-package',
      'pack',
      '--out',
      join(root, 'output', 'scope-public-package-1.2.3.tgz'),
    ]);
  });

  it('removes only exact versions already published', async () => {
    const output = await temporaryDirectory();
    const published = join(output, 'published.tgz');
    const unpublished = join(output, 'unpublished.tgz');
    await writeFile(published, 'published');
    await writeFile(unpublished, 'unpublished');
    const run: CommandRunner = async (command, args) => {
      const file = args[1];
      if (command === 'tar') {
        return {
          stderr: '',
          stdout: JSON.stringify({
            name: file === published ? 'published' : 'unpublished',
            version: '1.0.0',
          }),
        };
      }
      if (args[1] === 'published@1.0.0') return {stderr: '', stdout: '"1.0.0"\n'};
      const error = new Error('not found') as Error & {stderr: string};
      error.stderr = 'npm error code E404';
      throw error;
    };

    assert.deepEqual(await filterPublishedTarballs(output, run), [unpublished]);
    await assert.rejects(readFile(published), {code: 'ENOENT'});
    assert.equal(await readFile(unpublished, 'utf8'), 'unpublished');
  });

  it('reports whether filtered tarballs remain', async () => {
    const output = await temporaryDirectory();
    const unpublished = join(output, 'unpublished.tgz');
    await writeFile(unpublished, 'unpublished');
    const run: CommandRunner = async (command, args) => {
      if (command === 'tar') {
        return {
          stderr: '',
          stdout: JSON.stringify({name: 'unpublished', version: '1.0.0'}),
        };
      }
      const error = new Error('not found') as Error & {stderr: string};
      error.stderr = 'npm error code E404';
      throw error;
    };
    const messages: string[] = [];

    assert.deepEqual(
      await checkPublishedTarballs(output, run, message => messages.push(message)),
      [unpublished],
    );
    assert.deepEqual(messages, [
      'Found 1 unpublished package(s)',
      '##vso[task.setvariable variable=HasPackagesToPublish]true',
    ]);

    await rm(unpublished);
    messages.length = 0;
    assert.deepEqual(
      await checkPublishedTarballs(output, run, message => messages.push(message)),
      [],
    );
    assert.deepEqual(messages, [
      'Found 0 unpublished package(s)',
      '##vso[task.setvariable variable=HasPackagesToPublish]false',
    ]);
  });

  it('fails on registry errors and malformed responses', async () => {
    const serverError: CommandRunner = async () => {
      const error = new Error('server error') as Error & {stderr: string};
      error.stderr = 'npm error code E500';
      throw error;
    };
    await assert.rejects(getRegistryStatus('package', '1.0.0', serverError), /Failed to query npm/);

    const malformed: CommandRunner = async () => ({stderr: '', stdout: 'not-json'});
    await assert.rejects(getRegistryStatus('package', '1.0.0', malformed), SyntaxError);

    const wrongVersion: CommandRunner = async () => ({stderr: '', stdout: '"2.0.0"'});
    await assert.rejects(
      getRegistryStatus('package', '1.0.0', wrongVersion),
      /unexpected version/,
    );
  });
});
