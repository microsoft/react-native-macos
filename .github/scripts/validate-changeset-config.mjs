#!/usr/bin/env node
import {validateChangesetConfig} from './publishing-contract.mjs';

const {baseBranch, mode} = validateChangesetConfig();
console.log(`Changesets config is valid for ${mode} mode (${baseBranch}).`);
