import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localesDir = path.join(root, 'src/i18n/locales');
const localeFiles = fs.readdirSync(localesDir).filter((file) => file.endsWith('.json')).sort();

function flatten(value, prefix = '', output = new Map()) {
  for (const [key, child] of Object.entries(value)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, fullKey, output);
    else output.set(fullKey, child);
  }
  return output;
}

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return /\.(?:js|jsx|ts|tsx)$/.test(entry.name) ? [target] : [];
  });
}

const locales = new Map(localeFiles.map((file) => {
  const code = path.basename(file, '.json');
  return [code, flatten(JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8')))];
}));
const [referenceCode, reference] = locales.entries().next().value;
const problems = [];

for (const [code, entries] of locales) {
  const missing = [...reference.keys()].filter((key) => !entries.has(key));
  const extra = [...entries.keys()].filter((key) => !reference.has(key));
  if (missing.length) problems.push(`${code}: missing ${missing.length} keys\n  ${missing.join('\n  ')}`);
  if (extra.length) problems.push(`${code}: extra ${extra.length} keys\n  ${extra.join('\n  ')}`);

  for (const [key, referenceValue] of reference) {
    if (!entries.has(key) || typeof referenceValue !== 'string' || typeof entries.get(key) !== 'string') continue;
    const tokens = (value) => [...value.matchAll(/\{\{\s*([^},\s]+)[^}]*\}\}/g)].map((match) => match[1]).sort();
    const referenceTokens = tokens(referenceValue);
    const localeTokens = tokens(entries.get(key));
    if (referenceTokens.join('|') !== localeTokens.join('|')) {
      problems.push(`${code}: interpolation mismatch at ${key} (${referenceTokens.join(', ')} != ${localeTokens.join(', ')})`);
    }
  }
}

const staticKeyPattern = /\bt\(\s*['"]([^'"]+)['"]/g;
for (const file of sourceFiles(path.join(root, 'src'))) {
  const content = fs.readFileSync(file, 'utf8');
  for (const match of content.matchAll(staticKeyPattern)) {
    const key = match[1];
    const missingIn = [...locales].filter(([, entries]) => !entries.has(key)).map(([code]) => code);
    if (missingIn.length) {
      const line = content.slice(0, match.index).split('\n').length;
      problems.push(`${path.relative(root, file)}:${line}: ${key} is not a leaf key in ${missingIn.join(', ')}`);
    }
  }
}

if (problems.length) {
  console.error(`i18n check failed (reference locale: ${referenceCode})\n\n${problems.join('\n\n')}\n`);
  process.exit(1);
}

console.log(`i18n check passed: ${localeFiles.join(', ')} · ${reference.size} keys each`);
