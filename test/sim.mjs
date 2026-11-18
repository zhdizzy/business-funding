// Veteran Business Funding Finder: node harness. Run from tbv-tools/business-funding:  node test/sim.mjs
// Grid: modes x amounts ($5K to $2M) x own cash x ownership x citizenship x months x business types x states,
// plus date cases (the `today` the engine takes is injectable) and in-memory injections for the rules that the
// live data cannot exercise on a given day (a pending state, ended rows missing a proof field, empty data files).
// The data files on disk are never written; injections mutate the imported arrays in this process and are undone.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { solve, buildChecklist, checklistToText, checklistToHtml, grantStatus, endedRowIsProven, fmtUSD, MODES, OWNERSHIP, BIZ_TYPES } from '../engine.js';
import { buildDocxBytes } from '../docx.js';
import * as P from '../data/funding-paths.js';
import * as E from '../data/equity-sources.js';
import * as G from '../data/grants.js';
import * as X from '../data/ended-programs.js';
import * as S from '../data/state-funding.js';
import * as C from '../data/changes.js';
// The fee schedule is Founder Stack's. Same file the browser imports at /veteran-business/data/rules.js.
import { sbaFee, SBA_FEES, monthlyComp } from '../../veteran-business/data/rules.js';

let fails = 0, checks = 0;
const failed = new Map();
const ok = (cond, msg) => { checks++; if (!cond) { fails++; failed.set(msg, (failed.get(msg) || 0) + 1); } };
const CTX = today => ({ today, sbaFee, SBA_FEES, monthlyComp });
const TODAY = '2026-11-17';
const esc = s => String(s ?? '');

/* ─── Which strings did the engine write, and which are the owner's data passed through? ─── */
const dataStrings = new Set();
(function walk(v) { if (typeof v === 'string') dataStrings.add(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk); })([P, E, G, X, S, C].map(m => ({ ...m })));
function strings(v, out = [], seen = new Set()) {
  if (typeof v === 'string') out.push(v);
  else if (v && typeof v === 'object' && !seen.has(v)) { seen.add(v); (Array.isArray(v) ? v : Object.values(v)).forEach(x => strings(x, out, seen)); }
  return out;
}
const BANNED = /you qualify|guaranteed|free money/i;
const LEAK = /undefined|NaN|\[object Object\]/;
const DASH = /[–—]/;
function authored(r) { return strings(r).filter(t => !dataStrings.has(t)); }

/* ─── Per-result invariants ─────────────────────────────────────────────── */
function invariants(r, label) {
  const s = r.s, today = r.today;
  const mine = authored(r);
  ok(!mine.some(t => BANNED.test(t)), `banned phrase in an engine-written string (${mine.find(t => BANNED.test(t))})`);
  ok(!mine.some(t => LEAK.test(t)), `undefined/NaN leaked into a string (${mine.find(t => LEAK.test(t))})`);
  ok(!mine.some(t => DASH.test(t)), 'em or en dash in an engine-written string');
  ok(r.hero && r.hero.kicker && r.hero.lines.length >= 1, `${label}: hero has a kicker and at least one line`);
  // $0-cash figure
  const z = r.zeroCash;
  if (s.amount != null) { ok(z.amount >= 0 && z.amount <= s.amount, `${label}: $0-cash figure exceeds the amount needed`); ok(z.amount <= z.uncapped, `${label}: $0-cash figure exceeds the sum of its parts`); }
  else ok(z.amount === null, `${label}: no $0-cash figure without an amount`);
  const zeroNames = new Set(r.paths.filter(x => x.equity.kind === 'none' && ['loan', 'crowd-loan'].includes(x.row.kind)).map(x => x.name).concat(r.state.rows.filter(x => x.countsAsZeroCash).map(x => x.name)));
  ok(z.parts.every(p => zeroNames.has(p.name)), `${label}: $0-cash figure counts something other than a no-equity loan`);
  const grantNames = new Set([...(G.GRANTS || []), ...(G.GENERAL_GRANTS || [])].map(g => g.name));
  ok(!z.parts.some(p => grantNames.has(p.name)), `${label}: $0-cash figure counts a grant`);
  ok(!z.parts.some(p => /express|7\(a\)/i.test(p.name)), `${label}: $0-cash figure counts Express or 7(a)`);
  // Path filters
  for (const x of r.paths) {
    const p = x.row;
    ok(p.modes.includes(s.pathMode), `${label}: ${p.id} shown outside its modes`);
    ok(s.citizen || !(p.gates || []).includes('citizen'), `${label}: SBA-gated ${p.id} shown to a non-citizen owner`);
    ok(!(p.excludeStates || []).includes(s.state), `${label}: ${p.id} shown in an excluded state`);
    ok(p.requires !== 'reserve' || s.reserve, `${label}: ${p.id} shown without Guard/Reserve`);
    ok(!(s.months < (p.minMonths || 0)) && !(p.startupOk === false && s.months === 0), `${label}: ${p.id} shown to a business too young for it`);
    if (s.amount != null) { ok(s.amount >= p.min, `${label}: ${p.id} shown below its minimum`); const pmax = p.maxByBiz && Number.isFinite(p.maxByBiz[s.bizType]) ? p.maxByBiz[s.bizType] : p.max; const fin0 = x.equity.kind === 'pct' && x.equity.offLoan ? s.amount - x.equity.required : s.amount; ok(x.provides === Math.min(fin0, pmax), `${label}: ${p.id} provides the wrong amount`); ok(x.partial === (fin0 > pmax), `${label}: ${p.id} covers-part flag`); ok(!(p.max === 5000000 && p.id.startsWith('7a')) || x.provides <= 5000000, `${label}: 7(a) above its $5M maximum`); }
    if (p.fixedAssetsOnly) ok(x.notes.some(n => /fixed assets/i.test(n)), `${label}: 504 lacks the fixed-assets note`);
    if (p.ownCash.startupOnly) { // 7(a) family
      if (s.pathMode === 'buy' || s.startup) { ok(x.equity.kind === 'pct' && x.equity.pct === 0.10, `${label}: ${p.id} should need 10%`); if (s.amount != null) { ok(x.equity.required === Math.round(s.amount * 0.10), `${label}: ${p.id} equity is 10% of the whole project`); ok(x.gap === Math.max(0, x.equity.required - s.ownCash), `${label}: ${p.id} gap`); } }
      else ok(x.equity.kind === 'lender' && x.equity.required === null && /lender decides/i.test(x.notes.join(' ')), `${label}: established ${p.id} in grow mode should say the lender decides`);
    }
    if (p.id === 'express') ok(s.pathMode === 'buy' ? (x.equity.kind === 'pct' && x.equity.pct === 0.10 && (s.amount == null || x.equity.required === Math.round(s.amount * 0.10))) : x.equity.kind === 'lender', `${label}: Express takes 10% when buying a business and is the lender's call otherwise`);
    if (x.fee) {
      const f = x.fee, base = sbaFee(x.provides, f.type);
      ok(f.baseline === base.baseline, `${label}: ${p.id} fee differs from Founder Stack's sbaFee()`);
      ok(f.final >= 0 && f.final <= f.baseline && f.savings === f.baseline - f.final, `${label}: ${p.id} fee savings double counted`);
      ok(f.vetWaiver === (f.type === 'express' && s.combinedPct >= 0.51 && f.baseline > 0), `${label}: ${p.id} veteran Express waiver flag`);
      if (f.vetWaiver) ok(f.vetFee === 0 && f.final === 0, `${label}: Express veteran fee should be $0`);
      const sectorWho = s.bizType === 'manufacturing' || s.bizType === 'food' || s.rural;
      const borrowed = x.equity.kind === 'pct' && x.equity.offLoan ? s.amount - x.equity.required : s.amount;
      ok(f.sector === (sectorWho && borrowed <= 700000 && today <= '2027-09-30' && today >= '2026-10-01'), `${label}: ${p.id} sector waiver flag uses everything borrowed`);
    } else ok(!p.cost.feeRule || s.amount == null, `${label}: ${p.id} is missing its fee`);
  }
  { const Ln = r.lenders; ok(Ln && Array.isArray(Ln.directories) && Array.isArray(Ln.questions), `${label}: lenders block missing`);
    const lenderPath = r.paths.some(x => ['express', '7a-small', '7a-standard', 'caplines', 'marc', 'wcp', '504', 'microloan'].includes(x.id));
    ok(Ln.need === lenderPath, `${label}: lender prompt shown exactly when a path needs a lender`);
    if (lenderPath) ok(Ln.directories.length >= 2 && Ln.questions.length >= 1 && Ln.prompt, `${label}: lender section has directories, questions, and a prompt`);
    ok(Ln.directories.every(d => /^https:\/\/(www\.)?(sba\.gov|kiva\.org)\//.test(d.url)), `${label}: a lender directory is not an official page`);
    ok(Ln.questions.some(q => q.id === 'buy-vet') === (s.mode === 'buy' && lenderPath && !!(r.equity.acq && r.equity.acq.full)), `${label}: veteran purchase question shown only when the rule applies`); }
  // In buy mode a working-capital line cannot fund the purchase, so it is listed after the purchase loans.
  const main = r.paths.filter(x => !(x.row.kind === 'line' && s.pathMode === 'buy'));
  ok(s.pathMode !== 'buy' || r.paths.slice(main.length).every(x => x.row.kind === 'line'), `${label}: a working-capital line is ranked above a purchase loan`);
  const tiers = main.map(x => x.equity.tier);
  ok(tiers.every((t, i) => i === 0 || tiers[i - 1] <= t), `${label}: paths not ranked by own cash required`);
  if (!s.citizen) { const gated = P.FUNDING_PATHS.filter(p => p.modes.includes(s.pathMode) && p.gates.includes('citizen') && (p.requires !== 'reserve' || s.reserve) && s.months >= (p.minMonths || 0) && (!p.requiresBiz || p.requiresBiz.includes(s.bizType)) && !(p.startupOk === false && s.months === 0)); ok(r.withheld.length === gated.length, `${label}: withheld count`); if (gated.length) ok(/citizen/i.test(r.hero.lines.join(' ')) && /withheld/.test(r.hero.lines.join(' ')), `${label}: hero does not explain the citizenship rule`); }
  // Equity
  const eq = r.equity;
  ok(eq.sources.every(x => x.caveat === E.EQUITY_RULES.lenderCaveat), `${label}: an equity line lacks the lender caveat`);
  ok(eq.needs === (s.pathMode === 'buy' || s.startup), `${label}: equity needs flag`);
  if (s.pathMode === 'buy') ok(!!eq.acq && eq.sources.some(x => x.id === 'seller-note'), `${label}: buy mode lacks the acquisition block or seller note`);
  else ok(eq.acq === null && !eq.sources.some(x => x.id === 'seller-note'), `${label}: seller-note content outside buy mode`);
  // Grants
  const g = r.grants;
  for (const row of [...g.open, ...g.openNotForYou, ...g.general]) ok(!row.deadline || row.deadline >= today, `${label}: ${row.id} listed as open after its deadline`);
  ok(g.open.every(x => x.miss.length === 0) && g.openNotForYou.every(x => x.miss.length > 0), `${label}: eligibility split`);
  ok(g.closed.every(x => grantStatus(x, today) === 'closed'), `${label}: closed list holds an open row`);
  ok(g.ended.every(endedRowIsProven), `${label}: an ended row without full proof rendered`);
  ok(g.noCycle.every(x => x.verdict === 'no-cycle-found') && !g.ended.some(x => x.verdict === 'no-cycle-found'), `${label}: a no-cycle-found row rendered as ended`);
  ok(!g.nearest || g.nearest.deadline >= today, `${label}: nearest deadline is in the past`);
  if (s.mode === 'grants' && g.nearest) ok(r.hero.lines.join(' ').includes(g.nearest.label), `${label}: grants hero does not show the nearest deadline`);
  // State
  const st = r.state;
  if (st.checked === 'pending') { ok(/not yet checked/i.test(st.line), `${label}: pending state lacks "not yet checked"`); ok(!/none found|no state veteran|no state loan program|found as of|no program/i.test(st.line) && st.rows.length === 0 && st.general === null, `${label}: pending state reads as none found`); }
  if (st.checked === 'none-found') ok(/^The federal and national paths in your results apply in .+ We found no state loan program that is only for veterans \(checked \d+\/\d+\/\d{4}\), which takes nothing away from the rest\.$/.test(st.line), `${label}: none-found wording (${st.line})`);
  ok(st.rows.every(x => x.confidence !== 'unverified' || (!x.terms && !x.who && x.ask)), `${label}: an unverified state row shows terms`);
  ok(st.rows.every(x => x.confidence !== 'reported' || /reported; confirm with the agency/i.test(x.label)), `${label}: a reported state row lacks its label`);
  ok(st.lenders.every(l => l.national || l.inState || l.alsoAsk === true), `${label}: a mission lender from another state shown`);
  ok(st.founderStackUrl.startsWith('/veteran-business/?mode=') && (!s.state || st.founderStackUrl.includes(`st=${s.state}`)) && /[?&]r=/.test(st.founderStackUrl), `${label}: Founder Stack link`);
  ok((r.robs !== null) === s.retirement, `${label}: ROBS shown without a retirement balance (or hidden with one)`);
}

/* ─── 1. The grid ───────────────────────────────────────────────────────── */
const AMOUNTS = [5000, 15000, 50000, 80000, 350000, 400000, 700000, 2000000];
const STATES = ['MD', 'MN', 'WA', 'OK', 'NV', 'TX', 'PR'];
const BIZ = [['general', false], ['manufacturing', false], ['food', false], ['tech', false], ['franchise', true], ['wholesale', false]];
let runs = 0;
for (const mode of MODES) for (const amount of AMOUNTS) for (const ownCash of [0, 20000]) for (const ownership of OWNERSHIP) for (const citizen of [true, false]) for (const months of [0, 6, 18, 36]) for (const [bizType, rural] of BIZ) {
  const state = STATES[runs % STATES.length];
  const inp = { mode, amount, ownCash, state, ownership, citizen, months, bizType, rural, employees: runs % 3 === 0 ? 0 : 5, gift: runs % 2 === 0, outsideIncome: runs % 5 === 0, sellerNote: ['yes', 'no', 'unsure'][runs % 3], reserve: runs % 4 === 0, retirement: runs % 7 === 0 ? 90000 : null, rating: [null, 0, 10, 70, 100][runs % 5], spouseOwner: runs % 6 === 0 };
  const r = solve(inp, CTX(TODAY));
  invariants(r, `${mode}/${amount}/${ownership}/${citizen ? 'cit' : 'noncit'}/${months}mo/${bizType}/${state}`);
  if (runs % 97 === 0) { const doc = buildChecklist(r), txt = checklistToText(doc), html = checklistToHtml(doc, esc); ok(!LEAK.test(txt) && !LEAK.test(html), 'checklist leaked undefined/NaN'); ok(!BANNED.test(doc.howTo.join(' ') + doc.header.map(h => h[0].t).join(' ') + doc.sections.map(x => x.title).join(' ')), 'banned phrase in checklist copy'); ok(doc.sections.length >= 3, 'checklist has sections'); }
  runs++;
}
// Every state once, in every mode; plus grants mode with no amount, and odd inputs.
for (const st of [...Object.keys(S.STATE_NAMES), 'ZZ', '']) for (const mode of MODES) { invariants(solve({ mode, amount: mode === 'grants' ? null : 120000, state: st, months: 18, employees: 4 }, CTX(TODAY)), `state ${st || '(blank)'}/${mode}`); runs++; }
for (const junk of [{}, { mode: 'nope', amount: 'abc', ownCash: -5, state: 12, ownership: 'x', bizType: null, months: 'x', rating: 'x' }, { mode: 'buy', amount: 1e12 }, null]) { let r; try { r = solve(junk, CTX(TODAY)); } catch (e) { r = null; } ok(!!r, 'junk input throws'); if (r) invariants(r, 'junk input'); runs++; }
ok(!!solve({ mode: 'scratch', amount: 50000, state: 'MD' }, {}), 'solve works with no ctx (no fee math, real today)');

/* ─── 2. Named cases ────────────────────────────────────────────────────── */
{
  const r = solve({ mode: 'scratch', amount: 80000, ownCash: 0, state: 'MD', ownership: '100' }, CTX(TODAY));
  const kiva = P.FUNDING_PATHS.find(p => p.id === 'kiva'), micro = P.FUNDING_PATHS.find(p => p.id === 'microloan');
  { const w = solve({ mode: 'grow', amount: 3000000, state: 'FL', months: 36, bizType: 'wholesale' }, CTX(TODAY)); const marc = w.paths.find(x => x.id === 'marc');
    ok(marc && marc.provides === 2000000 && marc.partial === true, 'wholesale: MARC line shows and is capped at $2M');
    const m2 = solve({ mode: 'grow', amount: 3000000, state: 'FL', months: 36, bizType: 'manufacturing' }, CTX(TODAY)).paths.find(x => x.id === 'marc'); ok(m2 && m2.provides === 3000000, 'manufacturing: MARC line goes to $5M');
    ok(!solve({ mode: 'grow', amount: 300000, state: 'FL', months: 36, bizType: 'general' }, CTX(TODAY)).paths.some(x => x.id === 'marc'), 'general business: no MARC line');
    ok(!solve({ mode: 'scratch', amount: 300000, state: 'FL', bizType: 'manufacturing' }, CTX(TODAY)).paths.some(x => x.row.kind === 'line'), 'scratch: no dedicated line-of-credit product');
    ok(w.sector.who.length === 0 || !w.sector.who.includes('wholesale'), 'wholesale gets no sector fee waiver'); }
  ok(r.zeroCash.amount === Math.min(80000, kiva.max + micro.max), `scratch $80K: $0-cash is Kiva + Microloan maxima (${r.zeroCash.amount})`);
  ok(solve({ mode: 'scratch', amount: 20000, state: 'MD' }, CTX(TODAY)).zeroCash.amount === 20000, '$0-cash capped at the amount needed');
  ok(solve({ mode: 'scratch', amount: 80000, state: 'NV' }, CTX(TODAY)).zeroCash.amount === micro.max, 'Nevada: Kiva excluded from the $0-cash figure');
  const withGift = solve({ mode: 'scratch', amount: 80000, state: 'MD', gift: true, outsideIncome: true }, CTX(TODAY));
  ok(withGift.zeroCash.amount === r.zeroCash.amount, 'a gift or outside income does not inflate the $0-cash number');
  ok(/gift/i.test(withGift.hero.lines.join(' ')) && /Your lender may require more/.test(withGift.hero.lines.join(' ')), 'a gift is stated in words, with the lender caveat');
  const ex = r.paths.find(x => x.id === 'express');
  ok(ex && ex.fee.vetWaiver && ex.fee.final === 0, '100% veteran-owned: Express upfront fee is $0');
  const ex49 = solve({ mode: 'scratch', amount: 80000, state: 'MD', ownership: 'under50' }, CTX(TODAY)).paths.find(x => x.id === 'express');
  ok(ex49 && !ex49.fee.vetWaiver && ex49.fee.final === ex49.fee.baseline && ex49.fee.baseline > 0, 'under 50%: no Express waiver');
  const exSp = solve({ mode: 'scratch', amount: 80000, state: 'MD', ownership: 'spouse' }, CTX(TODAY)).paths.find(x => x.id === 'express');
  ok(exSp && exSp.fee.vetWaiver, 'owned with a spouse (51%+ together): Express waiver applies');
  const mf = solve({ mode: 'grow', amount: 700000, state: 'MD', months: 36, bizType: 'manufacturing', ownership: 'under50' }, CTX(TODAY)).paths.find(x => x.id === '7a-standard');
  ok(mf && mf.fee.sector && mf.fee.final === 0 && mf.fee.savings === mf.fee.baseline, 'manufacturer at $700,000: sector waiver, counted once');
  const mf2 = solve({ mode: 'grow', amount: 700001, state: 'MD', months: 36, bizType: 'manufacturing', ownership: 'under50' }, CTX(TODAY)).paths.find(x => x.id === '7a-standard');
  ok(mf2 && !mf2.fee.sector && mf2.fee.final === mf2.fee.baseline, 'manufacturer at $700,001: no sector waiver');
  const both = solve({ mode: 'scratch', amount: 200000, state: 'MD', rural: true }, CTX(TODAY)).paths.find(x => x.id === 'express');
  ok(both.fee.vetWaiver && both.fee.sector && both.fee.final === 0 && both.fee.savings === both.fee.baseline, 'veteran + rural on Express: savings equal one fee, not two');
  ok(!solve({ mode: 'grow', amount: 200000, state: 'MD', months: 36, rural: true }, CTX('2027-10-01')).paths.some(x => x.fee && x.fee.sector), 'sector waiver is off after 9/30/2027');
  const buy = solve({ mode: 'buy', amount: 400000, ownCash: 10000, state: 'WA', ownership: '50' }, CTX(TODAY));
  ok(buy.equity.required === 40000 && buy.equity.gap === 30000, 'buy $400K with $10K: $40,000 equity, $30,000 gap');
  ok(solve({ mode: 'buy', amount: 400000, ownCash: 90000, state: 'WA' }, CTX(TODAY)).equity.gap === 0, 'gap floors at zero');
  const grow = solve({ mode: 'grow', amount: 200000, state: 'MD', months: 36 }, CTX(TODAY));
  ok(grow.equity.needs === false && /lender decides/i.test(grow.equity.statement), 'established business in grow mode: no SBA-set minimum, lender decides');
  ok(solve({ mode: 'grow', amount: 200000, state: 'MD', months: 6 }, CTX(TODAY)).equity.required === 20000, 'grow mode at 6 months is still a startup: 10%');
  const grantsMode = solve({ mode: 'grants', state: 'TX', months: 18, employees: 4 }, CTX(TODAY));
  ok(grantsMode.paths.length > 0 && grantsMode.zeroCash.amount === null, 'grants mode still computes paths, with no $0 figure until an amount is entered');
  ok(!solve({ mode: 'scratch', amount: 50000, state: 'MD' }, CTX(TODAY)).paths.some(x => x.id === 'mreidl') && solve({ mode: 'grow', amount: 50000, state: 'MD', months: 18, reserve: true }, CTX(TODAY)).paths.some(x => x.id === 'mreidl'), 'MREIDL only for Guard/Reserve with an existing business');
  ok(solve({ mode: 'scratch', amount: 50000, state: 'MD' }, CTX(TODAY)).notForStartups.length === (P.NOT_FOR_STARTUPS || []).length && solve({ mode: 'grow', amount: 50000, state: 'MD', months: 36 }, CTX(TODAY)).notForStartups.length === 0, 'not-for-startups list shows only under 12 months');
  ok(solve({ mode: 'scratch', amount: 50000, state: 'MD', retirement: 50000 }, CTX(TODAY)).robs?.text.includes('failed'), 'ROBS carries the IRS warning');
  const fs = solve({ mode: 'grow', amount: 50000, state: 'TX', months: 18, rating: 70 }, CTX(TODAY)).state.founderStackUrl;
  ok(fs === '/veteran-business/?mode=own&r=70&st=TX', `Founder Stack link passes rating and state (${fs})`);
}

/* ─── 3. Date cases ─────────────────────────────────────────────────────── */
{
  const B = (today, ownership = '50') => solve({ mode: 'buy', amount: 400000, state: 'WA', ownership, sellerNote: 'yes' }, CTX(today));
  const on = B('2026-11-17'), off = B('2027-10-01'), pre = B('2026-11-10'), last = B('2027-09-30'), low = B('2026-11-17', 'under50'), sp = B('2026-11-17', 'spouse'), full = B('2026-11-17', '100');
  ok(on.equity.acq.full === true && /may supply the full 10%/.test(on.equity.acq.text) && /9\/30\/2027/.test(on.hero.lines.join(' ')), 'veteran acquisition flexibility ON at 2026-11-17 (50% owner)');
  ok(full.equity.acq.full === true, 'flexibility ON at 100% ownership');
  ok(last.equity.acq.full === true, 'flexibility ON on its last day, 2027-09-30');
  ok(off.equity.acq.full === false && off.equity.acq.reason === 'expired' && /no more than half/.test(off.equity.acq.text) && off.equity.acq.half === 20000 && /up to half/.test(off.hero.lines.join(' ')), 'flexibility OFF at 2027-10-01: half cap stated');
  ok(pre.equity.acq.full === false && pre.equity.acq.reason === 'not-yet', 'flexibility OFF before 11/11/2026');
  ok(low.equity.acq.full === false && low.equity.acq.reason === 'ownership' && /no more than half/.test(low.equity.acq.text), 'flexibility OFF under 50% ownership: half cap stated');
  ok(sp.equity.acq.full === false && sp.equity.acq.reason === 'spouse' && /no more than half/.test(sp.equity.acq.text), 'owned with a spouse: half cap stated, veteran share unknown');
  for (const x of [on, off, low, sp]) ok(x.equity.acq.caveat === E.EQUITY_RULES.lenderCaveat, 'acquisition block carries the lender caveat');

  // Grants: a passed deadline is never open.
  for (const g of [...G.GRANTS, ...G.GENERAL_GRANTS]) if (g.deadline) {
    const next = new Date(g.deadline + 'T12:00:00Z'); next.setUTCDate(next.getUTCDate() + 1);
    const after = next.toISOString().slice(0, 10);
    ok(grantStatus(g, g.deadline) === 'open', `${g.id}: open on its deadline day`);
    ok(grantStatus(g, after) === 'closed', `${g.id}: closed the day after its deadline`);
    const r = solve({ mode: 'grants', state: (g.elig?.states || ['TX'])[0], months: 18, employees: 5, bizType: 'food', spouseOwner: true }, CTX(after));
    ok(![...r.grants.open, ...r.grants.openNotForYou, ...r.grants.general].some(x => x.id === g.id), `${g.id}: not listed as open after ${g.deadline}`);
    if (G.GRANTS.includes(g)) ok(r.grants.closed.some(x => x.id === g.id), `${g.id}: moves to closed-for-this-cycle after its deadline`);
  }
  ok(grantStatus({ cycle: 'rolling' }, TODAY) === 'open' && grantStatus({ cycle: 'invite' }, TODAY) === 'invite' && grantStatus({ cycle: 'annual' }, TODAY) === 'closed' && grantStatus({ cycle: 'annual', deadline: '2027-03-01' }, TODAY) === 'open' && grantStatus({ cycle: 'dated', deadline: null, openNow: true, eventDate: '2026-01-01' }, TODAY) === 'closed' && grantStatus({}, TODAY) === 'closed', 'grant status derivation by cycle');
  for (const today of ['2026-11-17', '2026-12-16', '2027-02-01', '2027-10-01', '2030-01-01']) for (const mode of MODES) invariants(solve({ mode, amount: 150000, state: 'WV', months: 18, employees: 5, bizType: 'food' }, CTX(today)), `date ${today}/${mode}`);
  ok(solve({ mode: 'grants', state: 'TX', months: 18, employees: 5 }, CTX(new Date(2026, 10, 17))).today === '2026-11-17', 'today accepts a Date');
}

/* ─── 4. Injections (in memory only) ────────────────────────────────────── */
{
  // Ended programs: only a row with verdict + proofQuote + proofUrl + proofDate is named as ended.
  const proven = { id: 't-ok', kind: 'veteran', verdict: 'ended', name: 'ZZTEST Proven Program', proofQuote: 'This program has closed.', proofUrl: 'https://example.org/closed', proofDate: '2026-11-17', says: 'It says it closed.' };
  const bad = [
    { ...proven, id: 't1', name: 'ZZTEST NoVerdict', verdict: undefined }, { ...proven, id: 't2', name: 'ZZTEST NoQuote', proofQuote: '' }, { ...proven, id: 't3', name: 'ZZTEST NoUrl', proofUrl: null },
    { ...proven, id: 't4', name: 'ZZTEST NoDate', proofDate: undefined }, { ...proven, id: 't5', name: 'ZZTEST BadVerdict', verdict: 'dead' }, { ...proven, id: 't6', name: 'ZZTEST BadUrl', proofUrl: 'not a url' },
    { ...proven, id: 't7', name: 'ZZTEST BlankQuote', proofQuote: '   ' },
  ];
  const soft = { id: 't-soft', kind: 'veteran', verdict: 'no-cycle-found', name: 'ZZTEST Quiet Program', says: 'No round found.', checked: 'Its site.' };
  const softWithProof = { ...proven, id: 't-soft2', name: 'ZZTEST Quiet With Proof', verdict: 'no-cycle-found' };
  const before = X.ENDED_PROGRAMS.length;
  X.ENDED_PROGRAMS.push(proven, ...bad, soft, softWithProof, null);
  const r = solve({ mode: 'grants', state: 'TX' }, CTX(TODAY));
  ok(r.grants.ended.some(x => x.id === 't-ok'), 'a fully proven ended row renders');
  for (const b of bad) { ok(!r.grants.ended.some(x => x.id === b.id) && !r.grants.noCycle.some(x => x.id === b.id), `${b.name}: a row lacking a proof field never appears`); ok(!r.hero.lines.join(' ').includes(b.name), `${b.name}: not in the hero`); }
  ok(r.grants.noCycle.some(x => x.id === 't-soft') && r.grants.noCycle.some(x => x.id === 't-soft2') && !r.grants.ended.some(x => /t-soft/.test(x.id)), 'no-cycle-found rows go to the softer list, never the ended list');
  ok(r.grants.heldBack === bad.length, `held-back count (${r.grants.heldBack})`);
  X.ENDED_PROGRAMS.length = before;
  const saved = X.ENDED_PROGRAMS.splice(0);
  const empty = solve({ mode: 'grants', state: 'TX' }, CTX(TODAY));
  ok(empty.grants.ended.length === 0 && empty.grants.noCycle.length === 0 && !/ended/.test(empty.hero.lines.join(' ')), 'empty ended list: nothing rendered, nothing claimed');
  X.ENDED_PROGRAMS.push(...saved);

  // States: pending never reads as none; reported and unverified rows follow the UI rule.
  const keep = { MD: S.STATE_FUNDING.MD, TX: S.STATE_FUNDING.TX };
  S.STATE_FUNDING.TX = { veteran: [{ id: 'x', name: 'ZZ hidden row', terms: 'secret terms', confidence: 'verified', status: 'open', kind: 'loan' }], general: { name: 'ZZ general' }, checked: 'pending', checkedDate: null, checkedNote: 'ZZ note' };
  for (const mode of MODES) {
    const p = solve({ mode, amount: 90000, state: 'TX', months: 18 }, CTX(TODAY));
    invariants(p, `injected pending/${mode}`);
    const all = authored(p).join(' ') + checklistToText(buildChecklist(p));
    ok(p.state.checked === 'pending' && /Not yet checked/.test(p.state.line), `pending (${mode}): says not yet checked`);
    ok(!/none found|no state loan program that is only for veterans|ZZ hidden|secret terms|ZZ general|ZZ note/i.test(all), `pending (${mode}): never "none found", and nothing from an unchecked state leaks`);
  }
  S.STATE_FUNDING.TX = { veteran: null, checked: 'something-new' };
  ok(solve({ mode: 'scratch', amount: 90000, state: 'TX' }, CTX(TODAY)).state.checked === 'pending', 'an unknown checked value is treated as pending');
  delete S.STATE_FUNDING.TX;
  ok(solve({ mode: 'scratch', amount: 90000, state: 'TX' }, CTX(TODAY)).state.checked === 'pending', 'a state missing from the data is treated as pending');
  S.STATE_FUNDING.TX = { veteran: [], general: { name: 'ZZ General Fund', terms: 'Loans.', url: 'https://example.org' }, checked: 'none-found', checkedDate: '2026-11-17' };
  const nf = solve({ mode: 'scratch', amount: 90000, state: 'TX' }, CTX(TODAY));
  ok(/checked 11\/17\/2026/.test(nf.state.line) && /^The federal and national paths in your results apply/.test(nf.state.line) && nf.state.general?.name === 'ZZ General Fund', 'none-found: leads with what is available, dated, plus the general program');
  S.STATE_FUNDING.TX = { veteran: [
    { id: 'a', name: 'ZZ Reported', agency: 'Agency A', terms: 'T1', who: 'W1', kind: 'loan', status: 'unknown', confidence: 'reported' },
    { id: 'b', name: 'ZZ Unverified', agency: 'Agency B', terms: 'T2 SECRET', who: 'W2 SECRET', statusNote: 'N2 SECRET', kind: 'loan', status: 'open', confidence: 'unverified' },
    { id: 'c', name: 'ZZ No confidence', terms: 'T3 SECRET', kind: 'loan', status: 'open' },
    { id: 'd', name: 'ZZ Open Loan', terms: 'Up to $40,000.', kind: 'loan', status: 'open', confidence: 'verified', zeroCashMax: 40000 },
    { id: 'e', name: 'ZZ Closed Loan', terms: 'Up to $90,000.', kind: 'loan', status: 'closed', confidence: 'verified', zeroCashMax: 90000 },
    { id: 'f', name: 'ZZ Open Deposit', terms: 'Lower rate.', kind: 'linked-deposit', status: 'open', confidence: 'verified', zeroCashMax: 90000 },
  ], general: null, checked: 'verified', checkedDate: '2026-11-17' };
  const rr = solve({ mode: 'scratch', amount: 500000, state: 'TX' }, CTX(TODAY));
  invariants(rr, 'injected rows');
  const txt = strings(rr.state).join(' ') + checklistToText(buildChecklist(rr)) + strings(rr.costs).join(' ');
  ok(/Reported; confirm with the agency/.test(rr.state.rows[0].label) && rr.state.rows[0].terms === 'T1', 'reported row: terms with the label');
  ok(!/SECRET/.test(txt) && /Ask Agency B/.test(rr.state.rows[1].ask) && rr.state.rows[2].confidence === 'unverified', 'unverified row (or one with no confidence): name and the question to ask, no terms');
  ok(rr.zeroCash.parts.some(p => p.name === 'ZZ Open Loan') && !rr.zeroCash.parts.some(p => /Closed|Deposit|Reported/.test(p.name)), 'only an open, verified, direct state loan with zeroCashMax joins the $0-cash figure');
  ok(rr.state.rows.find(x => x.id === 'e').statusLabel === 'Closed', 'a closed round reads as closed');
  Object.assign(S.STATE_FUNDING, keep);

  // Mission lenders: alsoAsk shows everywhere, others only in their states.
  const ml = S.MISSION_LENDERS.length;
  S.MISSION_LENDERS.push({ id: 'zz-ask', name: 'ZZ Ask Lender', states: ['TX'], alsoAsk: true, statesNote: 'Ask.', ownCash: null }, { id: 'zz-tx', name: 'ZZ TX Lender', states: ['TX'] });
  const inMd = solve({ mode: 'scratch', amount: 50000, state: 'MD' }, CTX(TODAY)).state.lenders.map(l => l.id);
  ok(inMd.includes('zz-ask') && !inMd.includes('zz-tx'), 'alsoAsk lenders show in any state; state lenders only in theirs');
  S.MISSION_LENDERS.length = ml;

  // Empty data files: the engine still answers and claims nothing.
  const stash = [P.FUNDING_PATHS, E.EQUITY_SOURCES, G.GRANTS, G.GENERAL_GRANTS, G.NOT_GRANTS, G.MYTH_SOURCES, X.ENDED_PROGRAMS, S.MISSION_LENDERS, C.CHANGES, C.PENDING_BILLS, C.FREE_HELP, C.BENEFIT_FACTS, P.NOT_FOR_STARTUPS].map(a => [a, a.splice(0)]);
  for (const mode of MODES) { let r2 = null; try { r2 = solve({ mode, amount: 80000, state: 'MD', citizen: false, retirement: 1 }, CTX(TODAY)); buildDocxBytes(buildChecklist(r2)); } catch (e) { console.log('empty-data throw:', e.message); r2 = null; } ok(!!r2 && r2.paths.length === 0 && r2.zeroCash.amount === 0 && r2.grants.open.length === 0, `empty data files (${mode}): no throw, nothing claimed`); if (r2) ok(!authored(r2).some(t => LEAK.test(t)), `empty data files (${mode}): no undefined/NaN`); }
  for (const [a, items] of stash) a.push(...items);
  ok(P.FUNDING_PATHS.length > 0 && solve({ mode: 'scratch', amount: 80000, state: 'MD' }, CTX(TODAY)).paths.length > 0, 'data restored after the injections');
}

/* ─── 5. Checklist and Word file ────────────────────────────────────────── */
{
  const r = solve({ mode: 'buy', amount: 400000, ownCash: 10000, state: 'WA', ownership: '50', sellerNote: 'yes', gift: true }, CTX(TODAY));
  const doc = buildChecklist(r), bytes = buildDocxBytes(doc), txt = checklistToText(doc);
  ok(bytes[0] === 0x50 && bytes[1] === 0x4B && bytes.length > 2000, 'docx is a real ZIP');
  ok(new TextDecoder().decode(bytes).includes('LENDER-READY CHECKLIST'), 'docx carries the checklist');
  ok(/seller note/i.test(txt) && /Your lender may require more/.test(txt) && /not financial advice/.test(txt), 'checklist: seller note proof, lender caveat, disclaimer');
  ok(doc.sections.every((s2, i) => s2.n === i + 1), 'checklist sections numbered in order');
}

/* ─── 6. Static copy rules (the page's own words, not the data) ─────────── */
{
  const root = fileURLToPath(new URL('../', import.meta.url));
  for (const f of ['index.html', 'script.js', 'engine.js']) {
    const src = readFileSync(root + f, 'utf8').replace(/f\.guaranteed/g, 'f.G'); // one property read from Founder Stack's sbaFee()
    ok(!/[–—]/.test(src), `${f}: em or en dash`);
    ok(!/you qualify|guaranteed|free money/i.test(src), `${f}: banned phrase (${(src.match(/.{30}(you qualify|guaranteed|free money).{30}/i) || [''])[0]})`);
    ok(!/it.s worth noting|crucial|seamless|robust|leverage|navigate|landscape|pivotal/i.test(src), `${f}: filler or hype word`);
    const prose = (f === 'index.html' ? src.replace(/<script[\s\S]*?<\/script>/g, m => /ld\+json/.test(m) ? m : '').replace(/<[^>]+>/g, ' ') : src).replace(/credit cards?/gi, '');
    ok(!/[a-z,.] cards?[ .,;:!?]/i.test(prose), `${f}: result panels are "sections", not "cards" (${(prose.match(/.{25}[a-z,.] cards?[ .,;:!?].{15}/i) || [''])[0]})`);
  }
  const html = readFileSync(root + 'index.html', 'utf8');
  ok(!/<(input|select)[^>]*\srequired/.test(html) && /<form id="calc-form"[^>]*novalidate/.test(html), 'index.html: novalidate, no native required');
}

/* ─── Notice (not a failure): dated rows that have passed on the real calendar ─── */
{
  const real = new Date().toISOString().slice(0, 10);
  const stale = [...G.GRANTS, ...G.GENERAL_GRANTS].filter(g => g.deadline && g.deadline < real).map(g => `${g.id} (${g.deadline})`);
  const v = E.EQUITY_RULES.vetAcq;
  if (v && v.validTo < real) stale.push(`vetAcq window (${v.validTo})`);
  if (stale.length) console.log(`NOTICE  ${stale.length} dated row(s) have passed and want a status review: ${stale.join(', ')}`);
}

for (const [msg, n] of failed) console.log(`FAIL  ${msg}${n > 1 ? `  (x${n})` : ''}`);
console.log(`${runs} engine runs, ${checks} checks, ${fails} failed`);
// ── Audit regressions (11/18/2026) ──
{ const T = '2026-11-18';
  const big = solve({ mode: 'buy', amount: 6000000, state: 'TX', sellerNote: 'yes' }, CTX(T));
  ok(big.buyCash === null && !/\$5,400,000/.test(big.hero.lines.join(' ') + big.hero.kicker) && /tops out at \$5,000,000/.test(big.hero.lines.join(' ')), 'buy $6M: no loan above the 7(a) maximum and no $0-cash claim');
  ok(solve({ mode: 'buy', amount: 3000, state: 'TX', sellerNote: 'yes' }, CTX(T)).buyCash === null, 'buy $3,000: no purchase-loan claim below every product minimum');
  const ex = solve({ mode: 'buy', amount: 400000, state: 'TX' }, CTX(T)); const e1 = ex.paths.find(x => x.id === 'express');
  ok(e1 && e1.equity.kind === 'pct' && e1.equity.required === 40000 && e1.provides === 360000 && ex.equity.expressNote === '', 'buy: Express carries the 10% and the no-minimum note is gone');
  const sm = solve({ mode: 'scratch', amount: 1000000, ownCash: 40000, state: 'TX' }, CTX(T)).paths.find(x => x.id === '7a-small');
  ok(sm && sm.equity.required === 100000 && sm.gap === 60000, 'scratch $1M: 7(a) Small equity is 10% of the project, not of the capped loan');
  const mf = solve({ mode: 'grow', months: 36, amount: 700001, bizType: 'manufacturing', state: 'TX' }, CTX(T));
  ok(mf.paths.filter(x => x.fee).every(x => x.fee.sector === false), 'manufacturer $700,001: no sector waiver on any piece');
  const mv = solve({ mode: 'buy', amount: 770000, bizType: 'manufacturing', state: 'TX' }, CTX(T)).paths.find(x => x.id === '7a-standard');
  ok(mv && mv.provides === 693000 && mv.fee.sector === true, 'manufacturer buying at $770,000: the $693,000 loan is under the waiver line');
  ok(!/Every federal and national path/.test(solve({ mode: 'scratch', amount: 80000, state: 'ND' }, CTX(T)).state.line), 'North Dakota: no claim that every path is available');
  const gr = solve({ mode: 'grants', state: 'TX' }, CTX(T));
  ok(gr.grants.open.length - gr.grants.openCash.length >= 1 ? /pitch event/.test(gr.hero.lines[0]) : true, 'grants hero mentions an open pitch event when the list shows one');
  ok(grantStatus({ cycle: 'dated', openNow: true, verifiedDate: '2026-11-17', eventDate: '2027-04-01' }, '2026-12-31') === 'open' && grantStatus({ cycle: 'dated', openNow: true, verifiedDate: '2026-11-17', eventDate: '2027-04-01' }, '2027-01-05') === 'closed', 'an "open when we looked" grant stops reading as open 45 days later');
  ok(!E.EQUITY_SOURCES.find(x => x.id === 'assets').modes.includes('buy'), 'assets are not listed as equity for a purchase');
  const cov = solve({ mode: 'buy', amount: 400000, ownCash: 40000, state: 'TX', sellerNote: 'yes' }, CTX(T));
  ok(cov.buyCash && cov.buyCash.amountText === '$40,000', 'buy with cash covering the 10%: own cash needed reads $40,000, not $0');
}

console.log(fails === 0 ? 'ALL SIM CHECKS PASSED' : `${fails} SIM CHECK(S) FAILED`);
process.exitCode = fails === 0 ? 0 : 1;
