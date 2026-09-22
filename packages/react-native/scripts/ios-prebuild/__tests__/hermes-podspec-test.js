/**
 * Copyright (c) Microsoft Corporation.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @noflow
 * @format
 */

'use strict';

const {readHermesMetadata} = require('../hermes-version');
const {spawnSync} = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const rnRoot = path.resolve(__dirname, '../../..');
const podspec = path.join(rnRoot, 'sdks/hermes-engine/hermes-engine.podspec');

// Evaluate the actual podspec and source selector without CocoaPods, network,
// or native tools. Stop at source resolution, before the Pod::Spec DSL.
const ruby = `
require 'json'
require File.join(File.dirname(ARGV[0]), 'hermes-utils.rb')
class << File
  alias_method :original_read, :read
  def read(file, *args)
    if File.expand_path(file) == File.join(ENV.fetch('HERMES_TEST_ROOT'), 'package.json')
      return JSON.generate({
        'version' => ENV.fetch('HERMES_TEST_RN_VERSION'),
        'peerDependencies' => {'react-native' => '^0.87.0'},
        'dependencies' => {'hermes-compiler' => '123.4.56'}
      })
    end
    original_read(file, *args)
  end
end
def release_artifact_exists(version)
  true
end
def podspec_source(source_type, version, react_native_path)
  puts JSON.generate({
    version: version,
    source_type: source_type,
    tag: File.read(hermestag_file(react_native_path)).strip
  })
  throw :resolved
end
catch(:resolved) { load ARGV[0] }
`;

test.each(
  ['1000.0.0', '0.87.0-rc.0'].flatMap(version =>
    [undefined, '0', '1', '', 'true'].map(flag => [version, flag]),
  ),
)('podspec uses the single pin on RN %s with flag %s', (version, flag) => {
  for (const source of [false, true]) {
    const env = {...process.env};
    for (const key of [
      'RCT_HERMES_V1_ENABLED',
      'REACT_NATIVE_OVERRIDE_HERMES_DIR',
      'HERMES_ENGINE_TARBALL_PATH',
      'HERMES_COMMIT',
      'RCT_BUILD_HERMES_FROM_SOURCE',
    ]) {
      delete env[key];
    }
    const result = spawnSync('ruby', ['-e', ruby, podspec], {
      // Verify metadata paths do not depend on the current directory.
      cwd: os.tmpdir(),
      env: {
        ...env,
        HERMES_TEST_ROOT: rnRoot,
        HERMES_TEST_RN_VERSION: version,
        ...(flag == null ? {} : {RCT_HERMES_V1_ENABLED: flag}),
        ...(source ? {RCT_BUILD_HERMES_FROM_SOURCE: 'true'} : {}),
      },
      encoding: 'utf8',
      timeout: 10000,
    });
    expect(result.error).toBeUndefined();
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      version: readHermesMetadata('single').version,
      source_type: source
        ? 'build_from_github_tag'
        : 'download_prebuild_release_tarball',
      tag: fs
        .readFileSync(path.join(rnRoot, 'sdks/.hermesv1version'), 'utf8')
        .trim(),
    });
  }
});
