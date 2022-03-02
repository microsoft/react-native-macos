'use strict'

// Local modules
import { YAMLProcessor } from './ProcessYaml';
import { ValidateDefaultWorkingDirectory, ValidateOutputFilepath, ValidateInputFilePath } from './ValidateOptions';

// Community modules
import { Command } from 'commander';

const program = new Command();

// Add a banner to explain what the point of this script is.
program.addHelpText('beforeAll', 'yaml-to-script\n\nThis script is used to read in YAML files used for ADO pipeline configurations and generates a build script to replicate the steps locally. This script will automatically expand any templates, and explicitly add parameter values if they are specified in the YAML.\n\nOnce the script is generated, give the generated file executable permissions via chmod +x <path to generated file>\n\n');

// Define options. Expected values following an option are represented using the angle brackets, or square brackets if they are optional. Variadic options are represented with ...
program.requiredOption('-p, --path <path>', 'Paths to YAML files representing an ADO PR pipelines. Paths may be absolute or relative.');
program.requiredOption('-o, --output <output>', 'Path to save the generated build script to. Path may be absolute or relative.');
program.requiredOption('-d, --defaultworkingdir <defaultworkingdir>', 'Working directory the generated script will be run from. Path to directory can be absolute or relative');
program.option('-i, --interactive', 'Interactive mode. If set, each step will be presented and the user will have the option to accept or skip the step for their script.');
program.option('--no-errorcheck', 'By default, individual steps will be wrapped with a check for the exit code, and upon failure, abort running the remaining steps. Set this flag if you prefer to execute subsequent commands regardless of the success of the previous command.')
program.option('--no-echo', 'By default, the generated script will echo the command it will execute. Set this flag if you wish to avoid that.');
program.option('--no-summary', 'By default, the generated script will print a summary of the commands executed. Set this flag if you wish to avoid that.')

// Alert the user if the option is invalid, pointing them to the usage, or a reasonable suggestion for what they meant.
program.showHelpAfterError('(run with --help for additional information)');
program.showSuggestionAfterError();

program.addHelpText('after', '\nExample Usage:\n yaml-to-script -p .ado/android-pr.yml -o ./build.sh -d . -i');

// Read the user's options
program.parse();
const options = program.opts();

// Validate paths
const inputPath : string = ValidateInputFilePath(options.path);
const outputFilePath: string = ValidateOutputFilepath(options.output);
const defaultWorkingDirectory: string = ValidateDefaultWorkingDirectory(options.defaultworkingdir);

const yamlProcesor = new YAMLProcessor(inputPath, outputFilePath, defaultWorkingDirectory, { echo: options.echo, errorCheck: options.errorcheck, interactive: options.interactive, summary: options.summary });
yamlProcesor.Process();
