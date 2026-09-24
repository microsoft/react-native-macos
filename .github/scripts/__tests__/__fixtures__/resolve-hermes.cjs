/**
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

// Preload in the CLI subprocess. Exercise the real ESM entry point and URL
// helper without network access or changes to checked-in metadata.
const fs = require('node:fs');
const path = require('node:path');

const propertiesPath = path.resolve(
  __dirname,
  '../../../../packages/react-native/sdks/hermes-engine/version.properties',
);
const readFileSync = fs.readFileSync;
fs.readFileSync = function (file, ...args) {
  if (file === propertiesPath && process.env.HERMES_TEST_PROPERTIES != null) {
    if (process.env.HERMES_TEST_PROPERTIES === 'MISSING') {
      throw Object.assign(new Error(`ENOENT: ${propertiesPath}`), {
        code: 'ENOENT',
      });
    }
    if (process.env.HERMES_TEST_PROPERTIES === 'UNREADABLE') {
      throw Object.assign(new Error(`EACCES: ${propertiesPath}`), {
        code: 'EACCES',
      });
    }
    return process.env.HERMES_TEST_PROPERTIES;
  }
  return readFileSync.call(this, file, ...args);
};

const urls = [];
global.fetch = async url => {
  urls.push(url);
  const mode = process.env.HERMES_TEST_DOWNLOAD;
  if (url.endsWith('/maven-metadata.xml')) {
    return {
      ok: mode === 'snapshot',
      text: async () =>
        '<metadata><snapshot><timestamp>20260101.010203</timestamp><buildNumber>4</buildNumber></snapshot></metadata>',
    };
  }
  return {
    ok: mode === 'release' || (mode === 'snapshot' && url.includes('SNAPSHOT')),
    status: 404,
    statusText: 'Not Found',
    arrayBuffer: async () => Buffer.from('mock Hermes archive'),
  };
};
process.on('exit', () => console.log(`HERMES_TEST_URLS=${JSON.stringify(urls)}`));
