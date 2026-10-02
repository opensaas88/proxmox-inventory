import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeMigration, migrationFindings, workloadKey, csvCell, GiB } from './migration.js';

const vm = { node: 'pve1', vmid: 100, cpus: 4, maxmem: 8 * GiB, maxdisk: 80 * GiB, status: 'running' };

test('empty or missing capacity never passes readiness', () => {
  assert.ok(analyzeMigration([], { cpu: 4, ram: 8, disk: 80 }).checks.every(c => c.state === 'unknown'));
  assert.ok(analyzeMigration([vm], { cpu: '', ram: '', disk: '' }).checks.every(c => c.state === 'unknown'));
});
test('capacity counts all selected allocations and includes stopped workloads', () => {
  const result = analyzeMigration([vm, { ...vm, status: 'stopped' }], { cpu: 8, ram: 15, disk: 0 });
  assert.deepEqual(result.totals, { cpu: 8, ram: 16, disk: 160 });
  assert.deepEqual(result.checks.map(c => c.state), ['fits', 'exceeded', 'exceeded']);
});
test('missing allocations are unknown even when recorded totals fit', () => {
  assert.equal(analyzeMigration([{ ...vm, maxmem: 0 }], { ram: 128 }).checks[1].state, 'unknown');
});
test('invalid budgets are unknown', () => {
  assert.ok(analyzeMigration([vm], { cpu: -1, ram: 'invalid', disk: Infinity }).checks.every(c => c.state === 'unknown'));
});
test('identity distinguishes node and workload type', () => {
  assert.notEqual(workloadKey(vm), workloadKey({ ...vm, type: 'lxc' }));
  assert.notEqual(workloadKey(vm), workloadKey({ ...vm, node: 'pve2' }));
});
test('analysis exposes incomplete OS, running status and LXC limitations', () => {
  assert.ok(migrationFindings(vm).some(f => f.includes('OS non identifié')));
  assert.ok(migrationFindings(vm).some(f => f.includes('Machine active')));
  assert.ok(migrationFindings({ ...vm, type: 'lxc' }).some(f => f.includes('montages')));
});
test('CSV quotes delimiters and neutralizes spreadsheet formulas', () => {
  assert.equal(csvCell('a;"b"\nc'), '"a;""b""\nc"');
  assert.equal(csvCell('=1+1'), '"\'=1+1"');
  assert.equal(csvCell(' @SUM(A1)'), '"\' @SUM(A1)"');
});
