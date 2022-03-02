'use strict'

// Local modules
import { ColorizeText, ConsoleOutputColor } from './ConsoleUtils';
import { AskQuestion, ResponseType } from './AskUser';

// Node modules
import * as FS from 'fs';
import * as Path from 'path';

function ValidateInputFilePath(inputFilePathIn: string): string
{
    let inputPath: string = Path.resolve(inputFilePathIn);
    while (!FS.existsSync(inputPath))
    {
        const response = 
            AskQuestion({contextMessage: `Error: input file at path ${inputPath} is invalid!`,
                        question: 'Please specify a new one:',
                        color: ConsoleOutputColor.Red,
                        responseType: ResponseType.String | ResponseType.Quit,
                        stringBoilerplate: 'Path to input file',
                        defaultResponse: ResponseType.Quit});
        
        switch (response.type)
        {
            case ResponseType.Quit:
            {
                // Abort the process
                console.log('Terminating script generation');
                process.exit(0);
            }
            case ResponseType.String:
            {
                inputPath = Path.resolve(response.value);
                break;
            }
        }
    }

    return inputPath;
}

function ValidateDefaultWorkingDirectory(defaultWorkingDirectoryIn: string): string
{
    // Validate default working directory
    let defaultWorkingDirectory: string = Path.resolve(defaultWorkingDirectoryIn);
    let wasDefaultWorkingDirectoryInvalid: boolean = false;
    while (!FS.existsSync(defaultWorkingDirectory) || !FS.lstatSync(defaultWorkingDirectory).isDirectory())
    {
        wasDefaultWorkingDirectoryInvalid = true;
        // The specified working directory either does not exist or it is not actually a directory, so prompt the user for a new one
        const response = 
            AskQuestion({contextMessage: `Error: working directory at path ${defaultWorkingDirectory} is invalid!`,
                        question: 'Please specify a new one:',
                        color: ConsoleOutputColor.Red,
                        responseType: ResponseType.String | ResponseType.Quit,
                        stringBoilerplate: 'Path to directory',
                        defaultResponse: ResponseType.Quit});

        switch (response.type)
        {
            case ResponseType.Quit:
            {
                // Abort the process
                console.log('Terminating script generation');
                process.exit(0);
            }
            case ResponseType.String:
            {
                // Prompt the user for another filepath to write to
                defaultWorkingDirectory = Path.resolve(response.value);
                break;
            }
        }
    } 

    if (wasDefaultWorkingDirectoryInvalid)
    {
        console.log(ColorizeText(`${defaultWorkingDirectory} set as the default working directory`, ConsoleOutputColor.Green));
        console.log('');
    }

    return defaultWorkingDirectory;
}

function ValidateOutputFilepath(outputFilePathIn: string): string
{
    // Validate output filepath
    let outputFilePath: string = Path.resolve(outputFilePathIn);
    let overwriteAllowed: boolean = false;

    while (FS.existsSync(outputFilePath) && !overwriteAllowed)
    {
        const response = 
            AskQuestion({contextMessage: `Warning: File at path ${outputFilePath} already exists.`,
                        question: 'Are you sure you want to overwrite it?',
                        color: ConsoleOutputColor.Yellow,
                        responseType: ResponseType.Yes | ResponseType.No | ResponseType.Quit,
                        defaultResponse: ResponseType.Yes});

        switch (response.type)
        {
            case ResponseType.Quit:
            {
                // Abort the process
                console.log('Terminating script generation');
                process.exit(0);
            }
            case ResponseType.No:
            {
                // Prompt the user for another filepath to write to
                const pathResponse =
                    AskQuestion({question:'Please enter the filepath to generate the output script to:',
                                responseType: ResponseType.String,
                                color: ConsoleOutputColor.Reset});

                outputFilePath = pathResponse.value;
                break;
            }
            case ResponseType.Yes:
            {
                // Proceed
                overwriteAllowed = true;
                break;
            }
        }
    }

    return outputFilePath;
}

export { ValidateDefaultWorkingDirectory, ValidateOutputFilepath, ValidateInputFilePath };