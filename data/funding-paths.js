// Funding paths: one row per product a veteran can use to fund a business.
// Every row carries sourceUrls, verifiedDate, and confidence (verified | reported | unverified).
// "verified" means the source page or document was opened and read on verifiedDate.
// SBA fee math is NOT here: import SBA_FEES and sbaFee() from /veteran-business/data/rules.js (never fork it).
// Refresh: every Oct 1 (SBA SOP + fee notice). The governing SOP is 50 10 8.1, effective 10/1/2026.

export const PATHS_STAMP = '2026-11-17';

const SOP = 'https://legacy.sba.gov/document/sop-50-10-lender-development-company-loan-programs';
const FEES = 'https://www.sba.gov/document/information-notice-5000-881797-fy-2027-7a-program-fees';

// kind 'line' = a revolving line of credit (draw, repay, draw again). requiresBiz = business types the program is limited to.
// maxByBiz = a per-business-type maximum that overrides `max`.
// modeNotes = a note shown first for one mode. ownCash.buyPct = the down payment rule when the mode is buying a business.
// lineOk: true = a loan product that can also be set up as a revolving line.
// ownCash.kind: 'none' (program states no equity requirement) | 'lender' (lender decides) |
//               'pct' (a stated percentage, fillable from the sources in equity-sources.js)
// gates: 'citizen' = every owner a U.S. citizen or national (SBA rule since 3/1/2026)
export const FUNDING_PATHS = [
  {
    id: 'kiva',
    name: 'Kiva U.S. loan',
    kind: 'crowd-loan',
    min: 1000, max: 15000,
    ownCash: { kind: 'none', text: 'No down payment, no collateral, no minimum credit score.' },
    cost: { rateText: '0% interest, no fees', aprLow: 0, aprHigh: 0 },
    termText: '12 to 36 months',
    startupOk: true, minMonths: 0,
    modes: ['scratch', 'grow'],
    gates: [],
    excludeStates: ['NV', 'ND'],
    decides: 'You invite 5 to 40 people from your own network to lend first (up to 15 days). Then the loan goes public for up to 35 days. Funding is all or nothing.',
    notes: 'The cap is $1,000 to $3,000 without official business documents. A PayPal account is required. Not a veteran program; open to any U.S. small business.',
    timeText: 'About 4 to 8 weeks',
    nextStep: 'Start a Kiva application',
    url: 'https://www.kiva.org/borrow',
    sourceUrls: ['https://www.kiva.org/borrow'],
    verifiedDate: '2026-11-17', confidence: 'verified', refresh: 'annual'
  },
  {
    id: 'microloan',
    name: 'SBA Microloan',
    kind: 'loan',
    min: 500, max: 50000,
    ownCash: { kind: 'none', text: 'SBA states no equity or down payment requirement. The nonprofit lender makes the credit decision and may set its own.' },
    cost: { rateText: 'Generally 8% to 13%', aprLow: 8, aprHigh: 13 },
    termText: 'Up to 7 years',
    startupOk: true, minMonths: 0,
    modes: ['scratch', 'grow'],
    gates: ['citizen'],
    decides: 'A local nonprofit lender that SBA funds for this purpose. Many require training or a business plan first.',
    notes: 'For working capital, inventory, supplies, furniture, fixtures, machinery, and equipment. Not for real estate or paying off existing debt. SBA says the average microloan is about $13,000.',
    timeText: 'Often 30 to 90 days',
    nextStep: 'Find a microlender near you',
    url: 'https://www.sba.gov/loans/microloans/list-of-microlenders/',
    sourceUrls: ['https://www.sba.gov/funding-programs/loans/microloans', 'https://www.law.cornell.edu/cfr/text/13/120.707'],
    verifiedDate: '2026-11-17', confidence: 'verified', refresh: 'annual-oct'
  },
  {
    id: 'express',
    name: 'SBA Express loan',
    kind: 'loan',
    min: 5000, max: 500000,
    ownCash: { kind: 'lender', text: 'SBA sets no minimum equity on Express loans. The lender uses its own rules, so the down payment is whatever your bank requires.',
      // Buying a business is the exception: SOP 50 10 8.1 Appendix 15 applies its change-of-ownership rules to SBA Express.
      buyPct: 0.10, buyText: 'Buying a business with an SBA Express loan follows the same rule as other 7(a) loans: a down payment of 10% of the purchase. It does not have to be your own cash.' },
    cost: { rateText: 'Rate capped by SBA; set by the lender', feeRule: 'express' },
    termText: 'Up to 10 years for most uses; revolving lines allowed',
    startupOk: true, minMonths: 0,
    modes: ['scratch', 'buy', 'grow'],
    gates: ['citizen'],
    vetFee: 'The SBA upfront guaranty fee is $0 when the business is at least 51% owned and controlled by a veteran or a veteran’s spouse (Small Business Act section 7(a)(31)(G)). This is the only veteran fee waiver in the FY2027 fee notice.',
    decides: 'An SBA Express lender, using its own underwriting. SBA guarantees 50%.',
    notes: 'No SBA-required collateral at $50,000 or less.',
    modeNotes: { scratch: 'It can be set up as a revolving line of credit, not only as a one-time loan, so this is the SBA line of credit open to a new business.', grow: 'It can be set up as a revolving line of credit, not only as a one-time loan.' },
    lineOk: true,
    timeText: 'Often 30 to 60 days',
    nextStep: 'Use SBA Lender Match to find Express lenders',
    url: 'https://www.sba.gov/funding-programs/loans/lender-match-connects-you-lenders',
    sourceUrls: [SOP, FEES],
    verifiedDate: '2026-11-17', confidence: 'verified', refresh: 'annual-oct'
  },
  {
    id: '7a-small',
    name: 'SBA 7(a) Small loan',
    kind: 'loan',
    min: 5000, max: 350000,
    ownCash: { kind: 'pct', pct: 0.10, startupOnly: true, text: 'A startup (in business one year or less) needs equity of at least 10% of the total project cost. It does not have to be your own cash.' },
    cost: { rateText: 'Capped at base rate + 6.5% ($50,000 or less), + 6% (to $250,000), + 4.5% (to $350,000). The base rate is usually the Prime rate.', feeRule: 'standard' },
    termText: 'Up to 10 years; up to 25 for real estate',
    startupOk: true, minMonths: 0,
    modes: ['scratch', 'buy', 'grow'],
    gates: ['citizen'],
    decides: 'An SBA lender. Since 3/1/2026 there is no SBSS credit-score screen; the lender looks for debt coverage of at least 1.10 (the business has $1.10 available for every $1.00 of loan payments), which a new business can show with 12-month projections.',
    notes: 'SBA guarantees 85% up to $150,000 and 75% above. No SBA-required collateral at $50,000 or less.',
    timeText: 'Often 45 to 90 days',
    nextStep: 'Use SBA Lender Match to find 7(a) lenders',
    url: 'https://www.sba.gov/funding-programs/loans/lender-match-connects-you-lenders',
    sourceUrls: [SOP, 'https://legacy.sba.gov/sites/default/files/2026-02/Procedural%20Notice%20-%20Sunset%20of%20SBSS%20Score%20-%20Supplemental%20Guidance%20Corrected%202.24.pdf', FEES],
    verifiedDate: '2026-11-17', confidence: 'verified', refresh: 'annual-oct'
  },
  {
    id: '7a-standard',
    name: 'Standard SBA 7(a) loan',
    kind: 'loan',
    min: 350001, max: 5000000,
    ownCash: { kind: 'pct', pct: 0.10, startupOnly: true, text: 'A startup needs equity of at least 10% of the total project cost. Buying a business also takes 10%. It does not have to be your own cash.' },
    cost: { rateText: 'Capped at base rate + 3% (the base rate is usually the Prime rate)', feeRule: 'standard' },
    termText: 'Up to 10 years; up to 25 for real estate',
    startupOk: true, minMonths: 0,
    modes: ['scratch', 'buy', 'grow'],
    gates: ['citizen'],
    decides: 'An SBA lender. A startup’s projections must show debt coverage of at least 1.15 within two years (that is, $1.15 available for every $1.00 of loan payments). The loan must be fully secured; if business assets fall short, the lender takes available equity in personal real estate.',
    notes: 'SBA guarantees 75%.',
    timeText: 'Often 60 to 90 days',
    nextStep: 'Use SBA Lender Match to find 7(a) lenders',
    url: 'https://www.sba.gov/funding-programs/loans/lender-match-connects-you-lenders',
    sourceUrls: [SOP, FEES],
    verifiedDate: '2026-11-17', confidence: 'verified', refresh: 'annual-oct'
  },
  {
    id: '504',
    name: 'SBA 504 loan',
    kind: 'loan',
    min: 125000, max: 5000000,
    ownCash: { kind: 'pct', pct: 0.15, pctEstablished: 0.10, text: 'A new business (two years or less) contributes 15% of the project, or 20% if the property is also special-purpose. An established business contributes 10%.' },
    cost: { rateText: 'Fixed rate on the SBA portion, set when that portion is funded' },
    termText: '10, 20, or 25 years',
    startupOk: true, minMonths: 0,
    modes: ['scratch', 'buy', 'grow'],
    gates: ['citizen'],
    fixedAssetsOnly: true,
    decides: 'A Certified Development Company together with a bank.',
    notes: 'Fixed assets only: buildings, land, long-life equipment. Since 7/4/2026 a 7(a) loan no longer reduces how much 504 financing you can get.',
    timeText: 'Often 60 to 120 days',
    nextStep: 'Read how 504 loans work and find a CDC',
    url: 'https://www.sba.gov/funding-programs/loans/504-loans',
    sourceUrls: [SOP, 'https://www.sba.gov/funding-programs/loans/504-loans', 'https://legacy.sba.gov/sites/default/files/2026-05/Policy%20Notice%205000-879058%20Coordination%20of%207%28a%29%20and%20504%20for%20Maximum%20Loan%20Limits%20_Final_5-18-26.pdf'],
    verifiedDate: '2026-11-17', confidence: 'verified', refresh: 'annual-oct'
  },
  {
    id: 'regcf',
    name: 'Crowdfunding (investment or rewards)',
    kind: 'crowd',
    min: 1000, max: 5000000,
    ownCash: { kind: 'none', text: 'No down payment. You are raising from customers or investors, so the cost is your time, platform fees, and (for investment crowdfunding) a share of the business or a debt to investors.' },
    cost: { rateText: 'Platform and filing costs; varies' },
    termText: 'Not a loan in the rewards model',
    startupOk: true, minMonths: 0,
    modes: ['scratch', 'grow'],
    gates: [],
    decides: 'The crowd. Investment crowdfunding must run through an SEC-registered broker-dealer or funding portal and is capped at $5 million in a 12-month period.',
    notes: 'With rewards crowdfunding, backers typically get a product or perk, and SBA notes you are typically under no obligation to repay if the plan fails.',
    timeText: 'Weeks to months',
    nextStep: 'Read the SEC’s Regulation Crowdfunding rules',
    url: 'https://www.sec.gov/resources-small-businesses/exempt-offerings/regulation-crowdfunding',
    sourceUrls: ['https://www.sec.gov/resources-small-businesses/exempt-offerings/regulation-crowdfunding', 'https://www.sba.gov/business-guide/plan-your-business/fund-your-business'],
    verifiedDate: '2026-11-17', confidence: 'verified', refresh: 'annual'
  },
  {
    id: 'caplines',
    name: 'SBA CAPLines (working capital line of credit)',
    kind: 'line',
    min: 5000, max: 5000000,
    ownCash: { kind: 'lender', text: 'The lender sets any down payment and looks at what backs the line: your receivables, inventory, or a signed contract. If the business is a year old or less, SBA\u2019s 10% startup rule can still apply, so ask the lender.' },
    cost: { rateText: 'Rate capped by SBA; set by the lender. You pay interest only on what you have drawn.', feeRule: 'standard' },
    termText: 'Up to 10 years, including renewals',
    startupOk: false, minMonths: 1,
    modes: ['grow'],
    gates: ['citizen'],
    decides: 'An SBA lender that offers CAPLines. Not every SBA lender does, so ask.',
    notes: 'Three kinds fit most businesses. A Working Capital CAPLine is for a business that has receivables or inventory. A Contract CAPLine finances the costs of a specific contract, for a business that has completed similar contracts at a profit. A Seasonal CAPLine covers a seasonal build-up, for a business at least 12 months old. Anyone who owns 20% or more of the business guarantees the loan personally.',
    timeText: 'Often 45 to 90 days',
    nextStep: 'Use SBA Lender Match and ask for a CAPLines lender',
    url: 'https://www.sba.gov/funding-programs/loans/lender-match-connects-you-lenders',
    sourceUrls: [SOP, 'https://legacy.sba.gov/partners/lenders/7a-loan-program/types-7a-loans'],
    verifiedDate: '2026-11-17', confidence: 'verified', refresh: 'annual-oct'
  },
  {
    id: 'marc',
    name: 'SBA 7(a) MARC revolving line (manufacturers, wholesalers, food supply)',
    kind: 'line',
    min: 5000, max: 5000000,
    ownCash: { kind: 'lender', text: 'SBA says MARC loans have no minimum required down payment. The lender decides based on the business\u2019s cash flow.' },
    cost: { rateText: 'Capped at the Prime rate + 3% above $350,000 (higher caps on smaller lines). You pay interest only on what you have drawn.' },
    termText: 'A revolving line; the lender sets the term within SBA\u2019s limits',
    startupOk: true, minMonths: 0,
    modes: ['grow', 'buy'],
    gates: ['citizen'],
    requiresBiz: ['manufacturing', 'food', 'wholesale'],
    modeNotes: { buy: 'This line cannot pay for the purchase itself. A lender can set it up alongside the purchase loan to cover the business\u2019s working capital after you own it.' },
    maxByBiz: { manufacturing: 5000000, food: 2000000, wholesale: 2000000 },
    decides: 'An SBA lender. Repayment has to be supported by the business\u2019s cash flow.',
    notes: 'MARC stands for Manufacturers\u2019 Access to Revolving Credit. It is a revolving line for working capital only: up to $5 million for manufacturers (NAICS 31 to 33) and up to $2 million for the other eligible industries, which are wholesalers (NAICS 42, except motor vehicle wholesalers and wholesale trade agents and brokers), agriculture (NAICS 11), grocery stores, and refrigerated and farm warehousing. It cannot pay for buying a business, but a lender can set one up at the same time as a purchase to cover the business\u2019s working capital. Anyone who owns 20% or more guarantees the loan personally.',
    timeText: 'Often 45 to 90 days',
    nextStep: 'Use SBA Lender Match and ask for a MARC lender',
    url: 'https://www.sba.gov/funding-programs/loans/lender-match-connects-you-lenders',
    sourceUrls: [SOP],
    verifiedDate: '2026-11-17', confidence: 'verified', refresh: 'annual-oct'
  },
  {
    id: 'wcp',
    name: 'SBA 7(a) Working Capital Pilot line of credit',
    kind: 'line',
    min: 5000, max: 5000000,
    ownCash: { kind: 'lender', text: 'SBA sets no down payment on a line of credit. The lender sets the terms.' },
    cost: { rateText: 'Rate capped by SBA; set by the lender. SBA charges its own fee schedule for this program, starting at 0.25% for a line of 12 months or less.' },
    termText: 'Up to 60 months',
    startupOk: false, minMonths: 12,
    modes: ['grow'],
    gates: ['citizen'],
    decides: 'An SBA lender taking part in the pilot.',
    notes: 'A pilot program, so not every lender offers it. The business must have 12 full months of operations.',
    timeText: 'Varies',
    nextStep: 'Read the SBA Working Capital Pilot page',
    url: 'https://legacy.sba.gov/partners/lenders/7a-loan-program/7a-working-capital-pilot-program',
    sourceUrls: ['https://legacy.sba.gov/partners/lenders/7a-loan-program/7a-working-capital-pilot-program', FEES],
    verifiedDate: '2026-11-17', confidence: 'verified', refresh: 'annual-oct'
  },
  {
    id: 'mreidl',
    name: 'Military Reservist Economic Injury Disaster Loan',
    kind: 'disaster',
    min: 1000, max: 2000000,
    ownCash: { kind: 'none', text: 'No down payment. Collateral is required above $50,000 where available.' },
    cost: { rateText: '4% fixed', aprLow: 4, aprHigh: 4 },
    termText: 'Up to 30 years; first payment deferred 12 months',
    startupOk: false, minMonths: 1,
    modes: ['grow'],
    gates: ['citizen'],
    requires: 'reserve',
    decides: 'SBA directly.',
    notes: 'Not startup capital. It covers the actual economic injury to an existing business when an essential employee (including the owner) who is a reservist is called to active duty. File from the call-up notice until one year after release.',
    timeText: 'Varies',
    nextStep: 'Read the SBA reservist loan page',
    url: 'https://www.sba.gov/funding-programs/disaster-assistance/military-reservist-loan',
    sourceUrls: ['https://legacy.sba.gov/funding-programs/disaster-assistance/military-reservist-loan'],
    verifiedDate: '2026-11-17', confidence: 'verified', refresh: 'annual'
  }
];

// Products people ask about that do NOT fit a business under 12 months old. The tool says why instead of listing them.
export const NOT_FOR_STARTUPS = [
  { name: '7(a) Working Capital Pilot', why: 'Requires 12 full months of operations.', sourceUrl: 'https://legacy.sba.gov/partners/lenders/7a-loan-program/7a-working-capital-pilot-program', verifiedDate: '2026-11-17' },
  { name: 'SBA CAPLines', why: 'A line of credit backed by receivables, inventory, or contracts, which a brand-new business does not have yet. It shows as a funding path once the business is operating (choose Growing my business).', sourceUrl: SOP, verifiedDate: '2026-11-17' }
];

// Benchmarks for the "what each dollar costs" comparison.
export const COST_BENCHMARKS = {
  creditCardApr: 21.19, creditCardAprAssessed: 22.36,
  creditCardNote: 'Average commercial bank credit card rate, Q3 2026 (Federal Reserve G.19; consumer card series, used as the nearest published benchmark).',
  creditCardSource: 'https://www.federalreserve.gov/releases/g19/current/',
  verifiedDate: '2026-11-17'
};

// SBA volume context, FY2026 (SBA release 11/2/2026 and National Veterans Small Business Week release 11/9/2026).
export const SBA_CONTEXT = {
  fy: 2026, vetLoans: 2800, vetDollars: 1.32e9, startupLoans: 9700, startupDollars: 6.5e9,
  sourceUrl: 'https://www.sba.gov/sba-newsroom/2026/11/02/sba-fuels-main-street-growth-100-billion-delivered-fy26/',
  verifiedDate: '2026-11-17'
};

// Plain-English explainer shown in the funding paths section whenever a line of credit is among the paths.
// The 20% guarantee rule and "cash flow is the primary source of repayment" are from SOP 50 10 8.1.
export const LINE_OF_CREDIT_NOTE = {
  title: 'A loan or a line of credit?',
  lines: [
    'A term loan gives you one lump sum and a fixed payment. It suits a one-time cost: buying the business, equipment, a build-out.',
    'A line of credit is a limit you can draw from, repay, and draw from again, and you pay interest only on what you have drawn. It suits costs that come and go: buying inventory or parts for an order and waiting to be paid.',
    'SBA backs both. The paths marked \u201cline of credit\u201d below are revolving lines. A lender sizes a line to what the business\u2019s sales, receivables, and inventory can support, and SBA says the business\u2019s cash flow is the main source of repayment, so a business with a track record gets a larger line than a new one.',
    'On any SBA loan or line, anyone who owns 20% or more of the business guarantees it personally.'
  ],
  sourceUrls: [SOP], verifiedDate: '2026-11-17'
};
