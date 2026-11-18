// Veteran Business Funding Finder: UI wiring on the house template (forked from vre-self-employment-prep 11/17/26).
// Every program row on the page is rendered from ./data/ through engine.js. Nothing here hardcodes a row.
import { solve, buildChecklist, checklistToText, checklistToHtml, fmtUSD, fmtDate, MODES } from './engine.js';
import { STATE_NAMES } from './data/state-funding.js';
import { PATHS_STAMP } from './data/funding-paths.js';
import { GLOSSARY } from './data/glossary.js';
import { buildDocxBytes, DOCX_MIME } from './docx.js';
// SBA fee schedule and math live in Veteran Founder Stack. Imported, never copied.
import { sbaFee, SBA_FEES, monthlyComp } from '/veteran-business/data/rules.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SOURCE = 'business-funding';
const CTX = { sbaFee, SBA_FEES, monthlyComp };
const state = { mode: 'scratch', revealed: false, last: null, retFromLink: false };
$('data-stamp').textContent = fmtDate(PATHS_STAMP) || '';

/* ─── Elements ─────────────────────────────────────────────────────────── */
const amountEl = $('amount'), cashEl = $('own-cash'), stateEl = $('state'), ownershipEl = $('ownership'), bizEl = $('biz-type'), ruralEl = $('rural');
const citizenEl = $('citizen'), monthsEl = $('months'), employeesEl = $('employees'), ratingEl = $('rating'), reserveEl = $('reserve'), spouseEl = $('spouse-owner');
const giftEl = $('gift'), sellerEl = $('seller-note'), incomeEl = $('outside-income'), retirementEl = $('retirement');

stateEl.insertAdjacentHTML('beforeend', Object.entries(STATE_NAMES || {}).sort((a, b) => a[1].localeCompare(b[1])).map(([k, n]) => `<option value="${esc(k)}">${esc(n)}</option>`).join(''));

/* ─── Small render helpers ─────────────────────────────────────────────── */
const safeUrl = u => (typeof u === 'string' && (/^https?:\/\//.test(u) || /^\/[A-Za-z0-9?]/.test(u))) ? u : '';
const link = (u, text) => { const h = safeUrl(u); return h ? `<a href="${esc(h)}"${h.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(text)}</a>` : esc(text); };
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return 'source'; } };
function srcLine(urls, date, label = 'Source') {
  const list = [...new Set((urls || []).filter(safeUrl))];
  if (!list.length && !date) return '';
  return `<p class="sc-src">${label}: ${list.map(u => link(u, host(u))).join(' · ') || 'see the program page'}${date ? ` · verified ${esc(fmtDate(date) || date)}` : ''}</p>`;
}
const money = t => esc(t).replace(/(\$[\d,]+(?:\.\d+)?)/g, '<strong>$1</strong>');
const pct = p => `${Math.round(p * 1000) / 10}%`;
const chip = (text, cls = 'chip-gold') => `<span class="chip ${cls}">${esc(text)}</span>`;

/* ─── Mode pills (reshape the tool) ────────────────────────────────────── */
const MODE_BRIEF = {
  scratch: 'SBA gives no grants to start a business, so the money is loans. Some take no down payment at all, and the 10% down payment on SBA’s main loan (the 7(a) loan) does not have to be your own cash. Tell us how much you need and we’ll rank what is open to you on paper.',
  buy: 'Buying a running business takes a 10% down payment on a 7(a) loan, SBA’s main loan. For a veteran who will own at least half, a seller note (the owner agrees to be paid that part later, with no payments until your SBA loan is paid off) can cover all of it through September 30, 2027. Enter the price and we’ll show the math and the paperwork.',
  grow: 'A business with more than a year behind it has more doors: SBA sets no minimum down payment on a 7(a) loan for an established business, and some grants open only to businesses with employees. Tell us how long you have been operating.',
  grants: 'A few, and they are small and competitive. We’ll show which are open to your profile today, which are closed until next cycle, and which well-known names have ended or were never grants. Then we’ll show the larger money you can get without a down payment.',
};
const BTN_TEXT = { scratch: 'Find my funding →', buy: 'Find my funding →', grow: 'Find my funding →', grants: 'Find my grants and funding →' };
const AMOUNT_COPY = {
  scratch: ['How much do you need', 'The whole project: equipment, inventory, opening costs, working capital.'],
  buy: ['How much do you need', 'The purchase price plus closing costs and working capital.'],
  grow: ['How much do you need', 'The equipment, hire, inventory, or working capital you want to fund.'],
  grants: ['How much do you need', 'Optional in this mode. Enter it to see loan math beside the grants.'],
};
const LEGEND = {
  scratch: 'Two things gate your results: <strong>how much you need</strong> and <strong>your state</strong>. Everything else has a sensible default you can change.',
  buy: 'Two things gate your results: <strong>how much you need</strong> and <strong>your state</strong>. Open “Adjust assumptions” to say whether the seller would carry a note.',
  grow: 'Three things gate your results: <strong>how much you need</strong>, <strong>your state</strong>, and <strong>time in business</strong> (in “Adjust assumptions”, opened for you).',
  grants: 'One thing gates your results: <strong>your state</strong>. Employees and time in business decide which grants fit, so set them in “Adjust assumptions”.',
};
function setMode(m) {
  state.mode = MODES.includes(m) ? m : 'scratch';
  m = state.mode;
  document.querySelectorAll('.mode-pill').forEach(p => { p.classList.toggle('active', p.dataset.mode === m); p.setAttribute('aria-pressed', p.dataset.mode === m ? 'true' : 'false'); });
  $('mode-briefing').textContent = MODE_BRIEF[m];
  $('compare-btn').textContent = BTN_TEXT[m];
  $('req-legend').innerHTML = LEGEND[m];
  $('amount-label').textContent = AMOUNT_COPY[m][0];
  $('amount-hint').textContent = AMOUNT_COPY[m][1];
  $('amount-req').hidden = m === 'grants';
  $('field-seller').hidden = m !== 'buy';
  $('field-months').hidden = m === 'scratch' || m === 'buy';
  $('field-employees').hidden = m === 'scratch' || m === 'buy';
  $('months-req').hidden = m !== 'grow';
  if (m === 'grow' || m === 'grants') $('assumptions-drawer').open = true;
  clearMissing(); $('form-error').textContent = '';
  if (state.revealed) reveal({ silent: true });
  updateLive();
}
document.querySelectorAll('.mode-pill').forEach(p => p.addEventListener('click', () => {
  setMode(p.dataset.mode);
  if (isTourActive() && TOUR[tourState.i]?.id === 'pills') showTourStep(tourState.i + 1);
}));

/* ─── Inputs → model ───────────────────────────────────────────────────── */
function buildInput() {
  const m = state.mode;
  const hasMonths = m === 'grow' || m === 'grants';
  return {
    mode: m,
    amount: Number(amountEl.value) > 0 ? Number(amountEl.value) : null,
    ownCash: Number(cashEl.value) > 0 ? Number(cashEl.value) : 0,
    state: stateEl.value, ownership: ownershipEl.value, bizType: bizEl.value, rural: ruralEl.value === 'yes',
    citizen: citizenEl.value !== 'no',
    months: hasMonths ? Number(monthsEl.value) || 0 : 0,
    employees: hasMonths ? Number(employeesEl.value) || 0 : 0,
    rating: ratingEl.value === '' ? null : Number(ratingEl.value),
    gift: giftEl.value === 'yes', sellerNote: m === 'buy' ? sellerEl.value : 'no', outsideIncome: incomeEl.value === 'yes',
    retirement: Number(retirementEl.value) > 0 || state.retFromLink,
    reserve: reserveEl.value === 'yes', spouseOwner: spouseEl.value === 'yes',
  };
}
const run = () => solve(buildInput(), { ...CTX, today: new Date() });

/* ─── Live running total ───────────────────────────────────────────────── */
let liveTimer = null;
function updateLive() {
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => {
    const el = $('funding-total');
    const s = buildInput();
    if (s.mode !== 'grants' && s.amount == null) { el.innerHTML = '<strong>Required to run:</strong> how much you need and your state. Your paths count up here as you answer.'; return; }
    const r = solve(s, { ...CTX, today: new Date() });
    const zero = r.zeroCash.amount != null ? `<span class="stake">${fmtUSD(r.zeroCash.amount)}</span>` : '<strong>enter an amount</strong>';
    if (s.mode === 'grants') { const za = r.zeroCash.amount != null ? r.zeroCash.amount : r.zeroCash.uncapped; el.innerHTML = `Grants and prizes open to your profile: <span class="ready">${r.grants.openCash.length}</span> · Loans you could get with $0 of your own cash: <span class="stake">${fmtUSD(za)}</span>${r.withheld.length ? ` · <strong>${r.withheld.length} SBA path${r.withheld.length === 1 ? '' : 's'} withheld</strong>` : ''}${s.state ? '' : ' · <strong>pick your state</strong>'}`; return; }
    const grants = '';
    const held = r.withheld.length ? ` · <strong>${r.withheld.length} SBA path${r.withheld.length === 1 ? '' : 's'} withheld</strong>` : '';
    const stateNudge = s.state ? '' : ' · <strong>pick your state</strong>';
    if (r.buyCash) { el.innerHTML = `Funding paths open so far: <span class="ready">${r.paths.length}</span> · Equity SBA requires: <strong>${fmtUSD(r.buyCash.required)}</strong> · Your own cash needed: <span class="stake">${esc(r.buyCash.amountText)}</span> ${esc(r.buyCash.short)}${held}${stateNudge}`; return; }
    el.innerHTML = `Funding paths open so far: <span class="ready">${r.paths.length}</span> · Most you could raise with $0 of your own cash: ${zero}${grants}${held}${stateNudge}`;
  }, 150);
}
let rerenderTimer = null;
function onFormChange() {
  updateLive();
  if (!state.revealed) return;
  clearTimeout(rerenderTimer);
  rerenderTimer = setTimeout(() => reveal({ silent: true }), 250);
}
document.querySelectorAll('#calc-form select, #calc-form input').forEach(el => { el.addEventListener('input', onFormChange); el.addEventListener('change', onFormChange); });
retirementEl.addEventListener('input', () => { state.retFromLink = false; });

/* ─── Validation (novalidate + JS, house rule) ─────────────────────────── */
function clearMissing() { document.querySelectorAll('.field-missing, .field-error').forEach(el => el.classList.remove('field-missing', 'field-error')); }
function flag(el) { el.closest('.fg-field').classList.add('field-missing'); el.classList.add('field-error'); }
function validate() {
  clearMissing();
  if (state.mode !== 'grants' && !(Number(amountEl.value) > 0)) { flag(amountEl); return { message: 'Enter how much you need (the red field). A rough number is fine; you can change it after.', focusEl: amountEl }; }
  if (amountEl.value !== '' && !(Number(amountEl.value) >= 1000 && Number(amountEl.value) <= 50000000)) { flag(amountEl); return { message: 'Enter an amount between $1,000 and $50,000,000.', focusEl: amountEl }; }
  if (!stateEl.value) { flag(stateEl); return { message: 'Pick your state. It decides which state programs and regional lenders show.', focusEl: stateEl }; }
  if (state.mode === 'grow' && !(Number(monthsEl.value) > 0)) { $('assumptions-drawer').open = true; flag(monthsEl); return { message: 'For a business you already run, pick how long it has been operating. It changes the down payment rule.', focusEl: monthsEl }; }
  return { message: '', focusEl: null };
}
[amountEl, stateEl, monthsEl].forEach(el => el.addEventListener('change', () => { if (el.value) { clearMissing(); $('form-error').textContent = ''; } }));

/* ─── Submit gate ──────────────────────────────────────────────────────── */
$('calc-form').addEventListener('submit', e => { e.preventDefault(); reveal(); });
function reveal(opts = {}) {
  const v = validate();
  if (opts.silent && v.message) { clearMissing(); return; }
  $('form-error').textContent = v.message;
  if (v.message) { if (!isTourActive()) v.focusEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); v.focusEl.focus({ preventScroll: true }); return; }
  const r = run();
  state.last = r;
  const openIds = opts.silent ? [...document.querySelectorAll('#cards-panel > details[open]')].map(d => d.id) : null;
  renderHero(r);
  renderCards(r, openIds);
  state.revealed = true;
  $('hero-verdict').style.display = 'block';
  $('hero-capture').style.display = 'block';
  $('results-container').style.display = 'block';
  $('action-bar').style.display = 'flex';
  if (opts.silent) return;
  if (typeof gtag === 'function') gtag('event', 'show_results', { mode: state.mode, source: SOURCE, amountBand: r.s.amount == null ? 'none' : r.s.amount <= 50000 ? 'to50k' : r.s.amount <= 350000 ? 'to350k' : 'over350k' });
  if (isTourActive()) endTour(); // pressing the real button is the tour's natural finish
  $('hero-verdict').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
$('retake-btn').addEventListener('click', () => {
  state.revealed = false;
  ['hero-verdict', 'hero-capture', 'results-container'].forEach(id => $(id).style.display = 'none');
  $('cards-panel').innerHTML = ''; $('hero-verdict').innerHTML = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ─── Jump links: open a result section and bring it into view ─────────── */
const jumpLink = (id, text, cls = 'jump-link') => `<a href="#card-${esc(id)}" class="${cls} no-print" data-jump="${esc(id)}">${esc(text)} ↓</a>`;
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('[data-jump]');
  if (!a) return;
  const d = $(`card-${a.dataset.jump}`);
  if (!d) return;
  e.preventDefault();
  d.open = true;
  if (!isTourActive()) d.scrollIntoView({ behavior: 'smooth', block: 'start' });
  d.classList.remove('jump-flash'); void d.offsetWidth; d.classList.add('jump-flash');
  if (typeof gtag === 'function') gtag('event', 'jump_to_section', { section: a.dataset.jump, source: SOURCE });
});

/* ─── Hero ─────────────────────────────────────────────────────────────── */
function renderHero(r) {
  const s = r.s, z = r.zeroCash, eq = r.equity, g = r.grants;
  const lines = r.hero.lines.map((l, i) => `<p class="v-line${i === 0 ? ' v-first' : ''}">${money(l)}</p>`).join('');
  const t1 = `<div class="num-card comfortable"><span class="nc-label">With $0 of your own cash</span><span class="nc-amount">${z.amount != null ? fmtUSD(z.amount) : 'n/a'}</span><span class="nc-sub">${z.amount == null ? 'enter an amount to see it' : z.parts.length ? esc(`${z.parts.map(p => p.name).join(' + ')}, capped at what you need`) : 'no loan at this size states a no-down-payment rule'}</span></div>`;
  const t1buy = r.buyCash ? `<div class="num-card comfortable"><span class="nc-label">Your own cash needed</span><span class="nc-amount">${esc(r.buyCash.amountText)}</span><span class="nc-sub">${esc(r.buyCash.sub)}</span></div>` : '';
  const zg = z.amount != null ? z.amount : z.uncapped;
  const t1grants = s.mode === 'grants' ? `<div class="num-card comfortable"><span class="nc-label">Loans with $0 of your own cash</span><span class="nc-amount">${fmtUSD(zg)}</span><span class="nc-sub">${z.parts.length ? esc(`${z.parts.map(p => p.name).join(' + ')}${z.amount != null ? ', capped at what you need' : ''}. No down payment required by the program.`) : 'no loan here states a no-down-payment rule for your answers'}</span></div>` : '';
  const t2 = `<div class="num-card"><span class="nc-label">Paths open on paper</span><span class="nc-amount">${r.paths.length}</span><span class="nc-sub">${r.withheld.length ? `${r.withheld.length} SBA path${r.withheld.length === 1 ? '' : 's'} withheld (citizenship rule)` : 'least of your own cash first'}</span></div>`;
  let t3;
  if (s.mode === 'grants' && !g.openCash.length && g.closed.length) t3 = `<div class="num-card"><span class="nc-label">Real grants closed until next cycle</span><span class="nc-amount">${g.closed.length}</span><span class="nc-sub">The grants section says when each one usually reopens.</span></div>`;
  else if (s.mode === 'grants') t3 = `<div class="num-card"><span class="nc-label">Nearest grant deadline</span><span class="nc-amount">${g.nearest ? esc(g.nearest.label) : 'none dated'}</span><span class="nc-sub">${g.nearest ? esc(g.nearest.name) : `${g.openCash.length} open to your profile today`}</span></div>`;
  else if (eq.needs && eq.required != null && !r.withheld.length) t3 = `<div class="num-card ${eq.gap > 0 ? '' : 'gap-zero'}"><span class="nc-label">Down payment left to fill</span><span class="nc-amount">${fmtUSD(eq.gap)}</span><span class="nc-sub">${fmtUSD(eq.required)} required on a 7(a) loan (SBA calls it equity), ${fmtUSD(eq.ownCash)} is yours. It does not have to be your cash.</span></div>`;
  else t3 = `<div class="num-card"><span class="nc-label">7(a) down payment</span><span class="nc-amount">${r.withheld.length ? 'n/a' : 'Lender’s call'}</span><span class="nc-sub">${r.withheld.length ? 'SBA loans are withheld for your answers' : 'SBA sets no minimum for an established business'}</span></div>`;
  $('hero-verdict').innerHTML = `<p class="v-kicker">${esc(r.hero.kicker)}</p>${lines}<div class="three-num">${t1buy || t1grants || t1}${t2}${t3}</div>${r.lenders && r.lenders.need ? `<p class="hero-jump">Ready for the next step? ${jumpLink('lenders', r.lenders.prompt, 'jump-btn')}</p>` : ''}`;
}

/* ─── Sections (teaser accordions) ─────────────────────────────────────── */
// Plain-English terms: every result section lists the glossary terms that appear in it.
const GLOSS = (Array.isArray(GLOSSARY) ? GLOSSARY : []).filter(g => g && g.term && g.def && g.match).map(g => { try { return { ...g, re: new RegExp(g.match, 'i') }; } catch { return null; } }).filter(Boolean);
const glossList = gs => `<dl class="terms-list">${gs.map(g => `<dt>${esc(g.term)}</dt><dd>${esc(g.def)}</dd>`).join('')}</dl>`;
function termsFor(bodyHtml) {
  const text = String(bodyHtml).replace(/<[^>]+>/g, ' ');
  const found = GLOSS.filter(g => g.re.test(text));
  return found.length ? `<details class="terms no-print"><summary>Terms used in this section, in plain English (${found.length})</summary>${glossList(found)}</details>` : '';
}
function card(id, title, value, valueClass, body) {
  const terms = ['checklist', 'glossary'].includes(id) ? '' : termsFor(body);
  return `<details class="stack-card" id="card-${id}"><summary><span class="sc-title">${esc(title)}</span><span class="sc-value ${valueClass || ''}">${esc(value)}</span></summary><div class="sc-body">${body}${terms}</div></details>`;
}
function feeHtml(x) {
  const f = x.fee; if (!f) return '';
  const src = f.noticeUrl ? ` (${link(f.noticeUrl, `SBA Information Notice ${f.notice || ''}`.trim())})` : '';
  let t = `SBA upfront guaranty fee at this size: <strong>${fmtUSD(f.baseline)}</strong> on the standard schedule${src}.`;
  if (f.vetWaiver) t += ` <strong>${fmtUSD(f.vetFee)} for your business</strong> with the veteran waiver.`;
  if (x.row.vetFee) t += ` ${esc(x.row.vetFee)}`;
  if (f.sector && r0().sector.row) t += ` It may also be $0 under a separate fiscal year ${esc(String(f.fy || ''))} waiver: ${esc(r0().sector.row.text)} Ask the lender whether your business is covered.`;
  return t;
}
const r0 = () => state.last;
function pathHtml(x, r) {
  const p = x.row, e = x.equity, s = r.s;
  const range = (Number.isFinite(p.min) && Number.isFinite(p.max)) ? `Program range ${fmtUSD(p.min)} to ${fmtUSD(p.max)}.` : '';
  const at = x.provides != null ? ` At your amount: up to ${fmtUSD(x.provides)}${x.partial ? ' (covers part)' : ''}.` : '';
  let own;
  if (e.kind === 'none') own = `<strong>$0 required by the program.</strong> ${esc(e.text)}`;
  else if (e.kind === 'pct') own = `<strong>${e.required != null ? `${fmtUSD(e.required)} down payment (${pct(e.pct)}, which SBA calls equity)` : `${pct(e.pct)} down payment (SBA calls it equity)`}.</strong> ${esc(e.text)}${x.gap != null ? ` You entered ${fmtUSD(s.ownCash)} of your own cash; ${x.gap > 0 ? `${fmtUSD(x.gap)} is left to fill, and the down payment section shows what can fill it` : 'that covers it'}.` : ''} ${esc(r.equity.caveat)}`;
  else own = `<strong>Set by the lender.</strong> ${esc(e.text)}`;
  const cost = `${esc(p.cost?.rateText || 'See the program page')}. ${feeHtml(x)}`;
  const notes = [p.notes, ...x.notes].filter(Boolean).map(esc).join(' ');
  const row = (k, v) => v ? `<dt>${k}</dt><dd>${v}</dd>` : '';
  return `<div class="fp ${e.kind === 'none' ? 'fp-yes' : ''}"><p class="fp-t">${esc(x.name)}${x.row && x.row.kind === 'line' ? ' ' + chip('line of credit', 'chip-navy') : x.row && x.row.lineOk && r.s.mode !== 'buy' ? ' ' + chip('loan or line of credit', 'chip-navy') : ''}${x.partial ? ' ' + chip('covers part') : ''}</p>
    <dl>${row('What it provides', esc(range + at))}${row('Your own cash', own)}${row('What it costs', cost)}${row('Term', esc(p.termText || ''))}${row('Time to money', esc(p.timeText || ''))}${row('Who decides', esc(p.decides || ''))}${row('Good to know', notes)}</dl>
    ${safeUrl(p.url) ? `<p class="fp-next">Next step: ${link(p.url, `${p.nextStep || 'Open the program page'} →`)}</p>` : ''}${r.lenders && r.lenders.lenderPathIds.includes(x.id) ? `<p class="fp-next">${jumpLink('lenders', x.id === 'microloan' ? 'Where to find a microlender, and what to ask' : 'Where to find a lender for this, and what to ask')}</p>` : ''}
    ${srcLine(p.sourceUrls, p.verifiedDate)}</div>`;
}
function grantHtml(g, kind) {
  const amount = g.amountText ? `<dt>Amount</dt><dd>${esc(g.amountText)}${g.amountConfidence === 'reported' ? ' (amount reported, not on the program page)' : ''}</dd>` : '';
  const who = g.eligText ? `<dt>Who it is for</dt><dd>${esc(g.eligText)}</dd>` : '';
  let when = '';
  if (kind === 'open') when = g.deadlineLabel ? `<dt>Deadline</dt><dd><strong>${esc(g.deadlineLabel)}</strong></dd>` : '<dt>Deadline</dt><dd>Rolling; no fixed date.</dd>';
  else if (kind === 'closed') when = g.usuallyOpens ? `<dt>When to look</dt><dd>${esc(g.usuallyOpens)}</dd>` : (g.deadline ? `<dt>Closed</dt><dd>The last deadline was ${esc(fmtDate(g.deadline))}.</dd>` : '');
  else if (kind === 'invite') when = g.howIn ? `<dt>How people get in</dt><dd>${esc(g.howIn)}</dd>` : '';
  const miss = kind === 'nfy' && g.miss?.length ? `<dt>Why it is not listed for you</dt><dd>From what you entered, this one does not fit: ${esc(g.miss.join('; '))}. Check the rule yourself if your answers were rough.</dd>` : '';
  const tag = g.mostlyInvestment ? ' ' + chip('pitch event, no cash award listed', 'chip-navy') : (g.type && g.type !== 'grant' ? ' ' + chip(g.type === 'in-kind' ? 'paid to vendors' : g.type, 'chip-navy') : '');
  return `<div class="fp ${kind === 'open' ? 'fp-yes' : 'fp-soft'}"><p class="fp-t">${esc(g.name)}${tag}</p>${g.runBy ? `<p class="fp-by">${esc(g.runBy)}</p>` : ''}
    <dl>${amount}${who}${when}${miss}</dl>
    ${safeUrl(g.url) ? `<p class="fp-next">${link(g.url, kind === 'open' ? 'Go to the application page →' : 'Program page →')}</p>` : ''}
    ${srcLine(g.sourceUrls, g.verifiedDate)}</div>`;
}

function renderCards(r, openIds) {
  const s = r.s; const sec = {};
  // 1. Paths
  {
    const cr = r.citizenRule;
    const held = r.withheld.length ? `<div class="callout callout-red"><h3>${r.withheld.length} SBA path${r.withheld.length === 1 ? ' is' : 's are'} withheld</h3><p>You said not every owner is a U.S. citizen or U.S. national. ${cr ? esc(cr.text) : 'SBA loans require it.'}</p><p>Withheld: ${esc(r.withheld.map(w => w.name).join(', '))}.</p>${cr ? `<p class="sc-src">${link(cr.url, cr.source || 'SBA')} · in force since ${esc(cr.date)}</p>` : ''}</div>` : '';
    const notFit = r.notFit.length ? `<p class="sub-h">Not a fit for your answers</p><ul class="plain-list">${r.notFit.map(n => `<li><strong>${esc(n.name)}.</strong> ${esc(n.reason)}</li>`).join('')}</ul>` : '';
    const nfs = r.notForStartups.length ? `<p class="sub-h">Products people ask about that do not fit a business under 12 months old</p><ul class="plain-list">${r.notForStartups.map(n => `<li><strong>${esc(n.name)}.</strong> ${esc(n.why)} ${n.sourceUrl ? `(${link(n.sourceUrl, host(n.sourceUrl))}${n.verifiedDate ? `, verified ${esc(fmtDate(n.verifiedDate))}` : ''})` : ''}</li>`).join('')}</ul>` : '';
    const c = r.sbaContext;
    const ctxLine = Number.isFinite(c.vetLoans) && Number.isFinite(c.vetDollars) && c.fy ? `<p class="sc-src">For scale: SBA reported more than ${c.vetLoans.toLocaleString('en-US')} veteran 7(a) loans in fiscal year ${esc(String(c.fy))}, about $${(c.vetDollars / 1e9).toFixed(2)} billion. ${link(c.sourceUrl, 'SBA release')}${c.verifiedDate ? ` · verified ${esc(fmtDate(c.verifiedDate))}` : ''}</p>` : '';
    const body = `<p><strong>How these loans work.</strong> SBA almost never lends the money itself. A bank or nonprofit lender makes the loan, and SBA promises to repay that lender most of it if you cannot. You apply to the lender, not to SBA, and you owe the full loan either way.</p>${r.lineNote ? `<div class="callout callout-note" id="line-explainer"><h3>${esc(r.lineNote.title)}</h3>${r.lineNote.lines.map(l => `<p>${esc(l)}</p>`).join('')}${srcLine(r.lineNote.sourceUrls, r.lineNote.verifiedDate)}</div>` : ''}<p>Ranked by how little of your own cash each one takes, then by cost. ${s.amount != null ? 'A path whose maximum is below what you need still shows, because paths can be combined.' : 'Enter an amount in the form to see the dollar math for each.'} “Open on paper” means the published rules allow it. The lender or program decides.</p>
      ${held}${r.paths.map(x => pathHtml(x, r)).join('') || '<p class="neutral-line">No path in our data fits these answers. Change the amount or the mode to see more.</p>'}${notFit}${nfs}
      ${(r.state.rows.length || r.state.lenders.length) ? '<p>Your state section below lists state veteran programs and mission lenders that may add to this list.</p>' : ''}${ctxLine}`;
    sec.paths = card('paths', 'Your funding paths', `${r.paths.length} open on paper`, r.paths.length ? '' : 'off', body);
  }
  // 2. Down payment
  {
    const eq = r.equity;
    const avail = x => x.available === 'yes' ? ' ' + chip(x.ownCash ? 'you entered cash' : 'your answers point here', 'chip-green') : x.available === 'ask' ? ' ' + chip('ask the seller') : '';
    const srcs = eq.sources.map(x => `<div class="fp ${x.available === 'yes' ? 'fp-yes' : 'fp-soft'}"><p class="fp-t">${esc(x.label)}${avail(x)}${x.limited ? ' ' + chip('in the limited group', 'chip-navy') : ''}</p>
      <dl><dt>The rule</dt><dd>${esc(x.rule)}</dd><dt>What the lender asks for</dt><dd>${esc(x.proof)}</dd>${x.startupNote ? `<dt>Our reading</dt><dd>${esc(x.startupNote)}</dd>` : ''}</dl><p class="sc-src">${esc(x.caveat)}</p></div>`).join('');
    const acq = eq.acq ? `<div class="callout ${eq.acq.full ? 'callout-gold' : 'callout-note'}"><h3>${eq.acq.full ? 'The veteran flexibility applies to your answers' : 'The half cap applies to your answers'}</h3><p>${money(eq.acq.text)}</p>${eq.acq.ruleText ? `<p>${esc(eq.acq.ruleText)}</p>` : ''}<p>${esc(eq.acq.caveat)}</p>${srcLine(eq.acq.sourceUrls, eq.acq.verifiedDate)}</div>` : '';
    const sb = eq.standbyNote;
    const sbHtml = sb ? `<div class="callout callout-note" id="standby-explainer"><h3>${esc(sb.title)}</h3>${sb.what.map(x => `<p>${esc(x)}</p>`).join('')}${sb.example ? `<p><strong>${money(sb.example)}</strong></p>` : ''}
      ${sb.compare.length ? `<ul class="plain-list">${sb.compare.map(([h, d]) => `<li><strong>${esc(h)}</strong> ${esc(d)}</li>`).join('')}</ul>` : ''}${sb.how ? `<p>${esc(sb.how)}</p>` : ''}<p class="sc-src">${esc(sb.sourceLabel)}</p>${srcLine(sb.sourceUrls, sb.verifiedDate)}</div>` : '';
    const sn = eq.sellerNote;
    const ul = xs => `<ul class="plain-list">${xs.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
    const snHtml = sn ? `<div class="callout callout-note" id="seller-note-explainer"><h3>${esc(sn.title)}</h3>
      ${sn.what.map(x => `<p>${esc(x)}</p>`).join('')}
      ${sn.example ? `<p><strong>${money(sn.example)}</strong></p>` : ''}
      ${sn.standby.length ? `<p class="sub-h">What “full standby” means<small>This is the SBA rule that makes the note count as your down payment.</small></p>${ul(sn.standby)}` : ''}
      ${sn.steps.length ? `<p class="sub-h">How you get one<small>Practical steps. These are ours, not SBA rules.</small></p><ol class="plain-list">${sn.steps.map(([h, d]) => `<li><strong>${esc(h)}</strong> ${esc(d)}</li>`).join('')}</ol>` : ''}
      ${sn.watch.length ? `<p class="sub-h">Worth knowing</p>${ul(sn.watch)}` : ''}
      ${sn.help ? `<p>${esc(sn.help)}</p>` : ''}
      <p class="sc-src">${esc(sn.sourceLabel)}</p>${srcLine(sn.sourceUrls, sn.verifiedDate)}</div>` : '';
    const body = `<p>${money(eq.statement)}</p>${eq.nonOwnWords ? `<p>${esc(eq.nonOwnWords)}</p>` : ''}${acq}${snHtml}${sbHtml}
      ${eq.startupDefinition && !s.pathMode.startsWith('buy') ? `<p>${esc(eq.startupDefinition)}</p>` : ''}${eq.expressNote ? `<p>${esc(eq.expressNote)}</p>` : ''}
      <p class="sub-h">What SBA accepts as equity, and the paper each one needs</p>${srcs || '<p class="neutral-line">The list of accepted sources is not available right now.</p>'}
      ${eq.notCounted ? `<p>${esc(eq.notCounted)}</p>` : ''}${srcLine([eq.sopUrl], eq.stamp, 'Source: SOP 50 10 8.1')}`;
    const val = r.withheld.length ? 'SBA paths withheld' : eq.required != null ? `${fmtUSD(eq.gap)} left to fill` : eq.needs ? 'the 10% rule' : 'lender’s call';
    const downJump = r.lenders && r.lenders.need && eq.needs && !r.withheld.length ? `<p class="fp-next">Once you know where the down payment is coming from, the next call is a lender. ${jumpLink('lenders', r.lenders.prompt)}</p>` : '';
    sec.down = card('down', 'The down payment, solved', val, eq.gap === 0 ? '' : 'door', body + downJump);
  }
  // 3. Grants
  {
    const g = r.grants;
    const quote = g.sbaQuote ? `<div class="quote-band"><p class="qb-q">“${esc(g.sbaQuote.quote)}”</p><p class="qb-s">${link(g.sbaQuote.url, `${g.sbaQuote.who}, ${host(g.sbaQuote.url)}`)}${g.sbaQuote.verifiedDate ? ` · verified ${esc(fmtDate(g.sbaQuote.verifiedDate))}` : ''}${g.otherMyth.length ? ` · the same point from ${g.otherMyth.map(m => link(m.url, m.who)).join(' and ')}` : ''}</p></div>` : '';
    const scam = g.scam.lines.length ? `<div class="warn-line"><strong>Scam check.</strong><ul class="plain-list">${g.scam.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>${g.scam.report ? `<p>${esc(g.scam.report)}</p>` : ''}${srcLine(g.scam.sourceUrls, g.scam.verifiedDate)}</div>` : '';
    const list = (rows, kind, empty) => rows.length ? rows.map(x => grantHtml(x, kind)).join('') : `<p class="neutral-line">${empty}</p>`;
    const general = g.general.length ? `<p class="sub-h">Open to any small business<small>Not veteran programs. Listed because they are open and real.</small></p>${g.general.map(x => grantHtml(x, 'open')).join('')}` : '';
    const notG = g.notGrants.length ? `<p class="sub-h">Often called grants. They are something else.</p>${g.notGrants.map(n => `<div class="fp fp-soft"><p class="fp-t">${esc(n.name)}${n.relevant ? ' ' + chip('relevant to a franchise') : ''}</p><p>${esc(n.what)}</p>${srcLine([n.url], n.verifiedDate)}</div>`).join('')}` : '';
    const proofLine = e => {
      const via = e.proofVia === 'archive' ? `from an archived copy of the page${e.captureDate ? ` dated ${esc(fmtDate(e.captureDate))}` : ''}` : 'from the page itself';
      return `<p class="sc-src">Their words, ${via}: ${link(e.proofUrl, host(e.proofUrl))}${safeUrl(e.proofUrl2) ? ` · also ${link(e.proofUrl2, host(e.proofUrl2))}` : ''} · read ${esc(fmtDate(e.proofDate))}</p>`;
    };
    const replaced = e => { const rb = e.replacedBy; if (!rb) return ''; const text = typeof rb === 'string' ? rb : (rb.text || rb.name || ''); if (!text) return ''; return `<p><strong>What there is now:</strong> ${esc(text)}${safeUrl(rb.url) ? ` ${link(rb.url, 'Open it →')}` : ''}</p>`; };
    const verdictChip = v => chip(v === 'paused' ? 'paused' : v === 'changed' ? 'changed' : 'ended', 'chip-navy');
    const endedHtml = e => `<div class="fp fp-soft"><p class="fp-t">${esc(e.name)} ${verdictChip(e.verdict)}</p>${e.says ? `<p>${esc(e.says)}</p>` : ''}<p class="fp-quote">“${esc(e.proofQuote)}”</p>${e.proofSource ? `<p class="fp-by">${esc(e.proofSource)}</p>` : ''}${(Array.isArray(e.detail) ? e.detail : []).filter(Boolean).map(d => `<p>${esc(d)}</p>`).join('')}${replaced(e)}${proofLine(e)}</div>`;
    let ended = '<p class="sub-h">Programs you may have read about that have ended, paused, or changed<small>Each is named with the organization’s or agency’s own words and a link to them. “Ended” and “paused” are their words. “Changed” means the quote shows what the program is now.</small></p>';
    if (!g.ended.length && !g.noCycle.length) ended = '<p class="sub-h">Programs that have ended</p><p class="neutral-line">No ended programs are listed right now. A program is named here only when its own site or a government page says it has ended.</p>';
    else {
      const fed = g.ended.filter(e => e.kind === 'federal'), vet = g.ended.filter(e => e.kind !== 'federal');
      if (vet.length) ended += `<p class="sub-h">Veteran and small-business grant programs</p>${vet.map(endedHtml).join('')}`;
      if (fed.length) ended += `<p class="sub-h">Federal programs that have closed</p>${fed.map(endedHtml).join('')}`;
      if (g.noCycle.length) ended += `<p class="sub-h">We could not find a current round<small>Nobody has said these are over. We found no sign of a current round.</small></p>${g.noCycle.map(e => `<div class="fp fp-soft"><p class="fp-t">${esc(e.name)} ${chip('no current round found', 'chip-gold')}</p>${e.says ? `<p>${esc(e.says)}</p>` : ''}${e.checked ? `<p class="sc-src">What we checked: ${esc(e.checked)}</p>` : ''}</div>`).join('')}`;
    }
    const body = `${quote}${scam}
      <p class="sub-h">Open or upcoming for your profile<small>Sorted by deadline. Every one is competitive.</small></p>${list(g.open, 'open', 'Nothing we track is open to your profile today. The closed list below says when each one usually reopens.')}
      ${g.openNotForYou.length ? `<p class="sub-h">Open now, but your answers do not match</p>${g.openNotForYou.map(x => grantHtml(x, 'nfy')).join('')}` : ''}
      ${general}
      <p class="sub-h">Real, but closed for this cycle</p>${list(g.closed, 'closed', 'Nothing is in this list right now.')}
      ${g.invite.length ? `<p class="sub-h">Real, with no open application<small>You get in through the organization’s program.</small></p>${g.invite.map(x => grantHtml(x, 'invite')).join('')}` : ''}
      ${notG}${ended}`;
    sec.grants = card('grants', 'Grants and prizes: open, closed for now, not grants, ended', `${g.openCash.length} with cash open to you${g.open.length > g.openCash.length ? ` · ${g.open.length - g.openCash.length} pitch event${g.open.length - g.openCash.length === 1 ? '' : 's'}` : ''}${g.nearest ? ` · next ${g.nearest.label}` : ''}`, g.openCash.length ? '' : 'door', body);
  }
  // 4. State
  {
    const st = r.state;
    const rowHtml = x => `<div class="fp ${x.confidence === 'verified' && x.status === 'open' ? 'fp-yes' : x.confidence === 'verified' && x.status !== 'closed' ? '' : 'fp-soft'}"><p class="fp-t">${esc(x.name)}${x.confidence === 'unverified' ? ' ' + chip('not confirmed', 'chip-navy') : ' ' + chip(x.statusLabel.toLowerCase(), x.status === 'open' ? 'chip-green' : x.status === 'closed' ? 'chip-red' : 'chip-gold')}${x.confidence === 'reported' ? ' ' + chip('reported') : ''}</p>${x.agency ? `<p class="fp-by">${esc(x.agency)}</p>` : ''}
      ${x.confidence === 'unverified' ? `<p>${esc(x.ask)}</p>` : `<dl>${x.terms ? `<dt>Terms</dt><dd>${esc(x.terms)}</dd>` : ''}${x.who ? `<dt>Who it is for</dt><dd>${esc(x.who)}</dd>` : ''}<dt>Status</dt><dd><strong>${esc(x.statusLabel)}.</strong> ${esc(x.statusNote)}</dd></dl>${x.label ? `<p><strong>${esc(x.label)}</strong></p>` : ''}`}
      ${safeUrl(x.url) ? `<p class="fp-next">${link(x.url, 'Program page →')}</p>` : ''}${srcLine(x.sourceUrls, x.verifiedDate)}</div>`;
    const gen = st.general ? `<p class="sub-h">${esc(st.name)}’s main small-business loan program<small>Open to any small business, veteran or not.</small></p><div class="fp fp-soft"><p class="fp-t">${esc(st.general.name)}${st.general.label ? ' ' + chip('reported') : ''}</p>${st.general.agency ? `<p class="fp-by">${esc(st.general.agency)}</p>` : ''}${st.general.terms ? `<p>${esc(st.general.terms)}</p>` : ''}${st.general.label ? `<p><strong>${esc(st.general.label)}</strong></p>` : ''}${safeUrl(st.general.url) ? `<p class="fp-next">${link(st.general.url, 'Program page →')}</p>` : ''}${srcLine(st.general.sourceUrls, st.general.verifiedDate)}</div>` : '';
    const lenders = st.lenders.length ? `<p class="sub-h">Mission lenders with a veteran product<small>National ones, any that lend in ${esc(st.name)}, and any worth asking. Not ranked.</small></p>${st.lenders.map(l => `<div class="fp fp-soft"><p class="fp-t">${esc(l.name)} ${chip(l.national ? 'national' : l.inState ? st.code : 'ask if it serves your state', l.inState || l.national ? 'chip-navy' : 'chip-gold')}</p><dl>${!l.national && l.statesNote ? `<dt>Where it lends</dt><dd>${esc(l.statesNote)}</dd>` : ''}${l.terms ? `<dt>Terms</dt><dd>${esc(l.terms)}</dd>` : ''}${l.ownCash ? `<dt>Your own cash</dt><dd>${esc(l.ownCash)}</dd>` : ''}${l.note ? `<dt>Note</dt><dd>${esc(l.note)}</dd>` : ''}</dl>${safeUrl(l.url) ? `<p class="fp-next">${link(l.url, 'Lender’s page →')}</p>` : ''}${srcLine(l.sourceUrls, l.verifiedDate)}</div>`).join('')}` : '';
    const body = `<p class="${st.checked === 'pending' ? 'neutral-line' : ''}"><strong>${esc(st.name)}.</strong> ${esc(st.line)}</p>${st.checked === 'none-found' ? '' : (st.checkedNote ? `<p>What we looked at: ${esc(st.checkedNote)}</p>` : '')}
      ${st.rows.map(rowHtml).join('')}${gen}${lenders}${st.checked === 'none-found' && st.checkedNote ? `<p class="sc-src">What we looked at for a veteran-only state program: ${esc(st.checkedNote)}</p>` : ''}
      <div class="callout callout-gold"><h3>Certification, tax, and fee-waiver benefits in ${esc(st.name)}</h3><p>Those live in Veteran Founder Stack, with your state already filled in. ${link(st.founderStackUrl, `Open Veteran Founder Stack for ${st.name} →`)}</p></div>`;
    const extra = (st.general ? 1 : 0) + st.lenders.length;
    const val = st.checked === 'pending' ? 'not yet checked' : st.rows.length ? `${st.rows.length} veteran program${st.rows.length === 1 ? '' : 's'}` : extra ? `${extra} more option${extra === 1 ? '' : 's'}` : 'federal paths apply';
    sec.state = card('state', `Your state: ${st.name}`, val, st.checked === 'pending' ? 'off' : st.rows.length ? '' : 'door', body);
  }
  // 5. Costs
  {
    const c = r.costs;
    const feeCell = (f, x) => !f ? (x && x.sbaBacked ? (x.amount == null ? 'depends on the amount' : 'not calculated here; ask the lender') : 'none from SBA') : `${fmtUSD(f.baseline)} standard${f.vetWaiver ? `; <strong>${fmtUSD(f.vetFee)}</strong> with the veteran waiver` : ''}${f.sector ? '; may be $0 under the sector waiver' : ''}`;
    const yr = x => x.yearLow == null ? (x.amount == null && x.hasRate ? 'enter an amount' : 'rate not a fixed number') : x.yearHigh != null && x.yearHigh !== x.yearLow ? `${fmtUSD(x.yearLow)} to ${fmtUSD(x.yearHigh)}` : fmtUSD(x.yearLow);
    const tr = x => `<tr${x.benchmark ? ' class="punchline-row"' : ''}><td>${esc(x.name)}${x.note ? `<br><span class="cell-muted">${esc(x.note)}</span>` : ''}</td><td class="num">${x.amount != null ? fmtUSD(x.amount) : 'n/a'}</td><td>${esc(x.rateText)}</td><td class="num">${yr(x)}</td><td>${x.benchmark ? 'n/a' : feeCell(x.fee, x)}</td><td>${safeUrl(x.sourceUrl) ? link(x.sourceUrl, host(x.sourceUrl)) : ''}${x.verifiedDate ? `<br><span class="cell-muted">${esc(fmtDate(x.verifiedDate))}</span>` : ''}</td></tr>`;
    const rows = [...c.rows, ...(c.benchmark ? [c.benchmark] : [])];
    const body = `<p>Each path at your amount, with the rate or range its program publishes. “One year of interest” is simple interest on the full balance for twelve months, shown only where the program publishes a number. It is a yardstick for comparing, and a real loan pays down as it goes.</p>
      <div class="table-scroll"><table class="cmp-table"><thead><tr><th>Path</th><th class="num">At your amount</th><th>Published rate</th><th class="num">One year of interest</th><th>SBA upfront fee</th><th>Source</th></tr></thead><tbody>${rows.map(tr).join('')}</tbody></table></div>
      <p class="table-note">Where a rate is “capped by SBA”, the lender sets the actual rate under that cap. The SBA fee is charged on the part of the loan SBA backs and comes from the fee schedule shared with Veteran Founder Stack. Credit cards are here as the expensive end of the scale and are not a suggestion.</p>`;
    sec.costs = card('costs', 'What each dollar costs', `${c.rows.length} compared`, 'door', body);
  }
  // 6. What changed
  {
    const rows = r.changes.map(c => `<div class="change-row"><span class="cr-d">${esc(c.dateLabel)}</span><div><p class="cr-t">${esc(c.title)}${c.endsOn ? ' ' + chip(c.ended ? `ended ${c.endsLabel}` : `through ${c.endsLabel}`, c.ended ? 'chip-navy' : 'chip-gold') : ''}</p><p>${esc(c.text)}</p><p class="sc-src">${link(c.url, c.source || host(c.url))}</p></div></div>`).join('');
    const bills = r.bills.length ? `<p class="sub-h">Proposed, not law<small>Introduced in Congress. Neither has been enacted, and nothing above depends on them.</small></p>${r.bills.map(b => `<div class="fp fp-soft"><p class="fp-t">${esc(b.name)} ${chip('introduced only', 'chip-navy')}</p><p>${esc(b.text)}</p><p class="sc-src">${link(b.url, 'Bill text')}${b.introducedLabel ? ` · introduced ${esc(b.introducedLabel)}` : ''}</p></div>`).join('')}` : '';
    sec.changes = card('changes', 'What changed', `${r.changes.length} rule changes`, 'door', `<p>Most articles on veteran business loans were written before these. Newest first.</p>${rows || '<p class="neutral-line">No rule changes are listed right now.</p>'}${bills}${r.stamps.changes ? `<p class="sc-src">Read from the primary sources on ${esc(fmtDate(r.stamps.changes))}</p>` : ''}`);
  }
  // 7. Free help
  sec.help = card('help', 'Free help that makes you fundable', `${r.help.length} free offices`, 'door', `<p>None of these charge. Each one makes a loan package stronger before a lender sees it.</p>${r.help.map(h => `<div class="fp fp-soft"><p class="fp-t">${esc(h.name)}</p><p>${esc(h.what)}</p>${safeUrl(h.url) ? `<p class="fp-next">${link(h.url, 'Open the page →')}${safeUrl(h.url2) ? ` · ${link(h.url2, `${h.url2Label || host(h.url2)} →`)}` : ''}</p>` : ''}</div>`).join('')}`);
  // 8. Benefits
  {
    const facts = r.facts.map(f => `<div class="rule"><p class="rule-t">${esc(f.title)}</p><p>${esc(f.text)}</p><p class="rule-c">${f.internal ? `${esc(f.cite || '')} · ${link(f.url, 'VR&E Self-Employment Prep')}` : link(f.url, f.cite || host(f.url))}${f.verifiedDate ? ` · verified ${esc(fmtDate(f.verifiedDate))}` : ''}</p></div>`).join('');
    const rating = r.ratingLines.length ? `<p class="sub-h">From the rating you entered</p><ul class="plain-list">${r.ratingLines.map(l => `<li>${esc(l.text)}${l.url ? ` ${link(l.url, `${l.linkText} →`)}` : ''}</li>`).join('')}</ul>` : '';
    const robs = r.robs ? `<div class="callout callout-red"><h3>${esc(r.robs.title || 'Using a retirement balance')}</h3><p>${esc(r.robs.text)}</p>${r.robs.action ? `<p><strong>${esc(r.robs.action)}</strong></p>` : ''}<p>This is described because you entered a retirement balance. It is not a recommendation.</p>${srcLine(r.robs.sourceUrls, r.robs.verifiedDate)}</div>` : '';
    sec.benefits = card('benefits', 'Your benefits and a business loan', r.robs ? 'plus retirement money' : `${r.facts.length} facts`, 'door', `${facts || '<p class="neutral-line">Nothing is listed here right now.</p>'}${rating}${robs}`);
  }
  // 9. Checklist
  sec.checklist = card('checklist', 'Lender-ready checklist', 'print or download', 'door', `
    <p>Built from the paths and answers above: the free office to see first, each path with its next step, the paper trail for the down payment, and what to confirm with the lender.</p>
    <div class="letter-tools no-print">
      <button type="button" id="checklist-print" class="action-btn secondary">Print checklist only</button>
      <button type="button" id="checklist-download" class="action-btn secondary">Download for Word</button>
      <button type="button" id="checklist-copy" class="action-btn secondary">Copy checklist</button>
    </div>
    <p class="phone-hint no-print">On a phone, <strong>Download for Word</strong> opens your share menu: pick Pages, Word, Google Docs, or Save to Files.</p>
    <div id="letter-sheet"></div>`);

  {
    const L = r.lenders;
    const dirs = L.directories.map(d => `<div class="fp fp-soft"><p class="fp-t">${esc(d.name)}</p><p>${esc(d.what)}</p><p class="fp-next">${link(d.url, 'Open the page →')}${d.url2 ? ` · ${link(d.url2, `${d.url2Label || 'Second link'} →`)}` : ''}</p></div>`).join('');
    const qs = L.questions.length ? `<p class="sub-h">Questions to ask any lender<small>Chosen from your results. Ask two or three lenders the same questions.</small></p><ol class="plain-list ask-list">${L.questions.map(q => `<li><strong>${esc(q.q)}</strong><br>${esc(q.why)}${q.url ? ` ${link(q.url, `${q.urlLabel || 'Source'} →`)}` : ''}</li>`).join('')}</ol>` : '';
    const local = L.local.length ? `<p class="sub-h">Also on your list${L.stateName ? ` in ${esc(L.stateName)}` : ''}<small>From the state section. Nonprofit lenders are listed because they publish a veteran product. Not ranked.</small></p><ul class="plain-list">${L.local.map(x => `<li>${link(x.url, x.name)} <span class="cell-muted">(${esc(x.kind)})</span></li>`).join('')}</ul><p class="fp-next">${jumpLink('state', 'See the terms in your state section')}</p>` : '';
    const body = `<p>SBA does not lend directly, so the next step is finding a lender that makes the kind of loan you need. These are official directories. This page names no banks, takes no referral fees, and has no lead forms.</p>
      <p class="sub-h">Official places to find a lender<small>Government pages, chosen from the paths in your results.</small></p>${dirs || '<p class="neutral-line">No directory applies to your results right now.</p>'}${qs}${local}
      <p class="sc-src">Directories opened ${esc(fmtDate(L.stamp) || L.stamp)}.</p>`;
    sec.lenders = card('lenders', 'Where to find a lender', L.questions.length ? `${L.directories.length} directories · ${L.questions.length} questions to ask` : `${L.directories.length} directories`, 'door', body);
  }
  const glossAll = GLOSS.filter(g => g.when !== 'robs' || r.robs);
  sec.glossary = card('glossary', 'Plain-English glossary', `${glossAll.length} terms`, 'door', `<p>Every lending term this page uses, in plain words. Each section above also lists the terms that appear in it.</p>${glossList(glossAll)}`);
  const ORDER = s.mode === 'grants'
    ? ['grants', 'paths', 'down', 'lenders', 'state', 'costs', 'changes', 'help', 'benefits', 'checklist', 'glossary']
    : ['paths', 'down', 'lenders', 'grants', 'state', 'costs', 'changes', 'help', 'benefits', 'checklist', 'glossary'];
  $('cards-panel').innerHTML = ORDER.map(id => sec[id]).join('');
  const open = openIds || [`card-${ORDER[0]}`];
  open.forEach(id => { const d = $(id); if (d) d.open = true; });
  wireChecklist(r);
}

/* ─── Checklist: print, Word, copy ─────────────────────────────────────── */
function wireChecklist(r) {
  const sheet = $('letter-sheet'); if (!sheet) return;
  const doc = buildChecklist(r);
  sheet.innerHTML = checklistToHtml(doc, esc);
  $('checklist-copy')?.addEventListener('click', async () => {
    const btn = $('checklist-copy'), text = checklistToText(doc);
    try { await navigator.clipboard.writeText(text); const o = btn.textContent; btn.textContent = '✓ Copied'; setTimeout(() => { btn.textContent = o; }, 2000); } catch { prompt('Copy your checklist:', text); }
  });
  $('checklist-download')?.addEventListener('click', async () => {
    const name = 'veteran-business-funding-checklist.docx';
    const bytes = buildDocxBytes(doc);
    if (typeof gtag === 'function') gtag('event', 'checklist_download', { source: SOURCE, format: 'docx' });
    const touch = matchMedia('(pointer: coarse)').matches;
    if (touch && typeof File === 'function' && navigator.canShare) {
      try { const file = new File([bytes], name, { type: DOCX_MIME }); if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Lender-ready checklist' }); return; } }
      catch (err) { if (err && err.name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(new Blob([bytes], { type: DOCX_MIME }));
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  });
  $('checklist-print')?.addEventListener('click', () => {
    document.body.classList.add('print-letter-only');
    const done = () => { document.body.classList.remove('print-letter-only'); removeEventListener('afterprint', done); };
    addEventListener('afterprint', done);
    window.print();
    setTimeout(done, 1500);
    if (typeof gtag === 'function') gtag('event', 'checklist_print', { source: SOURCE });
  });
}

/* ─── FAQ (visible; rendered from the FAQPage JSON-LD so the two always match) ── */
try {
  const faq = JSON.parse($('faq-jsonld').textContent);
  $('faq-items').innerHTML = (faq.mainEntity || []).map(q => `<details class="faq-item"><summary>${esc(q.name)}</summary><p>${esc(q.acceptedAnswer?.text)}</p></details>`).join('');
} catch { /* the JSON-LD is static; if it fails to parse, the section stays empty */ }

/* ─── Share URL (selections only; the retirement balance is never in it) ── */
const URL_FIELDS = [['amt', amountEl], ['cash', cashEl], ['st', stateEl], ['own', ownershipEl], ['bt', bizEl], ['rur', ruralEl], ['cit', citizenEl], ['mo', monthsEl], ['emp', employeesEl], ['r', ratingEl], ['gift', giftEl], ['sn', sellerEl], ['inc', incomeEl], ['res', reserveEl], ['sp', spouseEl]];
const DRAWER_KEYS = ['cit', 'mo', 'emp', 'r', 'gift', 'sn', 'inc', 'res', 'sp', 'ret'];
const SHARE_KEYS = new Set(['m', 'ret', ...URL_FIELDS.map(([k]) => k)]);
function buildShareUrl() {
  const p = new URLSearchParams();
  p.set('m', state.mode);
  for (const [k, el] of URL_FIELDS) if (el.value !== '' && el.value != null && el.value !== el.dataset.default) p.set(k, el.value);
  if (Number(retirementEl.value) > 0 || state.retFromLink) p.set('ret', '1');
  return location.origin + location.pathname + '?' + p.toString() + '&source=' + SOURCE;
}
function loadFromUrl() {
  const p = new URLSearchParams(location.search);
  if (![...p.keys()].some(k => SHARE_KEYS.has(k))) return false;
  if (!p.has('st') && !p.has('amt')) { if (MODES.includes(p.get('m'))) { setMode(p.get('m')); history.replaceState(null, '', location.pathname); } return false; }
  for (const [k, el] of URL_FIELDS) if (p.has(k)) { el.value = p.get(k); if (el.tagName === 'SELECT' && el.selectedIndex < 0) el.selectedIndex = 0; if (el.tagName === 'INPUT') el.setAttribute('value', el.value); }
  state.retFromLink = p.get('ret') === '1';
  setMode(MODES.includes(p.get('m')) ? p.get('m') : 'scratch');
  if (DRAWER_KEYS.some(k => p.has(k))) $('assumptions-drawer').open = true;
  history.replaceState(null, '', location.pathname);
  reveal();
  return true;
}

/* ─── Email capture (existing endpoint, no new plumbing) ───────────────── */
async function sendResultsEmail(email, statusEl, btn, placement) {
  if (!email || !email.includes('@')) { statusEl.textContent = 'Please enter a valid email.'; statusEl.className = 'email-status error'; return false; }
  btn.disabled = true;
  statusEl.textContent = 'Sending…'; statusEl.className = 'email-status';
  try {
    const res = await fetch('/api/email-results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, resultsUrl: buildShareUrl(), source: SOURCE }) });
    const data = await res.json();
    if (res.ok && data.success) {
      statusEl.textContent = '✓ Check your inbox: your results link is on the way.'; statusEl.className = 'email-status success';
      if (typeof gtag === 'function') gtag('event', 'email_capture', { placement, source: SOURCE });
      return true;
    }
    statusEl.textContent = data.error || 'Something went wrong. Please try again.'; statusEl.className = 'email-status error';
  } catch { statusEl.textContent = 'Network error. Please try again.'; statusEl.className = 'email-status error'; }
  finally { btn.disabled = false; }
  return false;
}
$('hero-capture-form').addEventListener('submit', async e => { e.preventDefault(); if (await sendResultsEmail($('hero-email-input').value.trim(), $('hero-email-status'), $('hero-email-btn'), 'hero')) $('hero-email-input').value = ''; });
$('email-results-form').addEventListener('submit', async e => { e.preventDefault(); if (await sendResultsEmail($('email-input').value.trim(), $('email-status'), $('email-submit-btn'), 'bottom')) $('email-input').value = ''; });
$('share-btn').addEventListener('click', async () => {
  const btn = $('share-btn');
  try { await navigator.clipboard.writeText(buildShareUrl()); const o = btn.textContent; btn.textContent = '✓ Link Copied!'; setTimeout(() => { btn.textContent = o; }, 2000); }
  catch { prompt('Copy this link:', buildShareUrl()); }
});
// Print: closed accordions do not print, so open every section for the print and put them back after.
let printClosed = [];
addEventListener('beforeprint', () => { if (document.body.classList.contains('print-letter-only')) return; printClosed = [...document.querySelectorAll('#cards-panel > details:not([open])')]; printClosed.forEach(d => { d.open = true; }); });
addEventListener('afterprint', () => { printClosed.forEach(d => { d.open = false; }); printClosed = []; });
$('print-btn').addEventListener('click', () => window.print());

/* ─── Interactive tour (house standard; behavior copied from veteran-freedom-index) ── */
const TOUR_KEY = 'vbff-tour-seen';
const TOUR = [
  { id: 'welcome', target: null, title: 'Welcome: 60 seconds, then it’s all yours', text: 'SBA gives no grants to start a business, and most articles on veteran business loans are out of date. This shows every funding path open to you on paper, least of your own cash first. Fill in your real answers as we go; exit anytime.' },
  { id: 'pills', target: '#mode-pills', title: 'What brings you here?', text: 'Starting, buying, growing, or asking whether grants exist. The sections are the same; the order, the math, and the verdict change. Click one.' },
  { id: 'money', target: '#card-money', title: 'How much, and how much is yours', text: 'The amount sets which loans fit and the fee math. Your own cash can be $0. It sets the gap the down payment section has to fill.' },
  { id: 'biz', target: '#card-biz', title: 'Your state, your share, your kind of business', text: 'Ownership of 51% opens the $0 SBA Express fee, and 50% opens the veteran rule for buying a business. Manufacturing, food, and rural businesses have their own fee waiver this fiscal year.' },
  { id: 'assumptions', target: '#assumptions-drawer', title: 'Adjust assumptions', text: 'All optional. A gift, income outside the business, or a seller’s note changes what can fill the down payment. Time in business and employees decide which grants fit.' },
  { id: 'live', target: '#funding-total', title: 'Your running total', text: 'How many paths are open on paper and the most you could raise with $0 of your own cash, updating as you answer. Grants are never counted in that number.' },
  { id: 'gate', target: '#compare-btn', title: 'Find my funding', text: 'Press it for the full picture: the paths, the down payment, the grants with their deadlines, your state, and a checklist to print.' },
];
const tourState = { active: false, i: 0, timer: null };
function isTourActive() { return tourState.active; }
function positionTour() {
  const step = TOUR[tourState.i]; if (!step) return;
  const spot = $('tour-spotlight'), tip = $('tour-tooltip');
  if (!step.target) {
    spot.style.cssText = `top:${scrollY + innerHeight / 2}px; left:50vw; width:0; height:0;`;
    if (!matchMedia('(max-width: 560px)').matches) {
      tip.style.left = Math.max(24, (innerWidth - Math.min(380, innerWidth - 48)) / 2) + 'px';
      tip.style.top = (scrollY + innerHeight / 2 - (tip.offsetHeight || 220) / 2) + 'px';
    }
    return;
  }
  const target = document.querySelector(step.target);
  if (!target || target.offsetParent === null) return;
  const r = target.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return;
  const pad = 8;
  Object.assign(spot.style, { top: (r.top + scrollY - pad) + 'px', left: (r.left + scrollX - pad) + 'px', width: (r.width + pad * 2) + 'px', height: (r.height + pad * 2) + 'px' });
  const tipH = tip.offsetHeight || 180;
  // Below the target when it fits; above a tall target that would push the tooltip off-screen.
  const below = r.bottom + 16 + tipH < innerHeight || r.top < tipH + 32;
  if (matchMedia('(max-width: 560px)').matches) { tip.style.top = ''; tip.style.left = ''; }
  else {
    tip.style.top = (below ? r.bottom + scrollY + 14 : r.top + scrollY - tipH - 14) + 'px';
    tip.style.left = Math.max(12, Math.min(r.left + scrollX, innerWidth - tip.offsetWidth - 12)) + 'px';
  }
}
function showTourStep(i, dir = 1) {
  if (i < 0 || i >= TOUR.length) return endTour();
  const step = TOUR[i];
  if (step.target) { const el = document.querySelector(step.target); if (!el || el.offsetParent === null) return showTourStep(i + dir, dir); }
  tourState.i = i;
  $('tour-step-label').textContent = `Step ${i + 1} of ${TOUR.length}`;
  $('tour-title').textContent = step.title;
  $('tour-text').textContent = step.text;
  $('tour-next').textContent = i === TOUR.length - 1 ? 'Done ✓' : 'Next';
  $('tour-back').style.visibility = i === 0 ? 'hidden' : 'visible';
  if (step.id === 'assumptions') $('assumptions-drawer').open = true;
  if (!step.target) window.scrollTo({ top: 0, behavior: 'smooth' });
  else { const target = document.querySelector(step.target); if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  setTimeout(positionTour, 350);
}
function startTour() {
  tourState.active = true; tourState.i = 0;
  $('tour-root').hidden = false;
  showTourStep(0);
  clearInterval(tourState.timer);
  tourState.timer = setInterval(positionTour, 400); // the spotlight tracks its target as the page reflows
}
function endTour() {
  tourState.active = false;
  clearInterval(tourState.timer);
  $('tour-root').hidden = true;
  try { localStorage.setItem(TOUR_KEY, '1'); } catch { /* private mode */ }
}
$('tour-next').addEventListener('click', () => showTourStep(tourState.i + 1, 1));
$('tour-back').addEventListener('click', () => showTourStep(tourState.i - 1, -1));
$('tour-exit').addEventListener('click', endTour);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && tourState.active) endTour(); });
// Exit on a real click anywhere outside the spotlight. Keyboard-generated clicks (detail 0), the tooltip, the
// restart button, the mode pills, and the submit button have their own handling.
document.addEventListener('click', e => {
  if (!tourState.active || e.detail === 0) return;
  if (e.target.closest('#tour-tooltip') || e.target.closest('#tour-restart')) return;
  if (e.target.closest('#compare-btn') || e.target.closest('.mode-pill')) return;
  const r = $('tour-spotlight').getBoundingClientRect();
  const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  if (!inside) endTour();
});
$('tour-restart').addEventListener('click', startTour);
addEventListener('resize', () => { if (tourState.active) positionTour(); });
addEventListener('scroll', () => { if (tourState.active) positionTour(); }, { passive: true });

/* ─── Intro: collapse on phones, one tap to expand (content stays in the HTML) ── */
{
  const about = $('about-this-tool');
  if (about && !about.querySelector('.about-more')) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'about-more no-print'; b.textContent = 'Read more';
    b.addEventListener('click', () => { const open = about.classList.toggle('open'); b.textContent = open ? 'Show less' : 'Read more'; });
    about.appendChild(b);
  }
}

/* ─── Init ─────────────────────────────────────────────────────────────── */
for (const [, el] of URL_FIELDS) if (el.tagName === 'SELECT') el.dataset.default = el.options[0].value; // defaults (always the first option) stay out of share links
setMode('scratch');
$('assumptions-drawer').open = false;
const arrived = loadFromUrl();
let tourSeen = true;
try { tourSeen = localStorage.getItem(TOUR_KEY) === '1'; } catch { /* private mode: never auto-run */ }
if (!arrived && !window.__vbffArrivalHadParams && !tourSeen) setTimeout(startTour, 600);
updateLive();
