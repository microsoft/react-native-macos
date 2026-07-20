import assert from 'node:assert/strict';
import {execFile as execFileCallback} from 'node:child_process';
import {mkdtemp, mkdir, readFile, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, it} from 'node:test';
import {promisify} from 'node:util';

import {
  checkNpmVersion,
  discoverPublishableWorkspaces,
  extractPackageMetadata,
  filterAlreadyPublishedTarballs,
  packPublishableWorkspaces,
  type CommandRunner,
} from '../npm-pack.mts';

const execFile = promisify(execFileCallback);

async function temporaryDirectory(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'rnm-npm-pack-'));
}

describe('npm-pack', () => {
  it('excludes private workspaces from discovery', async () => {
    const root = await temporaryDirectory();
    await mkdir(join(root, 'packages/private'), {recursive: true});
    await mkdir(join(root, 'packages/public'), {recursive: true});
    await writeFile(
      join(root, 'packages/private/package.json'),
      JSON.stringify({name: 'private-package', private: true, version: '1.0.0'}),
    );
    await writeFile(
      join(root, 'packages/public/package.json'),
      JSON.stringify({name: 'public-package', version: '1.0.0'}),
    );
    const run: CommandRunner = async () => ({
      stderr: '',
      stdout:
        '{"location":"packages/private","name":"private-package"}\n' +
        '{"location":"packages/public","name":"public-package"}\n',
    });

    assert.deepEqual(await discoverPublishableWorkspaces(root, run), [
      {
        location: 'packages/public',
        name: 'public-package',
        version: '1.0.0',
      },
    ]);
  });

  it('packs a publishable workspace through Yarn', async () => {
    const root = await temporaryDirectory();
    const output = join(root, 'output');
    await mkdir(join(root, 'packages/public'), {recursive: true});
    await writeFile(
      join(root, 'packages/public/package.json'),
      JSON.stringify({
        name: '@scope/public-package',
        scripts: {prepublishOnly: 'node build.js'},
        version: '1.2.3',
      }),
    );
    const calls: Array<{args: string[]; command: string}> = [];
    const run: CommandRunner = async (command, args) => {
      calls.push({args, command});
      if (args[0] === 'workspaces') {
        return {
          stderr: '',
          stdout:
            '{"location":"packages/public","name":"@scope/public-package"}\n',
        };
      }
      if (args.includes('pack')) {
        await mkdir(output, {recursive: true});
        await writeFile(args.at(-1)!, 'packed');
      }
      return {stderr: '', stdout: ''};
    };

    const tarballs = await packPublishableWorkspaces(
      root,
      output,
      run,
      async () => ({name: '@scope/public-package', version: '1.2.3'}),
    );

    assert.equal(tarballs.length, 1);
    assert.equal(
      await readFile(join(output, 'scope-public-package-1.2.3.tgz'), 'utf8'),
      'packed',
    );
    assert.deepEqual(calls.slice(1), [
      {
        command: 'yarn',
        args: [
          'workspace',
          '@scope/public-package',
          'run',
          'prepublishOnly',
        ],
      },
      {
        command: 'yarn',
        args: [
          'workspace',
          '@scope/public-package',
          'pack',
          '--out',
          join(output, 'scope-public-package-1.2.3.tgz'),
        ],
      },
    ]);
  });

  it('extracts exact package name and version from a tgz', async () => {
    const root = await temporaryDirectory();
    const packageDirectory = join(root, 'package');
    const tarball = join(root, 'fixture.tgz');
    await mkdir(packageDirectory);
    await writeFile(
      join(packageDirectory, 'package.json'),
      JSON.stringify({name: '@scope/fixture', version: '4.5.6'}),
    );
    await execFile('tar', ['-czf', tarball, '-C', root, 'package']);

    assert.deepEqual(await extractPackageMetadata(tarball), {
      name: '@scope/fixture',
      version: '4.5.6',
    });
  });

  it('removes published versions and retains 404 versions', async () => {
    const output = await temporaryDirectory();
    const published = join(output, 'published.tgz');
    const unpublished = join(output, 'unpublished.tgz');
    await writeFile(published, 'published');
    await writeFile(unpublished, 'unpublished');

    const remaining = await filterAlreadyPublishedTarballs(
      output,
      async name => (name === 'published' ? 'published' : 'not-found'),
      async path => ({
        name: path === published ? 'published' : 'unpublished',
        version: '1.0.0',
      }),
    );

    assert.deepEqual(remaining, [unpublished]);
    await assert.rejects(readFile(published), {code: 'ENOENT'});
    assert.equal(await readFile(unpublished, 'utf8'), 'unpublished');
  });

  it('throws on unexpected npm registry failures', async () => {
    const run: CommandRunner = async () => {
      const error = new Error('network failed') as Error & {stderr: string};
      error.stderr = 'npm error code ECONNRESET';
      throw error;
    };
    await assert.rejects(
      checkNpmVersion('package', '1.0.0', run),
      /Failed to query npm for package@1.0.0/,
    );
  });

  it('treats npm 404 as not found', async () => {
    const run: CommandRunner = async () => {
      const error = new Error('not found') as Error & {stderr: string};
      error.stderr = 'npm error code E404';
      throw error;
    };
    assert.equal(await checkNpmVersion('package', '1.0.0', run), 'not-found');
  });

  it('succeeds when the tarball directory is empty', async () => {
    const output = await temporaryDirectory();
    assert.deepEqual(await filterAlreadyPublishedTarballs(output), []);
  });
});
