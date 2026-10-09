#!/usr/bin/env node

export function compareStableVersions(currentVersion, candidateVersion) {
  function parse(version) {
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(version).trim());
    if (!match) throw new Error('Expected stable semantic version, got: ' + version);
    return match.slice(1).map(Number);
  }

  const current = parse(currentVersion);
  const candidate = parse(candidateVersion);
  for (let i = 0; i < current.length; i++) {
    if (candidate[i] !== current[i]) return candidate[i] > current[i] ? 1 : -1;
  }
  return 0;
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  const [, , currentVersion, candidateVersion] = process.argv;
  if (!currentVersion || !candidateVersion) {
    console.error('Usage: node scripts/compare-release-versions.mjs <current> <candidate>');
    process.exit(2);
  }

  try {
    const comparison = compareStableVersions(currentVersion, candidateVersion);
    console.log('Live production: ' + currentVersion + '; candidate: ' + candidateVersion);
    if (comparison < 0) throw new Error('Refusing downgrade. Candidate is older than live production.');
    if (comparison === 0) throw new Error('Refusing same-version redeployment without a version bump.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
