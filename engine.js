// Veteran Business Funding Finder: the engine. Pure, no DOM. Shared by the page (script.js) and the node
// harness (test/sim.mjs).
//
// Everything a reader sees comes from the six files in ./data/. Nothing here hardcodes a program row. The data
// files change often, so every read is defensive: missing exports, empty arrays, null fields, and
// `checked: 'pending'` states all render as "nothing to say", never as a claim.
//
// SBA fee math is NOT here. It comes in through `ctx` from /veteran-business/data/rules.js (the same injection
// pattern Property Tax uses for the Best State dataset), so the browser and node both resolve it and the fee
// table is never forked:
//   solve(input, { today, sbaFee, SBA_FEES, monthlyComp })
// `today` is injectable (Date or 'YYYY-MM-DD') so tests can move the date.
import * as P from './data/funding-paths.js';
import * as E from './data/equity-sources.js';
import * as G from './data/grants.js';
import * as X from './data/ended-programs.js';
import * as S from './data/state-funding.js';
import * as C from './data/changes.js';
import * as L from './data/lenders.js';

export const MODES = ['scratch', 'buy', 'grow', 'grants'];
export const OWNERSHIP = ['100', '51', '50', 'under50', 'spouse'];
export const BIZ_TYPES = ['general', 'manufacturing', 'food', 'tech', 'franchise', 'wholesale'];

// The FY2027 sector fee waiver covers 7(a) loans of $700,000 or less. The dollar line is stated in the CHANGES
// row for Information Notice 5000-881797 but only as prose, and the Founder Stack rules module says the waiver is
// "not modeled here". This is the one rule parameter the engine carries itself. See the report: a numeric field in
// data would replace it.
const SECTOR_WAIVER_MAX = 700000;
// 504: "a new business (two years or less)" per the 504 row's own text.
const NEW_BUSINESS_504_MONTHS = 24;
// SOP: a startup is a business operating one year or less (EQUITY_RULES.startupDefinition).
const STARTUP_MONTHS = 12;

const arr = x => Array.isArray(x) ? x : [];
const obj = x => (x && typeof x === 'object') ? x : {};
const fin = x => typeof x === 'number' && Number.isFinite(x);
const str = x => (typeof x === 'string' && x.trim()) ? x.trim() : '';
export const fmtUSD = n => '$' + Math.round(n).toLocaleString('en-US');
export function fmtDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? `${+m[2]}/${+m[3]}/${m[1]}` : '';
}
export function isoDate(d) {
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
  const x = d instanceof Date && !isNaN(d) ? d : new Date();
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
const pctText = p => `${Math.round(p * 1000) / 10}%`;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const lowerFirst = t => t ? t.charAt(0).toLowerCase() + t.slice(1) : '';
function joinList(items) {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a.join('');
  if (a.length === 2) return `${a[0]} and ${a[1]}`;
  return `${a.slice(0, -1).join(', ')}, and ${a[a.length - 1]}`;
}

const FUNDING_PATHS = () => arr(P.FUNDING_PATHS);
const EQUITY_RULES = () => obj(E.EQUITY_RULES);
const EQUITY_SOURCES = () => arr(E.EQUITY_SOURCES);
const CHANGES = () => arr(C.CHANGES);

/* ─── Inputs ───────────────────────────────────────────────────────────── */
export function normalize(input = {}) {
  const i = obj(input);
  const mode = MODES.includes(i.mode) ? i.mode : 'scratch';
  const amount = Number(i.amount) > 0 ? Math.round(Number(i.amount)) : null;
  const ownCash = Number(i.ownCash) > 0 ? Math.round(Number(i.ownCash)) : 0;
  const state = str(i.state).toUpperCase();
  const ownership = OWNERSHIP.includes(String(i.ownership)) ? String(i.ownership) : '100';
  const bizType = BIZ_TYPES.includes(i.bizType) ? i.bizType : 'general';
  // Starting from scratch means the business has no operating history.
  const months = mode === 'scratch' ? 0 : Math.max(0, Math.round(Number(i.months) || 0));
  const employees = Math.max(0, Math.round(Number(i.employees) || 0));
  const ratingNum = (i.rating === '' || i.rating == null) ? null : Number(i.rating);
  const sellerNote = ['yes', 'no', 'unsure'].includes(i.sellerNote) ? i.sellerNote : 'unsure';
  const spouseOwner = !!i.spouseOwner || ownership === 'spouse';
  // The veteran's own share. "With my spouse" leaves it unknown (the two of them hold 51% or more together).
  const vetPct = { '100': 1, '51': 0.51, '50': 0.5, 'under50': 0.49, 'spouse': null }[ownership];
  const combinedPct = ownership === 'spouse' ? 0.51 : vetPct;
  // Grants mode has no path list of its own: it borrows the starting or growing list from the time in business.
  const pathMode = mode === 'grants' ? (months > 0 ? 'grow' : 'scratch') : mode;
  const tags = { food: ['farm', 'food'], tech: ['tech'], manufacturing: ['manufacturing'], franchise: ['franchise'], wholesale: ['wholesale'], general: [] }[bizType];
  return {
    mode, pathMode, amount, ownCash, state, ownership, vetPct, combinedPct, bizType, tags, rural: !!i.rural,
    citizen: i.citizen !== false, months, startup: months <= STARTUP_MONTHS, employees,
    rating: fin(ratingNum) ? ratingNum : null,
    gift: !!i.gift, sellerNote, outsideIncome: !!i.outsideIncome, retirement: !!i.retirement && Number(i.retirement) !== 0,
    reserve: !!i.reserve, spouseOwner, ownerTypes: spouseOwner ? ['veteran', 'spouse'] : ['veteran'],
  };
}

/* ─── Fees (math lives in Founder Stack's rules module, injected) ───────── */
function sectorWaiver(s, today, ctx) {
  const fees = obj(ctx.SBA_FEES);
  const row = CHANGES().find(c => c && c.url && c.url === fees.noticeUrl && c.endsOn);
  const who = [];
  if (s.bizType === 'manufacturing') who.push('manufacturing');
  if (s.bizType === 'food') who.push('food');
  if (s.rural) who.push('rural');
  const active = !!row && today >= String(row.date || '') && today <= String(row.endsOn);
  return { active, who, possible: active && who.length > 0, row: row || null, max: SECTOR_WAIVER_MAX };
}
function feeFor(p, loan, s, sector, ctx, totalBorrowed) {
  const rule = obj(p.cost).feeRule;
  if (!rule || typeof ctx.sbaFee !== 'function' || !fin(loan) || loan <= 0) return null;
  const type = rule === 'express' ? 'express' : 'standard';
  const f = obj(ctx.sbaFee(loan, type));
  if (!fin(f.baseline)) return null;
  const fees = obj(ctx.SBA_FEES);
  const vetOwned = s.combinedPct != null && s.combinedPct >= 0.51;
  // sbaFee().veteran already encodes the Express waiver (and any non-Express reduction, 0 today). It applies only
  // when the business is 51% or more veteran or spouse owned.
  const vetFee = vetOwned && fin(f.veteran) ? f.veteran : f.baseline;
  const vetWaiver = vetOwned && vetFee < f.baseline;
  // The waiver is for loans of $700,000 or less. A larger need split across loans is still one loan to SBA, so the
  // test uses everything that would be borrowed, not this path's piece.
  const sectorApplies = sector.possible && (fin(totalBorrowed) ? totalBorrowed : loan) <= sector.max;
  // One fee, never two waivers stacked: the result is the lower of the two, and savings are counted once.
  const final = sectorApplies ? 0 : vetFee;
  return {
    type, loan, baseline: f.baseline, sbaBacked: fin(f.guaranteed) ? f.guaranteed : null, vetOwned, vetWaiver, vetFee,
    sector: sectorApplies, sectorWho: sectorApplies ? sector.who : [], final, savings: Math.max(0, f.baseline - final),
    notice: str(fees.notice), noticeUrl: str(fees.noticeUrl), fy: fees.fy ?? null,
  };
}

/* ─── Paths ────────────────────────────────────────────────────────────── */
function equityFor(p, s, project) {
  const oc = obj(p.ownCash), R = EQUITY_RULES();
  // Buying a business: SBA Express follows the same change-of-ownership rule as other 7(a) loans (SOP Appendix 15).
  if (s.pathMode === 'buy' && fin(oc.buyPct)) return { kind: 'pct', tier: 2, pct: oc.buyPct, required: fin(project) ? Math.round(project * oc.buyPct) : null, sbaMinimum: true, offLoan: true, text: str(oc.buyText) || str(oc.text) };
  if (oc.kind === 'none') return { kind: 'none', tier: 0, required: 0, pct: 0, text: str(oc.text) };
  if (oc.kind === 'pct' && fin(oc.pct)) {
    let pct = oc.pct;
    if (oc.startupOnly) { // the 7(a) family
      if (s.pathMode === 'buy') pct = fin(R.acquisitionPct) ? R.acquisitionPct : oc.pct;
      else if (s.startup) pct = fin(R.startupPct) ? R.startupPct : oc.pct;
      else return { kind: 'lender', tier: 1, required: null, pct: null, sbaMinimum: false, text: str(oc.text), note: 'Your business has operated for more than a year, so SBA sets no minimum equity on this loan. The lender decides how much it wants you to put in.' };
    } else if (s.months > NEW_BUSINESS_504_MONTHS && fin(oc.pctEstablished)) pct = oc.pctEstablished;
    // The percentage is of the TOTAL project cost, never of the capped loan. For the 7(a) family the equity comes off
    // the amount borrowed (offLoan); 504 has its own three-part structure and keeps the project amount.
    return { kind: 'pct', tier: 2, pct, required: fin(project) ? Math.round(project * pct) : null, sbaMinimum: true, offLoan: !!oc.startupOnly, text: str(oc.text) };
  }
  return { kind: 'lender', tier: 1, required: null, pct: null, sbaMinimum: false, text: str(oc.text) || 'The lender sets the down payment.' };
}

function buildPaths(s, today, ctx, sector) {
  const out = [], withheld = [], notFit = [];
  for (const p of FUNDING_PATHS()) {
    if (!p || !p.id || !p.name) continue;
    if (!arr(p.modes).includes(s.pathMode)) continue;
    if (p.requires === 'reserve' && !s.reserve) continue;
    if (p.requires && p.requires !== 'reserve') continue; // a requirement this tool has no input for: hold it back
    if (arr(p.requiresBiz).length && !arr(p.requiresBiz).includes(s.bizType)) continue; // limited to certain industries
    const pmax = fin(obj(p.maxByBiz)[s.bizType]) ? p.maxByBiz[s.bizType] : p.max; // some programs cap by industry
    if (p.startupOk === false && s.months === 0) continue;
    if (fin(p.minMonths) && s.months < p.minMonths) continue;
    const gates = arr(p.gates);
    if (gates.includes('citizen') && !s.citizen) { withheld.push({ id: p.id, name: p.name, reason: 'citizen' }); continue; }
    if (gates.includes('vet51') && !(s.combinedPct >= 0.51)) { notFit.push({ id: p.id, name: p.name, reason: 'Needs a business at least 51% owned by a veteran or spouse.' }); continue; }
    if (s.state && arr(p.excludeStates).includes(s.state)) { notFit.push({ id: p.id, name: p.name, reason: `Not offered in ${stateName(s.state)}.` }); continue; }
    let provides = null, partial = false, financed = null;
    const equity = equityFor(p, s, s.amount);
    if (s.amount != null) {
      if (fin(p.min) && s.amount < p.min) continue; // smaller than the product's floor
      // What would actually be borrowed: the project less the down payment, when the down payment comes off the loan.
      financed = equity.kind === 'pct' && equity.offLoan && fin(equity.required) ? Math.max(0, s.amount - equity.required) : s.amount;
      partial = fin(pmax) && financed > pmax;
      provides = partial ? pmax : financed;
    }
    const gap = equity.kind === 'pct' && fin(equity.required) ? Math.max(0, equity.required - s.ownCash) : null;
    const notes = [];
    if (partial) notes.push(`Covers part: up to ${fmtUSD(pmax)} of the ${fmtUSD(financed)} you would borrow. You can combine it with another path to cover the rest.${obj(p.cost).feeRule ? ' When SBA loans are approved within 90 days of each other, SBA figures the fee as if they were one loan, so the fee on a combination can be higher than the figure shown for this piece.' : ''}`);
    const modeNote = str(obj(p.modeNotes)[s.pathMode]); if (modeNote) notes.unshift(modeNote);
    if (p.fixedAssetsOnly) notes.push('For fixed assets only. It fits if the money is going into a building, land, or long-life equipment, and it does not fit working capital or inventory.');
    if (equity.note) notes.push(equity.note);
    const unknownGates = gates.filter(g => !['citizen', 'vet51'].includes(g));
    if (unknownGates.length) notes.push('This product has an eligibility rule this tool does not check. Read the program page before you apply.');
    const fee = feeFor(p, provides, s, sector, ctx, financed);
    out.push({ id: p.id, name: p.name, row: p, provides, partial, coversAll: s.amount != null && !partial, equity, gap, fee, notes, statePath: false });
  }
  const cost = x => fin(obj(x.row.cost).aprLow) ? x.row.cost.aprLow : 999;
  // A path that cannot fund the main purpose in this mode (a working-capital line when buying) goes last.
  const side = x => (x.row.kind === 'line' && s.pathMode === 'buy') ? 1 : 0;
  out.sort((a, b) => (side(a) - side(b)) || (a.equity.tier - b.equity.tier) || ((a.equity.required ?? 0) - (b.equity.required ?? 0)) || (cost(a) - cost(b)));
  return { paths: out, withheld, notFit };
}

/* ─── State layer ──────────────────────────────────────────────────────── */
export const stateName = code => obj(S.STATE_NAMES)[code] || code || 'your state';
function buildState(s) {
  const all = obj(S.STATE_FUNDING);
  const rec = obj(all[s.state]);
  const checked = ['verified', 'none-found', 'pending'].includes(rec.checked) ? rec.checked : 'pending';
  const name = stateName(s.state);
  const rows = arr(rec.veteran).filter(r => r && r.name).map(r => {
    const confidence = ['verified', 'reported', 'unverified'].includes(r.confidence) ? r.confidence : 'unverified';
    const showTerms = confidence !== 'unverified';
    return {
      id: r.id || r.name, name: r.name, agency: str(r.agency), kind: str(r.kind), confidence,
      terms: showTerms ? str(r.terms) : '', who: showTerms ? str(r.who) : '',
      status: ['open', 'rounds', 'closed', 'unknown'].includes(r.status) ? r.status : 'unknown', statusNote: showTerms ? str(r.statusNote) : '',
      label: confidence === 'reported' ? 'Reported; confirm with the agency.' : '',
      statusLabel: showTerms ? ({ open: 'Open', rounds: 'Runs in application rounds', closed: 'Closed' })[r.status] || 'Status not confirmed' : '',
      ask: confidence === 'unverified' ? `We could not confirm this program from the agency’s own page. Ask ${str(r.agency) || 'the state agency'} whether it is taking applications and what the terms are.` : '',
      url: str(r.url), sourceUrls: arr(r.sourceUrls), verifiedDate: str(r.verifiedDate),
      // Counts toward the "$0 of your own cash" figure only when it is a verified, open, direct loan AND the data
      // carries `zeroCashMax`: the most the program lends with no equity, as a number. State loans differ (one
      // asks for 10% above $50,000), so the terms text is never parsed. No row carries the field today.
      max: fin(r.zeroCashMax) ? r.zeroCashMax : null,
      countsAsZeroCash: confidence === 'verified' && r.status === 'open' && r.kind === 'loan' && fin(r.zeroCashMax),
    };
  });
  let line;
  if (checked === 'pending') line = `Not yet checked. We have not finished researching ${name}’s veteran business financing, so this section cannot tell you what exists there. Your state veterans agency or a Veterans Business Outreach Center can.`;
  else if (checked === 'none-found') line = `The federal and national paths in your results apply in ${name}.${rec.general && rec.general.name ? ` ${name} also has a state loan program open to any small business, named in your state section.` : ''} We found no state loan program that is only for veterans (checked ${fmtDate(rec.checkedDate) || 'at our last check'}), which takes nothing away from the rest.`;
  else line = rows.length ? `${plural(rows.length, 'veteran financing program', 'veteran financing programs')} on file for ${name}${rec.checkedDate ? `, checked ${fmtDate(rec.checkedDate)}` : ''}.` : `${name} was checked${rec.checkedDate ? ` on ${fmtDate(rec.checkedDate)}` : ''}. No veteran financing row is on file.`;
  const g = rec.general && rec.general.name ? { ...rec.general, sourceUrls: arr(rec.general.sourceUrls), label: rec.general.confidence === 'reported' ? 'Reported; confirm with the agency.' : '', terms: rec.general.confidence === 'unverified' ? '' : str(rec.general.terms) } : null;
  // National lenders, lenders in the visitor's state, and lenders flagged alsoAsk (shown everywhere with statesNote).
  const lenders = arr(S.MISSION_LENDERS).filter(l => l && l.name && (arr(l.states).length === 0 || arr(l.states).includes(s.state) || l.alsoAsk === true))
    .map(l => ({ ...l, national: arr(l.states).length === 0, inState: arr(l.states).includes(s.state), states: arr(l.states), statesNote: str(l.statesNote), sourceUrls: arr(l.sourceUrls) }));
  // Founder Stack's loadFromUrl() restores state only when `r` is present; an empty `r` prefills the state and
  // leaves the rating for the visitor to pick.
  const fsMode = s.pathMode === 'scratch' ? 'think' : 'own';
  const founderStackUrl = `/veteran-business/?mode=${fsMode}&r=${s.rating != null ? encodeURIComponent(String(s.rating)) : ''}${s.state ? `&st=${encodeURIComponent(s.state)}` : ''}`;
  return {
    code: s.state, name, checked, checkedDate: str(rec.checkedDate), checkedNote: checked === 'pending' ? '' : str(rec.checkedNote), line,
    rows: checked === 'pending' ? [] : rows, general: checked === 'pending' ? null : g, lenders, founderStackUrl, stamp: str(S.STATE_FUNDING_STAMP),
  };
}

/* ─── Down payment ─────────────────────────────────────────────────────── */
function buildEquity(s, today, withheldSba) {
  const R = EQUITY_RULES();
  const caveat = str(R.lenderCaveat) || 'Allowed by SBA. Your lender may require more.';
  const buy = s.pathMode === 'buy';
  const needs = buy || s.startup;
  const pct = needs ? (buy ? R.acquisitionPct : R.startupPct) : null;
  const hasPct = fin(pct);
  const required = hasPct && s.amount != null ? Math.round(s.amount * pct) : null;
  const gap = required != null ? Math.max(0, required - s.ownCash) : null;
  const equityMode = buy ? 'buy' : 'scratch';
  const sources = EQUITY_SOURCES().filter(x => x && x.label && arr(x.modes).includes(equityMode)).map(x => {
    let available = null;
    if (x.ownCash) available = s.ownCash > 0 ? 'yes' : 'no';
    else if (x.input === 'gift') available = s.gift ? 'yes' : 'no';
    else if (x.input === 'outsideIncome') available = s.outsideIncome ? 'yes' : 'no';
    else if (x.input === 'sellerNote') available = s.sellerNote === 'yes' ? 'yes' : s.sellerNote === 'unsure' ? 'ask' : 'no';
    return { id: x.id, label: x.label, rule: str(x.rule), proof: str(x.proof), ownCash: !!x.ownCash, limited: buy && !!x.limitedInAcq, startupNote: !buy ? str(x.startupNote) : '', available, caveat };
  });
  // Buying a business: the half-cap group and the veteran flexibility window.
  let acq = null;
  if (buy) {
    const v = obj(R.vetAcq);
    const limitedNames = joinList(sources.filter(x => x.limited).map(x => lowerFirst(x.label)));
    const hasRule = !!(v.validFrom && v.validTo && fin(v.minVetOwnership));
    const inWindow = hasRule && today >= v.validFrom && today <= v.validTo;
    const ownOk = hasRule && s.vetPct != null && s.vetPct >= v.minVetOwnership;
    const full = inWindow && ownOk;
    const p = hasPct ? pctText(pct) : 'required equity';
    const half = required != null ? Math.round(required / 2) : null;
    const minOwn = hasRule ? pctText(v.minVetOwnership) : '';
    const win = hasRule ? `${fmtDate(v.validFrom)} through ${fmtDate(v.validTo)}` : '';
    let text, reason;
    if (full) {
      reason = 'on';
      text = `Veterans own at least ${minOwn} of the business after closing and today falls inside the window, so the limited sources (${limitedNames}) may supply the full ${p}${required != null ? `, ${fmtUSD(required)}` : ''}. The ${p} itself is not reduced. This applies to SBA loan numbers issued ${win}.`;
    } else {
      const cap = `Together, ${limitedNames} can supply no more than half of the ${p}${half != null ? ` (${fmtUSD(half)})` : ''}. The rest has to come from the sources that are not limited.`;
      if (!hasRule) { reason = 'no-rule'; text = cap; }
      else if (!inWindow) { reason = today > v.validTo ? 'expired' : 'not-yet'; text = `${cap} The veteran flexibility that lifts this cap covers SBA loan numbers issued ${win}, and today is outside that window.`; }
      else if (s.vetPct == null) { reason = 'spouse'; text = `${cap} The veteran flexibility lifts this cap when veterans own at least ${minOwn} after closing. If your own share reaches ${minOwn}, the limited sources may supply the full ${p} for SBA loan numbers issued ${win}. Ask the lender how a spouse’s share is counted.`; }
      else { reason = 'ownership'; text = `${cap} The veteran flexibility that lifts this cap needs veterans to own at least ${minOwn} after closing, and your answer is under that.`; }
    }
    acq = { full, reason, text, half, limitedNames, validFrom: str(v.validFrom), validTo: str(v.validTo), ruleText: str(v.text), sourceUrls: arr(v.sourceUrls), verifiedDate: str(v.verifiedDate), caveat };
  }
  // What the visitor's drawer answers make available that is not their own cash.
  const nonOwn = sources.filter(x => !x.ownCash && x.available === 'yes').map(x => lowerFirst(x.label));
  let statement;
  if (withheldSba) statement = 'SBA loans are withheld for your answers (see the citizenship rule in your funding paths), so the SBA equity rules below are for reference only.';
  else if (!needs) statement = 'Your business has operated for more than a year and you are not buying one, so SBA sets no minimum equity on a 7(a) loan. The lender decides how much it wants you to put in. The sources below are what SBA accepts when equity is required.';
  else if (!hasPct) statement = 'SBA requires equity on this kind of 7(a) loan. The percentage is not in our data right now, so ask the lender for the figure.';
  else if (required == null) statement = `${buy ? 'Buying a business with a 7(a) loan' : 'A startup on a 7(a) loan'} needs equity of ${pctText(pct)} of the total project cost. Enter an amount to see the dollar figure.`;
  else statement = `${buy ? `On a ${fmtUSD(s.amount)} purchase` : `On a ${fmtUSD(s.amount)} startup project`}, a 7(a) loan needs a down payment of ${fmtUSD(required)} (${pctText(pct)}), which SBA calls equity. You entered ${fmtUSD(s.ownCash)} of your own cash, which leaves ${gap > 0 ? `${fmtUSD(gap)} to fill from the sources below` : 'nothing to fill'}. The equity does not have to be your own cash.`;
  const nonOwnWords = nonOwn.length && needs && !withheldSba ? `Your answers show ${joinList(nonOwn)} as ${nonOwn.length === 1 ? 'a possible source' : 'possible sources'} for that equity other than your own savings. ${caveat}` : '';
  // Seller note explainer (buy mode only), with the visitor's own numbers when there are any.
  let sellerNote = null;
  const SN = obj(E.SELLER_NOTE);
  if (buy && SN.title) {
    let example = '';
    if (required != null && acq && !withheldSba) {
      const noteMax = acq.full ? required : acq.half, loan = Math.max(0, s.amount - required);
      example = `With your numbers: on a ${fmtUSD(s.amount)} purchase, the SBA loan could pay the seller up to ${fmtUSD(loan)} at closing, and the seller would carry ${acq.full ? `the other ${fmtUSD(noteMax)}` : `up to ${fmtUSD(noteMax)} of the remaining ${fmtUSD(required)}`} as a note. You make the SBA loan payments from the start. You make no payments on the note until the SBA loan is paid off or the note is refinanced, and then you owe the seller the ${fmtUSD(noteMax)} plus the interest that built up.`;
    }
    sellerNote = { title: str(SN.title), what: arr(SN.what), standby: arr(SN.standby), steps: arr(SN.steps), watch: arr(SN.watch), help: str(SN.help), example, sourceLabel: str(SN.sourceLabel), sourceUrls: arr(SN.sourceUrls), verifiedDate: str(SN.verifiedDate) };
  }
  // Standby explainer for startups (no seller involved).
  let standbyNote = null;
  const SB = obj(E.STANDBY_NOTE);
  if (!buy && needs && SB.title) {
    const example = required != null && gap > 0 && !withheldSba ? `With your numbers: if someone lends you the ${fmtUSD(gap)} and signs a standby agreement, SBA can count it as the down payment you still need. You would owe them the ${fmtUSD(gap)}, plus any interest, after the SBA loan is paid off.` : '';
    standbyNote = { title: str(SB.title), what: arr(SB.what), compare: arr(SB.compare), how: str(SB.how), example, sourceLabel: str(SB.sourceLabel), sourceUrls: arr(SB.sourceUrls), verifiedDate: str(SB.verifiedDate) };
  }
  return {
    sellerNote, standbyNote,
    needs, pct: hasPct ? pct : null, required, ownCash: s.ownCash, gap, statement, sources, acq, nonOwn, nonOwnWords, caveat,
    expressNote: buy ? '' : str(R.expressNote), startupDefinition: str(R.startupDefinition), notCounted: str(E.EQUITY_NOT_COUNTED),
    sopUrl: str(E.SOP_URL), stamp: str(E.EQUITY_STAMP),
  };
}

/* ─── Grants ───────────────────────────────────────────────────────────── */
// 'open' | 'closed' | 'invite'. A passed deadline moves a row to closed without an edit to the data.
export function grantStatus(g, today) {
  const cycle = g && g.cycle;
  if (cycle === 'rolling') return 'open';
  if (cycle === 'invite') return 'invite';
  const deadline = str(g && g.deadline), eventDate = str(g && g.eventDate);
  if (deadline) return today <= deadline ? 'open' : 'closed';
  if (cycle === 'dated' && g.openNow === true && (!eventDate || today <= eventDate)) {
    // "Applications were open when we looked" is not a deadline. Trust it for 45 days past the day we read the page.
    const seen = str(g.verifiedDate);
    if (!seen) return 'closed';
    const d = new Date(`${seen}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 45);
    return today <= d.toISOString().slice(0, 10) ? 'open' : 'closed';
  }
  return 'closed';
}
function grantMisses(g, s) {
  const e = obj(g.elig), miss = [];
  if (arr(e.owner).length && !arr(e.owner).some(o => s.ownerTypes.includes(o))) miss.push(`open to ${joinList(arr(e.owner).map(o => o === 'spouse' ? 'military spouse' : o))} owners`);
  if (fin(e.minOwnership) && !(s.combinedPct != null && s.combinedPct >= e.minOwnership)) miss.push(`needs at least ${pctText(e.minOwnership)} veteran or spouse ownership`);
  if (e.existingOnly && s.months === 0) miss.push('for a business that already exists');
  if (fin(e.minMonths) && s.months < e.minMonths) miss.push(`needs at least ${e.minMonths} months in business`);
  if (fin(e.minEmployees) && s.employees < e.minEmployees) miss.push(`needs at least ${e.minEmployees} employees`);
  if (fin(e.maxEmployees) && s.employees > e.maxEmployees) miss.push(`capped at ${e.maxEmployees} employees`);
  if (arr(e.industries).length && !arr(e.industries).some(t => s.tags.includes(t))) miss.push(`limited to ${joinList(arr(e.industries))} businesses`);
  if (arr(e.states).length && !arr(e.states).includes(s.state)) miss.push(`limited to ${joinList(arr(e.states).map(stateName))}`);
  return miss;
}
// HARD RULE (ended-programs.js): a row is named as ended only with a verdict, the organization's own words,
// the page they are on, and the date that page was opened.
export function endedRowIsProven(r) {
  return !!(r && str(r.name) && ['ended', 'paused', 'changed'].includes(r.verdict) && str(r.proofQuote) && /^https?:\/\//.test(str(r.proofUrl)) && /^\d{4}-\d{2}-\d{2}$/.test(str(r.proofDate)));
}
function buildGrants(s, today) {
  const open = [], openNotForYou = [], invite = [], closed = [];
  for (const g of arr(G.GRANTS)) {
    if (!g || !g.name) continue;
    const status = grantStatus(g, today), miss = grantMisses(g, s);
    const row = { ...g, status, miss, sourceUrls: arr(g.sourceUrls), deadlineLabel: str(g.deadlineText) || (g.deadline ? `Due ${fmtDate(g.deadline)}` : '') };
    if (status === 'open') (miss.length ? openNotForYou : open).push(row);
    else if (status === 'invite') invite.push(row);
    else closed.push(row);
  }
  const key = g => str(g.deadline) || str(g.eventDate) || '9999-12-31';
  open.sort((a, b) => key(a).localeCompare(key(b)));
  openNotForYou.sort((a, b) => key(a).localeCompare(key(b)));
  // A row flagged mostlyInvestment is a pitch event with no cash award: listed, labeled, and left out of the counts.
  const openCash = open.filter(g => !g.mostlyInvestment);
  const dated = openCash.filter(g => str(g.deadline));
  const nearest = dated.length ? { name: dated[0].name, deadline: dated[0].deadline, label: fmtDate(dated[0].deadline) } : null;
  const maxes = openCash.map(g => g.amountMax).filter(fin);
  const general = arr(G.GENERAL_GRANTS).filter(g => g && g.name && grantStatus(g, today) === 'open' && (!arr(g.industries).length || arr(g.industries).some(t => s.tags.includes(t))))
    .map(g => ({ ...g, sourceUrls: arr(g.sourceUrls), deadlineLabel: str(g.deadlineText) || (g.deadline ? `Due ${fmtDate(g.deadline)}` : '') }));
  const notGrants = arr(G.NOT_GRANTS).filter(n => n && n.name && n.what).map(n => ({ ...n, relevant: n.id === 'vetfran' && s.bizType === 'franchise' }));
  const endedAll = arr(X.ENDED_PROGRAMS).filter(r => r && r.name);
  const ended = endedAll.filter(endedRowIsProven);
  const noCycle = endedAll.filter(r => r.verdict === 'no-cycle-found');
  const myth = arr(G.MYTH_SOURCES).filter(m => m && m.quote && m.url);
  const sc = obj(G.SCAM_CHECK);
  return {
    open, openCash, openNotForYou, invite, closed, general, notGrants, ended, noCycle, heldBack: endedAll.length - ended.length - noCycle.length,
    nearest, largest: maxes.length ? Math.max(...maxes) : null,
    sbaQuote: myth.find(m => m.who === 'SBA') || null, otherMyth: myth.filter(m => m.who !== 'SBA'),
    scam: { lines: arr(sc.lines), report: str(sc.report), sourceUrls: arr(sc.sourceUrls), verifiedDate: str(sc.verifiedDate) },
    stamp: str(G.GRANTS_STAMP), endedStamp: str(X.ENDED_STAMP),
  };
}

/* ─── What each dollar costs ───────────────────────────────────────────── */
function buildCosts(s, paths, st) {
  const rows = [];
  for (const x of paths) {
    const c = obj(x.row.cost);
    if (!c.rateText) continue;
    const hasApr = fin(c.aprLow) && fin(c.aprHigh) && fin(x.provides);
    rows.push({
      name: x.name, amount: x.provides, rateText: c.rateText,
      yearLow: hasApr ? Math.round(x.provides * c.aprLow / 100) : null, yearHigh: hasApr ? Math.round(x.provides * c.aprHigh / 100) : null,
      fee: x.fee, sbaBacked: arr(x.row.gates).includes('citizen') && x.row.kind !== 'disaster', hasRate: fin(c.aprLow) && fin(c.aprHigh),
      sourceUrl: arr(x.row.sourceUrls)[0] || str(x.row.url), verifiedDate: str(x.row.verifiedDate),
    });
  }
  for (const r of st.rows) if (r.confidence !== 'unverified' && r.terms && r.status !== 'closed') rows.push({ name: `${r.name} (${st.name})`, amount: null, rateText: r.terms, yearLow: null, yearHigh: null, fee: null, sourceUrl: r.url || r.sourceUrls[0] || '', verifiedDate: r.verifiedDate, note: [r.statusLabel, r.label].filter(Boolean).join('. ') });
  const b = obj(P.COST_BENCHMARKS);
  const benchmark = fin(b.creditCardApr) ? {
    name: 'A business credit card, for comparison', amount: s.amount, rateText: `About ${b.creditCardApr}% APR on average${fin(b.creditCardAprAssessed) ? ` (${b.creditCardAprAssessed}% on accounts that were charged interest)` : ''}`,
    yearLow: s.amount != null ? Math.round(s.amount * b.creditCardApr / 100) : null, yearHigh: null, fee: null,
    sourceUrl: str(b.creditCardSource), verifiedDate: str(b.verifiedDate), note: str(b.creditCardNote), benchmark: true,
  } : null;
  return { rows, benchmark };
}

/* ─── Hero ─────────────────────────────────────────────────────────────── */
function citizenRule() {
  const row = CHANGES().find(c => c && /citizen/i.test(String(c.title || '')));
  return row ? { date: fmtDate(row.date), text: str(row.text), source: str(row.source), url: str(row.url) } : null;
}
function monthsLabel(m) { return m <= STARTUP_MONTHS ? 'a year or less' : m <= NEW_BUSINESS_504_MONTHS ? 'one to two years' : 'more than two years'; }
// Buying a business: how much of the veteran's OWN cash the purchase needs. The 7(a) loan funds the purchase less the
// required equity, and the equity does not have to be the buyer's cash. Always conditional on a source and on the
// lender; never a promise.
// "Where to find a lender": official directories and questions, chosen from the visitor's own results.
// `need` is true when at least one path is decided by a lender the visitor has to go and find, which is when the
// page points people to this section.
const LENDER_PATH_IDS = ['express', '7a-small', '7a-standard', 'caplines', 'marc', 'wcp', '504', 'microloan'];
const SBA_BANK_IDS = ['express', '7a-small', '7a-standard', 'caplines', 'marc', 'wcp', '504'];
function buildLenders(s, r) {
  const ids = r.paths.map(x => x.id), has = id => ids.includes(id);
  const anySba = ids.some(id => SBA_BANK_IDS.includes(id));
  const express = r.paths.find(x => x.id === 'express');
  const flags = {
    'always': true, 'any-sba': anySba, 'express': !!express && s.mode !== 'buy', 'express-vet': !!(express && express.fee && express.fee.vetWaiver),
    'equity': anySba && !!(r.equity && r.equity.needs), 'buy-vet': s.mode === 'buy' && anySba && !!(r.equity && r.equity.acq && r.equity.acq.full),
    'lines': ['caplines', 'marc', 'wcp'].some(has), 'startup': anySba && s.pathMode === 'scratch', 'sector': anySba && !!(r.sector && r.sector.possible), 'microloan': has('microloan'),
  };
  const directories = arr(L.LENDER_DIRECTORIES).filter(d => d && d.name && d.url && (d.showFor === 'always' || (d.showFor === 'any-sba' && anySba) || arr(d.showFor).some(has)));
  const questions = arr(L.LENDER_QUESTIONS).filter(q => q && q.q && flags[q.when]);
  const st = r.state || {};
  const local = [
    ...arr(st.rows).filter(x => x.confidence !== 'unverified' && x.status !== 'closed').map(x => ({ name: x.name, kind: 'state veteran program', url: x.url })),
    ...(st.general && st.general.name ? [{ name: st.general.name, kind: 'state program, open to any small business', url: st.general.url }] : []),
    ...arr(st.lenders).map(x => ({ name: x.name, kind: x.national ? 'nonprofit lender, national' : x.inState ? 'nonprofit lender in your state' : 'nonprofit lender, ask if it serves your state', url: x.url })),
  ].filter(x => x.name && x.url);
  const need = ids.some(id => LENDER_PATH_IDS.includes(id));
  const prompt = !need ? '' : s.mode === 'buy' ? 'Find a lender who handles SBA business purchases' : flags.lines && s.mode === 'grow' ? 'Find a lender for a loan or a line of credit' : 'See where to find a lender, and what to ask';
  return { need, prompt, directories, questions, local, stateName: str(st.name), stamp: str(L.LENDERS_STAMP), lenderPathIds: LENDER_PATH_IDS };
}
function buildBuyCash(s, r) {
  const eq = r.equity;
  if (s.mode !== 'buy' || r.withheld.length || !eq || eq.required == null || !eq.acq) return null;
  const req = eq.required, loan = Math.max(0, s.amount - req), a = eq.acq, until = fmtDate(a.validTo);
  // Only when an SBA loan in the results can carry the purchase less the down payment. Above the 7(a) maximum, or
  // with no SBA purchase loan in the results, there is no "$0 of your own cash" statement to make.
  const carrier = r.paths.filter(x => ['express', '7a-small', '7a-standard'].includes(x.id));
  if (!carrier.length || !carrier.some(x => !x.partial)) return null;
  const tail = ' Your lender may require more.';
  if (eq.gap === 0) return { zeroPossible: false, amountText: fmtUSD(req), loan, required: req, short: 'which the cash you entered covers', sub: `The ${fmtUSD(s.ownCash)} of your own cash you entered covers the ${fmtUSD(req)} SBA requires.${tail}`, lead: '' };
  let sub, short, lead;
  if (a.full && s.sellerNote === 'yes') {
    short = `if the seller note covers the ${fmtUSD(req)}`;
    sub = `The seller note you described can cover the whole ${fmtUSD(req)} if it is on full standby. Allowed for veteran buyers through ${until}.${tail}`;
    lead = `On paper you can buy this ${fmtUSD(s.amount)} business with $0 of your own cash: an SBA 7(a) loan for up to ${fmtUSD(loan)}, and the seller note you described covering the ${fmtUSD(req)} down payment. The seller agrees to wait for that money until your SBA loan is paid off.`;
  } else if (a.full && s.sellerNote === 'unsure') {
    short = `if the seller carries the ${fmtUSD(req)} as a note`;
    sub = `If the seller carries the ${fmtUSD(req)} as a note on full standby, it can cover all of the equity. Allowed for veteran buyers through ${until}.${tail}`;
    lead = `On paper you can buy this ${fmtUSD(s.amount)} business with $0 of your own cash: an SBA 7(a) loan for up to ${fmtUSD(loan)}, and a seller note covering the ${fmtUSD(req)} down payment, with the seller agreeing to wait for that money until your SBA loan is paid off. That depends on the seller agreeing to carry the note.`;
  } else if (a.full) {
    short = `if another source covers the ${fmtUSD(req)}`;
    sub = `Without a seller note, the ${fmtUSD(req)} can still come from other debt on full standby, a minority investor, a gift, or a loan repaid from income outside the business.${tail}`;
    lead = `On paper you can buy this ${fmtUSD(s.amount)} business with $0 of your own cash: an SBA 7(a) loan for up to ${fmtUSD(loan)}, with the ${fmtUSD(req)} down payment coming from a source other than your savings. You said the seller would not carry a note, so that source would be other standby debt, a minority investor, a gift, or a loan repaid from outside income.`;
  } else {
    short = 'if the equity comes from sources other than your savings';
    sub = `A seller note and the other limited sources can cover up to ${fmtUSD(a.half)}. The other ${fmtUSD(req - a.half)} can be a gift, a grant, or a loan repaid from income outside the business.${tail}`;
    lead = `On paper you can buy this ${fmtUSD(s.amount)} business with $0 of your own cash: an SBA 7(a) loan for up to ${fmtUSD(loan)}, with the ${fmtUSD(req)} down payment coming from sources other than your savings.`;
  }
  if (s.ownCash > 0) lead += ` You entered ${fmtUSD(s.ownCash)} of your own cash. You can put it toward the down payment to shrink what someone else has to cover, or keep it as starting cash.`;
  return { zeroPossible: true, amountText: fmtUSD(0), loan, required: req, short, sub, lead };
}
function buildHero(s, r) {
  const n = r.paths.length, z = r.zeroCash, eq = r.equity, lines = [];
  const pathsOpen = `${plural(n, 'funding path is', 'funding paths are')} open to you on paper`;
  let kicker;
  if (r.withheld.length) {
    const cr = r.citizenRule;
    lines.push(`${cr && cr.date ? `Since ${cr.date}, ` : ''}SBA loans need every owner to be a U.S. citizen or U.S. national, so ${plural(r.withheld.length, 'SBA path is', 'SBA paths are')} withheld for your answers.`);
  }
  const kivaNote = () => s.months === 0 && z.parts.some(p => /kiva/i.test(p.name)) ? ' Kiva lends its top amount to a business with official business documents; without them its cap is $1,000 to $3,000.' : '';
  const zeroLine = () => z.amount > 0 ? `Up to ${fmtUSD(z.amount)} of it could come from ${joinList(z.parts.map(p => p.name))} with no down payment required by the program.${kivaNote()}` : '';
  const restLine = () => {
    if (s.amount == null || z.amount >= s.amount) return '';
    const remaining = s.amount - z.amount;
    const lenderPaths = r.paths.filter(x => x.equity.tier > 0 && x.row.kind !== 'crowd');
    const next = lenderPaths.find(x => !fin(x.row.max) || x.row.max >= remaining) || lenderPaths[0];
    if (!next) return '';
    const lead = z.amount > 0 ? 'For the rest, look at the ' : 'The first path to look at is the ';
    if (next.equity.kind === 'pct' && fin(next.equity.required)) return `${lead}${next.name}, which takes a down payment of ${fmtUSD(next.equity.required)} (${pctText(next.equity.pct)}). SBA lets that come from sources other than your savings.`;
    const fee = next.fee && next.fee.vetWaiver ? ' The SBA upfront fee on it is $0 for a business at least 51% owned by a veteran or spouse.' : '';
    return `${lead}${next.name}. SBA sets no minimum down payment on it, so the lender sets its own.${fee}`;
  };
  if (s.mode === 'buy') {
    kicker = r.buyCash && eq.gap > 0 ? `$0 of your own cash is possible on a ${fmtUSD(s.amount)} purchase` : eq.required != null ? `${fmtUSD(eq.required)} in equity on a ${fmtUSD(s.amount)} purchase` : 'Buying a business';
    if (r.buyCash && r.buyCash.lead) lines.push(r.buyCash.lead);
    if (r.withheld.length) kicker = 'SBA loans are withheld for your answers';
    else if (!r.buyCash && eq.required != null && s.amount - eq.required > 5000000) lines.push(`An SBA 7(a) loan tops out at $5,000,000. On a ${fmtUSD(s.amount)} purchase, the loan and the ${fmtUSD(eq.required)} down payment together leave ${fmtUSD(s.amount - eq.required - 5000000)} to come from somewhere else, such as a larger seller note or a 504 loan when real estate is part of the purchase.`);
    if (eq.required != null && !r.withheld.length) {
      lines.push(`On a ${fmtUSD(s.amount)} purchase, an SBA 7(a) loan needs a down payment of ${fmtUSD(eq.required)} (${pctText(eq.pct)}), which SBA calls equity.`);
      if (eq.acq) lines.push(eq.acq.full
        ? `Through ${fmtDate(eq.acq.validTo)}, a veteran buyer who owns at least half can cover all of it with ${eq.acq.limitedNames.replace(/, and /, ', or ').replace(/ and /, ' or ')}.`
        : `Together, ${eq.acq.limitedNames} can cover up to half of it${eq.acq.half != null ? ` (${fmtUSD(eq.acq.half)})` : ''}. The rest comes from the other sources SBA accepts.`);
      lines.push(eq.gap > 0 ? `You entered ${fmtUSD(s.ownCash)} of your own cash, so ${fmtUSD(eq.gap)} is left to fill.` : `The ${fmtUSD(s.ownCash)} of your own cash you entered covers it.`);
      if (s.sellerNote === 'yes') lines.push('You said the seller would carry a note. Ask for it on full standby, in writing.');
    }
    lines.push(`${pathsOpen.charAt(0).toUpperCase() + pathsOpen.slice(1)}.`);
  } else if (s.mode === 'grants') {
    // Answer the grant question in one line, then lead with the money that does exist.
    const g = r.grants, k = g.openCash.length;
    const zeroAmt = z.amount != null ? z.amount : z.uncapped;
    kicker = zeroAmt > 0 ? `Few grants exist. ${fmtUSD(zeroAmt)} in loans needs no down payment.` : 'Few grants exist. Here is what does.';
    if (k) lines.push(`Few grants for veteran-owned businesses exist. ${plural(k, 'grant or prize is', 'grants and prizes are')} open to your profile today${fin(g.largest) ? `, with the largest award up to ${fmtUSD(g.largest)}` : ''}${g.nearest ? `. The nearest deadline is ${g.nearest.label} (${g.nearest.name})` : ''}. Each one is competitive.`);
    else lines.push(`Few grants for veteran-owned businesses exist, and none with a cash award is open to your profile today.${arr(g.open).length - k > 0 ? ` ${plural(arr(g.open).length - k, 'pitch event is', 'pitch events are')} taking applications, with no cash award listed.` : ''}${g.closed.length ? ` ${plural(g.closed.length, 'more is real but closed', 'more are real but closed')} for this cycle.` : ''}`);
    if (zeroAmt > 0) lines.push(`The larger money needs no down payment either: up to ${fmtUSD(zeroAmt)} in loans with $0 of your own cash (${joinList(z.parts.map(p => p.name))}).${kivaNote()}`);
    const rest = restLine(); if (rest) lines.push(rest);
    if (k && g.closed.length) lines.push(`${plural(g.closed.length, 'more grant is real but closed', 'more grants are real but closed')} for this cycle.`);
    if (g.ended.length) lines.push(`${plural(g.ended.length, 'program you may have read about has', 'programs you may have read about have')} ended, paused, or changed. Each is named in the grants section with the organization\u2019s own words.`);
    if (g.sbaQuote) lines.push(`SBA says it plainly: \u201c${g.sbaQuote.quote}\u201d`);
    if (n) lines.push(`${pathsOpen.charAt(0).toUpperCase() + pathsOpen.slice(1)}.`);
  } else if (s.mode === 'grow') {
    kicker = `${plural(n, 'path fits', 'paths fit')} your business on paper`;
    lines.push(`${plural(n, 'funding path fits', 'funding paths fit')} a business with ${monthsLabel(s.months)} of history that needs ${fmtUSD(s.amount)}.`);
    const priced = r.paths.filter(x => fin(obj(x.row.cost).aprLow)).sort((a, b) => a.row.cost.aprLow - b.row.cost.aprLow)[0];
    if (priced) lines.push(`The lowest published rate among them is the ${priced.name}: ${lowerFirst(priced.row.cost.rateText)}.`);
    const stRow = r.state.rows.find(x => x.confidence === 'verified' && x.terms && x.status === 'open');
    if (stRow) lines.push(`${r.state.name} also has the ${stRow.name}. See the section on your state.`);
    lines.push(zeroLine(), restLine());
  } else {
    kicker = z.amount > 0 ? `${fmtUSD(z.amount)} open on paper with $0 of your own cash` : `${plural(n, 'path', 'paths')} open on paper`;
    lines.push(`You need ${fmtUSD(s.amount ?? 0)} and have ${fmtUSD(s.ownCash)} of your own cash to put in. ${pathsOpen.charAt(0).toUpperCase() + pathsOpen.slice(1)}.`);
    lines.push(zeroLine(), restLine());
  }
  if (s.mode !== 'buy' && eq.nonOwnWords && s.mode !== 'grants') lines.push(eq.nonOwnWords);
  lines.push('“Open on paper” means the published rules allow it. The lender or program makes the decision.');
  return { kicker, lines: lines.filter(Boolean) };
}

/* ─── Main ─────────────────────────────────────────────────────────────── */
export function solve(input = {}, ctx = {}) {
  ctx = obj(ctx);
  const today = isoDate(ctx.today);
  const s = normalize(input);
  const sector = sectorWaiver(s, today, ctx);
  const { paths, withheld, notFit } = buildPaths(s, today, ctx, sector);
  const st = buildState(s);
  const grants = buildGrants(s, today);
  const sbaWithheld = withheld.length > 0;
  const equity = buildEquity(s, today, sbaWithheld);

  // "$0 of your own cash": only loans whose program states no equity requirement, each counted once at its
  // maximum, capped at the amount needed. Never a grant (winning is not certain), never crowdfunding or a disaster
  // loan, never Express or 7(a) (their equity is the lender's call or a percentage).
  const parts = paths.filter(x => x.equity.kind === 'none' && ['loan', 'crowd-loan'].includes(x.row.kind) && fin(x.row.max)).map(x => ({ name: x.name, max: x.row.max }));
  for (const r of st.rows) if (r.countsAsZeroCash) parts.push({ name: r.name, max: r.max });
  const sum = parts.reduce((a, p) => a + p.max, 0);
  const zeroCash = { amount: s.amount != null ? Math.min(s.amount, sum) : null, uncapped: sum, parts };

  const costs = buildCosts(s, paths, st);
  const P_STAMP = str(P.PATHS_STAMP);
  const notForStartups = s.pathMode !== 'buy' && s.months < 12 ? arr(P.NOT_FOR_STARTUPS).filter(x => x && x.name && x.why) : [];
  const changes = CHANGES().filter(c => c && c.title && c.date).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .map(c => ({ ...c, dateLabel: fmtDate(c.date), endsLabel: c.endsOn ? fmtDate(c.endsOn) : '', ended: !!c.endsOn && today > c.endsOn }));
  const bills = arr(C.PENDING_BILLS).filter(b => b && b.name && b.enacted === false).map(b => ({ ...b, introducedLabel: fmtDate(b.introduced) }));
  const help = arr(C.FREE_HELP).filter(h => h && h.name && h.what);
  const facts = arr(C.BENEFIT_FACTS).filter(f => f && f.title && f.text);
  const robsRow = obj(C.ROBS);
  const robs = s.retirement && robsRow.text ? { ...robsRow, sourceUrls: arr(robsRow.sourceUrls) } : null;
  const ratingLines = [];
  if (s.rating != null) {
    if (s.rating >= 10) {
      const comp = typeof ctx.monthlyComp === 'function' ? ctx.monthlyComp(s.rating, false, 0) : null;
      if (fin(comp) && comp > 0) ratingLines.push({ text: `At ${s.rating}% with no dependents, VA compensation is ${fmtUSD(comp)} a month on the current rate table. It arrives whether the business earns or not.`, url: '', linkText: '' });
      ratingLines.push({ text: 'A rating of 10% or more is the threshold to be evaluated for VR&E, which has a self-employment track.', url: '/vre-self-employment-prep/', linkText: 'VR&E Self-Employment Prep' });
    }
    ratingLines.push({ text: 'Any service-connected rating, including 0%, opens SDVOSB certification.', url: st.founderStackUrl, linkText: 'Veteran Founder Stack' });
  }

  const r = {
    s, today, todayLabel: fmtDate(today), sector, paths, withheld, notFit, notForStartups, zeroCash, equity, grants, state: st, costs,
    changes, bills, help, facts, robs, ratingLines, citizenRule: citizenRule(), stamps: { paths: P_STAMP, changes: str(C.CHANGES_STAMP) },
    sbaContext: obj(P.SBA_CONTEXT),
  };
  const LN = obj(P.LINE_OF_CREDIT_NOTE);
  r.lineNote = LN.title && paths.some(x => x.row.kind === 'line' || x.row.lineOk === true) ? { title: str(LN.title), lines: arr(LN.lines), sourceUrls: arr(LN.sourceUrls), verifiedDate: str(LN.verifiedDate) } : null;
  r.lenders = buildLenders(s, r);
  r.buyCash = buildBuyCash(s, r);
  r.hero = buildHero(s, r);
  return r;
}

/* ─── Lender-ready checklist (same document shape docx.js writes) ───────── */
const T = t => [{ t }];
export function buildChecklist(r) {
  const s = r.s, sections = [];
  const add = (title, blocks) => { if (blocks.length) sections.push({ n: sections.length + 1, title, blocks }); };
  const help = id => r.help.find(h => h.id === id);

  // 1. Free review first
  {
    const items = ['vboc', 'sbdc', 'score'].map(help).filter(Boolean).map(h => T(`${h.name}: ${h.what} ${h.url}`));
    if (items.length) add('Book the free review first', [{ type: 'p', items: [T('These offices are free. Book one before you apply anywhere.')] }, { type: 'ul', items }]);
  }
  // 2. Paths, in order
  {
    const items = r.paths.slice(0, 6).map(x => {
      const own = x.equity.kind === 'none' ? 'No down payment required by the program.' : x.equity.kind === 'pct' && x.equity.required != null ? `Equity of ${fmtUSD(x.equity.required)} (${pctText(x.equity.pct)}).` : 'The lender sets the down payment.';
      return T(`${x.name}${x.provides != null ? `, up to ${fmtUSD(x.provides)}` : ''}. ${own} Who decides: ${str(x.row.decides)} Next step: ${str(x.row.nextStep)} ${str(x.row.url)}`);
    });
    if (items.length) add('Your funding paths, least of your own cash first', [{ type: 'ol', items }]);
  }
  // 3. Down payment proof
  if (r.equity.needs && !r.withheld.length) {
    const blocks = [{ type: 'p', items: [T(r.equity.statement)] }];
    if (r.equity.acq) blocks.push({ type: 'p', items: [T(r.equity.acq.text)] });
    const pick = r.equity.sources.filter(x => x.available === 'yes' || x.available === 'ask');
    const list = (pick.length ? pick : r.equity.sources).map(x => T(`${x.label}: ${x.proof}`));
    if (list.length) blocks.push({ type: 'p', items: [T(pick.length ? 'Documents for the sources your answers point to:' : 'Documents for each source SBA accepts:')] }, { type: 'ul', items: list });
    blocks.push({ type: 'p', items: [T(r.equity.caveat)] });
    add('The down payment and its paper trail', blocks);
  }
  // 4. Things to confirm with the lender
  {
    const items = [];
    if (r.citizenRule && r.paths.some(x => arr(x.row.gates).includes('citizen'))) items.push(T(`Ownership: ${r.citizenRule.text}`));
    const ex = r.paths.find(x => x.fee && x.fee.vetWaiver);
    if (ex && ex.row.vetFee) items.push(T(`Fee: ${ex.row.vetFee} Ask the lender to confirm the fee in writing.`));
    const sec = r.paths.find(x => x.fee && x.fee.sector);
    if (sec && r.sector.row) items.push(T(`Fee: ${r.sector.row.text} Ask the lender whether your business is on that list.`));
    const proj = r.paths.find(x => /projections/i.test(str(x.row.decides)));
    if (proj) items.push(T(`Projections: ${proj.row.decides}`));
    if (items.length) add('Confirm these with the lender', [{ type: 'ul', items }]);
  }
  // 5. Grants with a date
  {
    const items = r.grants.open.map(g => T(`${g.name}: ${str(g.amountText)}${g.deadlineLabel ? ` ${g.deadlineLabel}.` : ''} ${str(g.url)}`));
    if (items.length) add('Grants and prizes open to your profile', [{ type: 'p', items: [T(`${r.grants.scam.lines[0] || ''} Each of these is competitive, so keep the loan work moving while you apply.`.trim())] }, { type: 'ul', items }]);
  }
  // 6. State
  {
    const items = r.state.rows.filter(x => x.confidence !== 'unverified').map(x => T(`${x.name} (${x.statusLabel}${x.label ? `. ${x.label}` : ''}): ${x.terms} ${x.statusNote} ${x.url}`.replace(/\s+/g, ' ').trim()));
    for (const l of r.state.lenders) items.push(T(`${l.name}: ${str(l.terms)} ${!l.national && !l.inState ? l.statesNote : ''} ${str(l.url)}`.replace(/\s+/g, ' ').trim()));
    if (items.length || r.state.code) add(`${r.state.name}`, [{ type: 'p', items: [T(r.state.line)] }, ...(items.length ? [{ type: 'ul', items }] : [])]);
  }
  return {
    header: [T('LENDER-READY CHECKLIST'), T('Veteran Business Funding Finder, The Better Veteran'), T(`Built ${r.todayLabel} from your answers: ${({ scratch: 'starting from scratch', buy: 'buying a business', grow: 'growing a business', grants: 'looking for grants' })[s.mode]}${s.amount != null ? `, ${fmtUSD(s.amount)} needed` : ''}${s.state ? `, ${r.state.name}` : ''}.`)],
    howTo: [
      'Work the sections in order. The free review comes first because it costs nothing and catches problems early.',
      'Every figure here comes from a published program rule. The lender or program makes its own decision.',
      'This is an educational checklist. It is not a loan application and it is not financial advice.',
    ],
    sections,
    closing: [T('Rules and programs change. Check each link before you rely on it.'), T('tools.thebetterveteran.com/business-funding/')],
  };
}
const partText = parts => arr(parts).map(p => p.b ? `[${p.b}]` : (p.t || '')).join('');
export function checklistToText(doc) {
  const out = [...doc.header.map(partText), '', ...doc.howTo.map(h => `- ${h}`), ''];
  for (const sec of doc.sections) {
    out.push(`${sec.n}. ${sec.title.toUpperCase()}`);
    for (const b of sec.blocks) {
      if (b.type === 'p') out.push(partText(b.items[0]));
      else b.items.forEach((it, i) => out.push(`${b.type === 'ol' ? `${i + 1}.` : '-'} ${partText(it)}`));
    }
    out.push('');
  }
  return [...out, ...doc.closing.map(partText)].join('\n');
}
export function checklistToHtml(doc, esc) {
  const link = t => esc(t).replace(/(https?:\/\/[^\s<]+[^\s<.,;)])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  const pt = parts => link(partText(parts));
  let h = doc.header.map((l, i) => `<p class="lh${i < 2 ? ' lh-title' : ''}">${pt(l)}</p>`).join('');
  h += `<div class="l-howto"><p class="l-howto-t">How to use this</p><ul>${doc.howTo.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
  for (const sec of doc.sections) {
    h += `<h4>${sec.n}. ${esc(sec.title)}</h4>`;
    for (const b of sec.blocks) {
      if (b.type === 'p') h += `<p>${pt(b.items[0])}</p>`;
      else h += `<${b.type}>${b.items.map(it => `<li>${pt(it)}</li>`).join('')}</${b.type}>`;
    }
  }
  return h + doc.closing.map(l => `<p class="lc">${pt(l)}</p>`).join('');
}
