'use strict'

// Local modules
import { ConsoleOutputColor, ColorizeText } from './ConsoleUtils';

// Community modules
import * as ReadlineSync from 'readline-sync';

enum ResponseType
{
    Yes             = 1 << 0,
    No              = 1 << 1,
    AcceptRemaining = 1 << 2,
    SkipRemaining   = 1 << 3,
    Quit            = 1 << 4,
    String          = 1 << 5,
    Invalid         = 1 << 6
}

class Response
{
    type:ResponseType;
    value:string;

    constructor(typeIn:ResponseType, valueIn:string)
    {
        this.type = typeIn;
        this.value = valueIn;
    }
}

namespace ResponseType
{
    export function ToKeyInValue(responseType: ResponseType):string
    {
        switch (responseType)
        {
            case ResponseType.Yes: return 'y';
            case ResponseType.No: return 'n';
            case ResponseType.AcceptRemaining: return 'a';
            case ResponseType.SkipRemaining: return 's';
            case ResponseType.Quit: return 'q';
            case ResponseType.String: return '';
        }

        // TODO: switch to different error reporting
        console.error(`Missing key in value for ResponseType: ${responseType}`);
        process.exit(1);
    }

    export function ToString(responseType: ResponseType): string
    {
        switch (responseType)
        {
            case ResponseType.Yes: return 'Yes';
            case ResponseType.No: return 'No';
            case ResponseType.AcceptRemaining: return 'Accept remaining';
            case ResponseType.SkipRemaining: return 'Skip remaining';
            case ResponseType.Quit: return 'Quit';
            case ResponseType.String: return '';
        }

        // TODO: switch to different error reporting
        console.error(`Missing string value for ResponseType: ${responseType}`);
        process.exit(1);
    }

    export function IsSingleResponseType(responseTypeIn: ResponseType): boolean
    {
        let numResponseTypes = 0;
        for (const value of Object.values(ResponseType))
        {
            const responseType: ResponseType = value as ResponseType;
            if (responseTypeIn & responseType)
            {
                numResponseTypes++;
                if (numResponseTypes > 1)
                {
                    return false;
                }
            }
        }

        return true;
    }

    export function FormatValidResponses(responseTypesIn: ResponseType, defaultResponse?:ResponseType, stringBoilerplate?:string): string
    {
        if (responseTypesIn === ResponseType.String)
        {
            return '';
        }

        let responseOptionsMessage:string[] = [];
        for (const value of Object.values(ResponseType))
        {
            const responseType: ResponseType = value as ResponseType;
            if (responseTypesIn & responseType && responseType !== ResponseType.String)
            {
                const stringValue = ResponseType.ToString(responseType);
                const keyInValue = ResponseType.ToKeyInValue(responseType);
                responseOptionsMessage.push(`${stringValue}(${keyInValue})`);
            }
        }

        if (stringBoilerplate !== undefined)
        {
            responseOptionsMessage.push('|');
            responseOptionsMessage.push(`<${stringBoilerplate}>`);
        }
    
        if (defaultResponse !== undefined)
        {
            // Validate that only one value was chosen
            if (!IsSingleResponseType(defaultResponse))
            {
                // TODO: Replace with other error reporting
                console.error(`Default response should be limited to only one response type!`);
                process.exit(1);
            }

            const defaultKeyInValue:string = ResponseType.ToKeyInValue(defaultResponse);
            responseOptionsMessage.push(`[${defaultKeyInValue}]`);
        }
    
        return responseOptionsMessage.join(' ') + ': ';
    }

    export function GetResponse(responseTypeIn: ResponseType, valueIn: string): Response
    {
        for (const value of Object.values(ResponseType))
        {
            const responseType:ResponseType = value as ResponseType;
            if (responseTypeIn & responseType)
            {
                if (responseType === ResponseType.String ||
                    valueIn.toUpperCase() === ResponseType.ToKeyInValue(responseType).toUpperCase())
                {
                    return { type:responseType, value:valueIn }
                }
            }
        }

        return { type:ResponseType.Invalid, value: '' };
    }
}

class QuestionParams
{
    // Optional message to present before asking a question, to provide necessary context
    // The context message is presented on a line before the question.
    contextMessage?: string;

    // The actual question to ask.
    question: string = '';

    // Set of allowed responses. Can be or'd together
    responseType: ResponseType = ResponseType.Yes | ResponseType.No;

    // Specifies a default response if the user decides to press enter without any input
    defaultResponse?: ResponseType;

    color: ConsoleOutputColor = ConsoleOutputColor.Reset;

    stringBoilerplate?: string;
}

function AskQuestion(params: QuestionParams) : Response
{
    // Display the context message, if any, before asking the question
    if (params.contextMessage !== undefined)
    {
        console.log(ColorizeText(params.contextMessage, params.color));
    }

    // Ask the question
    console.log(ColorizeText(params.question, params.color));

    // Present valid responses
    while (true)
    {
        const responseValue:string = ReadlineSync.question(ResponseType.FormatValidResponses(params.responseType, params.defaultResponse, params.stringBoilerplate));
        if (responseValue === '' && params.defaultResponse !== undefined)
        {
            console.log('');
            return { type:params.defaultResponse, value:ResponseType.ToKeyInValue(params.defaultResponse) };
        }

        const response:Response = ResponseType.GetResponse(params.responseType, responseValue);
        if (response.type !== ResponseType.Invalid)
        {
            console.log('');
            return { type:response.type, value:responseValue };
        }

        console.log(ColorizeText('Invalid response! Please enter a valid response:', ConsoleOutputColor.Red));
    }
}

export { AskQuestion, Response, ResponseType };
