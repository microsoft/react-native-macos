/**
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 *
 * @format
 */

import * as fs from 'fs';
// import * as path from 'path';
// import {
//     copyProjectTemplateAndReplace,
//     installDependencies,
// } from './generator-macos';
  
/**
 * Simple utility for running the Windows generator.
 *
 * @param  {String} projectDir root project directory (i.e. contains index.js)
 * @param  {String} name       name of the root JS module for this app
 * @param  {String} ns         namespace for the project
 * @param  {Object} options    command line options container
 */
export default function generateMacOS (projectDir: string, name: string, ns: string, options: Object) {
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir);
    }
  
    // installDependencies(options);
  
    // copyProjectTemplateAndReplace(
    //   path.join(__dirname, 'generator-macos', 'templates'),
    //   projectDir,
    //   name,
    //   { ns, overwrite: options.overwrite }
    // );
  }
  