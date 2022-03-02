'use strict';

// Local Modules
import { ScriptBuilder } from './ScriptBuilder';
import { ColorizeText, ConsoleOutputColor } from './ConsoleUtils';
import { AskQuestion, ResponseType } from './AskUser';

// Community modules
import * as YAML from 'js-yaml';

// Node modules
import * as FS from 'fs';
import * as Path from 'path';

const enum YAMLKeys
{
    Jobs        = 'jobs',
    Job         = 'job',
    Steps       = 'steps',
    Template    = 'template',
    Parameters  = 'parameters',
    Inputs      = 'inputs',
    Script      = 'script',
    DisplayName = 'displayName',
    Task        = 'task'
}

// Not all task types are supported as of yet.
const supportedTasks: string[] = ['CmdLine@2'];

class YAMLProcessorOptions
{
    echo: boolean = true;
    errorCheck: boolean = true;
    interactive: boolean = false;
    summary: boolean = true;

    constructor(options: { echo: boolean,  errorCheck: boolean, interactive: boolean, summary: boolean })
    {
       Object.assign(this, options);
    }
}

class YAMLProcessor
{
    inputFilePath: string;
    outputFilePath: string;
    defaultWorkingDirectory: string;
    options: YAMLProcessorOptions;
    scriptBuilder: ScriptBuilder;
    acceptRemaining: boolean = false;
    skipRemaining: boolean = false;

    constructor(inputFilePath: string, outputFilePath: string, defaultWorkingDirectory: string, options: YAMLProcessorOptions)
    {
        this.inputFilePath = inputFilePath;
        this.outputFilePath = outputFilePath;
        this.defaultWorkingDirectory = defaultWorkingDirectory
        this.options = options;
        this.scriptBuilder = new ScriptBuilder(this.outputFilePath, {echo: this.options.echo, errorCheck: this.options.errorCheck, summary: this.options.summary} );
    }

    SanitizeCommand(command: string, parameters: object) : string
    {
        // Update the working directory environment variable to point to the repo root
        let sanitizedCommand = command.replace(/\$\(System\.DefaultWorkingDirectory\)/g, this.defaultWorkingDirectory);

        // Update any parameters with the parameters that were passed in with the template
        const parameterMatches = sanitizedCommand.matchAll(/\$\{\{\s*parameters\.(\S*)\s*\}\}/g);
        for (const match of parameterMatches)
        {
            // The 0th index of match contains the full regex match, wheras the 1st index of match contains the first capture group
            // which in the case of the regex above, is the name of the parameter. We don't have to check that the passed in parameters 
            // object contains a key corresponding to the matched parameter, since we validated this in ProcessTemplate.
            sanitizedCommand = sanitizedCommand.replace(match[0], parameters[match[1]]);
        }

        return sanitizedCommand;
    }

    ProcessTemplate(templatePath: string, passedInParameters: Object) : void
    {
        const templateYAML = YAML.load(FS.readFileSync(templatePath, 'utf-8'));
        if (YAMLKeys.Parameters in templateYAML)
        {
            // Verify the correct parameters were read in
            for (const parameter in templateYAML[YAMLKeys.Parameters])
            {
                if (!(parameter in passedInParameters))
                {
                    const templateName: string = Path.basename(templatePath);
                    // Give user an opportunity to supply a parameter value
                    const response = 
                        AskQuestion({contextMessage:`Error: Missing parameter '${parameter}' for template '${templateName}.`,
                                    question: 'Provide a value now?',
                                    defaultResponse: ResponseType.Quit,
                                    stringBoilerplate: `${parameter}`,
                                    responseType: ResponseType.Quit | ResponseType.String,
                                    color: ConsoleOutputColor.Red});
                    
                    if (response.type === ResponseType.Quit)
                    {
                        console.log('Terminating script termination');
                        process.exit(1);
                    }
                    else
                    {
                        passedInParameters[parameter] = response.value
                    }
                }
            }
        }
    
        if (YAMLKeys.Steps in templateYAML)
        {
            this.ProcessSteps(templateYAML[YAMLKeys.Steps], Path.dirname(templatePath), passedInParameters);
        }
    }

    ProcessSteps(steps: Object, currentDirectory: string, parameters: Object) : void
    {
        for (const stepIndex in steps)
        {
            const step = steps[stepIndex];
            if (YAMLKeys.Template in step)
            {
                let parameters = {};
                if (YAMLKeys.Parameters in step)
                {
                    parameters = step[YAMLKeys.Parameters];
                }

                // Expand the template and process it
                this.ProcessTemplate(Path.join(currentDirectory, step[YAMLKeys.Template]), parameters);
            }

            if (YAMLKeys.Inputs in step && YAMLKeys.Script in step[YAMLKeys.Inputs])
            {
                const displayName = YAMLKeys.DisplayName in step ? step[YAMLKeys.DisplayName] : 'Command without display name';

                if (YAMLKeys.Task in step)
                {
                    const taskType = step[YAMLKeys.Task];
                    if (!this.skipRemaining && !supportedTasks.includes(taskType))
                    {
                        console.log(ColorizeText(`Warning: Unsupported task type '${taskType}' for command '${displayName}'. Skipping command.\n`, ConsoleOutputColor.Yellow));
                        continue;
                    }
                }

                const santizedCommand = this.SanitizeCommand(step[YAMLKeys.Inputs].script, parameters);
                let skipCommand:boolean = this.skipRemaining;

                if (this.options.interactive && !this.skipRemaining && !this.acceptRemaining)
                {
                    const response = 
                        AskQuestion({contextMessage: `Processing command: ${displayName}:\n${santizedCommand}\n`,
                                    question: `Add \'${displayName}\' to your script?`,
                                    responseType: ResponseType.Yes | ResponseType.No | ResponseType.AcceptRemaining | ResponseType.SkipRemaining | ResponseType.Quit,
                                    defaultResponse: ResponseType.Yes,
                                    color: ConsoleOutputColor.Reset});

                    switch (response.type)
                    {
                        case ResponseType.AcceptRemaining:
                        {
                            this.acceptRemaining = true;
                            console.log(ColorizeText('Accepting all subsequent commands.\n', ConsoleOutputColor.Yellow));
                            break;
                        } 
                        case ResponseType.SkipRemaining:
                        {
                            this.skipRemaining = true;
                            skipCommand = true;
                            console.log(ColorizeText('Skipping all subsequent commands.\n', ConsoleOutputColor.Yellow));
                            break;
                        }
                        case ResponseType.No:
                        {
                            skipCommand = true;
                            break;
                        }
                        case ResponseType.Yes:
                        {
                            break;
                        }
                        case ResponseType.Quit:
                        {
                            console.log('Terminating script generation.');
                            process.exit(0);
                        }
                    }
                }

                if (skipCommand)
                {
                    continue;
                }

                this.scriptBuilder.AddCommand(displayName, santizedCommand);
            }
        }
    }

    ProcessJob(jobYAML: object, currentDirectory: string) : void
    {
        // Start the script section with the name of the job, for reference
        if (!(YAMLKeys.Steps in jobYAML))
        {
            // For whatever reason, this job doesn't have any steps, so ignore it
            return;
        }

        this.scriptBuilder.AddComment('Job: ' + jobYAML[YAMLKeys.Job]);
        this.scriptBuilder.AddLine('');
        this.ProcessSteps(jobYAML[YAMLKeys.Steps], currentDirectory, {});
    }

    Process(): void
    {
        // Load the YAML located at the path
        const prYAML = YAML.load(FS.readFileSync(this.inputFilePath, 'utf-8'));

        // Verify there is at least one job in the YAML file, and report an error otherwise
        if (!(YAMLKeys.Jobs in prYAML))
        {
            console.error(`No jobs found in the YAML file located at ${this.inputFilePath}! Not a valid PR YAML file.`);
            process.exit(1);
        }

        for (const jobIndex in prYAML.jobs)
        {
            this.ProcessJob(prYAML.jobs[jobIndex], Path.dirname(this.inputFilePath));
        }

        this.scriptBuilder.WriteFile();
        console.log(ColorizeText(`Script generated successfully to ${this.outputFilePath}`, ConsoleOutputColor.Green));
    }
}

export { YAMLProcessor };
