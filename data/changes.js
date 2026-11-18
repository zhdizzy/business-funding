// "What changed" strip, free help, and the benefits-and-loans facts. All read from primary sources on 11/17/2026
// unless a row says otherwise.

export const CHANGES_STAMP = '2026-11-17';

export const CHANGES = [
  { date: '2026-11-11', title: 'Veterans buying a business can cover the whole 10% with outside sources',
    text: 'Through September 30, 2027, when veterans own at least 50% of the business after closing, a seller note on full standby, other standby debt, or a minority investor can supply all of the required 10% down payment (SBA calls it equity) on a 7(a) loan. The 10% is not reduced. It applies to loans SBA approves and numbers in that window.',
    source: 'SBA Procedural Notice 5000-883564', url: 'https://legacy.sba.gov/sites/default/files/2026-11/Procedural%20Notice%20-%205000-883564%20Equity%20Injection%20Flexibility%20for%20Veteran%20Business%20Acquisitions.pdf', endsOn: '2027-09-30' },
  { date: '2026-10-01', title: 'A new SBA rulebook took effect',
    text: 'SOP 50 10 8.1, SBA\u2019s rulebook for lenders, governs every 7(a) and 504 loan that SBA approves and numbers on or after October 1, 2026. Startups still need 10% equity on a 7(a) loan.',
    source: 'SBA Information Notice 5000-880695', url: 'https://legacy.sba.gov/sites/default/files/2026-08/SBA%20Information%20Notice%205000-880695%20-%20Issuance%20of%20SOP%2050%2010%208.1.pdf' },
  { date: '2026-10-01', title: '$0 SBA fee for rural, manufacturing, and food-supply businesses',
    text: 'For fiscal year 2027 the upfront guaranty fee is 0% on 7(a) loans of $700,000 or less to manufacturers (NAICS 31 to 33), listed food supply chain businesses, and businesses in a rural area. Separate from the veteran SBA Express waiver.',
    source: 'SBA Information Notice 5000-881797', url: 'https://www.sba.gov/document/information-notice-5000-881797-fy-2027-7a-program-fees', endsOn: '2027-09-30' },
  { date: '2026-07-04', title: '7(a) and 504 limits no longer offset each other',
    text: 'A 7(a) balance no longer reduces how much 504 financing a business can get, so up to $5 million in each is possible when the 7(a) loan is approved first.',
    source: 'SBA Policy Notice 5000-879058', url: 'https://legacy.sba.gov/sites/default/files/2026-05/Policy%20Notice%205000-879058%20Coordination%20of%207%28a%29%20and%20504%20for%20Maximum%20Loan%20Limits%20_Final_5-18-26.pdf' },
  { date: '2026-03-01', title: 'The SBA credit-score screen ended',
    text: 'SBA stopped using the SBSS score, a business credit score it used as a screen (the minimum had been 165), on 7(a) loans of $350,000 or less. Lenders now do their own credit analysis and look for debt coverage of at least 1.10 (the business has $1.10 available for every $1.00 of loan payments), which a new business can show with 12-month projections.',
    source: 'SBA Procedural Notice 5000-876777', url: 'https://legacy.sba.gov/sites/default/files/2026-02/Procedural%20Notice%20-%20Sunset%20of%20SBSS%20Score%20-%20Supplemental%20Guidance%20Corrected%202.24.pdf' },
  { date: '2026-03-01', title: 'Every owner must be a U.S. citizen or national',
    text: 'All direct and indirect owners and guarantors must be U.S. citizens or U.S. nationals living in the United States. A business with a green-card-holding owner is no longer eligible for SBA loans.',
    source: 'SOP 50 10 8.1, Section A, Chapter 1', url: 'https://legacy.sba.gov/document/sop-50-10-lender-development-company-loan-programs' }
];

// Introduced, NOT law. Rendered under a "proposed, not law" heading. Status was read from bill text; later action unconfirmed.
export const PENDING_BILLS = [
  { id: 's3171', name: 'S. 3171, Veteran Entrepreneurship Empowerment Act', introduced: '2025-11-10', enacted: false,
    text: 'Would bar the 7(a) guaranty fee for veterans and spouses where the guaranteed share is $1 million or less, cut the equity minimum for startups and acquisitions by at least 5 points, and set the 504 contribution at 5%.',
    url: 'https://www.govinfo.gov/content/pkg/BILLS-119s3171is/html/BILLS-119s3171is.htm' },
  { id: 'hr10016', name: 'H.R. 10016, Veterans Entrepreneurship Act of 2026', introduced: '2026-08-03', enacted: false,
    text: 'Would create a three-year SBA pilot giving up to 250 veterans a grant to start or buy a business, sized to their remaining GI Bill entitlement.',
    url: 'https://www.govinfo.gov/content/pkg/BILLS-119hr10016ih/html/BILLS-119hr10016ih.htm' }
];

export const FREE_HELP = [
  { id: 'vboc', name: 'Veterans Business Outreach Center (VBOC)', what: 'Free counseling, business plan help, and loan-readiness review for veterans, funded by SBA: 31 organizations operating 51 locations. Start here before you talk to a lender.', url: 'https://www.sba.gov/local-assistance/resource-partners/veterans-business-outreach-center-vboc-program' },
  { id: 'b2b', name: 'Boots to Business and Boots to Business Reboot', what: 'A free two-day SBA course on starting a business. Boots to Business is taught on installations through the Transition Assistance Program (TAP); Reboot is the same course off base for veterans who already separated. Spouses can attend.', url: 'https://www.sba.gov/sba-learning-platform/boots-business', url2: 'https://bootstobusiness.sba.gov/s/reboot-course-information', url2Label: 'Reboot course information' },
  { id: 'sbdc', name: 'Small Business Development Center (SBDC)', what: 'Free one-on-one advising and help building the financial projections a lender asks for. More than 900 locations.', url: 'https://www.sba.gov/local-assistance/resource-partners/small-business-development-centers-sbdc' },
  { id: 'score', name: 'SCORE', what: 'Free mentoring from volunteer business owners.', url: 'https://www.score.org/' },
  { id: 'apex', name: 'APEX Accelerator', what: 'Free help with SAM.gov registration and selling to the government, if contracts are part of your plan.', url: 'https://www.apexaccelerators.us/' },
  { id: 'lender-match', name: 'SBA Lender Match', what: 'You answer a few questions and SBA sends a list of interested lenders within two business days. It is not a loan application and a match is not guaranteed.', url: 'https://www.sba.gov/funding-programs/loans/lender-match-connects-you-lenders' }
];

export const BENEFIT_FACTS = [
  { id: '5301', title: 'Your VA compensation cannot be pledged or seized for a business debt',
    text: 'Federal law says VA benefits are not assignable, are exempt from the claims of creditors, and are not subject to attachment, levy, or seizure. An agreement that gives a lender the right to receive your benefit is prohibited. You can still choose to make loan payments from it yourself.',
    cite: '38 U.S.C. 5301', url: 'https://www.law.cornell.edu/uscode/text/38/5301', verifiedDate: '2026-11-17' },
  { id: 'outside-income', title: 'It is income from outside the business',
    text: 'SBA counts a borrowed down payment as equity only when it is repaid from a source other than the business. Compensation, retirement pay, a job, or a spouse’s income are all outside sources. Whether a lender accepts yours is the lender’s decision.',
    cite: 'SOP 50 10 8.1', url: 'https://legacy.sba.gov/document/sop-50-10-lender-development-company-loan-programs', verifiedDate: '2026-11-17' },
  { id: 'vre', title: 'VR&E can buy startup equipment for some veterans',
    text: 'On the Chapter 31 self-employment track, VA can pay for inventory, essential equipment, and business license fees for veterans it approves. It is not a loan and it is not open to everyone.',
    cite: '38 CFR 21.214(e), 21.257', url: '/vre-self-employment-prep/', internal: true, verifiedDate: '2026-11-17' }
];

export const ROBS = {
  title: 'Using a 401(k) or TSP balance (a "ROBS")',
  text: 'A Rollover as Business Startup moves retirement money into a new company’s retirement plan, which then buys stock in the company. The IRS does not treat it as abusive on its face, but in its own review it found that most ROBS businesses either failed or were on the road to failure, often leaving the owner with no business and no retirement savings. It requires a C corporation, and SBA lenders ask for the plan documents and an IRS determination letter. No government source addresses moving a TSP balance into a ROBS plan by name; TSP rules allow a rollover to an eligible employer plan only if that plan accepts it.',
  action: 'Talk to a CPA who does not sell ROBS plans before you talk to a promoter.',
  sourceUrls: ['https://www.irs.gov/retirement-plans/rollovers-as-business-start-ups-compliance-project', 'https://www.law.cornell.edu/cfr/text/5/1650.25'],
  verifiedDate: '2026-11-17'
};
