// State layer: business FINANCING for veterans (loans, guarantees, linked deposits, interest buydowns, grants),
// plus each state's main small-business loan program open to anyone, plus regional mission lenders.
// Certification, tax, and fee-waiver rows stay in /veteran-business/data/state-business-benefits.js (never fork them);
// the UI deep-links to Veteran Founder Stack for those.
//
// Per jurisdiction:
//   veteran: []   rows for veteran-specific financing (may be empty)
//   general: {}   the state's main small-business loan program open to all, or null
//   checked: 'verified' | 'none-found' | 'pending'
//             none-found = a real search of official sources on checkedDate found no veteran financing program
//             pending    = not yet researched; the UI must say so and never imply "none"
//   checkedDate, checkedNote (what was looked at)
// Row fields: id, name, agency, kind ('loan'|'guarantee'|'linked-deposit'|'buydown'|'grant'), terms, who,
//             status ('open'|'rounds'|'closed'|'unknown'), statusNote, url, sourceUrls, verifiedDate,
//             confidence ('verified'|'reported'|'unverified'), zeroCashMax (optional: the most the program lends with
//             no equity contribution; only set when the program's own page says so)
// UI rule: 'reported' rows render with "reported; confirm with the agency"; 'unverified' rows render the name and the
// question to ask, no terms.

export const STATE_FUNDING_STAMP = '2026-11-18';

export const STATE_NAMES = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',
  FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',
  MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',
  NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',
  PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',
  WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
  PR:'Puerto Rico',GU:'Guam',VI:'U.S. Virgin Islands',AS:'American Samoa',MP:'Northern Mariana Islands'
};

const pending = () => ({ veteran: [], general: null, checked: 'pending', checkedDate: null, checkedNote: null });

export const STATE_FUNDING = Object.fromEntries(Object.keys(STATE_NAMES).map(k => [k, pending()]));

STATE_FUNDING.MD = {
  veteran: [{
    id: 'md-mpvolp', name: 'Military Personnel and Veteran-Owned Small Business Loan Program',
    agency: 'Maryland Department of Commerce, with the Department of Veterans and Military Families',
    kind: 'loan', terms: '$1,000 to $100,000 at 0% interest, repaid over 1 to 8 years.',
    who: 'Businesses with fewer than 50 employees that are veteran-owned, or owned by or employing an activated reservist or National Guard member.',
    status: 'rounds', statusNote: 'Runs in application rounds. The last round ran July 1 to August 14, 2026 and is closed.',
    url: 'https://commerce.maryland.gov/fund/programs-for-businesses/mpvolp',
    sourceUrls: ['https://commerce.maryland.gov/fund/programs-for-businesses/mpvolp'], verifiedDate: '2026-11-17', confidence: 'verified'
  }], general: null, checked: 'verified', checkedDate: '2026-11-17', checkedNote: null
};

STATE_FUNDING.MN = {
  veteran: [{
    id: 'mn-reservist-veteran', name: 'Reservist and Veteran Business Loan Program',
    agency: 'Minnesota Department of Employment and Economic Development (DEED)',
    kind: 'loan', terms: '$5,000 to $20,000 interest-free, 4.5-year term, no payments for the first 18 months.',
    who: 'A startup majority-owned by a veteran who separated after September 11, 2001, or a business hurt by an essential employee’s activation.',
    status: 'unknown', statusNote: 'Terms are from the DEED fact sheet. Confirm with DEED that the fund is taking applications.',
    url: 'https://mn.gov/deed/assets/reservist-fact-sheet_tcm1045-131666.pdf',
    sourceUrls: ['https://mn.gov/deed/assets/reservist-fact-sheet_tcm1045-131666.pdf'], verifiedDate: '2026-11-17', confidence: 'verified'
  }], general: null, checked: 'verified', checkedDate: '2026-11-17', checkedNote: null
};

STATE_FUNDING.WA = {
  veteran: [{
    id: 'wa-linked-deposit', name: 'Veteran Linked Deposit Program',
    agency: 'Washington State Treasurer and Washington Department of Veterans Affairs',
    kind: 'linked-deposit', terms: 'A bank loan at up to 2 percentage points below the market rate, up to $1 million per loan, for up to 10 years.',
    who: 'Businesses certified by WDVA as veteran or servicemember owned. You still have to meet the participating bank’s credit criteria.',
    status: 'open', statusNote: 'Active, with participating banks listed by WDVA.',
    url: 'https://dva.wa.gov/node/642',
    sourceUrls: ['https://dva.wa.gov/node/642', 'https://app.leg.wa.gov/RCW/default.aspx?cite=43.86A.060'], verifiedDate: '2026-11-17', confidence: 'verified'
  }], general: null, checked: 'verified', checkedDate: '2026-11-17', checkedNote: null
};

// Regional and national mission lenders with a published veteran product. states: [] = national.
// Only rows whose terms were read on the lender's own site render with terms.
export const MISSION_LENDERS = [
  { id: 'veteran-loan-fund', name: 'Veteran Loan Fund', states: [],
    terms: 'A national platform that matches veterans to one of 15 nonprofit community lenders, with free coaching. Startups and pre-revenue businesses are eligible.',
    ownCash: 'Requires that you have invested, or will invest, some of your own money.',
    note: 'The site states the loan range two different ways, so no amount is shown here. Ask for the range in your state.',
    url: 'https://www.veteranloanfund.com/for-veteran-business-owners/', sourceUrls: ['https://www.veteranloanfund.com/for-veteran-business-owners/'], verifiedDate: '2026-11-17', confidence: 'verified' },
  { id: 'rei-ok', name: 'REI Oklahoma Veteran Loan Program', states: ['OK'],
    terms: 'Up to $15,000 at a fixed 7.50%, with the origination fee waived.',
    ownCash: 'The program page says no equity is required and 100% financing is available.',
    url: 'https://www.reiok.org/business-lending/loans/veteran-loan-program/', sourceUrls: ['https://www.reiok.org/business-lending/loans/veteran-loan-program/'], verifiedDate: '2026-11-17', confidence: 'verified' },
  { id: 'cef-valor', name: 'Colorado Enterprise Fund VALOR loans', states: ['CO'],
    terms: 'Up to $500,000 with terms up to 10 years and a discounted interest rate for veterans and Gold Star families.',
    ownCash: null,
    url: 'https://coloradoenterprisefund.org/VALOR-Loan-Program', sourceUrls: ['https://coloradoenterprisefund.org/VALOR-Loan-Program'], verifiedDate: '2026-11-17', confidence: 'verified' }
];

// ─── Pass 2 (11/17/2026): the 20 jurisdictions the first pass did not reach ───────────────────────────────
// none-found = at least two differently worded searches plus the state economic development or finance
// authority's own pages, opened 11/17/2026. General programs were read on the agency page or Treasury's
// SSBCI Capital Program Summaries page.
const TREASURY_SSBCI = 'https://home.treasury.gov/policy-issues/small-business-programs/state-small-business-credit-initiative-ssbci/capital-program-summaries';
const none = (general, note) => ({ veteran: [], general, checked: 'none-found', checkedDate: '2026-11-17', checkedNote: note });
const gen = (name, agency, terms, url, extra) => Object.assign({ name, agency, terms, url, sourceUrls: [url], verifiedDate: '2026-11-17', confidence: 'verified' }, extra || {});

STATE_FUNDING.AL = none(gen('LendAL', 'Innovate Alabama', 'Supports bank loans up to $5 million through enrolled lenders with a loan guaranty, a collateral deposit, or a purchase of part of the loan.', 'https://innovatealabama.org/ssbci'), 'Searched for veteran loan and linked-deposit programs and 2025 to 2026 bills; LendAL pages do not mention veterans.');
STATE_FUNDING.AR = none(gen('Arkansas Small Business Revolving Loan Guaranty Program', 'Arkansas Development Finance Authority', 'Guarantees 10% to 50% of a bank loan, up to a $250,000 guarantee on a $500,000 loan, with a 2% fee at closing. Your lender applies.', 'https://adfa.arkansas.gov/programs/development-finance/arkansas-small-business-revolving-loan-guaranty-program/'), 'Searched veteran loan programs, statutes, and ADFA; the ADFA guaranty page does not mention veterans.');
STATE_FUNDING.DE = none(gen('Delaware Loan Participation Program (DELPP)', 'Delaware Division of Small Business', 'The state buys part of a bank’s loan, usually on 5 to 10 year loans. You apply through a participating lender.', 'https://business.delaware.gov/state-small-business-credit-initiative-ssbci'), 'Two veteran searches and the Division of Small Business SSBCI page; no state veteran program.');
STATE_FUNDING.HI = none(gen('HI-CAP Collateral and Loans', 'Hawaii Green Infrastructure Authority with HTDC', 'Cash collateral placed with participating lenders, or loans for up to 50% of total project costs on qualifying projects.', 'https://gems.hawaii.gov/hawaii-small-business-capital-program-hi-cap/'), 'Two veteran searches including the Office of Veterans’ Services and legislature bills.');
STATE_FUNDING.ID = none(gen('Collateral Support Program', 'Idaho Housing and Finance Association', 'Pledges a cash deposit at your bank to cover a collateral shortfall on a business loan. You apply through your bank.', 'https://idahohousing.com/collateral-support-program/'), 'Two veteran searches (Division of Veterans Services, Commerce, legislature).');
STATE_FUNDING.MS = none(gen('Small Business Loan Guaranty Program', 'Mississippi Development Authority', 'Guarantees to lenders on term loans and lines of credit, up to 80% of the loan per the U.S. Treasury summary.', 'https://mississippi.org/minority-small-business-loans/', { sourceUrls: ['https://mississippi.org/minority-small-business-loans/', TREASURY_SSBCI] }), 'Two veteran searches (MDA, Mississippi Code, state VA); the MDA loans page does not mention veterans.');
STATE_FUNDING.MT = none(gen('Montana SSBCI 2.0 Loan Participation Program', 'Montana Department of Commerce', 'The state buys up to 50% of a bank’s loan, up to $1 million per borrower, with its share priced at 0.50% to 3.00%. Veteran status is one way a business can self-certify for the program’s underserved-business terms.', 'https://commerce.mt.gov/_shared/business/MTSSBCI/docs/12.31.2025-MT-SSBCI-2.0-LPP-Policy.pdf'), 'Two veteran searches, Commerce’s Veteran Entrepreneurs page, and the SSBCI policy.');
STATE_FUNDING.NH = none(gen('Loan Participation and Capital Access programs', 'New Hampshire Business Finance Authority', 'The authority buys 10% to 25% of a bank loan at a reduced rate in the first two years, or backs a bank’s loss reserve under its Capital Access Program.', 'https://nhbfa.com/loans/cap/', { sourceUrls: ['https://nhbfa.com/loans/cap/', TREASURY_SSBCI] }), 'Two veteran searches (BFA, veterans division, 2025 to 2026 bills).');
STATE_FUNDING.SC = none(gen('SC SSBCI Loan Participation Program', 'Business Development Corporation of South Carolina for SC JEDA', 'Buys a share of a bank loan (usually 10% to 25%), with 5% minimum equity and up to 25-year amortization. The program says it puts special emphasis on underserved businesses, including veteran-owned.', 'https://www.businessdevelopment.org/ssbci'), 'Two veteran searches (SC DVA, Commerce, legislature).');
STATE_FUNDING.SD = none(gen('SD Works', 'South Dakota Governor’s Office of Economic Development', 'A 3% fixed-rate companion loan matched at least 1:1 by a lender, with 10% equity and a 1% origination fee.', 'https://sdgoed.com/wp-content/uploads/2023/05/2023-SDWORKS-2.0.pdf'), 'Two veteran searches (GOED, state DVA, statutes).');
STATE_FUNDING.UT = none(gen('Utah Small Business Credit Initiative, Loan Participation Program', 'Utah Governor’s Office of Economic Opportunity', 'The state buys part of a bank loan and prices its share at 0.5% to 3%.', 'https://business.utah.gov/usbci/'), 'Two veteran searches and the state veterans department’s business resources page.');
STATE_FUNDING.VT = none(gen('Small Business Loan Program', 'Vermont Economic Development Authority', 'Up to $1 million: up to 40% of a fixed-asset project, 50% for working capital, or 75% of loans under $100,000.', 'https://www.veda.org/financing-options/vermont-commercial-financing/'), 'Two veteran searches (VEDA, Office of Veterans Affairs, legislature).');
STATE_FUNDING.WV = none(gen('WVCAP (subordinated debt and collateral support)', 'West Virginia Jobs Investment Trust', 'Subordinated debt for up to 50% of the capital need (maximum $2 million), or collateral support of up to 20% of a loan.', 'https://wvjit.wv.gov/wvcap/', { sourceUrls: ['https://wvjit.wv.gov/wvcap/', TREASURY_SSBCI] }), 'Two veteran searches (Veterans Assistance, WV Code, EDA). See the grants section for the state agriculture pitch competition.');
STATE_FUNDING.WY = none(gen('Challenge Loan Program', 'Wyoming Business Council', 'A bridge loan for up to 35% of a project (maximum $1 million), or participation in a bank loan.', 'https://wyomingbusiness.org/business/financing/businesses-seeking-finances/'), 'Two veteran searches (Veterans Commission, statutes) and the Business Council financing page.');
STATE_FUNDING.DC = none(gen('DC BizCAP Loan Participation Program', 'DC Department of Insurance, Securities and Banking', 'Buys up to 50% of a lender’s financing, up to $1 million, through participating lenders.', 'https://disb.dc.gov/page/dc-bizcap-loan-participation-program-1'), 'Two veteran searches (DSLBD, Mayor’s Office of Veterans Affairs, Council) and the BizCAP pages.');
STATE_FUNDING.GU = none(gen('SSBCI Loan Guarantee Program', 'Guam Economic Development Authority', 'Guarantees up to 75% of a bank loan, up to a $1 million guarantee, with a 2% fee.', 'https://www.investguam.com/wp-content/uploads/2026/docs/SSBCI%202.0%20Fact%20Sheet%20%28revised%204.10.26%29.pdf'), 'Two veteran searches (GEDA, Veterans Affairs Office, legislature).');
STATE_FUNDING.VI = none(gen('SSBCI credit programs and Direct Development Loans', 'U.S. Virgin Islands Economic Development Authority', 'Collateral support or a loan guarantee of up to 80% through participating lenders, or a direct loan of $10,000 to $500,000 at Prime + 1.5% for up to 10 years.', 'https://usvieda.org/financing/'), 'Two veteran searches (Office of Veterans Affairs, legislature, VI Code).');
STATE_FUNDING.AS = none(gen('SSBCI 2.0', 'American Samoa Department of Commerce with Territorial Bank of American Samoa', 'Collateral support, loan guarantees, and loan participation. The page lists no terms; apply through the American Samoa SBDC and confirm the program is still open.', 'https://www.doc.as.gov/ssbci', { confidence: 'reported' }), 'Veteran searches of the development bank and veterans office.');
STATE_FUNDING.MP = none(gen('SSBCI collateral support, loan guarantee, and loan participation', 'Commonwealth Economic Development Authority', 'Collateral support up to 50% of a loan, a guarantee up to 80%, or participation up to 60%, per the U.S. Treasury summary.', 'https://home.treasury.gov/node/982581'), 'Veteran searches of the development authority and veterans office.');

STATE_FUNDING.PR = {
  veteran: [{
    id: 'pr-legado-de-honor', name: 'Legado de Honor',
    agency: 'Banco de Desarrollo Económico para Puerto Rico (BDE)',
    kind: 'loan',
    terms: 'A term loan up to $500,000 at Prime minus 0.50 (fixed at approval), or a one-year line of credit up to $50,000 at Prime. No equity contribution on loans up to $50,000; 10% of project cost above that. $50 application fee and a 1% commitment fee.',
    who: 'Honorably discharged or retired service members, members in TAP, retired Guard or reservists, spouses, and surviving spouses, with a DD-214 or other proof of service. Requires a credit score of at least 640 and attendance at a VBOC workshop.',
    status: 'open', statusNote: 'Announced November 9, 2026.', zeroCashMax: 50000,
    url: 'https://www.bde.pr.gov/BDEPROnline/Home/PrestamosATerminos',
    sourceUrls: ['https://www.bde.pr.gov/BDEPROnline/Home/PrestamosATerminos', 'https://www.elnuevodia.com/noticias/locales/notas/crean-programa-de-financiamiento-comercial-para-veteranos/'],
    verifiedDate: '2026-11-17', confidence: 'verified'
  }],
  general: gen('Impulso a Tu Negocio', 'Banco de Desarrollo Económico para Puerto Rico (BDE)', 'Loan participation or cash collateral for up to 50% of an eligible loan through a bank or cooperative.', 'https://www.bde.pr.gov/BDEPROnline/Home/ImpulsoATuNegocio'),
  checked: 'verified', checkedDate: '2026-11-17', checkedNote: null
};

// ─── Pass 3 (11/17/2026): programs confirmed from the agency page or the statute ─────────────────────────
const row = (o) => Object.assign({ verifiedDate: '2026-11-17', confidence: 'verified' }, o, { sourceUrls: o.sourceUrls || [o.url] });
const set = (code, rows, extra) => { STATE_FUNDING[code] = Object.assign({ veteran: rows.map(row), general: (STATE_FUNDING[code] || {}).general || null, checked: 'verified', checkedDate: '2026-11-17', checkedNote: null }, extra || {}); };

STATE_FUNDING.MD.veteran[0].statusNote = 'Runs in application rounds. The most recent round took applications from July 1 through August 14, 2026 and has closed. No next round is announced; the program page says to contact the program (410-767-6356).';
STATE_FUNDING.MD.veteran[0].status = 'closed';
STATE_FUNDING.MD.veteran[0].terms = '$1,000 to $100,000 with no interest, repaid over one to eight years. Collateral is required.';

set('MN', [{
  id: 'mn-reservist-veteran', name: 'Reservist and Veteran Business Loan Program',
  agency: 'Minnesota Department of Employment and Economic Development (DEED)', kind: 'loan',
  terms: 'A one-time, interest-free loan of $5,000 to $20,000. The term is 54 months, with no repayment for the first 18 months and equal monthly payments over the remaining 36.',
  who: 'For a startup loan: a business majority-owned by a veteran who was on active duty on or after September 11, 2001 and separated under honorable conditions after 181 consecutive days (or for disability).',
  status: 'open', statusNote: 'The fund holds $400,000 in total, and applications are accepted until all of it is committed. Ask DEED how much remains before you apply.',
  url: 'https://mn.gov/deed/business/financing-business/deed-programs/reservists/',
  sourceUrls: ['https://mn.gov/deed/business/financing-business/deed-programs/reservists/', 'https://mn.gov/deed/assets/reservist-fact-sheet_tcm1045-131666.pdf', 'https://www.revisor.mn.gov/statutes/cite/116J.996']
}]);

set('WA', [{
  id: 'wa-linked-deposit', name: 'Veteran Linked Deposit Program',
  agency: 'Washington State Treasurer', kind: 'linked-deposit',
  terms: 'A bank loan with an interest rate reduction of up to 2 percentage points, on loans up to $1 million.',
  who: 'Veteran-owned businesses with state certification from the Washington Department of Veterans Affairs. You apply at a participating bank and must meet its credit criteria. The Treasurer lists twelve participating lenders.',
  status: 'open', statusNote: null,
  url: 'https://tre.wa.gov/investments-and-public-deposits/public-deposits/linked-deposit-program',
  sourceUrls: ['https://tre.wa.gov/investments-and-public-deposits/public-deposits/linked-deposit-program', 'https://app.leg.wa.gov/RCW/default.aspx?cite=43.86A.060']
}]);

set('OR', [{
  id: 'or-edlf', name: 'Entrepreneurial Development Loan Fund',
  agency: 'Business Oregon', kind: 'loan',
  terms: 'Loans totaling up to $1 million, for up to 10 years. The statute asks for owner equity of 15% for working capital and equipment or 10% for real property.',
  who: 'One of four ways to be eligible is being a veteran with a VA total disability rating of at least 70% and a discharge under other than dishonorable conditions. The others are revenue under $1.5 million, fewer than 25 employees, or a certified severe disability.',
  status: 'unknown', statusNote: 'Eligibility is from the statute (ORS 285B.746 and 285B.749). Confirm with Business Oregon that the fund is taking applications.',
  url: 'https://www.oregon.gov/biz/programs/edlf/pages/default.aspx',
  sourceUrls: ['https://www.oregonlegislature.gov/bills_laws/ors/ors285B.html', 'https://www.oregon.gov/biz/programs/edlf/pages/default.aspx']
}]);

set('NY', [{
  id: 'ny-linked-deposit', name: 'Excelsior Linked Deposit Program (contract financing)',
  agency: 'Empire State Development', kind: 'linked-deposit',
  terms: 'A reduced-rate bank loan backed by a state deposit. Startups are not eligible.',
  who: 'Narrow: the law covers certified service-disabled veteran-owned businesses that need financing to carry out a procurement contract with a state or federal agency. It is not a general business loan for veterans.',
  status: 'open', statusNote: 'The Empire State Development page does not mention veterans; the eligibility is in State Finance Law section 213.',
  url: 'https://esd.ny.gov/linked-deposit-program',
  sourceUrls: ['https://www.nysenate.gov/legislation/laws/STF/213', 'https://esd.ny.gov/linked-deposit-program']
}]);

set('MO', [{
  id: 'mo-mobucks', name: 'MOBUCK$ linked deposit (small business)',
  agency: 'Missouri State Treasurer', kind: 'linked-deposit',
  terms: 'A bank loan at a rate about 2 to 3 points lower than usual, backed by a state deposit.',
  who: 'Any business owned by an honorably discharged veteran who is a Missouri resident, agrees to locate the business in Missouri for at least three years, and employs fewer than 100 people. State law tells lenders to give priority to veteran-owned small businesses.',
  status: 'closed', statusNote: 'The Treasurer’s lender portal says it is closed until further notice because of demand. It last opened November 3 to December 3, 2025. Ask your bank when it reopens.',
  url: 'https://treasurer.mo.gov/content/low-interest-loans/',
  sourceUrls: ['https://treasurer.mo.gov/content/low-interest-loans/', 'https://revisor.mo.gov/main/OneSection.aspx?section=30.750']
}]);

set('RI', [{
  id: 'ri-banklocal', name: 'BankLOCAL',
  agency: 'Rhode Island General Treasurer', kind: 'linked-deposit',
  terms: 'When a participating bank or credit union lends to a veteran-owned business, the state deposits $2 for every $1 lent, up to $250,000 per loan. The benefit goes to the lender, which is meant to make these loans easier to get; the state publishes no borrower rate.',
  who: 'Rhode Island small businesses with fewer than 100 employees that are veteran-owned (also first-time owners and women- and minority-owned). The lender chooses borrowers; the Treasurer has no role in approvals.',
  status: 'unknown', statusNote: 'The Treasurer’s page blocked our reader on 11/17/2026, so these terms are from an archived copy of that page dated November 10, 2025.',
  url: 'https://treasury.ri.gov/programs/banklocal', confidence: 'reported'
}]);

set('IA', [{
  id: 'ia-tsb-loans', name: 'Targeted Small Business loans',
  agency: 'Iowa Economic Development Authority', kind: 'loan',
  terms: 'Loans up to $50,000 to start or expand. Not for real estate or paying off debt. No interest rate is published.',
  who: 'A business at least 51% owned and actively managed by a service-disabled veteran (also women, minorities, and people with disabilities), owned by an Iowa resident, with average gross income under $4 million. Certification is not required.',
  status: 'unknown', statusNote: 'The state page blocked our reader on 11/17/2026, so these terms are from an archived copy dated September 6, 2025.',
  url: 'https://opportunityiowa.gov/business/small-business-entrepreneurs/small-business-resources/targeted-small-business-program/tsb-loans', confidence: 'reported'
}]);

set('IL', [{
  id: 'il-advantage', name: 'Advantage Illinois participation loans (veteran-owned)',
  agency: 'Illinois Department of Commerce and Economic Opportunity', kind: 'loan',
  terms: 'The state takes part in a bank loan. Program limits range from $10,000 to $2,000,000, and state law allows up to $2,000,000 or 50% of project costs for businesses in this category. No rate is published.',
  who: 'Businesses at least 51% owned and managed by veterans are a named category in state law, and veteran status counts in the program’s disadvantaged-owner definition. You apply through a participating lender, not the state.',
  status: 'open', statusNote: 'There is no separate veteran application. Ask a participating Advantage Illinois lender.',
  url: 'https://dceo.illinois.gov/smallbizassistance/advantageillinois.html',
  sourceUrls: ['https://dceo.illinois.gov/smallbizassistance/advantageillinois.html', 'https://www.ilga.gov/legislation/ilcs/documents/003007500K9-4.3.htm']
}]);

set('ME', [{
  id: 'me-fame-cli', name: 'Commercial Loan Insurance (100% for veterans)',
  agency: 'Finance Authority of Maine (FAME)', kind: 'guarantee',
  terms: 'FAME insures a bank’s loan to reduce the bank’s risk. The usual limit is 90% of the loan; for loans to veterans, up to 100% is available.',
  who: 'Veteran borrowers in Maine. Your lender applies to FAME, not you, so ask your bank to use it.',
  status: 'open', statusNote: null,
  url: 'https://www.famemaine.com/business-financing/for-lenders/commercial-loan-insurance/traditional-application/'
}]);

// Mission lenders: replace the first-pass rows with terms read on each lender's own site.
MISSION_LENDERS.length = 0;
MISSION_LENDERS.push(
  { id: 'veteran-loan-fund', name: 'Veteran Loan Fund', states: [],
    terms: 'A national matching network of 15 nonprofit community lenders, not a single lender. Network loans run from $5,000 to $2 million. Its free eight-week Accelerator offers a loan up to $350,000 plus a grant of $3,000 to $5,000. No rate is published.',
    ownCash: 'Requires that you have invested, or will invest, your own money. There is no minimum time in business.',
    url: 'https://www.veteranloanfund.com/for-veteran-business-owners/', sourceUrls: ['https://www.veteranloanfund.com/for-veteran-business-owners/'], verifiedDate: '2026-11-17', confidence: 'verified' },
  { id: 'rei-ok', name: 'REI Oklahoma Veteran Loan Program', states: ['OK'],
    terms: 'Loans up to $15,000 at a fixed 7.50%, with the origination fee waived.',
    ownCash: 'No equity required; a 100% financing option is listed.',
    url: 'https://www.reiok.org/business-lending/loans/veteran-loan-program/', sourceUrls: ['https://www.reiok.org/business-lending/loans/veteran-loan-program/'], verifiedDate: '2026-11-17', confidence: 'verified' },
  { id: 'cef-valor', name: 'Colorado Enterprise Fund VALOR loans', states: ['CO'],
    terms: 'Loans of $5,000 to $500,000 for up to 10 years, with a 2% interest rate discount off the standard rate, for veterans and Gold Star families.',
    ownCash: null,
    url: 'https://coloradoenterprisefund.org/VALOR-Loan-Program', sourceUrls: ['https://coloradoenterprisefund.org/VALOR-Loan-Program'], verifiedDate: '2026-11-17', confidence: 'verified' },
  { id: 'pursuit-vet', name: 'Pursuit veteran loan', states: ['NY', 'NJ', 'PA', 'CT', 'IL'],
    terms: 'Loans of $10,000 to $250,000 at a fixed 6.75% for six years, with 2.5% in closing fees that are financed into the loan. For veterans, active duty, and immediate family, where one owns at least 20% of the business.',
    ownCash: 'Automatic approval needs break-even or positive cash flow; other businesses may still apply.',
    url: 'https://pursuitlending.com/business-loans/products/veterans/', sourceUrls: ['https://pursuitlending.com/business-loans/products/veterans/'], verifiedDate: '2026-11-17', confidence: 'verified' },
  { id: 'liftfund-vet', name: 'LiftFund Veterans Loan', states: ['TX'], statesNote: 'LiftFund is based in Texas and lends in other states too; its veteran page does not list which. Ask whether it serves yours.', alsoAsk: true,
    terms: 'Loans up to $34,999 at a fixed 5% for honorably discharged veterans, veteran spouses, and active duty members. Other fees may apply.',
    ownCash: null,
    url: 'https://www.liftfund.com/veterans-loan', sourceUrls: ['https://www.liftfund.com/veterans-loan'], verifiedDate: '2026-11-17', confidence: 'verified' },
  { id: 'osdc-vetloan', name: 'Ohio Statewide Development Corporation VetLoan Advantage', states: ['OH'],
    terms: 'On its SBA 504 and other loans to businesses at least 50% veteran-owned, the application fee is waived and up to $3,000 of the appraisal cost is rebated.',
    ownCash: 'Follows the underlying loan (see SBA 504 above).',
    url: 'https://osdc.net/vetloan-advantage-program/', sourceUrls: ['https://osdc.net/vetloan-advantage-program/'], verifiedDate: '2026-11-17', confidence: 'verified' }
);

// ─── Pass 4 (11/17/2026): second look at the 26 states the first pass only skimmed ───────────────────────
// Method for every state: the MyArmyBenefits state fact sheet, a legislature or statute search, and the state
// economic development or finance authority's own page. General programs marked 'reported' could not be opened on
// the state site that day (404 or blocked); the name is from the U.S. Treasury SSBCI program list.
const genR = (name, agency, terms) => gen(name, agency, terms, TREASURY_SSBCI, { confidence: 'reported' });

set('VA', [{
  id: 'va-vsbfa-microloan', name: 'VSBFA Microloan (veteran rate)',
  agency: 'Virginia Small Business Financing Authority', kind: 'loan',
  terms: 'Up to $150,000. The current application lists a fixed 6% rate and a fixed 3% rate for veterans, for 5 years unsecured or 7 years secured, with a $150 fee.',
  who: 'A Virginia small business that is at least 51% veteran-owned and meets one size test (revenue of $10 million or less, net worth of $2 million or less, or fewer than 250 employees).',
  status: 'open', statusNote: 'The veteran rate is on the application form dated January 9, 2026, not on the program web page. Confirm the rate when you apply.',
  url: 'https://sbsd.virginia.gov/?p=10687',
  sourceUrls: ['https://sbsd.virginia.gov/wp-content/uploads/2026/VSBFA/APP-MICRO-FILLABLE-20260109.pdf', 'https://sbsd.virginia.gov/?p=10687']
}], { general: gen('VSBFA loan programs (Capital Connect loan participation, Economic Development Loan)', 'Virginia Small Business Financing Authority', 'State participation in bank loans and direct loans for Virginia small businesses.', 'https://sbsd.virginia.gov/?p=10687') });

set('OK', [{
  id: 'ok-vet-young-farmer', name: 'Veteran or Young Farmer Grant or Loan (farm businesses only)',
  agency: 'Oklahoma Department of Agriculture, Food and Forestry', kind: 'grant',
  terms: 'Grants up to $10,000 with a tiered match. Requests above $10,000 are treated as loans, and program loans carry 0% interest.',
  who: 'Veterans (or farmers 45 and under) starting or expanding a farm or ranch business, with a five-year business plan.',
  status: 'closed', statusNote: 'On hold. As of April 2, 2026 the department is accepting only viticulture applications.',
  url: 'https://ag.ok.gov/economic-development-and-agriculture-markets/'
}], { general: gen('Small Business Linked Deposit', 'Oklahoma State Treasurer', 'The state places deposits with lenders so they can lend to small businesses at up to 3 points below their standard rate. The page does not say whether it is taking new applications.', 'https://oklahoma.gov/treasurer/inside-the-office/linked-deposit-programs.html') });

set('NV', [{
  id: 'nv-rise', name: 'Nevada RISE (rural; priority to veteran-owned businesses)',
  agency: 'Rural Nevada Development Corporation with the Nevada SBDC', kind: 'loan',
  terms: 'A forgivable loan of up to $25,000 with no payments for the first year.',
  who: 'Rural Nevada startups, with priority to veteran-owned businesses. Nevada law (NRS 612.607) also directs state money to a nonprofit to make startup loans to veterans and senior citizens.',
  status: 'closed', statusNote: 'The application period is closed. Ask the Nevada SBDC when the next one opens.',
  url: 'https://nevadasbdc.org/nevada-rural-investment-and-support-for-entrepreneurs/',
  sourceUrls: ['https://nevadasbdc.org/nevada-rural-investment-and-support-for-entrepreneurs/', 'https://www.leg.state.nv.us/NRS/NRS-612.html']
}], { general: gen('SSBCI Collateral Support Program and microloans', 'Nevada Governor’s Office of Economic Development', 'Collateral support for bank loans. Requests under $250,000 are sent to the Nevada SBDC.', 'https://goed.nv.gov/programs-incentives/ssbci/') });

set('PA', [{
  id: 'pa-vet-ag-grant', name: 'Pennsylvania Veteran Grant Program (farm businesses only)',
  agency: 'Pennsylvania Department of Agriculture', kind: 'grant',
  terms: 'Mini-grants of up to $10,000 to veteran farmers, awarded through veteran organizations.',
  who: 'Pennsylvania veterans with a farm business.',
  status: 'closed', statusNote: 'Applications closed December 20, 2024 and no new window is posted.',
  url: 'https://www.pa.gov/services/pda/apply-for-the-pennsylvania-veteran-grant-program.html'
}], { general: gen('PIDA loans', 'Pennsylvania Industrial Development Authority (DCED)', 'Low-interest loans and lines of credit through certified economic development organizations.', 'https://dced.pa.gov/programs/pennsylvania-industrial-development-authority-pida/'),
     checkedNote: 'A former state loan program for certified diverse businesses, including veteran-owned ones, no longer has a page; we could not confirm it is open.' });

STATE_FUNDING.NC = none(gen('NC Loan Participation Program', 'NC Rural Center', 'Buys a subordinate share of a bank’s loan. You apply through a participating lender, not the Rural Center.', 'https://www.ncruralcenter.org/ssbci/loan-participation-program/'), 'State veterans department, the state benefits fact sheet, a legislature bill search, and the NC Rural Center.');
STATE_FUNDING.GA = none(gen('Georgia Loan Participation Program', 'Georgia Department of Community Affairs', 'Buys up to 25% of a bank’s loan. A companion program guarantees 50% of a loan.', 'https://dca.georgia.gov/financing-tools/small-business/state-small-business-credit-initiative-ssbci'), 'DCA program pages, the Department of Veterans Service, the state benefits fact sheet, and a 2025 to 2026 bill search.');
STATE_FUNDING.AZ = none(gen('Arizona Loan Guarantee Program', 'Arizona Commerce Authority', 'Guarantees up to 50% of loan principal through three partner community lenders.', 'https://www.azcommerce.com/ssbci/', { confidence: 'reported' }), 'Commerce Authority program page (archived copy from March 11, 2026), the state benefits fact sheet, and a statute and bill search.');
STATE_FUNDING.TN = none(gen('LendTN (Fund Tennessee)', 'Tennessee Department of Economic and Community Development', 'Loans through approved community lenders. The state page lists no amounts or rates.', 'https://www.tn.gov/ecd/small-business/ssbci.html'), 'TNECD program page, the state agriculture veterans page, the state benefits fact sheet, and a 2025 to 2026 bill search.');
STATE_FUNDING.MI = none(genR('Michigan Business Growth Fund', 'Michigan Strategic Fund / MEDC', 'Collateral support, loan participation, and loan guarantees. Your lender applies.'), 'MEDC and MVAA sources and the state benefits fact sheet. A 2023 microloan fund run by a nonprofit names veterans among the groups it serves; its current terms were not confirmed.');
STATE_FUNDING.KY = none(gen('KSBCI Collateral Support and Loan Participation', 'Kentucky Cabinet for Economic Development', 'Collateral support and loan participation through lenders.', 'https://newkentuckyhome.ky.gov/Entrepreneurship/KSBCI'), 'Two bills to create a veteran business loan program were not enacted: HB 505 (2025) died in committee and HB 286 (2026) has not moved since January 2026.');
STATE_FUNDING.LA = none(genR('Louisiana Small Business Loan Guaranty Program', 'Louisiana Economic Development', 'A state guarantee on bank loans to small businesses.'), 'Louisiana’s Veteran Initiative and Veterans First Business Initiative are certifications, not financing.');
STATE_FUNDING.CT = none(gen('Connecticut Small Business Boost Fund', 'Connecticut DECD', 'Loans of $5,000 to $500,000 at a fixed 4.5% for 60 or 72 months through community lenders. Since July 1, 2026 state law lets DECD give preference in its small business program to businesses majority-owned by disabled veterans (VA rating of 30% or more).', 'https://ctsmallbusinessboostfund.org/', { sourceUrls: ['https://ctsmallbusinessboostfund.org/', 'https://prdext3.cga.ct.gov/olr/Documents/year/AA/2025AA-0084_2025%20Acts%20Affecting%20Veterans%20and%20the%20Military.pdf'] }), 'The legislature’s 2025 summary of veterans acts, the state benefits fact sheet, and the Boost Fund site.');
STATE_FUNDING.NM = none(gen('Collateral Assistance Program 2.0', 'New Mexico Economic Development Department', 'Cash collateral for up to 50% of loan principal, requested through your lender. The program states a preference for veteran-owned businesses, among others.', 'https://www.edd.newmexico.gov/wp-content/uploads/2026/03/Final-CAP-2.0-One-page-revised-4-24-2024.pdf'), 'Department of Veterans Services, the state benefits fact sheet, and the Economic Development Department.');
STATE_FUNDING.NJ = none(genR('NJ Capital Access Fund', 'New Jersey Economic Development Authority', 'Working-capital loans for small businesses.'), 'NJEDA lists no veteran loan program. Bill S866 (2026), which would make NJEDA small business loans 0% for service-disabled veteran owners, has been introduced but is not law.');
STATE_FUNDING.TX = none(gen('Texas Small Business Credit Initiative Loan Guarantee Program', 'Texas Governor’s Economic Development and Tourism Office', 'Guarantees up to 80% on loans of $5,000 to $20 million through participating lenders. A Capital Access Program covers $5,000 to $5 million.', 'https://gov.texas.gov/business/page/tsbci'), 'The Veterans Land Board lends for land and homes only, and the Texas Veterans Commission entrepreneur program is advisory.');
STATE_FUNDING.CO = none(gen('Cash Collateral Support', 'CHFA for the Colorado Office of Economic Development', 'A cash deposit of up to 35% of the loan (maximum $1 million) to cover a collateral shortfall, with a 4% borrower fee.', 'https://oedit.colorado.gov/cash-collateral-support'), 'No state-run veteran loan. See the Colorado Enterprise Fund VALOR loan under mission lenders.');
STATE_FUNDING.CA = none(gen('Small Business Loan Guarantee Program', 'California IBank Small Business Finance Center', 'A state guarantee on loans to businesses with 1 to 750 employees, through participating lenders.', 'https://www.ibank.ca.gov/small-business/loan-guarantees/'), 'CalVet lends for homes, farms, and home improvement only. The State Treasurer’s veterans resource guide lists no business loan.');
STATE_FUNDING.OH = none(gen('Buckeye Business Advantage (linked deposit)', 'Ohio Treasurer', 'Reduced-rate bank loans for Ohio businesses with 150 or fewer employees.', 'https://www.tos.ohio.gov/newsroom/article/buckeye-business-advantage-program-to-launch-later-this-month'), 'The Treasurer’s linked-deposit programs have no veteran category. See Ohio Statewide Development Corporation under mission lenders.');
STATE_FUNDING.FL = none(genR('Florida Small Business Loan Program', 'FloridaCommerce', 'Loan guarantees, loan participation, and collateral support through lenders.'), 'Veterans Florida’s entrepreneurship program is training and mentoring, not financing.');
STATE_FUNDING.IN = none(gen('SSBCI Loan Fund Investment Program', 'Indiana Economic Development Corporation', 'The state buys part of loans made by community lenders and revolving loan funds.', 'https://iedc.in.gov/program/state-small-business-credit-initiative-(ssbci)/loan-fund-investment-program'), 'IEDC, the state veteran procurement program, the state benefits fact sheet, and a bill search.');
STATE_FUNDING.WI = none(gen('WHEDA business lending programs', 'Wisconsin Housing and Economic Development Authority', 'Capital access, subordinate loan participation, and collateral support. The page shows no terms.', 'https://www.wheda.com/business-lending'), 'The state veterans department’s personal loan program has been under a moratorium since December 1, 2011, and its entrepreneurship grant goes to nonprofits, not to veterans.');
STATE_FUNDING.ND = none(gen('Flex PACE interest buydown', 'Bank of North Dakota', 'Buys the interest rate down by up to 5 points (1% floor), up to $200,000 per project, with a community match.', 'https://bnd.nd.gov/business/flex-pace-program/'), 'No Bank of North Dakota business program is veteran-specific. The state Veterans Aid Loan is a personal loan of up to $5,000.');
STATE_FUNDING.AK = none(gen('AIDEA Loan Participation Program', 'Alaska Industrial Development and Export Authority', 'AIDEA buys part of a loan your bank originates.', 'https://www.aidea.org/Programs/Business-Loans/Loan-Participation-Program'), 'AIDEA and the state commercial fishing loan fund; neither has a veteran program.');
STATE_FUNDING.NE = none(gen('Nebraska Growth Loan Fund', 'Nebraska Department of Economic Development', 'Up to $5 million per loan with at least a 1:1 private match, packaged by Nebraska community lenders.', 'https://opportunity.nebraska.gov/programs/business/ssbci/'), 'Department of Economic Development, the state benefits fact sheet, and a bill search.');
STATE_FUNDING.KS = none(genR('GrowKS Loan Fund', 'Kansas Department of Commerce', 'State participation in bank loans to small businesses.'), 'Office of Veterans Services, the state benefits fact sheet, and a bill search.');
STATE_FUNDING.MA = none(gen('SSBCI Loans and Guarantees', 'MassDevelopment', 'Guarantees of up to 50% of a loan, and loans up to $2 million for working capital, matched with a private loan.', 'https://massdevelopment.com/assets/document/loans-and-guarantees/SSBCI-Loans-and-Guarantees-Brochure.pdf'), 'MassDevelopment counts veteran status in its underserved-business focus group but has no veteran product or pricing.');

// ─── Correction 11/18/2026: two rows that rested on archived copies were re-checked in a browser ─────────
// Rhode Island BankLOCAL and Iowa Targeted Small Business loans are no longer on their agencies' live sites
// (the old pages return "page not found" and the agencies' current program lists do not mention them).
// Neither agency has said the program ended, so the notes say only what we saw. Both rows are removed as programs.
STATE_FUNDING.RI = Object.assign(none(
  gen('SSBCI Loan Participation Program', 'Rhode Island Commerce Corporation', 'The state takes part in small-business loans made through four partner lenders.', TREASURY_SSBCI, { confidence: 'reported' }),
  'BankLOCAL, a General Treasurer program that rewarded banks for lending to veteran-owned businesses, is no longer listed on the Treasurer’s website. We could not confirm it is still operating, so it is not shown as a program. If you bank in Rhode Island, ask your lender whether it still takes part.'), { checkedDate: '2026-11-18' });
STATE_FUNDING.IA = Object.assign(none(
  gen('State Small Business Credit Initiative (SSBCI) programs', 'Iowa Economic Development Authority', 'State support for small-business loans made through lenders, including a loan participation program.', 'https://opportunityiowa.gov/business/small-business-entrepreneurs/small-business-resources/state-small-business-credit-initiative-ssbci', { confidence: 'reported' }),
  'Iowa’s Targeted Small Business loans (up to $50,000, open to service-disabled veteran owners) no longer have a page on the state’s website, and the program page no longer mentions loans. We could not confirm they are still offered, so they are not shown as a program. Ask the Iowa Economic Development Authority.'), { checkedDate: '2026-11-18' });
