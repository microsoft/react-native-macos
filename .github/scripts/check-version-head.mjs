import {execFileSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export function isCurrentHead(env = process.env, run = execFileSync) {
  if (!/^refs\/heads\/\d+\.\d+-stable$/.test(env.GITHUB_REF ?? '') || !env.GITHUB_SHA) {
    return false;
  }
  const remote = run('git', ['ls-remote', '--exit-code', 'origin', env.GITHUB_REF], {
    encoding: 'utf8', timeout: 60000,
  }).trim();
  const [sha, ref] = remote.split(/\s+/);
  return sha === env.GITHUB_SHA && ref === env.GITHUB_REF;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const current = isCurrentHead();
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `current=${current}\n`);
  console.log(current ? 'Version workflow matches the stable branch head' : 'Skip stale or non-stable version workflow');
}
