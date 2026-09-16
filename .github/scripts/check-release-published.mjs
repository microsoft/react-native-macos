import {execFileSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export function isReleasePublished(minor, query = execFileSync) {
  if (!/^\d+\.\d+$/.test(minor)) {
    throw new Error(`Invalid React Native minor: ${minor}`);
  }
  // Query the package, not a potentially missing version range. A successful
  // response with no matching version is distinct from a failed registry query.
  const versions = JSON.parse(query('npm', ['view', 'react-native-macos', 'versions', '--json'], {
    encoding: 'utf8',
    timeout: 60000,
  }));
  if (!Array.isArray(versions) || !versions.every(version => typeof version === 'string')) {
    throw new Error('Invalid npm versions response');
  }
  return versions.some(version => version.startsWith(`${minor}.`));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const published = isReleasePublished(process.argv[2]);
  console.log(`react-native-macos ${process.argv[2]}.x published: ${published}`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `published=${published}\n`);
  }
}
