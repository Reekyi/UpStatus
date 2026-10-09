#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'tests/release-version-guard.test.mjs');
execFileSync(process.execPath, ['--test', FILE], { stdio: 'inherit' });

function assert(ok, message) { if (!ok) throw new Error('RELEASE SAFETY FAILED: ' + message); }
const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/deploy-production.yml'), 'utf8');
const comparator = fs.readFileSync(path.join(ROOT, 'scripts/compare-release-versions.mjs'), 'utf8');
assert(workflow.includes('Read current production version and prevent downgrade'), 'production workflow guard is missing');
assert(workflow.includes('scripts/compare-release-versions.mjs'), 'production workflow does not call the tested version comparator');
assert(workflow.includes('current-production.user.js'), 'production workflow does not fetch the live userscript');
assert(comparator.includes('Refusing downgrade'), 'downgrade rejection is missing from shared comparator');
assert(comparator.includes('Refusing same-version redeployment'), 'same-version redeployment rejection is missing from shared comparator');
console.log('Release safety validation passed.');
