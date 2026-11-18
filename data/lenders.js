// "Where to find a lender": official directories only, plus questions to ask any lender.
// RULE: no commercial bank is ever named or linked here. Directories are government pages. Nonprofit lenders with a
// published veteran product and state programs are pulled in from state-funding.js by the engine, not listed here.
// showFor: path ids that make a directory relevant; 'any-sba' = any SBA-backed path; 'always' = always shown.
// Each URL was opened on verifiedDate.

export const LENDERS_STAMP = '2026-11-18';

export const LENDER_DIRECTORIES = [
  { id: 'lender-match', name: 'SBA Lender Match', showFor: ['express', '7a-small', '7a-standard', 'caplines', 'marc', 'wcp'],
    what: 'Answer a few questions and SBA sends you a list of lenders interested in your loan, usually within two business days. It is free, it is not a loan application, and a match is not certain. Start here for SBA Express, 7(a), and lines of credit.',
    url: 'https://www.sba.gov/funding-programs/loans/lender-match-connects-you-lenders', verifiedDate: '2026-11-18' },
  { id: 'lender-reports', name: 'SBA lender activity reports', showFor: ['express', '7a-small', '7a-standard', 'caplines', 'marc', 'wcp', '504'],
    what: 'SBA’s own reports of loan approvals by lender. Use them to see which banks are making SBA loans in volume before you spend time on one that rarely does.',
    url: 'https://www.sba.gov/partners/lenders/lender-reports', verifiedDate: '2026-11-18' },
  { id: 'microlenders', name: 'SBA list of microlenders', showFor: ['microloan'],
    what: 'The nonprofit lenders that make SBA Microloans, listed by state. You apply to one of them directly.',
    url: 'https://www.sba.gov/loans/microloans/list-of-microlenders/', verifiedDate: '2026-11-18' },
  { id: 'cdc-list', name: 'SBA list of Certified Development Companies', showFor: ['504'],
    what: 'The nonprofit SBA partners that arrange 504 loans for buildings, land, and long-life equipment. One of them works with your bank.',
    url: 'https://www.sba.gov/loans/504-loans/list-of-certified-development-companies/', verifiedDate: '2026-11-18' },
  { id: 'kiva', name: 'Kiva U.S.', showFor: ['kiva'],
    what: 'Kiva is the lender. You apply on its site.',
    url: 'https://www.kiva.org/borrow', verifiedDate: '2026-11-18' },
  { id: 'district', name: 'Your SBA district office', showFor: 'any-sba',
    what: 'Each district office works with the SBA lenders in its area and can tell you who is active locally.',
    url: 'https://www.sba.gov/local-assistance/district', verifiedDate: '2026-11-18' },
  { id: 'vboc', name: 'Veterans Business Outreach Center or SBDC', showFor: 'always',
    what: 'Free counselors who review your loan package before a lender sees it. They work with local lenders and can often make an introduction.',
    url: 'https://www.sba.gov/local-assistance/resource-partners/veterans-business-outreach-center-vboc-program',
    url2: 'https://www.sba.gov/local-assistance/resource-partners/small-business-development-centers-sbdc', url2Label: 'Find an SBDC', verifiedDate: '2026-11-18' }
];

// when: a key the engine sets from the visitor's results. Questions render in this order.
//   any-sba | express-vet | express | equity | buy-vet | lines | startup | sector | microloan | always
export const LENDER_QUESTIONS = [
  { id: 'plp', when: 'any-sba', q: 'Are you an SBA Preferred Lender?',
    why: 'A Preferred Lender can approve an SBA loan itself. Other lenders send the file to SBA for approval, which takes longer.' },
  { id: 'express-fee', when: 'express-vet', q: 'Do you make SBA Express loans, and will you apply the $0 upfront fee for a veteran-owned business?',
    why: 'The waiver is in the law, and the lender has to document your eligibility in the loan file. Bring proof of service, such as your DD-214.' },
  { id: 'express-line', when: 'express', q: 'Can you set an SBA Express loan up as a revolving line of credit?',
    why: 'Express can be a one-time loan or a line you draw from and repay. Not every lender offers both.' },
  { id: 'equity', when: 'equity', q: 'What down payment do you require, and which sources do you accept for it?',
    why: 'SBA’s minimum is 10% for a startup or a purchase, and SBA accepts gifts, standby loans, and other sources. A lender can require more or accept fewer.' },
  { id: 'buy-vet', when: 'buy-vet', q: 'Will you accept a seller note on full standby for the whole 10% under SBA Procedural Notice 5000-883564?',
    why: 'The veteran rule for buying a business took effect November 11, 2026, so some lenders have not used it yet. Bring the notice with you.',
    url: 'https://legacy.sba.gov/sites/default/files/2026-11/Procedural%20Notice%20-%205000-883564%20Equity%20Injection%20Flexibility%20for%20Veteran%20Business%20Acquisitions.pdf', urlLabel: 'The SBA notice' },
  { id: 'lines', when: 'lines', q: 'Do you offer SBA CAPLines, the MARC revolving line, or the Working Capital Pilot?',
    why: 'These are SBA lines of credit, and many SBA lenders do not offer them. Ask before you fill out an application.' },
  { id: 'startup', when: 'startup', q: 'Do you lend to startups, and what do you need to see in my projections?',
    why: 'A new business shows it can repay with 12-month projections. Some lenders do not lend to startups at all.' },
  { id: 'sector', when: 'sector', q: 'Does my loan get this year’s $0 upfront fee for manufacturers, food supply businesses, or rural locations?',
    why: 'The fiscal year 2027 waiver covers 7(a) loans of $700,000 or less in those groups. The lender confirms whether your business is on SBA’s list.' },
  { id: 'microloan', when: 'microloan', q: 'Do you require training or a business plan before I apply?',
    why: 'Many microlenders do. Knowing up front saves you a wasted application.' },
  { id: 'guarantee', when: 'any-sba', q: 'Who has to guarantee the loan, and what collateral will you take?',
    why: 'Anyone who owns 20% or more guarantees an SBA loan personally. SBA requires no collateral at $50,000 or less; above that, lenders take what is available.' },
  { id: 'cost', when: 'always', q: 'What is the total cost: the rate, the SBA fee, and your own fees?',
    why: 'Ask two or three lenders the same question and compare the answers in writing.' }
];
