#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicFlag = process.argv.includes('--public');

if (!publicFlag) {
  console.error('Refusing to publish the CLA without --public.');
  console.error('Run this only after legal review: node scripts/create-cla-gist.mjs --public');
  process.exit(1);
}

try {
  execFileSync('gh', ['auth', 'status'], { stdio: 'ignore' });
} catch {
  console.error('GitHub CLI is not authenticated. Run `gh auth login` first.');
  process.exit(1);
}

const metadataPath = join(root, 'docs', 'legal', 'cla-metadata.json');
const claPath = join(root, 'CLA.md');
const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));

if (!metadata.agreement || metadata.agreement.type !== 'boolean' || metadata.agreement.required !== true) {
  throw new Error('cla-metadata.json must contain a required boolean "agreement" field.');
}

// CLA Assistant renders this file as markdown before reading it as JSON. A bare
// email address or URL becomes an autolink, which injects quotes into the JSON
// and makes the signing page fail with a parse error.
for (const [key, field] of Object.entries(metadata)) {
  const text = `${field.title ?? ''} ${field.description ?? ''}`;
  if (/@|https?:\/\//.test(text)) {
    throw new Error(
      `cla-metadata.json field "${key}" contains an email address or URL. ` +
        'Markdown autolinking corrupts the metadata JSON; describe the process instead.',
    );
  }
}

const tempDir = mkdtempSync(join(tmpdir(), 'skillex-cla-'));

try {
  const gistClaPath = join(tempDir, 'CLA.md');
  const gistMetadataPath = join(tempDir, 'metadata');

  copyFileSync(claPath, gistClaPath);
  writeFileSync(gistMetadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');

  const output = execFileSync(
    'gh',
    [
      'gist',
      'create',
      '--public',
      '--desc',
      'SkillEx Individual Contributor License Agreement',
      gistClaPath,
      gistMetadataPath,
    ],
    { encoding: 'utf8' },
  );

  const url = output
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .pop();

  console.log(`Created CLA Gist: ${url}`);
  console.log('');
  console.log('Next steps:');
  console.log('1. Open https://cla-assistant.io and sign in with GitHub.');
  console.log('2. Install the CLA Assistant app for richard-kenneth/skillex.');
  console.log('3. Link the repository to the Gist above.');
  console.log('4. Require the CLA Assistant status check in branch protection.');
  console.log('5. Test with a pull request from a non-maintainer account.');
  console.log('');
  console.log('When CLA.md changes, edit the CLA.md file in this Gist. Do not create a new Gist.');
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
