'use strict';
const postcss = require('../toolchain/node_modules/postcss');
const crypto = require('node:crypto');

function inventoryCss(css, source = 'input.css') {
  const ast = postcss.parse(css, {from: source});
  const nodes = [];
  ast.walk(node => {
    if (!['comment','rule','decl','atrule'].includes(node.type)) {
      throw new Error(`Unsupported CSS node: ${node.type}`);
    }
    const conditions = [];
    let selector = null;
    for (let parent = node.parent; parent && parent.type !== 'root'; parent = parent.parent) {
      if (parent.type === 'atrule') conditions.unshift({name: parent.name, params: parent.params});
      if (selector === null && parent.type === 'rule') selector = parent.selector;
    }
    const ordinal = nodes.length;
    nodes.push({
      id: crypto.createHash('sha256').update(source + ':' + ordinal + ':' + node.toString()).digest('hex'),
      source, ordinal, type: node.type, conditions,
      selector: node.type === 'rule' ? node.selector : selector,
      property: node.type === 'decl' ? node.prop : null,
      value: node.type === 'decl' ? node.value : null,
      important: node.type === 'decl' ? Boolean(node.important) : false,
      name: node.type === 'atrule' ? node.name : null,
      params: node.type === 'atrule' ? node.params : null,
      start: node.source.start, end: node.source.end,
      css: node.toString()
    });
  });
  const counts = {};
  for (const node of nodes) counts[node.type] = (counts[node.type] || 0) + 1;
  return {source, sha256: crypto.createHash('sha256').update(css).digest('hex'), counts, nodes};
}
function diffInventories(before, after) {
  // Conservative occurrence alignment. This is structural triage, not a rendering oracle.
  const signature = node => JSON.stringify([node.type, node.conditions, node.selector,
    node.property, node.name, node.params]);
  const group = nodes => {
    const groups = new Map();
    for (const node of nodes) {
      const key = signature(node);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(node);
    }
    return groups;
  };
  const oldGroups = group(before.nodes), newGroups = group(after.nodes);
  const keys = new Set([...oldGroups.keys(), ...newGroups.keys()]);
  const entries = [];
  for (const key of keys) {
    const old = oldGroups.get(key) || [], current = newGroups.get(key) || [];
    for (let i = 0; i < Math.max(old.length, current.length); i++) {
      const a = old[i] || null, b = current[i] || null;
      const kind = !a ? 'added' : !b ? 'removed' : a.css !== b.css ? 'changed' :
        a.ordinal !== b.ordinal ? 'order-shifted' : 'identical';
      entries.push({id: crypto.createHash('sha256').update(key + ':' + i).digest('hex'),
        kind, status: kind === 'identical' ? 'structurally-identical' : 'pending', before:a, after:b});
    }
  }
  const accountedBefore = entries.filter(e => e.before).map(e => e.before.id);
  const accountedAfter = entries.filter(e => e.after).map(e => e.after.id);
  if (new Set(accountedBefore).size !== before.nodes.length ||
      new Set(accountedAfter).size !== after.nodes.length) throw new Error('Unaccounted CSS occurrence');
  const counts = {};
  for (const entry of entries) counts[entry.kind] = (counts[entry.kind] || 0) + 1;
  return {schema_version:1, interpretation:'Structural potential changes; non-identical entries require contextual analysis, not automatic restoration.',
    before:{source:before.source,sha256:before.sha256,counts:before.counts,nodes:before.nodes.length},
    after:{source:after.source,sha256:after.sha256,counts:after.counts,nodes:after.nodes.length}, counts, entries};
}
module.exports = {inventoryCss, diffInventories};

if (require.main === module) {
  const fs = require('node:fs');
  const [beforePath, afterPath, outputPath] = process.argv.slice(2);
  if (!beforePath || !afterPath || !outputPath) {
    console.error('Usage: node inventory.cjs BEFORE.css AFTER.css OUTPUT.json');
    process.exitCode = 2;
  } else {
    try {
      const before = inventoryCss(fs.readFileSync(beforePath, 'utf8'), beforePath);
      const after = inventoryCss(fs.readFileSync(afterPath, 'utf8'), afterPath);
      const report = diffInventories(before, after);
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
      console.log(JSON.stringify({before:report.before, after:report.after, counts:report.counts}));
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
