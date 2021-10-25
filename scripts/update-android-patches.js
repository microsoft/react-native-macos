"use strict";
/*
 * A script to update Android patches from an already clean commit.
 * Ideally, this should live in android-patches/, but I haven't figured out
 * how to get things building there, so it'll live in scripts/ for now.
 *
 * Note: when transpiling with `tsc`, you might see an error in commander
 * along the lines of "Cannot extend an interface 'NodeJS.EventEmitter'", but
 * as long as update-android-patches.js gets generated, you should be fine.
 */
exports.__esModule = true;
var chalk = require("chalk");
var child_process = require("child_process");
var commander = require("commander");
var fs = require("fs");
var os = require("os");
var path = require("path");
/**
 * The maximum buffer size for outputs. In general, if you're dealing with a
 * really big file that needs to be patched, increase this number.
 */
var maxBuffer = 10 * 1024 * 1024;
/**
 * The amount of "fuzz" to allow for when attempting to apply our current
 * patch files. This gets passed as the `-F` argument into `patch`.
 * See the manual page for `patch` for more information.
 */
var patchFuzzFactor = 3;
/**
 * If true, our `execSync` and `spawnSync` helper functions will also print
 * the commands being executed to stdout.
 */
var printCommands = false;
var patchAbsoluteFolder = path.resolve(__dirname, '..', 'android-patches', 'patches');
// We're basically lifting these functions from fs_utils.ts
function isDirectory(filePath) {
    return fs.lstatSync(filePath).isDirectory();
}
function isRegularFile(filePath) {
    return fs.lstatSync(filePath).isFile();
}
function traverseDirectory(rootAbsolutePath, rootRelativePath, callbackFile) {
    var children = fs.readdirSync(rootAbsolutePath);
    children.forEach(function (child) {
        var childAbsolutePath = path.resolve(rootAbsolutePath, child);
        var childRelativePath = rootRelativePath + path.sep + child;
        if (isRegularFile(childAbsolutePath)) {
            callbackFile(childAbsolutePath, childRelativePath);
        }
        else if (isDirectory(childAbsolutePath)) {
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
function execSync(command) {
    if (printCommands) {
        console.log(chalk.gray("$ " + command));
    }
    return child_process.execSync(command, { maxBuffer: maxBuffer });
}
/**
 * Run a shell command where we're interested in the different outputs.
 * @param command the command to run
 * @param args an array of arguments
 * @returns the result of `child_process.spawnSync`
 */
function spawnSync(command, args, outputFile) {
    if (args === void 0) { args = []; }
    if (printCommands) {
        console.log(chalk.gray("$ " + command + " " + args.join(' ')));
    }
    var result = child_process.spawnSync(command, args, { encoding: 'buffer', maxBuffer: maxBuffer });
    if (outputFile !== undefined) {
        var stream = fs.createWriteStream(outputFile);
        stream.write(result.stdout);
        stream.close();
    }
    return result;
}
function makeMerges(cleanCommitPoint, patchNames) {
    // Verify the commit point
    var result = spawnSync('git', ['cat-file', '-t', cleanCommitPoint]);
    if (result.stdout.toString().trim() !== 'commit') {
        console.error("Error: " + cleanCommitPoint + " is not a commit");
        process.exit(2);
    }
    var tempDir = fs.mkdtempSync(path.resolve(os.tmpdir(), 'update-'));
    var prePatchDir = path.resolve(tempDir, 'old-prepatch');
    var postPatchDir = path.resolve(tempDir, 'old-postpatch');
    var mergeResultDir = path.resolve(tempDir, 'merge');
    // Ensure these directories exist
    [prePatchDir, postPatchDir, mergeResultDir].forEach(function (dir) { return fs.mkdirSync(dir); });
    console.log(chalk.cyan("Merge results can be found in " + tempDir));
    var filesWithConflicts = [];
    patchNames.forEach(function (patchName) {
        var patchFolder = path.resolve(patchAbsoluteFolder, patchName);
        traverseDirectory(patchFolder, '.', function (absolutePath, relativePath) {
            // Extract the version of the file at the clean commit point
            var prePatchFile = path.resolve(prePatchDir, patchName, relativePath);
            execSync("mkdir -p `dirname " + prePatchFile + "`");
            var gitObject = cleanCommitPoint + ":" + relativePath;
            var fileExists = spawnSync('git', ['cat-file', '-e', gitObject]).status === 0;
            if (fileExists) {
                execSync("git cat-file -p " + gitObject + " > " + prePatchFile);
            }
            else {
                execSync("touch " + prePatchFile);
            }
            // Apply the patch
            var postPatchFile = path.resolve(postPatchDir, patchName, relativePath);
            execSync("mkdir -p `dirname " + postPatchFile + "`");
            // Note: absolutePath is the patch file itself
            execSync("patch -u -F 3 " + prePatchFile + " " + absolutePath + " -o " + postPatchFile);
            // Now, perform a three-way merge
            var mergeResultFile = path.resolve(mergeResultDir, patchName, relativePath);
            execSync("mkdir -p `dirname " + mergeResultFile + "`");
            // Note: relativePath will take us to HEAD's version of the file
            // If it doesn't exist, treat it as empty
            var relativePathOrDevNull = fs.existsSync(relativePath) ? relativePath : '/dev/null';
            var diff3Result = spawnSync('diff3', ['-m', postPatchFile, prePatchFile, relativePathOrDevNull], mergeResultFile);
            if (diff3Result.status === 1) {
                filesWithConflicts.push(relativePath);
            }
        });
    });
    if (filesWithConflicts.length > 0) {
        console.log(chalk.yellow('Conflicts found in these files:'));
        filesWithConflicts.forEach(function (file) { return console.log("  " + file); });
        console.log(chalk.yellow('Open the folder above, resolve conflicts as needed, and then run updatePatches.'));
    }
    else {
        console.log(chalk.green('No conflicts found!'));
    }
}
function updatePatches(updateFolder, patchNames) {
    var mergeRootFolder = path.resolve(updateFolder, 'merge');
    patchNames.forEach(function (patchName) {
        var mergePatchFolder = path.resolve(mergeRootFolder, patchName);
        var patchDestinationFolder = path.resolve(patchAbsoluteFolder, patchName);
        traverseDirectory(mergePatchFolder, '.', function (mergedFile, relativePath) {
            var relativePathOrDevNull = fs.existsSync(relativePath) ? relativePath : '/dev/null';
            var patchDestination = path.resolve(patchDestinationFolder, relativePath);
            // The [ $? -eq 1 ] part at the end prevents an error from being thrown
            // if `diff` returns exit code 1 (i.e., the files are different and we generated a diff successfully)
            execSync("diff -u " + relativePathOrDevNull + " " + mergedFile + " > " + patchDestination + " || [ $? -eq 1 ]");
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
