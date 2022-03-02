"use strict"

// Local modules
import { ColorizeText, ConsoleOutputColor } from "./ConsoleUtils";

// Node modules
import * as FS from 'fs';
import * as OS from 'os';

class ScriptBuilderOptions
{
    echo: boolean = true;
    errorCheck: boolean = true;
    summary: boolean = true;

    constructor(options: { echo: boolean, errorCheck: boolean, summary: boolean })
    {
       Object.assign(this, options);
    }
}

class ScriptBuilder
{
    buffer: string;
    filepath: string;
    options: ScriptBuilderOptions;

    constructor(filepath: string, options: ScriptBuilderOptions)
    {
        this.filepath = filepath;
        this.buffer = '';
        this.options = options;

        // shebang to use bash as the interpreter
        this.AddLine('#!/bin/bash');

        // Initialize a bash array for storing the summaries of the commands invoked
        if (options.summary)
        {
            this.AddSummaryPrinter();
        }

        this.AddCallWrapper();
    }

    AddCallWrapper()
    {
        this.AddLine('CallWrapper()');
        this.AddLine('{');
        if (this.options.summary)
        {
            this.AddLine('\tstartTime=`date +"%s"`')
            const startMessage = ColorizeText('$1 : START \`date +\"%b %d %T\"\`', ConsoleOutputColor.Magenta);
            this.AddLine(`\techo -e ${startMessage}`);
        }
        if (this.options.echo)
        {
            this.AddLine('\techo $2');
        }

        this.AddLine('\teval $2');
        if (this.options.errorCheck)
        {
            this.AddLine('\texitCode=$?');
        }

        if (this.options.summary)
        {
            this.AddLine('\tendTimePretty=`date +\"%b %d %T\"`')
            const endMessage = ColorizeText('$1 : END $endTimePretty - \`date -d @$duration -u +%M:%S\`', ConsoleOutputColor.Magenta);
            this.AddLine('\tendTime=`date +"%s"`')
            this.AddLine('\tduration=$((endTime-startTime))')
            this.AddLine(`\techo -e ${endMessage}`);
        }

        this.AddLine(`\techo ""`);
        
        if (this.options.errorCheck)
        {
            this.AddLine('\tif [ $exitCode -ne 0 ]')
            this.AddLine('\tthen')
            const commandFailedMessage = ColorizeText('$2\\nfailed with error code $exitCode. Stopping execution early.', ConsoleOutputColor.Red);
            this.AddLine(`\t\techo -e \"${commandFailedMessage}\"`);
        
            if (this.options.summary)
            {
                const commandFailedSummaryMessage = ColorizeText('$1 : Failed', ConsoleOutputColor.Red);
                this.AddLine(`\t\tcommandSummaries+=( \"${commandFailedSummaryMessage}|$endTimePretty    - \`date -d @$duration -u +%M:%S\`\" )`)
                this.AddLine('\t\teval SummaryPrinter $exitCode');
            }

            this.AddLine('\tfi')
        }
       
        if (this.options.summary)
        {
            this.AddLine('\tcommandSummaries+=( \"$1|$endTimePretty  - \`date -d @$duration -u +%M:%S\`\" )');
        }

        this.AddLine('}');
        this.AddLine('');
    }

    AddSummaryPrinter()
    {
        const summaryPrinterFunction: string = 
`
commandSummaries=()

SummaryPrinter()
{
        headerString=" Summary "
        headerStringLength=\${#headerString}
        maxSummaryLength=100;
        for i in \${!commandSummaries[@]}; do
                # Remove colors to count length properly
                decolorizedSummary=$(sed 's/\x1b\[[0-9;]*m//g' <<< \${commandSummaries[$i]})
                summaryLength=\${#decolorizedSummary}
                maxSummaryLength=$((maxSummaryLength > summaryLength ? maxSummaryLength : summaryLength))
        done

        if [ \`expr $((maxSummaryLength - headerStringLength)) % 2\` == 1 ]
        then
                maxSummaryLength=$((maxSummaryLength + 1))
        fi
        numEqualSigns=$(((maxSummaryLength - headerStringLength)/2))
        echo ""
        printf '=%.0s' $(seq 1 $numEqualSigns)
        printf "$headerString"
        printf '=%.0s' $(seq 1 $numEqualSigns)
        echo ""
        for i in \${!commandSummaries[@]}; do
                summary=\${commandSummaries[$i]}
                # Remove colors to count length properly
                decolorizedSummary=$(sed 's/\x1b\[[0-9;]*m//g' <<< \$summary)
                decolorizedCommand=\${decolorizedSummary%|*}
                decolorizedTimestamp=\${decolorizedSummary#*|}
                commandLength=\${#decolorizedCommand}
                timestampLength=\${#decolorizedTimestamp}
                numSpaces=$((maxSummaryLength - commandLength - timestampLength))
                command=\${summary%|*}
                timestamp=\${summary#*|}
                printf "$command"
                printf ' %.0s' $(seq 1 $numSpaces)
                printf "$timestamp"
                echo ""
        done
        exit $1
}
`;

        this.AddLine(summaryPrinterFunction);
    }

    AddCommand(displayName: string, command: string)
    {
        this.AddComment(displayName);
        this.AddLine(`CallWrapper \'${displayName}\' \'${command}\'`);
        this.AddLine('');
    }

    AddComment(comment: string)
    {
        this.buffer += '# ' + comment + OS.EOL; 
    }

    AddLine(line: string)
    {
        this.buffer +=  line + OS.EOL;
    }

    WriteFile()
    {
        if (this.options.summary)
        {
            this.AddLine('eval SummaryPrinter 0');
        }

        FS.writeFileSync(this.filepath, this.buffer);
        FS.chmodSync(this.filepath, FS.statSync(this.filepath).mode | 0o100); // set to executable for user
    }
}

export { ScriptBuilder };
