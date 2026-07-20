#!/usr/bin/env node
import {execFile as execFileCallback} from 'node:child_process';
import {
  mkdir,
  readFile,
  readdir,
  rm,
} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {promisify} from 'node:util';

const execFile = promisify(execFileCallback);
const NPM_REGISTRY = 'https://registry.npmjs.org/';

interface CommandResult {
  stdout: string;
  stderr: string;
}

export type CommandRunner = (
  command: string,
  args: string[],
  options?: {cwd?: string},
) => Promise<CommandResult>;

export interface Workspace {
  location: string;
  name: string;
  version: string;
  scripts?: Record<string, string>;
}

export interface PackageMetadata {
  name: string;
  version: string;
}

interface CliOptions {
  checkNpm: boolean;
  clean: boolean;
  noPack: boolean;
  outputDirectory: string;
}

async function runCommand(
  command: string,
  args: string[],
  options?: {cwd?: string},
): Promise<CommandResult> {
  return execFile(command, args, {
    cwd: options?.cwd,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
}

function parseWorkspaceLines(output: string): Array<{
  location: string;
  name: string;
}> {
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => JSON.parse(line) as {location: string; name: string});
}

export async function discoverPublishableWorkspaces(
  rootDirectory: string,
  run: CommandRunner = runCommand,
): Promise<Workspace[]> {
  const {stdout} = await run(
    'yarn',
    ['workspaces', 'list', '--json'],
    {cwd: rootDirectory},
  );
  const workspaces: Workspace[] = [];

  for (const entry of parseWorkspaceLines(stdout)) {
    const manifestPath = join(rootDirectory, entry.location, 'package.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      name?: string;
      private?: boolean;
      scripts?: Record<string, string>;
      version?: string;
    };

    if (manifest.private) {
      continue;
    }
    if (!manifest.name || !manifest.version) {
      throw new Error(`Publishable workspace is missing name/version: ${manifestPath}`);
    }

    const workspace: Workspace = {
      location: entry.location,
      name: manifest.name,
      version: manifest.version,
    };
    if (manifest.scripts) {
      workspace.scripts = manifest.scripts;
    }
    workspaces.push(workspace);
  }

  return workspaces;
}

export async function extractPackageMetadata(
  tarballPath: string,
  run: CommandRunner = runCommand,
): Promise<PackageMetadata> {
  const {stdout} = await run('tar', [
    '-xOf',
    tarballPath,
    'package/package.json',
  ]);
  const manifest = JSON.parse(stdout) as {name?: string; version?: string};
  if (!manifest.name || !manifest.version) {
    throw new Error(`Tarball package.json is missing name/version: ${tarballPath}`);
  }
  return {name: manifest.name, version: manifest.version};
}

export function isNpmNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const commandError = error as Error & {stderr?: string; stdout?: string};
  const output = `${commandError.stderr ?? ''}\n${commandError.stdout ?? ''}`;
  return /\bE404\b|404 Not Found|is not in this registry/i.test(output);
}

export async function checkNpmVersion(
  name: string,
  version: string,
  run: CommandRunner = runCommand,
): Promise<'published' | 'not-found'> {
  try {
    await run('npm', [
      'view',
      `${name}@${version}`,
      'version',
      '--json',
      '--registry',
      NPM_REGISTRY,
    ]);
    return 'published';
  } catch (error) {
    if (isNpmNotFoundError(error)) {
      return 'not-found';
    }
    throw new Error(`Failed to query npm for ${name}@${version}`, {
      cause: error,
    });
  }
}

async function findTarballs(directory: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(directory, {withFileTypes: true});
  } catch (error) {
    if ((error as Error & {code?: string}).code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const tarballs: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      tarballs.push(...(await findTarballs(path)));
    } else if (entry.isFile() && entry.name.endsWith('.tgz')) {
      tarballs.push(path);
    }
  }
  return tarballs.sort();
}

export async function filterAlreadyPublishedTarballs(
  outputDirectory: string,
  npmCheck: (
    name: string,
    version: string,
  ) => Promise<'published' | 'not-found'> = checkNpmVersion,
  extractMetadata: (
    tarballPath: string,
  ) => Promise<PackageMetadata> = extractPackageMetadata,
): Promise<string[]> {
  const remaining: string[] = [];
  for (const tarballPath of await findTarballs(outputDirectory)) {
    const metadata = await extractMetadata(tarballPath);
    const status = await npmCheck(metadata.name, metadata.version);
    if (status === 'published') {
      console.log(`Removing already-published ${metadata.name}@${metadata.version}`);
      await rm(tarballPath);
    } else {
      console.log(`Keeping unpublished ${metadata.name}@${metadata.version}`);
      remaining.push(tarballPath);
    }
  }
  return remaining;
}

function tarballName(workspace: Workspace): string {
  const safeName = workspace.name.replace(/^@/, '').replaceAll('/', '-');
  return `${safeName}-${workspace.version}.tgz`;
}

export async function packPublishableWorkspaces(
  rootDirectory: string,
  outputDirectory: string,
  run: CommandRunner = runCommand,
  extractMetadata: (
    tarballPath: string,
  ) => Promise<PackageMetadata> = extractPackageMetadata,
): Promise<string[]> {
  await mkdir(outputDirectory, {recursive: true});
  const tarballs: string[] = [];

  for (const workspace of await discoverPublishableWorkspaces(rootDirectory, run)) {
    if (workspace.scripts?.prepublishOnly) {
      await run(
        'yarn',
        ['workspace', workspace.name, 'run', 'prepublishOnly'],
        {cwd: rootDirectory},
      );
    }

    const tarballPath = join(outputDirectory, tarballName(workspace));
    await run(
      'yarn',
      ['workspace', workspace.name, 'pack', '--out', tarballPath],
      {cwd: rootDirectory},
    );

    const metadata = await extractMetadata(tarballPath);
    if (
      metadata.name !== workspace.name ||
      metadata.version !== workspace.version
    ) {
      throw new Error(
        `Packed metadata mismatch for ${workspace.name}: ` +
          `${metadata.name}@${metadata.version}`,
      );
    }
    console.log(`Packed ${metadata.name}@${metadata.version}: ${tarballPath}`);
    tarballs.push(tarballPath);
  }

  return tarballs;
}

function parseCliOptions(args: string[]): CliOptions {
  const positional = args.filter(arg => !arg.startsWith('--'));
  if (positional.length !== 1) {
    throw new Error(
      'Usage: npm-pack.mts [--clean] [--no-pack] [--check-npm] <output-directory>',
    );
  }
  const knownOptions = new Set(['--check-npm', '--clean', '--no-pack']);
  const unknownOption = args.find(
    arg => arg.startsWith('--') && !knownOptions.has(arg),
  );
  if (unknownOption) {
    throw new Error(`Unknown option: ${unknownOption}`);
  }
  return {
    checkNpm: args.includes('--check-npm'),
    clean: args.includes('--clean'),
    noPack: args.includes('--no-pack'),
    outputDirectory: resolve(positional[0]),
  };
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  if (options.clean) {
    await rm(options.outputDirectory, {recursive: true, force: true});
  }
  await mkdir(options.outputDirectory, {recursive: true});

  if (!options.noPack) {
    await packPublishableWorkspaces(process.cwd(), options.outputDirectory);
  }
  if (options.checkNpm) {
    await filterAlreadyPublishedTarballs(options.outputDirectory);
  }
}

const isDirectRun =
  process.argv[1] != null && resolve(process.argv[1]) === resolve(import.meta.filename);

if (isDirectRun) {
  await main();
}
