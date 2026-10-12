// Lighthouse (mobile) on the key pages, against a launch-like copy of dist/ (robots.txt allowed, no noindex headers).
//
//   npm run build && node scripts/lighthouse.mjs <label>
//
// Staging blocks indexing on purpose (public/_headers and robots.txt), which would fail Lighthouse's "is crawlable"
// audit. This script copies dist/ to a temporary folder, replaces robots.txt, serves it on a free port, runs Lighthouse on
// each page with a hard timeout, then stops the server and deletes the copy. Nothing is left running.
// Reports: .cache/lh/<label>-<page>.json.  Needs the installed Edge or Chrome (CHROME_PATH to override).
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const label = process.argv[2] ?? 'run';
const port = Number(process.argv[3] ?? 4323);
const root = process.cwd();
const pages = [
  ['home', '/'],
  ['transaxillary', '/procedures/no-scar-breast-augmentation-transaxillary/'],
  ['gallery', '/gallery/breast-enlargement/'],
  ['case-study', '/case-study/38-year-female-newest-natrelle-inspira-soft-touch-implant-ssf-365cc/'],
  ['contact', '/contact/'],
];
const only = process.env.LH_ONLY?.split(',');
const chrome = [process.env.CHROME_PATH, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean).find(existsSync);
if (!chrome) throw new Error('No Edge or Chrome found. Set CHROME_PATH.');

const site = join(root, '.cache', `lh-site-${Date.now()}`);
mkdirSync(join(root, '.cache', 'lh'), { recursive: true });
cpSync(join(root, 'dist'), site, { recursive: true });
writeFileSync(join(site, 'robots.txt'), 'User-agent: *\nAllow: /\n');
rmSync(join(site, '_headers'), { force: true });

const server = spawn(process.execPath, [join(root, 'scripts', 'serve-static.mjs'), site, String(port)], { stdio: 'ignore' });
const cleanup = () => {
  try {
    server.kill('SIGKILL');
  } catch {}
  // Give Windows a moment to release the folder, then remove it. Failure to delete is not fatal.
  setTimeout(() => {
    try {
      rmSync(site, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
    } catch (e) {
      console.warn('Could not remove', site, '(delete it by hand later):', e.code);
    }
  }, 800);
};
process.on('exit', () => {
  try {
    server.kill('SIGKILL');
  } catch {}
});

await new Promise((r) => setTimeout(r, 1500));
const rows = [];
try {
  for (const [name, path] of pages) {
    if (only && !only.includes(name)) continue;
    const out = join(root, '.cache', 'lh', `${label}-${name}.json`);
    const r = spawnSync(
      process.execPath,
      [join(root, 'node_modules', 'lighthouse', 'cli', 'index.js'), `http://localhost:${port}${path}`, '--quiet', '--output=json', `--output-path=${out}`, '--form-factor=mobile', '--only-categories=performance,accessibility,best-practices,seo', '--chrome-flags=--headless=new --no-sandbox'],
      { env: { ...process.env, CHROME_PATH: chrome }, encoding: 'utf8', timeout: 240000 },
    );
    if (!existsSync(out)) {
      console.log(name, 'FAILED', r.error?.code ?? '', (r.stderr || '').slice(-200));
      continue;
    }
    const j = JSON.parse(readFileSync(out, 'utf8'));
    const c = j.categories;
    const a = j.audits;
    rows.push({
      page: name,
      perf: Math.round(c.performance.score * 100),
      a11y: Math.round(c.accessibility.score * 100),
      bp: Math.round(c['best-practices'].score * 100),
      seo: Math.round(c.seo.score * 100),
      FCP: a['first-contentful-paint'].displayValue,
      LCP: a['largest-contentful-paint'].displayValue,
      TBT: a['total-blocking-time'].displayValue,
      CLS: a['cumulative-layout-shift'].displayValue,
      bench: Math.round(j.environment.benchmarkIndex),
    });
  }
} finally {
  cleanup();
}
console.table(rows);
setTimeout(() => process.exit(0), 1500);
