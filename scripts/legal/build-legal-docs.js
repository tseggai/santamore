#!/usr/bin/env node
/**
 * Builds content/legal/docs.json: the governance documents rendered for the site's legal
 * pages (the public parts, per language) and the console's Rules section (whole documents,
 * Montenegrin and English side by side, plus the working notes).
 *   node scripts/legal/build-legal-docs.js
 */
const fs = require('fs'), path = require('path');
const { buildDocs } = require('./legal-docs');
const { docs, missing, order } = buildDocs();
const out = path.join(__dirname, '..', '..', 'content/legal/docs.json');
fs.writeFileSync(out, JSON.stringify({ builtAt: new Date().toISOString().slice(0, 10), order, docs }, null, 0) + '\n');
console.log('wrote', out, Math.round(fs.statSync(out).size / 1024) + ' KB;', Object.keys(docs).length, 'documents' + (missing.length ? `; missing language files: ${missing.join(', ')}` : ''));
if (missing.length) process.exitCode = 1;
