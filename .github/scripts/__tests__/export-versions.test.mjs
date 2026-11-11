import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';

const script = new URL('../export-versions.mts', import.meta.url);

for (const {name, peerVersion, codegenVersion, expected} of [
  {name: 'main uses the codegen workspace version', codegenVersion: '0.83.0-main', expected: '0.83'},
  {name: 'stable prefers its explicit React Native peer', peerVersion: '0.83.10', codegenVersion: '0.83.0-main', expected: '0.83'},
  {name: 'the peer takes precedence over a different workspace minor', peerVersion: '0.84.1', codegenVersion: '0.83.0-main', expected: '0.84'},
  {name: 'later fork points use their own workspace version', codegenVersion: '0.87.0-main', expected: '0.87'},
]) {
  test(name, t => {
    const root = mkdtempSync(join(tmpdir(), 'rnm-export-versions-'));
    t.after(() => rmSync(root, {recursive: true, force: true}));
    mkdirSync(join(root, '.github/scripts'), {recursive: true});
    mkdirSync(join(root, 'packages/react-native'), {recursive: true});
    mkdirSync(join(root, 'packages/react-native-codegen'), {recursive: true});
    const target = join(root, '.github/scripts/export-versions.mts');
    copyFileSync(script, target);
    writeFileSync(join(root, 'packages/react-native/package.json'), JSON.stringify({
      dependencies: {'@react-native/codegen': 'workspace:*'},
      peerDependencies: {react: '^19.2.0', ...(peerVersion ? {'react-native': peerVersion} : {})},
    }));
    writeFileSync(join(root, 'packages/react-native-codegen/package.json'), JSON.stringify({version: codegenVersion}));
    const output = join(root, 'github-output');
    const env = {...process.env, GITHUB_OUTPUT: output};
    execFileSync(process.execPath, [target], {env});
    assert.equal(readFileSync(output, 'utf8'), `react_version=^19.2.0\nreact_native_version=${expected}\n`);
    delete env.GITHUB_OUTPUT;
    assert.equal(execFileSync(process.execPath, [target], {env, encoding: 'utf8'}),
      `react_version=^19.2.0\nreact_native_version=${expected}\n`);
  });
}
