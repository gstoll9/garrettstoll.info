// Systematic refresh of the site's external data (registry in scripts/data-sources.mjs).
//
// Usage: node scripts/update-data.mjs <command>   (or the npm run data:* aliases)
//   status              which jobs are due (default command)
//   run <job...>        run jobs (in dependency order); also --due for every due auto job, --all for every auto job
//   done <job...>       record a manual job's checklist as completed today
//   graph               regenerate public/knowledgegraph/datasources.fol from SOURCES
//   check               validate the registry and check every source URL still responds
//
// Last-run dates are kept in scripts/data-sources.state.json (commit it with the data). A job
// that has never been recorded falls back to the last git commit touching its outputs (or,
// for uncommitted outputs, their modification time).
// Downloads are cached under scripts/.cache/; delete a file there to refetch it.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { SOURCES, JOBS } from './data-sources.mjs';

const STATE_FILE = path.resolve('scripts/data-sources.state.json');
const CACHE_DIR = path.resolve('scripts/.cache');
const GRAPH_FILE = path.resolve('public/knowledgegraph/datasources.fol');
const DAY = 86400000;

const jobById = Object.fromEntries(JOBS.map(j => [j.id, j]));
const sourceById = Object.fromEntries(SOURCES.map(s => [s.id, s]));

const readState = () => (fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : {});
function record(ids) {
  const state = readState();
  const today = new Date().toISOString().slice(0, 10);
  for (const id of ids) state[id] = today;
  const sorted = Object.fromEntries(Object.entries(state).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(STATE_FILE, JSON.stringify(sorted, null, 2) + '\n');
}

function gitDate(paths) {
  const r = spawnSync('git', ['log', '-1', '--format=%cs', '--', ...paths], { encoding: 'utf8' });
  return r.stdout.trim() || null;
}

function lastRun(job, state) {
  if (state[job.id]) return { date: state[job.id], from: 'recorded' };
  const date = gitDate(job.outputs);
  if (date) return { date, from: 'git' };
  // Not committed yet: use the newest output file's modification time
  const mtimes = job.outputs.filter(o => fs.existsSync(o)).map(o => fs.statSync(o).mtimeMs);
  return mtimes.length
    ? { date: new Date(Math.max(...mtimes)).toISOString().slice(0, 10), from: 'file' }
    : { date: null, from: 'never' };
}

function isDue(job, state) {
  const { date } = lastRun(job, state);
  if (!date) return true;
  if (job.everyDays == null) return false;
  return Date.now() - Date.parse(date) >= job.everyDays * DAY;
}

// ── status ───────────────────────────────────────────────────────────────────
function status() {
  const state = readState();
  const rows = JOBS.map(j => {
    const { date, from } = lastRun(j, state);
    return [
      j.id, j.kind, date ? `${date}${from === 'recorded' ? '' : ` (${from})`}` : 'never',
      j.everyDays == null ? 'on release' : `${j.everyDays}d`,
      isDue(j, state) ? 'DUE' : 'ok', j.sources.map(s => sourceById[s]?.name ?? s).join(', '),
    ];
  });
  const head = ['job', 'kind', 'last run', 'every', 'status', 'sources'];
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map(r => r[i].length)));
  for (const r of [head, ...rows]) console.log(r.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd());
  const due = JOBS.filter(j => isDue(j, state));
  if (due.length) {
    console.log(`\n${due.length} due. Auto: npm run data:update -- --due` +
      (due.some(j => j.kind === 'manual') ? '; manual: npm run data:update -- <job> for its checklist' : ''));
  }
}

// ── run ──────────────────────────────────────────────────────────────────────
function ordered(ids) {
  const out = [];
  const visit = id => {
    if (out.includes(id)) return;
    for (const dep of jobById[id].after ?? []) if (ids.includes(dep)) visit(dep);
    out.push(id);
  };
  ids.forEach(visit);
  return out;
}

// A download is a URL, or { url, file } for an archive: it's extracted next to itself and
// `file` (a path inside it) is what the job gets. Extracting matters for shapefile zips:
// mapshaper given the whole Natural Earth zip also imports its README.html as a layer.
async function download(name, spec) {
  const { url, file: inner } = typeof spec === 'string' ? { url: spec } : spec;
  const file = path.join(CACHE_DIR, 'downloads', path.basename(new URL(url).pathname));
  if (!fs.existsSync(file)) {
    console.log(`  downloading ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`download ${name} failed: HTTP ${res.status}`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  if (!inner) return file;
  const dir = file.replace(/\.zip$/i, '');
  if (!fs.existsSync(path.join(dir, inner))) {
    const r = spawnSync('python', ['-I', '-m', 'zipfile', '-e', file, dir], { stdio: 'inherit' });
    if (r.status !== 0 || !fs.existsSync(path.join(dir, inner))) throw new Error(`${name}: ${inner} not found in ${file}`);
  }
  return path.join(dir, inner);
}

async function runJob(job) {
  const files = {};
  for (const [name, url] of Object.entries(job.downloads ?? {})) files[name] = await download(name, url);
  for (const step of job.steps) {
    const [cmd, ...args] = step.map(a => a
      .replace('{cache}', CACHE_DIR)
      .replace(/\{download:(\w+)\}/, (_, n) => files[n]));
    console.log(`  $ ${[cmd, ...args].join(' ')}`);
    const r = spawnSync(cmd, args, { stdio: 'inherit' });
    if (r.error) throw r.error;
    if (r.status !== 0) throw new Error(`${job.id}: "${step.join(' ')}" exited with ${r.status}`);
  }
}

async function run(argv) {
  const state = readState();
  let ids = argv.filter(a => !a.startsWith('--'));
  if (argv.includes('--all')) ids = JOBS.filter(j => j.kind === 'auto').map(j => j.id);
  if (argv.includes('--due')) ids = JOBS.filter(j => j.kind === 'auto' && isDue(j, state)).map(j => j.id);
  const unknown = ids.filter(id => !jobById[id]);
  if (unknown.length) throw new Error(`unknown job(s): ${unknown.join(', ')} (see npm run data:status)`);
  if (!ids.length) return console.log('Nothing to run.');

  const done = [];
  for (const id of ordered(ids)) {
    const job = jobById[id];
    console.log(`\n== ${id}`);
    if (job.kind === 'manual') {
      job.checklist.forEach((line, i) => console.log(`  ${i + 1}. ${line}`));
      console.log(`  Then: npm run data:done -- ${id}`);
      continue;
    }
    try {
      await runJob(job);
      record([id]);
      done.push(id);
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
      process.exitCode = 1;
      break;
    }
  }
  writeGraph();
  if (done.length) {
    const outputs = done.flatMap(id => jobById[id].outputs);
    const diff = spawnSync('git', ['status', '--short', '--', ...outputs], { encoding: 'utf8' }).stdout.trim();
    console.log(`\nUpdated: ${done.join(', ')}\n${diff ? `Changed files:\n${diff}` : 'No output files changed.'}`);
    console.log('Review the diff, then npm run lint && npm run build before committing.');
  }
}

// ── graph ────────────────────────────────────────────────────────────────────
function writeGraph() {
  const label = id => sourceById[id]?.name ?? id;
  const lines = [];
  for (const s of SOURCES) {
    for (const target of s.usedBy) {
      for (const license of s.licenses ?? [s.license]) lines.push(`${license}(${s.name}, ${label(target)})`);
    }
  }
  fs.writeFileSync(GRAPH_FILE, lines.join('\n') + '\n');
}

// ── check ────────────────────────────────────────────────────────────────────
async function check() {
  const problems = [];
  for (const s of SOURCES) {
    if (/[(),]/.test(s.name)) problems.push(`${s.id}: name can't contain ( ) or , (knowledge graph syntax)`);
    for (const l of s.licenses ?? [s.license]) if (!l || /[\s(),]/.test(l)) problems.push(`${s.id}: bad license token "${l}"`);
    for (const t of s.usedBy) if (!t.startsWith('/') && !sourceById[t]) problems.push(`${s.id}: usedBy unknown source "${t}"`);
    for (const t of s.usedBy.filter(t => t.startsWith('/'))) {
      if (!fs.existsSync(path.resolve('src/app', t.slice(1), 'page.tsx'))) problems.push(`${s.id}: no page for route ${t}`);
    }
  }
  for (const j of JOBS) {
    for (const s of j.sources) if (!sourceById[s]) problems.push(`${j.id}: unknown source "${s}"`);
    for (const d of j.after ?? []) if (!jobById[d]) problems.push(`${j.id}: unknown dependency "${d}"`);
    for (const o of j.outputs) if (!fs.existsSync(path.resolve(o))) problems.push(`${j.id}: output ${o} doesn't exist`);
  }

  const results = await Promise.all(SOURCES.filter(s => s.url).map(async s => {
    try {
      const res = await fetch(s.url, { redirect: 'follow', signal: AbortSignal.timeout(20000),
        headers: { 'User-Agent': 'garrettstoll.info-data-check/0.1 (https://github.com/gstoll9/garrettstoll.info)' } });
      return [s, res.status];
    } catch (err) {
      return [s, err.name === 'TimeoutError' ? 'timeout' : err.message];
    }
  }));
  for (const [s, code] of results) {
    console.log(`${String(code).padEnd(8)} ${s.name}  ${s.url}`);
    if (code !== 200) problems.push(`${s.id}: ${s.url} returned ${code}`);
  }
  for (const s of SOURCES.filter(s => (s.licenses ?? [s.license]).includes('Unverified'))) {
    console.log(`\nLicense unverified: ${s.name}`);
  }
  console.log(problems.length ? `\n${problems.length} problem(s):\n  ${problems.join('\n  ')}` : '\nRegistry OK.');
  if (problems.length) process.exitCode = 1;
}

// ── main ─────────────────────────────────────────────────────────────────────
const [command = 'status', ...rest] = process.argv.slice(2);
if (command === 'status') status();
else if (command === 'run') await run(rest);
else if (command === 'done') {
  const unknown = rest.filter(id => !jobById[id]);
  if (unknown.length || !rest.length) throw new Error(`usage: done <job...> (unknown: ${unknown.join(', ')})`);
  record(rest);
  console.log(`Recorded ${rest.join(', ')}.`);
} else if (command === 'graph') { writeGraph(); console.log(`Wrote ${path.relative(process.cwd(), GRAPH_FILE)}`); }
else if (command === 'check') await check();
else throw new Error(`unknown command "${command}"`);
