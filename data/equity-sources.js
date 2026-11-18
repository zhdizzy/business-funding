// What SBA accepts as the equity injection ("down payment") on a 7(a) loan, per SOP 50 10 8.1 (effective 10/1/2026).
// Read from the SOP text on 11/17/2026. Lenders can always require more than SBA does; every line in the UI says so.

export const EQUITY_STAMP = '2026-11-17';
export const SOP_URL = 'https://legacy.sba.gov/document/sop-50-10-lender-development-company-loan-programs';
export const VET_ACQ_NOTICE_URL = 'https://legacy.sba.gov/sites/default/files/2026-11/Procedural%20Notice%20-%205000-883564%20Equity%20Injection%20Flexibility%20for%20Veteran%20Business%20Acquisitions.pdf';
export const VET_ACQ_RELEASE_URL = 'https://www.sba.gov/sba-newsroom/2026/11/09/sba-establishes-new-7a-equity-flexibility-veterans-small-business-acquisitions/';

export const EQUITY_RULES = {
  startupPct: 0.10,            // startup = in operation one year or less
  startupDefinition: 'A startup is a business that has been operating for one year or less.',
  acquisitionPct: 0.10,
  expressNote: 'SBA Express has no SBA-set minimum; the lender decides.',
  // Veteran acquisition flexibility: Procedural Notice 5000-883564
  vetAcq: {
    validFrom: '2026-11-11', validTo: '2027-09-30', minVetOwnership: 0.50,
    text: 'For 7(a) loans to buy a business, where veterans own at least 50% after closing, the sources that are normally limited to half of the 10% (a seller note on full standby, other standby debt, a minority investor) may supply all of it. The 10% itself is not reduced. Applies to loans that SBA approves and numbers from 11/11/2026 through 9/30/2027, so what counts is the approval date, not the day you apply.',
    sourceUrls: [VET_ACQ_NOTICE_URL, VET_ACQ_RELEASE_URL], verifiedDate: '2026-11-17', confidence: 'verified'
  },
  lenderCaveat: 'Allowed by SBA. Your lender may require more.'
};

// modes: which tool modes the source applies to. ownCash: true if it is the veteran's own money.
// limitedInAcq: counts toward the "no more than half" group when buying a business (lifted for veterans, see vetAcq).
export const EQUITY_SOURCES = [
  { id: 'cash', label: 'Your own cash', ownCash: true, modes: ['scratch', 'buy'], limitedInAcq: false,
    rule: 'Cash that is not borrowed counts in full.',
    proof: 'Bank statements showing the funds and the deposit into the business.' },
  { id: 'gift', label: 'A gift from family or anyone else', ownCash: false, modes: ['scratch', 'buy'], limitedInAcq: false, input: 'gift',
    rule: 'Gifted cash counts the same as your own cash.',
    proof: 'A gift letter alone is not enough. The lender needs the check or wire record, 30 days of statements from the giver’s account, and proof of the deposit.' },
  { id: 'grant', label: 'A grant with no repayment or clawback', ownCash: false, modes: ['scratch', 'buy'], limitedInAcq: false,
    rule: 'Grant money counts if nothing has to be repaid and it cannot be taken back.',
    proof: 'The award letter and proof of deposit.' },
  { id: 'personal-loan', label: 'A personal loan repaid from income outside the business', ownCash: false, modes: ['scratch', 'buy'], limitedInAcq: false, input: 'outsideIncome',
    rule: 'Borrowed cash counts if you can show it will be repaid from a source other than the business’s cash flow. A salary the business pays you does not qualify. A home equity line is treated the same way.',
    proof: 'The loan terms and proof of the outside income that covers the payment (a job, a spouse’s income, retirement pay, VA compensation).' },
  { id: 'assets', label: 'Equipment or other assets you already own', ownCash: false, modes: ['scratch'], limitedInAcq: false, // SOP Appendix 15 does not list non-cash assets for a purchase
    rule: 'Non-cash assets put into the business count at their value.',
    proof: 'An independent appraisal if you claim more than net book value.' },
  { id: 'standby', label: 'A loan on full standby', ownCash: false, modes: ['scratch', 'buy'], limitedInAcq: true,
    rule: 'Debt counts as equity if the lender agrees to take no payments of principal or interest for the whole term of the SBA loan. Interest can accrue.',
    proof: 'A signed standby agreement (SBA Form 155 or equivalent).',
    startupNote: 'The SOP’s section on startups sets no cap on how much of the 10% standby debt can cover. That is our reading of the text, and a lender can be stricter.' },
  { id: 'seller-note', label: 'A seller note on full standby', ownCash: false, modes: ['buy'], limitedInAcq: true, input: 'sellerNote',
    rule: 'When you buy a business, the seller can finance part of the price. It counts as equity if it is subordinated and on full standby for the term of the SBA loan.',
    proof: 'The note and a signed standby agreement.' },
  { id: 'minority', label: 'A minority investor', ownCash: false, modes: ['buy'], limitedInAcq: true,
    rule: 'An investor who takes under 20% and has no control can supply equity.',
    proof: 'The investment agreement showing no repayment terms.' }
];

export const EQUITY_NOT_COUNTED = 'Education, advisory, and agent fees do not count toward equity.';

// Plain-English explainer for a seller note, shown in Buying a business mode. The rule sentences track SOP 50 10 8.1
// (Appendix 15 and the equity injection section), read 11/17/2026. The "how you get one" steps are practical guidance,
// not SBA rules, and are labeled that way in the UI.
export const SELLER_NOTE = {
  title: 'What a seller note is, and how you get one',
  what: [
    'A seller note is the owner selling you the business agreeing to be paid part of the price later. You sign a promissory note to the seller for that part, and the SBA loan pays the seller the rest at closing.',
    'It is a debt. You still owe the seller that money, usually with interest. What it changes is who has to come up with cash on closing day: for the part the seller carries, nobody does.'
  ],
  standby: [
    'For SBA to count a seller note as your equity, it has to be on full standby. SBA’s words: “no payments of principal or interest for the term of the 7(a) loan.”',
    'Interest can keep adding up during that time, and the note is paid off after the SBA loan is paid in full.',
    'The note has to sit behind the bank: the seller subordinates to the lender and cannot take action against you or the business’s collateral without the lender’s consent.',
    'An SBA loan to buy a business runs up to 10 years (longer when real estate is part of the purchase), so that is how long the seller may wait. SBA allows a seller note to be refinanced after it has been in place and current for 36 months, which can pay the seller sooner.'
  ],
  // Practical steps (ours, not SBA's).
  steps: [
    ['Ask for it in your offer.', 'A seller note is a term of the deal, like the price. Put it in your letter of intent: the amount, the interest rate, and that it will be on full standby for the life of the SBA loan.'],
    ['Tell the seller what they get.', 'They receive the rest of the price in cash at closing from the SBA loan. The note is the last slice, it earns interest while they wait, and a buyer with SBA financing lined up is a buyer who can close.'],
    ['Expect to negotiate.', 'Waiting years for the last slice is a real ask. A seller may want a higher interest rate on the note or a higher price in return, and some will say no. The veteran rule took effect November 11, 2026, so a seller or broker may not have heard of it; bring the SBA notice.'],
    ['Get it in the purchase agreement.', 'The note and its terms go into the signed purchase agreement. Use an attorney who has closed SBA acquisitions.'],
    ['The lender handles the standby paperwork.', 'Your SBA lender has the seller sign a standby agreement (SBA Form 155 or the lender’s own version) with a copy of the note attached. The lender also checks that the total debt, including the note, fits the business valuation and that the business’s cash flow covers it.']
  ],
  watch: [
    'The seller note and the SBA loan together cannot exceed what the business is valued at.',
    'A seller who carries a note has a stake in the business doing well after the sale. If a seller will not carry any of the price, ask why.',
    'Some sellers prefer to take part of the price over time for tax reasons. That is a question for the seller’s accountant, not something to promise them.'
  ],
  help: 'A Veterans Business Outreach Center will review a letter of intent with you for free before you send it.',
  sourceLabel: 'Rules: SOP 50 10 8.1 (equity injection and Appendix 15) and SBA Procedural Notice 5000-883564. The steps are practical guidance, not SBA rules.',
  sourceUrls: [SOP_URL, VET_ACQ_NOTICE_URL],
  verifiedDate: '2026-11-17'
};

// Short explainer for "a loan on full standby" when starting a business (no seller involved). Rule sentences track
// SOP 50 10 8.1's equity injection section, read 11/17/2026.
export const STANDBY_NOTE = {
  title: 'What “a loan on full standby” means',
  what: [
    'Someone lends you money for the business (a relative, a friend, a partner) and agrees in writing to take no payments at all until your SBA loan is paid off. Interest can build up while they wait.',
    'Because that loan does not compete with the SBA loan for the business’s cash, SBA counts it as part of your down payment. It is still a debt: you repay it after the SBA loan.'
  ],
  compare: [
    ['A gift', 'is never repaid. It needs proof of where the money came from.'],
    ['A loan on full standby', 'is repaid, but only after the SBA loan. It needs a signed standby agreement (SBA Form 155 or your lender’s version) with the note attached.'],
    ['A personal loan', 'has payments now, so SBA counts it only if you can show those payments come from income outside the business.']
  ],
  how: 'Ask your lender for its standby agreement form before you ask anyone for money, so the person lending knows exactly what they are agreeing to. They also give up the right to collect from the business without the bank’s consent.',
  sourceLabel: 'Rule: SOP 50 10 8.1, equity injection.',
  sourceUrls: [SOP_URL],
  verifiedDate: '2026-11-17'
};
