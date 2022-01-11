/*
 * A script to update Android patches from an already clean commit.
 * Ideally, this should live in android-patches/, but I haven't figured out
 * how to get things building there, so it'll live in scripts/ for now.
 * 
 * Note: when transpiling with `tsc`, you might see an error in commander
 * along the lines of "Cannot extend an interface 'NodeJS.EventEmitter'", but
 * as long as update-android-patches.js gets generated, you should be fine.
 */

import * as chalk from 'chalk';
import * as child_process from 'child_process';
import * as commander from 'commander';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * The maximum buffer size for outputs. In general, if you're dealing with a
 * really big file that needs to be patched, increase this number.
 */ 
const maxBuffer = 10 * 1024 * 1024;

/**
 * The amount of "fuzz" to allow for when attempting to apply our current
 * patch files. This gets passed as the `-F` argument into `patch`.
 * See the manual page for `patch` for more information.
 */
const patchFuzzFactor = 3;

/**
 * If true, our `execSync` and `spawnSync` helper functions will also print
 * the commands being executed to stdout.
 */
const printCommands = false;

const patchAbsoluteFolder = path.resolve(__dirname, '..', 'android-patches', 'patches');


// We're basically lifting these functions from fs_utils.ts
function isDirectory(filePath: string): boolean {
  return fs.lstatSync(filePath).isDirectory();
}

function isRegularFile(filePath: string): boolean {
  return fs.lstatSync(filePath).isFile();
}

function traverseDirectory(
  rootAbsolutePath: string,
  rootRelativePath: string,
  callbackFile: (absolute: string, relative: string) => void
): void {
  const children = fs.readdirSync(rootAbsolutePath);
  children.forEach(child => {
    const childAbsolutePath = path.resolve(rootAbsolutePath, child);
    const childRelativePath = rootRelativePath + path.sep + child;
    if (isRegularFile(childAbsolutePath)) {
      callbackFile(childAbsolutePath, childRelativePath);
    } else if (isDirectory(childAbsolutePath)) {
      traverseDirectory(childAbsolutePath, childRelativePath, callbackFile);
    }
  });
}

// End of borrowing from fs_utils.ts



/**
 * Run a shell command where we only really care about stdout.
 * @param command the command to run
 * @returns a Buffer containing stdout, the result of 
 */
function execSync(command: string): Buffer {
  if (printCommands) {
    console.log(chalk.gray(`$ ${command}`));
  }
  return child_process.execSync(command, {maxBuffer});
}

/**
 * Run a shell command where we're interested in the different outputs.
 * @param command the command to run
 * @param args an array of arguments
 * @returns the result of `child_process.spawnSync`
 */
function spawnSync(command: string, args: string[] = [], outputFile?: string): child_process.SpawnSyncReturns<Buffer> {
  if (printCommands) {
    console.log(chalk.gray(`$ ${command} ${args.join(' ')}`));
  }

  const result = child_process.spawnSync(command, args, {encoding: 'buffer', maxBuffer});
  if (outputFile !== undefined) {
    const stream = fs.createWriteStream(outputFile);
    stream.write(result.stdout);
    stream.close();
  }
  return result;
}

function makeMerges(cleanCommitPoint: string, patchNames: string[]) {
  // Verify the commit point
  const result = spawnSync('git', ['cat-file', '-t', cleanCommitPoint]);
  if (result.stdout.toString().trim() !== 'commit') {
    console.error(`Error: ${cleanCommitPoint} is not a commit`);
    process.exit(2);
  }

  const tempDir = fs.mkdtempSync(path.resolve(os.tmpdir(), 'update-'));

  const prePatchDir = path.resolve(tempDir, 'old-prepatch');
  const postPatchDir = path.resolve(tempDir, 'old-postpatch');
  const mergeResultDir = path.resolve(tempDir, 'merge');
  // Ensure these directories exist
  [prePatchDir, postPatchDir, mergeResultDir].forEach(dir => fs.mkdirSync(dir));

  console.log(chalk.cyan(`Merge results can be found in ${tempDir}`));

  const filesWithConflicts: string[] = []

  patchNames.forEach(patchName => {
    const patchFolder = path.resolve(patchAbsoluteFolder, patchName);
    traverseDirectory(patchFolder, '.', (absolutePath, relativePath) => {
      // Extract the version of the file at the clean commit point
      const prePatchFile = path.resolve(prePatchDir, patchName, relativePath);
      execSync(`mkdir -p \`dirname ${prePatchFile}\``);
      
      const gitObject = `${cleanCommitPoint}:${relativePath}`;
      const fileExists = spawnSync('git', ['cat-file', '-e', gitObject]).status === 0;
      if (fileExists) {
        execSync(`git cat-file -p ${gitObject} > ${prePatchFile}`);
      } else {
        execSync(`touch ${prePatchFile}`);
      }

      // Apply the patch
      const postPatchFile = path.resolve(postPatchDir, patchName, relativePath);
      execSync(`mkdir -p \`dirname ${postPatchFile}\``);
      // Note: absolutePath is the patch file itself
      execSync(`patch -u -F ${patchFuzzFactor} ${prePatchFile} ${absolutePath} -o ${postPatchFile}`);

      // Now, perform a three-way merge
      const mergeResultFile = path.resolve(mergeResultDir, patchName, relativePath);
      execSync(`mkdir -p \`dirname ${mergeResultFile}\``);
      // Note: relativePath will take us to HEAD's version of the file
      // If it doesn't exist, treat it as empty
      const relativePathOrDevNull = fs.existsSync(relativePath) ? relativePath : '/dev/null';
      const diff3Result = spawnSync('diff3', ['-m', postPatchFile, prePatchFile, relativePathOrDevNull], mergeResultFile);

      if (diff3Result.status === 1) {
        filesWithConflicts.push(relativePath);
      }
    });
  });

  if (filesWithConflicts.length > 0) {
    console.log(chalk.yellow('Conflicts found in these files:'));
    filesWithConflicts.forEach(file => console.log(`  ${file}`));
    console.log(chalk.yellow('Open the folder above, resolve conflicts as needed, and then run updatePatches.'));
  } else {
    console.log(chalk.green('No conflicts found!'))
  }
}

function updatePatches(updateFolder: string, patchNames: string[]) {
  const mergeRootFolder = path.resolve(updateFolder, 'merge');

  patchNames.forEach(patchName => {
    const mergePatchFolder = path.resolve(mergeRootFolder, patchName);
    const patchDestinationFolder = path.resolve(patchAbsoluteFolder, patchName);
    traverseDirectory(mergePatchFolder, '.', (mergedFile, relativePath) => {
      const relativePathOrDevNull = fs.existsSync(relativePath) ? relativePath : '/dev/null';
      const patchDestination = path.resolve(patchDestinationFolder, relativePath);
      // The [ $? -eq 1 ] part at the end prevents an error from being thrown
      // if `diff` returns exit code 1 (i.e., the files are different and we generated a diff successfully)
      execSync(`diff -u ${relativePathOrDevNull} ${mergedFile} > ${patchDestination} || [ $? -eq 1 ]`);
    });
  });
}

commander.version('0.0.1');

commander
  .command('makeMerges <cleanCommitPoint> [patchNames...]')
  .action(makeMerges);
commander
  .command('updatePatches <updateFolder> [patchNames...]')
  .action(updatePatches);

commander.parse(process.argv);
