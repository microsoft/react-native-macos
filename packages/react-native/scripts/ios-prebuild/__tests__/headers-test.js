/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

const {getHeaderFilesFromPodspecs} = require('../headers');
const fs = require('fs');
const os = require('os');
const path = require('path');

describe('getHeaderFilesFromPodspecs', () => {
  let directory;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'headers-test-'));
    fs.writeFileSync(path.join(directory, 'Public.h'), '');
    fs.writeFileSync(path.join(directory, 'Private.h'), '');
  });

  afterEach(() => {
    fs.rmSync(directory, {recursive: true, force: true});
  });

  it('extracts the prebuild header argument from podspec_sources', () => {
    const podspec = path.join(directory, 'Example.podspec');
    fs.writeFileSync(
      podspec,
      `source_files = podspec_sources(
        ["**/*.{h,m}", "Sources/**/*.{h,cpp}"],
        ["Public.h", "Private.h"]
      )`,
    );

    expect(getHeaderFilesFromPodspecs(directory)[podspec]).toEqual([
      path.join(directory, 'Public.h'),
      path.join(directory, 'Private.h'),
    ]);
  });

  it('does not backtrack on malformed calls', () => {
    const podspec = path.join(directory, 'Malformed.podspec');
    fs.writeFileSync(
      podspec,
      `podspec_sources(${'['.repeat(10_000)}"source", "Public.h")`,
    );

    expect(getHeaderFilesFromPodspecs(directory)[podspec]).toBeUndefined();
  });
});
