/**
 * Veteran Business Funding Finder headless smoke test.
 * Run from tbv-tools/:  node business-funding/test/smoke.mjs     (or from business-funding/: node test/smoke.mjs)
 *
 * Serves the tbv-tools root (the page imports /veteran-business/data/rules.js) and drives the real page in headless
 * Chrome over the DevTools protocol: real clicks on the mode pills and the submit button, real typing into the
 * fields. The sibling tools dump the DOM of share-link arrivals; this one also presses the button, so "results are
 * not there before submit" and "the share link round-trips" are tested as a visitor would hit them.
 *
 * Nothing leaves the machine: Chrome is started with every host except localhost unresolvable (no GA, no pixel),
 * and /api/email-results is answered by a local stub that records the request body.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, extname } from 'node:path';
import { tmpdir } from 'node:os';
import process from 'node:process';
import { STATE_FUNDING } from '../data/state-funding.js';

const PORT = 8929, DEBUG_PORT = 9339;
const BASE = `http://localhost:${PORT}/business-funding/`;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const sleep = ms => new Promise(r => setTimeout(r, ms));

let failures = 0, passes = 0;
const check = (ok, label, extra = '') => { ok ? passes++ : failures++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${!ok && extra ? ' :: ' + extra : ''}`); };

/* ─── Local server (static files + a stub for the email endpoint) ───────── */
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const emailPosts = [];
const server = createServer(async (req, res) => {
  try {
    const p0 = decodeURIComponent(req.url.split('?')[0]);
    if (p0 === '/api/email-results' && req.method === 'POST') {
      let body = ''; for await (const c of req) body += c;
      emailPosts.push(JSON.parse(body));
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ success: true })); return;
    }
    let p = p0; if (p.endsWith('/')) p += 'index.html';
    const body = await readFile(join(ROOT, p));
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404).end('not found'); }
});
await new Promise(r => server.listen(PORT, r));

/* ─── Chrome over CDP ──────────────────────────────────────────────────── */
const profile = await mkdtemp(join(tmpdir(), 'vbff-smoke-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
  '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1', '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
chrome.on('error', e => console.log('chrome spawn error', e.message));
chrome.on('exit', (c, sig) => { if (c) console.log('chrome exited early', c, sig); });
async function cleanup() { try { chrome.kill('SIGKILL'); } catch {} server.close(); await sleep(300); await rm(profile, { recursive: true, force: true }).catch(() => {}); }

async function openPage() {
  let target, lastErr;
  for (let i = 0; i < 50 && !target; i++) {
    try { target = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`, { method: 'PUT' })).json(); } catch (e) { lastErr = e; await sleep(300); }
  }
  if (!target) throw new Error('Chrome did not start: ' + (lastErr && (lastErr.cause?.code || lastErr.message)));
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(); const errors = []; let loadWaiter = null;
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); return; }
    if (m.method === 'Runtime.exceptionThrown') errors.push('EXCEPTION ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('console.error ' + m.params.args.map(a => a.value ?? a.description).join(' '));
    // Blocked third-party loads (GA, pixel) are expected here; only errors from our own origin count.
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error' && /localhost/.test(m.params.entry.url || '')) errors.push('LOG ' + m.params.entry.text + ' ' + m.params.entry.url);
    if (m.method === 'Page.loadEventFired' && loadWaiter) { loadWaiter(); loadWaiter = null; }
  };
  const send = (method, params = {}) => new Promise((res, rej) => { pending.set(++id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval failed: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text) + '\n' + expr); return r.result.value; };
  const go = async (url, wait = 1500) => { const loaded = new Promise(r => { loadWaiter = r; }); await send('Page.navigate', { url }); await Promise.race([loaded, sleep(8000)]); await sleep(wait); };
  return { send, ev, go, errors, takeErrors: () => errors.splice(0) };
}

// Page-side helpers
const HELPERS = `
  window.__t = {
    set(id, v) { const el = document.getElementById(id); el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); },
    shown(id) { return getComputedStyle(document.getElementById(id)).display !== 'none'; },
    text(id) { return document.getElementById(id).textContent; },
    cards() { return [...document.querySelectorAll('#cards-panel > details')].map(d => d.id + (d.open ? ':open' : '')); },
    pill(m) { document.querySelector('.mode-pill[data-mode="' + m + '"]').click(); },
    submit() { document.getElementById('compare-btn').click(); },
  }; true`;

try {
  const page = await openPage();
  const { ev, go } = page;

  /* A. First visit */
  await go(BASE, 2000);
  await ev(HELPERS);
  check(page.takeErrors().length === 0, 'first visit: no console errors', page.errors.join(' | '));
  check(await ev(`!document.getElementById('tour-root').hidden`), 'tour auto-starts on a first visit');
  check(await ev(`document.getElementById('tour-step-label').textContent`) === 'Step 1 of 7', 'tour has 7 steps');
  check(await ev(`document.title`) === 'Veteran Small Business Loans & Grants Finder | The Better Veteran', 'title');
  check(await ev(`document.querySelector('h1').textContent`) === 'Veteran Business Funding Finder', 'static h1');
  check(/<head>\s*<!-- Google tag \(gtag\.js\) -->\s*<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-HG7N8F337G"><\/script>/.test(readFileSync(join(ROOT, 'business-funding/index.html'), 'utf8')), 'GA4 snippet is the first element in <head> (static HTML)');
  check(await ev(`[...document.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent)['@type']).join(',')`) === 'WebApplication,FAQPage', 'JSON-LD: WebApplication + FAQPage, both valid JSON');
  check(await ev(`!!document.querySelector('link[rel=canonical]') && !!document.querySelector('meta[name=robots][content="index, follow"]') && !!document.querySelector('meta[property="og:url"]') && document.querySelectorAll('link[rel=icon]').length === 2`), 'canonical, robots, OG, favicons');
  check(await ev(`!__t.shown('results-container') && !__t.shown('hero-verdict') && !__t.shown('hero-capture')`), 'results, verdict, and capture are hidden before submit');
  check(await ev(`document.getElementById('cards-panel').children.length === 0 && document.getElementById('hero-verdict').textContent === ''`), 'no result content exists in the DOM before submit');
  check(/Required to run/.test(await ev(`__t.text('funding-total')`)), 'live total shows the gate message with no amount');
  check(await ev(`document.getElementById('state').options.length`) >= 52, 'state list rendered from data');
  check(await ev(`document.querySelectorAll('#faq-items .faq-item').length`) === 5, 'visible FAQ has 5 questions');
  check(await ev(`(() => { const j = JSON.parse(document.getElementById('faq-jsonld').textContent).mainEntity; const v = [...document.querySelectorAll('#faq-items .faq-item')]; return j.every((q, i) => v[i].querySelector('summary').textContent === q.name && v[i].querySelector('p').textContent === q.acceptedAnswer.text); })()`), 'visible FAQ matches the FAQPage JSON-LD word for word');
  check(await ev(`!!document.getElementById('about-this-tool') && !!document.getElementById('how-it-works') && /More Free Veteran Tools/.test(document.body.textContent)`), 'about, how-it-works, footer present');
  check(await ev(`!document.querySelector('[required]')`), 'no native required attributes (novalidate + JS)');
  {
    const html = readFileSync(join(ROOT, 'business-funding/index.html'), 'utf8');
    const about = /<section id="about-this-tool">\s*<p>([\s\S]*?)<\/p>/.exec(html)[1].replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '"');
    const words = about.trim().split(/\s+/).length;
    check(words >= 130 && words <= 170, `about-this-tool is static HTML, ${words} words (130 to 170)`);
    check(!html.slice(html.indexOf('More Free Veteran Tools')).includes('href="/business-funding/"'), 'footer does not link to itself');
  }

  /* B. Tour behavior */
  await ev(`__t.pill('scratch')`); await sleep(500); // step 1 has no target; a pill click only advances from step 2
  await ev(`document.getElementById('tour-next').click()`); await sleep(500);
  check(await ev(`document.getElementById('tour-step-label').textContent`) === 'Step 2 of 7', 'Next advances the tour');
  check(await ev(`getComputedStyle(document.getElementById('tour-backdrop')).pointerEvents`) === 'none', 'tour backdrop is click-through');
  await ev(`__t.pill('buy')`); await sleep(500);
  check(await ev(`document.getElementById('tour-step-label').textContent`) === 'Step 3 of 7', 'clicking a mode pill advances the tour from the pills step');
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await sleep(200);
  check(await ev(`document.getElementById('tour-root').hidden && localStorage.getItem('vbff-tour-seen') === '1'`), 'Esc exits the tour and marks it seen');
  await ev(`document.getElementById('tour-restart').click()`); await sleep(500);
  check(await ev(`!document.getElementById('tour-root').hidden`), 'the restart button reopens the tour');
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 5, y: 5, button: 'left', clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 5, y: 5, button: 'left', clickCount: 1 }); await sleep(200);
  check(await ev(`document.getElementById('tour-root').hidden`), 'a real click outside the spotlight exits the tour');

  /* C. Tracking params alone: tour still runs, gate holds */
  await ev(`localStorage.clear()`);
  await go(BASE + '?fbclid=abc123&utm_source=fb', 1800); await ev(HELPERS);
  check(await ev(`!document.getElementById('tour-root').hidden`), 'tracking params alone still auto-run the tour');
  check(await ev(`!__t.shown('results-container')`), 'tracking params do not skip the gate');
  await ev(`document.getElementById('tour-exit').click()`);

  /* D. Validation, then each mode submits and reveals */
  await go(BASE, 1200); await ev(HELPERS);
  await ev(`__t.submit()`); await sleep(300);
  check(/how much you need/i.test(await ev(`__t.text('form-error')`)) && !(await ev(`__t.shown('results-container')`)), 'submit with no amount shows a JS message and stays gated');
  await ev(`__t.set('amount', 80000)`); await ev(`__t.submit()`); await sleep(300);
  check(/state/i.test(await ev(`__t.text('form-error')`)) && !(await ev(`__t.shown('results-container')`)), 'submit with no state shows a JS message and stays gated');
  check(/Funding paths open so far/.test(await ev(`__t.text('funding-total')`)) && /\$0 of your own cash/.test(await ev(`__t.text('funding-total')`)), 'live total counts paths and the $0-cash figure before submit');
  check(await ev(`document.getElementById('cards-panel').children.length === 0`), 'typing does not render results');

  const MODE_CASES = [
    { m: 'scratch', set: { amount: 80000, 'own-cash': 0, state: 'MD' }, first: 'card-paths', expect: /open on paper/ },
    { m: 'buy', set: { amount: 400000, 'own-cash': 10000, state: 'WA', ownership: '50', 'seller-note': 'yes' }, first: 'card-paths', expect: /down payment of \$40,000/ },
    { m: 'grow', set: { amount: 150000, 'own-cash': 0, state: 'MN', months: '36', employees: 5 }, first: 'card-paths', expect: /fit/ },
    { m: 'grants', set: { amount: '', state: 'TX', months: '18', employees: 4 }, first: 'card-grants', expect: /open to your profile today/ },
  ];
  for (const c of MODE_CASES) {
    await ev(`document.getElementById('retake-btn').click()`); await sleep(150);
    await ev(`__t.pill('${c.m}')`);
    for (const [id, v] of Object.entries(c.set)) await ev(`__t.set('${id}', ${JSON.stringify(v)})`);
    await sleep(350);
    check(await ev(`!__t.shown('results-container') && document.getElementById('cards-panel').children.length === 0`), `${c.m}: nothing rendered before the button`);
    await ev(`__t.submit()`); await sleep(500);
    check(await ev(`__t.shown('results-container') && __t.shown('hero-verdict')`), `${c.m}: submit reveals results`, await ev(`__t.text('form-error')`));
    check(await ev(`__t.shown('hero-capture')`), `${c.m}: inline capture appears at the result moment`);
    check(await ev(`(() => { const a = document.getElementById('hero-verdict'), b = document.getElementById('hero-capture'), c = document.getElementById('results-container'); return !!(a.compareDocumentPosition(b) & 4) && !!(b.compareDocumentPosition(c) & 4); })()`), `${c.m}: capture sits between the verdict and the sections`);
    const cards = await ev(`__t.cards()`);
    check(cards.length === 11 && cards.some(x => x.startsWith('card-lenders')) && cards[cards.length - 1].startsWith('card-glossary'), `${c.m}: eleven sections render, lenders included, glossary last`, cards.join(','));
    check(cards[0] === c.first + ':open', `${c.m}: ${c.first} leads and is open`, cards.join(','));
    if (c.m === 'grants') check(cards[1] === 'card-paths', 'grants: the paths section sits collapsed below the grants section', cards.join(','));
    check(c.expect.test(await ev(`__t.text('hero-verdict')`)), `${c.m}: hero verdict is written for the mode`, await ev(`__t.text('hero-verdict')`));
    check(!/undefined|NaN|\[object Object\]/.test(await ev(`document.getElementById('hero-verdict').textContent + document.getElementById('cards-panel').textContent`)), `${c.m}: no undefined/NaN in the rendered results`);
    check(!/you qualify|guaranteed to|free money/i.test(await ev(`document.getElementById('hero-verdict').textContent`)), `${c.m}: verdict avoids the banned phrases`);
    check(await ev(`[...document.querySelectorAll('#cards-panel .fp')].length > 3 && [...document.querySelectorAll('#card-paths .fp')].every(f => f.querySelector('.sc-src'))`), `${c.m}: every funding path shows a source line`);
    check(page.takeErrors().length === 0, `${c.m}: no console errors`, page.errors.join(' | '));
  }
  check(await ev(`/Lender-ready checklist/i.test(document.getElementById('card-checklist').textContent) && !!document.getElementById('checklist-download') && document.getElementById('letter-sheet').textContent.length > 200`), 'checklist section renders with its Word download');
  check(await ev(`/SBA does not provide grants for starting and expanding a business/.test(document.getElementById('card-grants').textContent) && /Scam check/.test(document.getElementById('card-grants').textContent)`), 'grants section opens with the SBA quote and the scam check');
  check(await ev(`/Proposed, not law/.test(document.getElementById('card-changes').textContent)`), 'what-changed section has the proposed-not-law list');
  check(await ev(`/veteran-business\\/\\?mode=/.test(document.querySelector('#card-state a[href^="/veteran-business/"]').getAttribute('href')) && /st=TX/.test(document.querySelector('#card-state a[href^="/veteran-business/"]').getAttribute('href'))`), 'state section links to Founder Stack with the state prefilled');
  check(await ev(`(() => { const a = document.querySelector('.hero-jump [data-jump="lenders"]'); const d = document.getElementById('card-lenders'); if (!a || !d) return 'missing'; d.open = false; a.click(); return d.open; })()`) === true, 'hero jump link opens the lender section');
  check(await ev(`(() => { const a = document.querySelector('#card-paths [data-jump="lenders"]'); const d = document.getElementById('card-lenders'); if (!a || !d) return 'missing'; d.open = false; a.click(); return d.open; })()`) === true, 'a funding path\u2019s jump link opens the lender section');
  check(await ev(`[...document.querySelectorAll('#card-lenders a[href^="http"]')].every(a => /(^|\\.)(sba\\.gov|kiva\\.org)$/.test(new URL(a.href).hostname) || a.closest('ul.plain-list'))`) === true, 'lender directories link only to official pages (state and nonprofit rows aside)');
  check(!(await ev(`/Rollover as Business Startup/.test(document.getElementById('cards-panel').textContent)`)), 'ROBS is absent with no retirement balance');

  /* E. Share link round trip (buy mode, with drawer answers and a retirement balance) */
  await ev(`document.getElementById('retake-btn').click()`);
  await ev(`__t.pill('buy')`);
  const BUY = { amount: 400000, 'own-cash': 10000, state: 'WA', ownership: '50', 'biz-type': 'manufacturing', rural: 'yes', citizen: 'yes', gift: 'yes', 'seller-note': 'yes', 'outside-income': 'yes', rating: '70', retirement: 123456 };
  for (const [id, v] of Object.entries(BUY)) await ev(`__t.set('${id}', ${JSON.stringify(v)})`);
  await ev(`__t.submit()`); await sleep(500);
  check(await ev(`/Rollover as Business Startup/.test(document.getElementById('card-benefits').textContent) && /failed/.test(document.getElementById('card-benefits').textContent)`), 'ROBS appears with the IRS warning once a retirement balance is entered');
  const heroBefore = await ev(`__t.text('hero-verdict')`);
  await ev(`(() => { try { Object.defineProperty(navigator, 'clipboard', { value: { writeText: async t => { window.__copied = t; } }, configurable: true }); } catch (e) { navigator.clipboard.writeText = async t => { window.__copied = t; }; } })()`);
  await ev(`document.getElementById('share-btn').click()`); await sleep(200);
  const shareUrl = await ev(`window.__copied`);
  check(typeof shareUrl === 'string' && shareUrl.startsWith(BASE + '?m=buy') && /source=business-funding/.test(shareUrl), 'Copy Link builds a share URL with source=business-funding', String(shareUrl));
  check(!/123456/.test(shareUrl) && /ret=1/.test(shareUrl), 'the retirement balance is not in the share URL (only a flag)', String(shareUrl));
  check(/Link Copied/.test(await ev(`__t.text('share-btn')`)), 'Copy Link shows its feedback');
  // Email capture posts to the existing endpoint
  await ev(`document.getElementById('hero-email-input').value = 'smoke@example.com'; document.getElementById('hero-email-btn').click()`); await sleep(500);
  check(emailPosts.length === 1 && emailPosts[0].source === 'business-funding' && emailPosts[0].email === 'smoke@example.com' && emailPosts[0].resultsUrl === shareUrl, 'capture posts { email, resultsUrl, source: business-funding } to /api/email-results', JSON.stringify(emailPosts));
  check(/on the way/.test(await ev(`__t.text('hero-email-status')`)), 'capture shows the success message');
  await ev(`document.getElementById('hero-email-input').value = 'not-an-email'; document.getElementById('hero-email-btn').click()`); await sleep(200);
  check(emailPosts.length === 1 && /valid email/.test(await ev(`__t.text('hero-email-status')`)), 'a bad email is caught in JS and never posted');

  await ev(`localStorage.clear()`); // unseen tour + share arrival: the tour must still stay closed
  await go(shareUrl, 1800); await ev(HELPERS);
  check(page.takeErrors().length === 0, 'share arrival: no console errors', page.errors.join(' | '));
  check(await ev(`document.getElementById('tour-root').hidden`), 'tour does NOT auto-run for a share-link arrival');
  check(await ev(`__t.shown('results-container') && __t.shown('hero-capture')`), 'share link reveals results and the capture');
  const restored = await ev(`JSON.stringify(Object.fromEntries(${JSON.stringify(Object.keys(BUY).filter(k => k !== 'retirement'))}.map(id => [id, document.getElementById(id).value])))`);
  const want = JSON.stringify(Object.fromEntries(Object.entries(BUY).filter(([k]) => k !== 'retirement').map(([k, v]) => [k, String(v)])));
  check(restored === want, 'share link restores every field', `${restored} vs ${want}`);
  check(await ev(`document.querySelector('.mode-pill.active').dataset.mode`) === 'buy', 'share link restores the mode');
  check((await ev(`__t.text('hero-verdict')`)) === heroBefore, 'restored verdict is identical to the original');
  check(await ev(`/Rollover as Business Startup/.test(document.getElementById('card-benefits').textContent) && document.getElementById('retirement').value === ''`), 'ROBS section restores from the flag without the balance');
  check(await ev(`location.search === ''`), 'share params are stripped from the address bar after load');

  /* F. State wording and the citizenship gate, from live data */
  const pendingSt = Object.keys(STATE_FUNDING).find(k => STATE_FUNDING[k]?.checked === 'pending');
  const noneSt = Object.keys(STATE_FUNDING).find(k => STATE_FUNDING[k]?.checked === 'none-found');
  if (pendingSt) {
    await go(`${BASE}?m=scratch&amt=50000&st=${pendingSt}`, 1500);
    const t = await ev(`document.getElementById('card-state').textContent`);
    check(/Not yet checked/.test(t) && !/no state loan program that is only for veterans/i.test(t) && !/none found/i.test(t), `pending state (${pendingSt}) says "not yet checked" and never "none found"`, t.slice(0, 200));
  } else console.log('SKIP  no pending state left in data');
  if (noneSt) {
    await go(`${BASE}?m=scratch&amt=50000&st=${noneSt}`, 1500);
    check(/The federal and national paths in your results apply in[\s\S]+checked \d+\/\d+\/\d{4}/.test(await ev(`document.getElementById('card-state').textContent`)), `none-found state (${noneSt}) leads with what is available and shows the dated check`);
  } else console.log('SKIP  no none-found state in data yet');
  await go(`${BASE}?m=scratch&amt=50000&st=MD&cit=no`, 1500);
  check(/withheld/.test(await ev(`document.getElementById('hero-verdict').textContent`)) && /U\.S\. citizens/.test(await ev(`document.getElementById('card-paths').textContent`)), 'non-citizen owner: SBA paths withheld and the rule explained');
  check(await ev(`document.getElementById('assumptions-drawer').open`), 'a share link with drawer answers opens the drawer');
  check(page.takeErrors().length === 0, 'state and citizenship arrivals: no console errors', page.errors.join(' | '));

  /* G. Print CSS */
  await page.send('Emulation.setEmulatedMedia', { media: 'print' });
  check(await ev(`['mode-pills', 'funding-total', 'hero-capture', 'action-bar', 'email-results-container', 'tour-restart', 'compare-btn'].every(id => getComputedStyle(document.getElementById(id)).display === 'none') && getComputedStyle(document.querySelector('.more-tools')).display === 'none' && getComputedStyle(document.getElementById('hero-verdict')).display !== 'none'`), 'print CSS hides the non-essential elements and keeps the verdict');
  await page.send('Emulation.setEmulatedMedia', { media: '' });

  /* H. Phone width */
  await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 800, deviceScaleFactor: 2, mobile: true });
  await go(`${BASE}?m=buy&amt=400000&st=WA&own=50`, 1500);
  check(await ev(`document.documentElement.scrollWidth <= 392`), 'no horizontal overflow at 390px', String(await ev(`document.documentElement.scrollWidth`)));
  check(page.takeErrors().length === 0, 'phone width: no console errors', page.errors.join(' | '));
} catch (e) {
  failures++; console.log('FAIL  smoke run aborted :: ' + (e && e.stack || e));
} finally {
  await cleanup();
}
console.log(failures === 0 ? `ALL ${passes} SMOKE CHECKS PASSED` : `${failures} smoke check(s) failed, ${passes} passed`);
process.exit(failures === 0 ? 0 : 1);
