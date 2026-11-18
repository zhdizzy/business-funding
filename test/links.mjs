// Live-link check for every external URL the tool can render. Run from tbv-tools/business-funding:
//   node test/links.mjs
// Walks every export of the six data files for http(s) strings (so new rows and new fields are picked up without
// editing this file), adds the SBA fee notice the page links from Founder Stack's rules module, plus literal URLs
// in the page and scripts. Follows redirects and reports anything that does not end at 2xx. No dead pages ship.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as P from '../data/funding-paths.js';
import * as E from '../data/equity-sources.js';
import * as G from '../data/grants.js';
import * as X from '../data/ended-programs.js';
import * as S from '../data/state-funding.js';
import * as C from '../data/changes.js';
import * as LN from '../data/lenders.js';
import { SBA_FEES } from '../../veteran-business/data/rules.js';
const execFileP = promisify(execFile);

const root = fileURLToPath(new URL('../', import.meta.url));
const urls = new Map();
const add = (u, where) => { if (typeof u === 'string' && /^https?:\/\/\S+$/.test(u) && !/\$\{|googletagmanager|thebetterveteran\.com|schema\.org|example\.(com|org)/.test(u)) { if (!urls.has(u)) urls.set(u, new Set()); urls.get(u).add(where); } };
function walk(v, where, seen = new Set()) {
  if (typeof v === 'string') add(v, where);
  else if (v && typeof v === 'object' && !seen.has(v)) { seen.add(v); for (const [k, x] of Object.entries(v)) walk(x, Array.isArray(v) ? `${where}[${x && x.id ? x.id : k}]` : (where.includes('[') || where.includes('.') ? where : `${where}.${k}`), seen); }
}
for (const [name, mod] of Object.entries({ 'funding-paths': P, 'equity-sources': E, grants: G, 'ended-programs': X, 'state-funding': S, changes: C, lenders: LN })) walk({ ...mod }, name);
add(SBA_FEES.noticeUrl, 'veteran-business rules SBA_FEES.noticeUrl');
for (const f of ['index.html', 'script.js', 'engine.js']) for (const m of readFileSync(root + f, 'utf8').matchAll(/https?:\/\/[^\s'"`)<]+/g)) add(m[0].replace(/[.,;]+$/, ''), f);

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
// Sites that serve a bot wall to every scripted request but are live in a browser go here, each with the date a
// human-equivalent fetch confirmed the page. Empty on purpose: nothing is excused until someone has looked.
const KNOWN_BOT_WALLS = {};
async function curl(u, secs) { const { stdout } = await execFileP('curl', ['-sL', '-o', '/dev/null', '-m', String(secs), '-A', UA, '-w', '%{http_code} %{url_effective}', u]); const [st, fin] = stdout.trim().split(' '); return { status: parseInt(st, 10) || 0, final: fin || u, viaCurl: true }; }
async function probe(u) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 25000);
  const H = { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,application/pdf,application/json,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9' };
  const wall = KNOWN_BOT_WALLS[new URL(u).hostname];
  try {
    const res = await fetch(u, { method: 'GET', redirect: 'follow', signal: ctl.signal, headers: H });
    if (res.status >= 200 && res.status < 300) return { status: res.status, final: res.url };
    try { const c = await curl(u, 40); if (c.status >= 200 && c.status < 300) return c; } catch {}
    if (wall) return { status: 200, final: res.url, botWall: wall };
    return { status: res.status, final: res.url };
  } catch (e) {
    try { const c = await curl(u, 60); if (c.status >= 200 && c.status < 300) return c; if (!wall) return { ...c, error: e.name === 'AbortError' ? 'timeout' : (e.cause?.code || e.message) }; } catch {}
    if (wall) return { status: 200, final: u, botWall: wall };
    return { status: 0, error: e.name === 'AbortError' ? 'timeout' : (e.cause?.code || e.message) };
  } finally { clearTimeout(t); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const all = [...urls.keys()];
// The Wayback Machine rate-limits parallel probes; check archived copies one at a time with a pause.
const archive = all.filter(u => /web\.archive\.org/.test(u)), list = all.filter(u => !/web\.archive\.org/.test(u));
console.log(`${all.length} external URLs (${archive.length} archived copies checked one at a time)`);
const results = [];
let i = 0;
await Promise.all(Array.from({ length: 6 }, async () => { while (i < list.length) { const u = list[i++]; let r = await probe(u); if (!(r.status >= 200 && r.status < 300) && (r.status === 0 || r.status === 429 || r.status >= 500)) { await sleep(3000); r = await probe(u); } results.push({ u, ...r }); } }));
for (const u of archive) { let r = await probe(u); if (!(r.status >= 200 && r.status < 300)) { await sleep(10000); r = await probe(u); } results.push({ u, ...r }); await sleep(2500); }
let bad = 0;
for (const r of results.sort((a, b) => a.u.localeCompare(b.u))) {
  const live = r.status >= 200 && r.status < 300;
  if (!live) bad++;
  if (!live || r.botWall) console.log(`${live ? 'OK  ' : 'DEAD'} ${r.status}${r.viaCurl ? ' (curl)' : ''}${r.botWall ? ' (bot wall: ' + r.botWall + ')' : ''}  ${r.u}${r.error ? '  ' + r.error : ''}${!live ? '  <- ' + [...urls.get(r.u)].slice(0, 4).join(', ') : ''}`);
}
console.log(bad ? `${bad} of ${all.length} LINK(S) DID NOT RETURN 2xx` : `ALL ${all.length} LINKS LIVE`);
process.exitCode = bad ? 1 : 0;
