import test from 'node:test';
import assert from 'node:assert/strict';

function compareStableVersions(current, candidate) {
  const parse = (v) => {
    const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
    if (!m) throw new Error('Expected stable semantic version: ' + v);
    return m.slice(1).map(Number);
  };
  const a = parse(current);
  const b = parse(candidate);
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return b[i] > a[i] ? 1 : -1;
  }
  return 0;
}

test('allows a newer release', () => { assert.equal(compareStableVersions('3.0.29', '3.0.30'), 1); });
test('rejects a downgrade', () => { assert.equal(compareStableVersions('3.0.29', '3.0.27'), -1); });
test('detects same-version redeploy', () => { assert.equal(compareStableVersions('3.0.29', '3.0.29'), 0); });
test('compares numeric components rather than strings', () => { assert.equal(compareStableVersions('3.0.9', '3.0.10'), 1); });
test('rejects prerelease and malformed versions', () => {
  assert.throws(() => compareStableVersions('3.0.29', '3.0.30-beta.1'));
  assert.throws(() => compareStableVersions('latest', '3.0.30'));
});
