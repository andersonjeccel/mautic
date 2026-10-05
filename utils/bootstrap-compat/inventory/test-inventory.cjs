'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { inventoryCss, diffInventories } = require('./inventory.cjs');

test('accounts for every duplicate declaration, fallback and conditional rule', () => {
  const report = inventoryCss('/* provenance */ .x {display:block;display:flex} @media(min-width:768px){.x{font-weight:400!important}}', 'fixture.css');
  assert.equal(report.nodes.length, 7);
  assert.deepEqual(report.nodes.filter(n => n.type === 'decl').map(n => [n.property,n.value,n.important]), [
    ['display','block',false], ['display','flex',false], ['font-weight','400',true]
  ]);
  const weight = report.nodes.find(n => n.property === 'font-weight');
  assert.deepEqual(weight.conditions, [{name:'media',params:'(min-width:768px)'}]);
  assert.equal(weight.selector, '.x');
  assert.equal(new Set(report.nodes.map(n => n.id)).size, report.nodes.length);
});

test('diff accounts for both sides including removed fallbacks and new global rules', () => {
  const before = inventoryCss('.x{display:block;display:flex} @media(min-width:768px){.x{font-weight:400}}', 'before.css');
  const after = inventoryCss('.x{display:flex} body{font-weight:600} @media(min-width:768px){.x{font-weight:400}}', 'after.css');
  const diff = diffInventories(before, after);
  assert.equal(diff.entries.filter(e => e.before).length, before.nodes.length);
  assert.equal(diff.entries.filter(e => e.after).length, after.nodes.length);
  assert.ok(diff.entries.some(e => e.kind === 'removed' && e.before.property === 'display'));
  assert.ok(diff.entries.some(e => e.kind === 'added' && e.after.selector === 'body'));
  assert.ok(diff.entries.filter(e => e.kind !== 'identical').every(e => e.status === 'pending'));
  assert.equal(new Set(diff.entries.filter(e => e.before).map(e => e.before.id)).size, before.nodes.length);
  assert.equal(new Set(diff.entries.filter(e => e.after).map(e => e.after.id)).size, after.nodes.length);
});

test('CLI writes parseable complete inventories and reports parse failure without success output', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const { spawnSync } = require('node:child_process');
  const scratch = fs.mkdtempSync(path.join(process.env.TMPDIR, 'css-inventory-test-'));
  try {
    fs.writeFileSync(path.join(scratch,'before.css'), '.x{display:block;display:flex}');
    fs.writeFileSync(path.join(scratch,'after.css'), '.x{display:flex}');
    const output = path.join(scratch,'diff.json');
    const run = spawnSync(process.execPath, [path.join(__dirname,'inventory.cjs'), path.join(scratch,'before.css'), path.join(scratch,'after.css'), output], {encoding:'utf8'});
    assert.equal(run.status, 0, run.stderr);
    assert.ok(fs.existsSync(output), 'CLI must write the actual inventory report');
    assert.equal(JSON.parse(fs.readFileSync(output,'utf8')).before.nodes, 3);
    fs.writeFileSync(path.join(scratch,'invalid.css'), '.x{color:');
    const failedOutput = path.join(scratch,'invalid.json');
    const bad = spawnSync(process.execPath, [path.join(__dirname,'inventory.cjs'), path.join(scratch,'invalid.css'), path.join(scratch,'after.css'), failedOutput], {encoding:'utf8'});
    assert.notEqual(bad.status, 0);
    assert.equal(fs.existsSync(failedOutput), false);
  } finally { fs.rmSync(scratch, {recursive:true,force:true}); }
});
