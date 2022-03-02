'use strict'

// Color escape codes which will be used to generate colorized text output.
const enum ConsoleOutputColor
{
    Reset   = '\x1b[0m',
    Black   = '\x1b[30m',
    Red     = '\x1b[31m',
    Green   = '\x1b[32m',
    Yellow  = '\x1b[33m',
    Blue    = '\x1b[34m',
    Magenta = '\x1b[35m',
    Cyan    = '\x1b[36m',
    White   = '\x1b[37m',
}

// Wraps text with the appropriate color escape codes, so that when the returned text is written to the console,
// it will be colored and subsequent text will be returned to the previous color. This does NOT write to the console.
// Callers are responsible for writing the returned text to the console.
function ColorizeText(text: String, color: ConsoleOutputColor) : String
{
    if (color === ConsoleOutputColor.Reset)
    {
        // No need to wrap the text with escape codes, as the net effect is the same as
        // printing the text with the current console foreground color.
        return text;
    }

    return color + text + ConsoleOutputColor.Reset;
}

export { ConsoleOutputColor, ColorizeText};
