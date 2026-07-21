#!/usr/bin/env node
import {execFile as execFileCallback} from 'node:child_process';
import {mkdir, readFile, readdir, rm} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {parseArgs, promisify} from 'node:util';

const execFile = promisify(execFileCallback);
const registry = 'https://registry.npmjs.org/';

export type CommandRunner = (
  command: string,
  args: string[],
  options?: {cwd?: string},
) => Promise<{stdout: string; stderr: string}>;

const runCommand: CommandRunner = (command, args, options) =>
  execFile(command, args, {cwd: options?.cwd, encoding: 'utf8'});

export function safeTarballName(name: string, version: string): string {
  return `${name.replace(/^@/, '').replaceAll('/', '-')}-${version}.tgz`;
}

export async function getPublishableWorkspaces(
  root: string,
  run: CommandRunner = runCommand,
): Promise<Array<{name: string; version: string}>> {
  const {stdout} = await run('yarn', ['workspaces', 'list', '--json'], {cwd: root});
  const workspaces = [];
  for (const line of stdout.split(/\r?\n/).filter(Boolean)) {
    const {location} = JSON.parse(line) as {location: string};
    const manifest = JSON.parse(await readFile(join(root, location, 'package.json'), 'utf8')) as {
      name?: string;
      private?: boolean;
      version?: string;
    };
    if (manifest.private) continue;
    if (!manifest.name || !manifest.version) {
      throw new Error(`Publishable workspace is missing name or version: ${location}`);
    }
    workspaces.push({name: manifest.name, version: manifest.version});
  }
  return workspaces;
}

export async function packWorkspaces(
  root: string,
  output: string,
  run: CommandRunner = runCommand,
): Promise<void> {
  await mkdir(output, {recursive: true});
  for (const workspace of await getPublishableWorkspaces(root, run)) {
    const tarball = join(output, safeTarballName(workspace.name, workspace.version));
    await run('yarn', ['workspace', workspace.name, 'pack', '--out', tarball], {cwd: root});
    console.log(`Packed ${workspace.name}@${workspace.version}: ${tarball}`);
  }
}

export async function getRegistryStatus(
  name: string,
  version: string,
  run: CommandRunner = runCommand,
): Promise<'published' | 'unpublished'> {
  let stdout: string;
  try {
    ({stdout} = await run('npm', [
      'view',
      `${name}@${version}`,
      'version',
      '--json',
      '--registry',
      registry,
    ]));
  } catch (error) {
    const output = `${(error as {stdout?: string}).stdout ?? ''}\n${
      (error as {stderr?: string}).stderr ?? ''
    }`;
    if (/\bE404\b|404 Not Found|is not in this registry/i.test(output)) return 'unpublished';
    throw new Error(`Failed to query npm for ${name}@${version}`, {cause: error});
  }
  if (JSON.parse(stdout) !== version) {
    throw new Error(`npm returned an unexpected version for ${name}@${version}`);
  }
  return 'published';
}

export async function filterPublishedTarballs(
  output: string,
  run: CommandRunner = runCommand,
): Promise<string[]> {
  const remaining = [];
  for (const file of (await readdir(output)).filter(name => name.endsWith('.tgz')).sort()) {
    const tarball = join(output, file);
    const {stdout} = await run('tar', ['-xOf', tarball, 'package/package.json']);
    const {name, version} = JSON.parse(stdout) as {name?: string; version?: string};
    if (!name || !version) throw new Error(`Invalid package metadata in ${tarball}`);
    if ((await getRegistryStatus(name, version, run)) === 'published') {
      await rm(tarball);
      console.log(`Removed already-published ${name}@${version}`);
    } else {
      remaining.push(tarball);
      console.log(`Keeping unpublished ${name}@${version}`);
    }
  }
  return remaining;
}

export function getHasPackagesToPublishCommand(packageCount: number): string {
  return `##vso[task.setvariable variable=HasPackagesToPublish]${packageCount > 0}`;
}

export async function checkPublishedTarballs(
  output: string,
  run: CommandRunner = runCommand,
  log: (message: string) => void = console.log,
): Promise<string[]> {
  const remaining = await filterPublishedTarballs(output, run);
  log(`Found ${remaining.length} unpublished package(s)`);
  log(getHasPackagesToPublishCommand(remaining.length));
  return remaining;
}

const isDirectRun = process.argv[1] != null && resolve(process.argv[1]) === resolve(import.meta.filename);
if (isDirectRun) {
  const {values, positionals} = parseArgs({
    options: {
      'check-npm': {type: 'boolean', default: false},
      clean: {type: 'boolean', default: false},
      'no-pack': {type: 'boolean', default: false},
    },
    allowPositionals: true,
    strict: true,
  });
  if (positionals.length !== 1) throw new Error('Expected one output directory');
  const output = resolve(positionals[0]);
  if (values.clean) await rm(output, {recursive: true, force: true});
  await mkdir(output, {recursive: true});
  if (!values['no-pack']) await packWorkspaces(process.cwd(), output);
  if (values['check-npm']) {
    await checkPublishedTarballs(output);
  }
}
