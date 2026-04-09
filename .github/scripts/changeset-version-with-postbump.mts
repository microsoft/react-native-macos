#!/usr/bin/env node
import { $, echo, fs } from 'zx';
import { updateReactNativeArtifacts } from '../../scripts/releases/set-rn-artifacts-version.js';

// Step 1: Run changeset version to bump package.json files and update CHANGELOGs
echo('📦 Running changeset version...');
await $`yarn changeset version`;

// Step 2: Update native artifacts to match the new react-native version
echo('\n🔄 Updating React Native native artifacts...');
const { version } = fs.readJsonSync('packages/react-native/package.json');
await updateReactNativeArtifacts(version);
echo('✅ Native artifacts updated');

// Step 4: Update yarn.lock to reflect all changes
echo('\n🔒 Updating yarn.lock...');
await $`yarn install --mode update-lockfile`;

echo('\n✅ Version bump complete!');
