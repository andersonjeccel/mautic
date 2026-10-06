#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const postcss = require('./toolchain/node_modules/postcss');
const selectorParser = require('./toolchain/node_modules/postcss-selector-parser');

const [bootstrap3Path, currentPath, outputPath, reportPath] = process.argv.slice(2);

if (!reportPath) {
    console.error('Usage: generate_legacy_classes.js <bootstrap-3.css> <current.css> <output.scss> <report.json>');
    process.exit(1);
}

function parseCss(filePath) {
    return postcss.parse(fs.readFileSync(filePath, 'utf8'), {from: filePath});
}

function selectorClasses(selector) {
    const classes = new Set();

    try {
        selectorParser((selectors) => {
            selectors.walkClasses((node) => classes.add(node.value));
        }).processSync(selector);
    } catch (error) {
        return classes;
    }

    return classes;
}

function allClasses(root) {
    const classes = new Set();

    root.walkRules((rule) => {
        for (const name of selectorClasses(rule.selector)) {
            classes.add(name);
        }
    });

    return classes;
}

function filterRuleSelectors(rule, wanted) {
    const kept = [];

    try {
        selectorParser((selectors) => {
            selectors.each((selector) => {
                let include = false;

                selector.walkClasses((node) => {
                    if (wanted.has(node.value)) {
                        include = true;
                    }
                });

                if (include) {
                    kept.push(selector.toString());
                }
            });
        }).processSync(rule.selector);
    } catch (error) {
        return [];
    }

    return kept;
}

function filteredRoot(source, wanted, label) {
    const output = postcss.root();
    output.append(postcss.comment({text: `${label} removed-class compatibility`}));

    function copyContainer(sourceContainer, targetContainer) {
        for (const node of sourceContainer.nodes || []) {
            if (node.type === 'rule') {
                const selectors = filterRuleSelectors(node, wanted);

                if (selectors.length) {
                    const clone = node.clone();
                    clone.selector = selectors.join(',\n');
                    targetContainer.append(clone);
                }
                continue;
            }

            if (node.type === 'atrule' && node.nodes && !/keyframes$/i.test(node.name)) {
                const clone = node.clone({nodes: []});
                copyContainer(node, clone);
                if (clone.nodes.length) {
                    targetContainer.append(clone);
                }
            }
        }
    }

    copyContainer(source, output);

    return output;
}

const bootstrap3 = parseCss(bootstrap3Path);
const current = parseCss(currentPath);
const bootstrap3Classes = allClasses(bootstrap3);
const currentClasses = allClasses(current);
const removedBootstrap3 = new Set([...bootstrap3Classes].filter((name) => !currentClasses.has(name)));
const output = postcss.root();

output.append(postcss.comment({text: 'Generated from Bootstrap 3.4.1. Do not edit manually.'}));
output.append(filteredRoot(bootstrap3, removedBootstrap3, 'Bootstrap 3.4.1'));

fs.mkdirSync(path.dirname(outputPath), {recursive: true});
fs.mkdirSync(path.dirname(reportPath), {recursive: true});
fs.writeFileSync(outputPath, `${output.toString()}\n`);
fs.writeFileSync(reportPath, `${JSON.stringify({
    bootstrap3RemovedClasses: [...removedBootstrap3].sort(),
    bootstrap3Version: '3.4.1',
}, null, 2)}\n`);

console.log(JSON.stringify({
    bootstrap3RemovedClasses: removedBootstrap3.size,
    outputBytes: fs.statSync(outputPath).size,
}));
