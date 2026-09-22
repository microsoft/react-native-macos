import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire, stripTypeScriptTypes} from 'node:module';
import {test} from 'node:test';
import {runInNewContext} from 'node:vm';

const callerSource = readFileSync(new URL('../resolve-hermes.mts', import.meta.url), 'utf8');
const helperSource = readFileSync(new URL(
  '../../../packages/react-native/scripts/ios-prebuild/utils.js', import.meta.url,
), 'utf8');
// Execute the actual downloader without the CLI dispatch or the zx dependency.
const downloaderSource = stripTypeScriptTypes(callerSource.slice(
  callerSource.indexOf('async function downloadUpstreamHermesTarball('),
  callerSource.indexOf('/**\n * Extracts an upstream Hermes tarball'),
));

for (const buildType of ['Debug', 'Release']) {
  for (const metadataAvailable of [true, false]) {
    test(`${buildType}: ${metadataAvailable ? 'resolves nightly metadata' : 'missing metadata keeps release fallback'}`, async () => {
      const version = buildType === 'Debug' ? '123.4.5' : '987.6.5';
      const flavor = buildType.toLowerCase();
      const snapshotRoot = `https://central.sonatype.com/repository/maven-snapshots/com/facebook/hermes/hermes-ios/${version}-SNAPSHOT`;
      const metadataUrl = `${snapshotRoot}/maven-metadata.xml`;
      const releaseUrl = `https://repo1.maven.org/maven2/com/facebook/hermes/hermes-ios/${version}/hermes-ios-${version}-hermes-ios-${flavor}.tar.gz`;
      const nightlyUrl = `${snapshotRoot}/hermes-ios-${version}-20260915.123456-7-hermes-ios-${flavor}.tar.gz`;
      const requests = [];
      const fetch = async url => {
        requests.push(url);
        if (url === metadataUrl && metadataAvailable) {
          return {
            ok: true,
            text: async () => '<metadata><versioning><snapshot><timestamp>20260915.123456</timestamp><buildNumber>7</buildNumber></snapshot></versioning></metadata>',
          };
        }
        return {ok: false, status: 404, statusText: 'Not Found'};
      };
      const module = {exports: {}};
      runInNewContext(helperSource, {
        module,
        require: createRequire(import.meta.url),
        fetch,
      });
      const download = runInNewContext(`${downloaderSource}\ndownloadUpstreamHermesTarball`, {
        computeNightlyTarballURL: module.exports.computeNightlyTarballURL,
        resolveHermesArtifactVersion: () => version,
        fetch,
        echo: () => {},
      });

      assert.equal(await download(buildType), null);
      assert.deepEqual(requests, metadataAvailable
        ? [metadataUrl, releaseUrl, nightlyUrl]
        : [metadataUrl, releaseUrl]);
    });
  }
}
