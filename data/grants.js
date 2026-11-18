// Grants, prizes, and things mislabeled as grants. One row per program, each read from the program's own page.
// status is DERIVED by the engine from `deadline` / `eventDate` against today's date, so a passed deadline moves a row
// to "closed for this cycle" without an edit:
//   cycle: 'dated'    -> open until `deadline` (YYYY-MM-DD), then closed-cycle
//   cycle: 'annual'   -> closed-cycle unless a future `deadline` is set; `usuallyOpens` says when to look
//   cycle: 'rolling'  -> always open
//   cycle: 'invite'   -> not open to direct application; `howIn` says how people get in
// type: grant | prize | in-kind | training-stipend
// elig keys are all optional; the engine only filters on keys that are present.
// confidence: verified = the program's own page was opened on verifiedDate and showed these facts.

export const GRANTS_STAMP = '2026-11-17';

export const GRANTS = [
  {
    id: 'hoh-heroes-grant', name: 'Heroes Small Business Grant Program (2027 cycle)',
    runBy: 'Hiring Our Heroes (U.S. Chamber of Commerce Foundation), funded by the FedEx Founders Fund',
    type: 'grant', amountMin: 10000, amountMax: 25000, amountText: 'Five grants: four of $10,000 and one of $25,000',
    elig: { owner: ['veteran', 'spouse'], minOwnership: 0.51, minEmployees: 3, maxEmployees: 20, existingOnly: true },
    eligText: 'Business at least 51% owned by an honorably discharged veteran or a military spouse, with 3 to 20 employees (counting the owner and 1099 workers) and under $5 million in revenue, located in a distressed zip code or able to show hardship.',
    cycle: 'dated', deadline: '2026-12-15', deadlineText: 'Before 11:59 pm Eastern on December 15, 2026',
    url: 'https://www.hiringourheroes.org/small-business-grant/',
    sourceUrls: ['https://www.hiringourheroes.org/small-business-grant/', 'https://www.hiringourheroes.org/small-business-grant/rules/'],
    verifiedDate: '2026-11-17', confidence: 'verified'
  },
  {
    id: 'warrior-rising', name: 'Warrior Rising Business Showers',
    runBy: 'Warrior Rising',
    type: 'grant', amountMin: 2000, amountMax: 150000, amountText: 'Non-dilutive grants from $2,000 to $150,000, no equity taken',
    elig: { owner: ['veteran', 'spouse'] },
    eligText: 'Veterans, spouses, and immediate family who have graduated from Warrior Rising’s Warrior University.',
    cycle: 'invite', howIn: 'There is no open application. You go through Warrior Rising’s free training first, and graduates are invited to pitch.',
    url: 'https://warriorrising.org/business-showers/',
    sourceUrls: ['https://warriorrising.org/business-showers/'],
    verifiedDate: '2026-11-17', confidence: 'verified'
  },
  {
    id: 'fvc-fellowship', name: 'Farmer Veteran Fellowship Fund',
    runBy: 'Farmer Veteran Coalition',
    type: 'in-kind', amountMin: 1000, amountMax: 5000, amountText: '$1,000 to $5,000, paid to the vendor for equipment you need (not paid to you)',
    elig: { owner: ['veteran'], industries: ['farm'] },
    eligText: 'Farmer Veteran Coalition member with honorable service and a for-profit farm business with a business plan.',
    cycle: 'annual', usuallyOpens: 'Opens once a year for at least four weeks; awards are usually announced in spring. The 2026 awards were made May 1, 2026.',
    url: 'https://farmvetco.org/fvfellowship/',
    sourceUrls: ['https://farmvetco.org/fvfellowship/'],
    verifiedDate: '2026-11-17', confidence: 'verified'
  },
  {
    id: 'tadlock', name: 'Stephen L. Tadlock Veteran Business Grant',
    runBy: 'Founders First CDC',
    type: 'grant', amountMin: 1000, amountMax: 1000, amountText: '25 finalists receive $1,000 each plus a training program',
    elig: { owner: ['veteran', 'spouse'], minEmployees: 2, maxEmployees: 100, minMonths: 12, existingOnly: true },
    eligText: 'Veteran or military spouse owner, 2 to 100 employees, under $5 million in revenue, at least one year in business.',
    cycle: 'annual', usuallyOpens: 'The 2026 round closed October 22, 2026. It has run once a year.',
    url: 'https://foundersfirstcdc.org/stephen-tadlock',
    sourceUrls: ['https://foundersfirstcdc.org/stephen-tadlock'],
    verifiedDate: '2026-11-17', confidence: 'verified'
  },
  {
    id: 'dav-pbc', name: 'DAV Patriot Boot Camp pitch competition',
    runBy: 'DAV (Disabled American Veterans)',
    type: 'prize', amountMin: null, amountMax: null, amountText: 'A free three-day program with pitch prizes. A $10,000 prize was reported at the October 2026 cohort.',
    elig: { owner: ['veteran', 'spouse'] },
    eligText: 'Veteran, service member, and military spouse founders.',
    cycle: 'annual', usuallyOpens: 'Cohorts run during the year; no upcoming dates were posted on 11/17/2026.',
    url: 'https://patriotbootcamp.org/',
    sourceUrls: ['https://patriotbootcamp.org/', 'https://www.fox19.com/2026/10/21/veteran-entrepreneurs-compete-10000-dav-patriot-bootcamp/'],
    verifiedDate: '2026-11-17', confidence: 'verified', amountConfidence: 'reported'
  },
  {
    id: 'vet-shark-tank', name: 'Veteran Shark Tank',
    runBy: 'Greater Philadelphia Veteran Network',
    type: 'prize', amountMin: 50000, amountMax: 50000, amountText: 'Five veterans pitch to win $50,000',
    elig: { owner: ['veteran'] },
    eligText: 'Veteran founders. The page does not list further rules.',
    cycle: 'annual', eventDate: '2026-12-07', usuallyOpens: 'The 13th annual event is December 7, 2026 in Philadelphia; applications for it have closed. Applications reportedly open in July.',
    url: 'https://veteransharktank.com/',
    sourceUrls: ['https://veteransharktank.com/'],
    verifiedDate: '2026-11-17', confidence: 'verified'
  },
  {
    id: 'vetsintech', name: 'VetsinTech Pitch Contest',
    runBy: 'VetsinTech',
    type: 'prize', amountMin: null, amountMax: 25000, amountText: 'Up to $25,000 in prizes',
    elig: { owner: ['veteran', 'spouse'], industries: ['tech'] },
    eligText: 'Early-stage tech startups at least 15% owned by a veteran or military spouse.',
    cycle: 'annual', usuallyOpens: 'The 2026 finals were reportedly held August 20, 2026. No 2027 date was posted on 11/17/2026.',
    url: 'https://vetsintech.co/entrepreneurship',
    sourceUrls: ['https://vetsintech.co/entrepreneurship'],
    verifiedDate: '2026-11-17', confidence: 'verified'
  },
  {
    id: 'ivmf-accel', name: 'D’Aniello Family Foundation Acceleration Challenge',
    runBy: 'IVMF at Syracuse University',
    type: 'grant', amountMin: null, amountMax: 10000, amountText: 'Up to $10,000 in grant funding',
    elig: { owner: ['veteran', 'spouse'] },
    eligText: 'Ten nominated participants a year from IVMF entrepreneurship programs.',
    cycle: 'invite', howIn: 'Nomination only. The way in is to take part in an IVMF program such as the Entrepreneurship Bootcamp for Veterans.',
    url: 'https://ivmf.syracuse.edu/programs/entrepreneurship/',
    sourceUrls: ['https://ivmf.syracuse.edu/programs/entrepreneurship/'],
    verifiedDate: '2026-11-17', confidence: 'verified'
  },
  {
    id: 'rice-vbb', name: 'Rice Veterans Business Battle',
    runBy: 'Rice Business (Rice University)',
    type: 'prize', amountMin: null, amountMax: null, amountText: 'A pitch event to raise capital from investors and lenders. The page lists no cash prize.',
    elig: { owner: ['veteran', 'spouse'] },
    eligText: 'A startup founded and actively managed by a veteran or a veteran’s spouse.',
    cycle: 'dated', deadline: null, eventDate: '2027-04-01', openNow: true, deadlineText: 'Applications were open on 11/17/2026; the event is March 31 to April 1, 2027',
    url: 'https://business.rice.edu/veterans-business-battle',
    sourceUrls: ['https://business.rice.edu/veterans-business-battle'],
    verifiedDate: '2026-11-17', confidence: 'verified', mostlyInvestment: true
  },
  {
    id: 'wv-ag-pitch', name: 'Veterans & Heroes to Agriculture Pitch Competition',
    runBy: 'West Virginia Department of Agriculture',
    type: 'prize', amountMin: null, amountMax: null, amountText: 'Cash awards (amounts not listed on the page)',
    elig: { owner: ['veteran'], industries: ['farm'], states: ['WV'] },
    eligText: 'West Virginia veterans, active duty, first responders, and their families with an agriculture or food business.',
    cycle: 'dated', deadline: '2027-01-15', deadlineText: 'Due January 15, 2027 by 4:00 pm',
    url: 'https://agriculture.wv.gov/ag-business/veterans-and-heroes-to-agriculture/',
    sourceUrls: ['https://agriculture.wv.gov/ag-business/veterans-and-heroes-to-agriculture/'],
    verifiedDate: '2026-11-17', confidence: 'verified'
  },
  {
    id: 'twu-vet-grant', name: 'Veteran Entrepreneur Grant',
    runBy: 'Texas Woman’s University, Center for Women Entrepreneurs',
    type: 'grant', amountMin: 5000, amountMax: 5000, amountText: 'Five grants of $5,000 each',
    elig: { owner: ['veteran'], states: ['TX'], existingOnly: true },
    eligText: 'Existing Texas businesses owned and controlled by one or more veterans. The 2026 page opens it to all qualified Texas veterans, though its application documents still carry some women-owned wording, so confirm with the center before you apply. Requires a 10% owner match.',
    cycle: 'annual', usuallyOpens: 'The 2026 window was January 27 to February 27, 2026. No 2027 dates were posted on 11/17/2026.',
    url: 'https://twu.edu/center-women-entrepreneurs/veteran-grant/',
    sourceUrls: ['https://twu.edu/center-women-entrepreneurs/veteran-grant/'],
    verifiedDate: '2026-11-17', confidence: 'verified'
  }
];

// Open to any small business; no veteran preference found. Shown in a short, clearly labeled list.
export const GENERAL_GRANTS = [
  {
    id: 'verizon-digital-ready', name: 'Verizon Small Business Digital Ready grants', runBy: 'Verizon',
    type: 'grant', amountText: '$10,000 grants',
    eligText: 'Complete two free courses or events on the platform to unlock the application.',
    cycle: 'dated', deadline: '2026-12-31', deadlineText: 'Monthly reviews through December 2026; decisions by January 12, 2027',
    url: 'https://digitalready.verizonwireless.com/grants', sourceUrls: ['https://digitalready.verizonwireless.com/grants'],
    verifiedDate: '2026-11-17', confidence: 'verified'
  },
  {
    id: 'sbir', name: 'SBIR and STTR awards', runBy: 'Federal agencies (11 participate)',
    type: 'grant', amountText: 'Equity-free research and development awards: up to $335,937 for Phase I and $2,239,578 for Phase II without a waiver',
    eligText: 'Any U.S. small business doing research and development an agency wants. No veteran set-aside. Reauthorized through September 30, 2031.',
    cycle: 'rolling', industries: ['tech'],
    url: 'https://www.sbir.gov/about', sourceUrls: ['https://www.sbir.gov/about'],
    verifiedDate: '2026-11-17', confidence: 'verified'
  },
  {
    id: 'usda-eqip', name: 'USDA conservation cost-share for veteran farmers (EQIP, CSP)', runBy: 'USDA',
    type: 'grant', amountText: 'Higher payment rates, an advance payment of at least 50% under EQIP, ranking priority, and a 5% set-aside pool',
    eligText: 'Veteran farmers and ranchers are named explicitly. This pays for conservation practices on a working farm; it is not startup capital.',
    cycle: 'rolling', industries: ['farm'],
    url: 'https://www.farmers.gov/your-business/military-veterans', sourceUrls: ['https://www.farmers.gov/your-business/military-veterans'],
    verifiedDate: '2026-11-17', confidence: 'verified'
  }
];

// Real programs that are routinely called "grants" and are not. Stated plainly so readers know what they are.
export const NOT_GRANTS = [
  { id: 'hivers', name: 'Hivers and Strivers', what: 'An angel investment group that invests only in veteran-led companies, from seed stage through Series B. It buys a share of your company. It is not a grant.', url: 'https://www.hiversandstrivers.com/', verifiedDate: '2026-11-17' },
  { id: 'vetfran', name: 'VetFran', what: 'A franchise fee discount from member brands (at least 10%, 15%, or 20% depending on the brand’s tier). It lowers the price of a franchise. It is not cash.', url: 'https://www.franchise.org/franchising-for-veterans/', verifiedDate: '2026-11-17' },
  { id: 'ebv', name: 'Entrepreneurship Bootcamp for Veterans (EBV) and V-WISE', what: 'Free or low-cost training from IVMF at Syracuse University, including travel and lodging for EBV. No cash award.', url: 'https://ivmf.syracuse.edu/programs/entrepreneurship/start-up/ebv/', verifiedDate: '2026-11-17' },
  { id: 'kiva-not-grant', name: 'Kiva', what: 'A 0% loan of $1,000 to $15,000 that you repay. It is listed in the funding paths above.', url: 'https://www.kiva.org/borrow', verifiedDate: '2026-11-17' },
  { id: 'dogtag', name: 'Dog Tag Fellowship', what: 'A five-month fellowship with a Georgetown certificate and a monthly living stipend for fellows. It is training, not business capital. Summer 2027 applications open January 18, 2027.', url: 'https://www.dogtaginc.org/apply', verifiedDate: '2026-11-17' },
  { id: 'penfed-vep', name: 'PenFed Foundation Veteran Entrepreneur Program', what: 'A free incubator, accelerator, and bootcamp. The program page lists no cash, grant, or investment.', url: 'https://penfedfoundation.org/how-we-help/vep', verifiedDate: '2026-11-17' }
];

// Programs that have ENDED or stopped taking applications. A row renders ONLY when it has a verdict, a verbatim
// proofQuote, and a proofUrl from the organization's own site or an official government page. Filled from the
// dead-program verification pass; see ENDED_PROGRAMS in ended-programs.js.

// The myth, in the government's own words.
export const MYTH_SOURCES = [
  { who: 'SBA', quote: 'SBA does not provide grants for starting and expanding a business.', url: 'https://www.sba.gov/funding-programs/grants', verifiedDate: '2026-11-17' },
  { who: 'USA.gov', quote: 'The government does not offer “free money” for individuals.', url: 'https://www.usa.gov/grants', verifiedDate: '2026-11-17' },
  { who: 'Grants.gov', quote: 'applying for a grant is completely free.', url: 'https://www.grants.gov/learn-grants/grant-fraud', verifiedDate: '2026-11-17' }
];

export const SCAM_CHECK = {
  lines: [
    'A real grant never costs money to apply for. Do not pay for a list of grants or an up-front fee.',
    'Government agencies do not contact you by phone, text, social media, or email about a grant you did not apply for.',
    'Scammers read your profile for military history and message you about real-sounding veteran grant programs that do not exist.'
  ],
  report: 'Report veteran-targeted scams at VSAFE.gov or 833-38V-SAFE.',
  sourceUrls: ['https://consumer.ftc.gov/articles/government-grant-scams', 'https://consumer.ftc.gov/consumer-alerts/2026/11/veterans-day-reminder-how-spot-scams-social-media', 'https://www.militaryconsumer.gov/node/329524'],
  verifiedDate: '2026-11-17'
};
