// Validates every JSON-LD block in dist/ against the schema.org vocabulary.
//
//   npm run build && node scripts/validate-jsonld.mjs
//
// For each node: the @type must exist, every property must exist and belong to the type (or one of its parents),
// and object values with their own @type must be allowed by the property's range. The vocabulary is downloaded once
// into .cache/. This is a structural check; Google's Rich Results Test remains the final word for rich-result features.
import { readdir, readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import * as cheerio from 'cheerio';

const root = process.cwd();
const vocabFile = join(root, '.cache', 'schemaorg-current-https.jsonld');
if (!existsSync(vocabFile)) {
  await mkdir(join(root, '.cache'), { recursive: true });
  const res = await fetch('https://schema.org/version/latest/schemaorg-current-https.jsonld');
  if (!res.ok) throw new Error('Could not download the schema.org vocabulary: ' + res.status);
  await writeFile(vocabFile, Buffer.from(await res.arrayBuffer()));
}
const vocab = JSON.parse(await readFile(vocabFile, 'utf8'))['@graph'];
const short = (id) => String(id).replace(/^(schema:|https?:\/\/schema\.org\/)/, '');
const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

const classes = new Map(); // name -> parents[]
const props = new Map(); // name -> { domains:Set, ranges:Set }
for (const n of vocab) {
  const types = arr(n['@type']).map(short);
  const name = short(n['@id']);
  if (types.includes('rdfs:Class') || types.includes('Class')) classes.set(name, arr(n['rdfs:subClassOf']).map((x) => short(x['@id'])));
  if (types.includes('rdf:Property') || types.includes('Property')) {
    props.set(name, {
      domains: new Set(arr(n['schema:domainIncludes']).map((x) => short(x['@id']))),
      ranges: new Set(arr(n['schema:rangeIncludes']).map((x) => short(x['@id']))),
    });
  }
}
const ancestors = (t, seen = new Set()) => {
  if (seen.has(t)) return seen;
  seen.add(t);
  for (const p of classes.get(t) ?? []) ancestors(p, seen);
  return seen;
};
const DATATYPES = new Set(['Text', 'URL', 'Number', 'Integer', 'Float', 'Boolean', 'Date', 'DateTime', 'Time', 'DataType', 'CssSelectorType', 'XPathType', 'PronounceableText']);

const errors = [];
function checkNode(node, where) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) return node.forEach((n) => checkNode(n, where));
  if (node['@graph']) return checkNode(node['@graph'], where);
  const types = arr(node['@type']);
  for (const t of types) if (!classes.has(t)) errors.push(`${where}: unknown type "${t}"`);
  const typeAnc = new Set(types.flatMap((t) => [...ancestors(t)]));
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('@')) continue;
    const p = props.get(key);
    if (!p) {
      errors.push(`${where}: unknown property "${key}" on ${types.join('/')}`);
      continue;
    }
    if (types.length && ![...p.domains].some((d) => typeAnc.has(d))) errors.push(`${where}: property "${key}" is not valid on ${types.join('/')}`);
    for (const v of arr(value)) {
      if (v && typeof v === 'object' && v['@type']) {
        const vt = arr(v['@type']);
        const vAnc = new Set(vt.flatMap((t) => [...ancestors(t)]));
        const ok = [...p.ranges].some((r) => vAnc.has(r) || DATATYPES.has(r) === false && false);
        if (!ok && ![...p.ranges].some((r) => DATATYPES.has(r) && vt.length === 0)) errors.push(`${where}: "${key}" does not accept type ${vt.join('/')} (expects ${[...p.ranges].join(' | ')})`);
      }
      if (v && typeof v === 'object') checkNode(v, `${where} > ${key}`);
    }
  }
}

async function* walk(dir) {
  for (const name of await readdir(dir)) {
    const full = join(dir, name);
    if ((await stat(full)).isDirectory()) yield* walk(full);
    else if (full.endsWith('.html')) yield full;
  }
}
let files = 0;
let blocks = 0;
const typeCount = {};
for await (const file of walk(join(root, 'dist'))) {
  files++;
  const $ = cheerio.load(await readFile(file, 'utf8'));
  $('script[type="application/ld+json"]').each((_, el) => {
    blocks++;
    let data;
    try {
      data = JSON.parse($(el).text());
    } catch (e) {
      errors.push(`${file}: invalid JSON (${e.message})`);
      return;
    }
    if (!String(data['@context']).includes('schema.org')) errors.push(`${file}: missing schema.org @context`);
    const nodes = data['@graph'] ?? [data];
    for (const n of nodes) for (const t of arr(n['@type'])) typeCount[t] = (typeCount[t] ?? 0) + 1;
    checkNode(data, file.replace(root, '').replace(/\\/g, '/'));
  });
}
console.log(`Checked ${blocks} JSON-LD blocks on ${files} pages. Types:`, typeCount);
const unique = [...new Set(errors.map((e) => e.replace(/^[^:]*: /, '')))];
if (unique.length) {
  console.log(`\n${unique.length} distinct problems:`);
  unique.forEach((e) => console.log('  - ' + e));
  process.exit(1);
}
console.log('JSON-LD check passed: valid JSON, known types and properties, ranges respected.');
