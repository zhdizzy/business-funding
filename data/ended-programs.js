// Programs readers still find online that have ended, paused, or changed into something else.
// Naming a program as ended is a serious public claim. HARD RULE, enforced by the engine and by test/sim.mjs:
// a row renders in the "ended / paused / changed" list ONLY when all of these are present:
//   verdict   : 'ended' | 'paused' | 'changed'
//   proofQuote: the organization's or agency's own words, verbatim
//   proofUrl  : the page those words are on (the organization's own site, an official government page, or an
//               Internet Archive capture of the organization's own page when the live page has been removed)
//   proofDate : the date we read it (YYYY-MM-DD)
// proofVia: 'live' (read on the live page) | 'archive' (read in an Internet Archive capture; captureDate says when).
// `says` is the public sentence. It tracks the proof and adds nothing to it. `replacedBy` is optional.
//
// verdict 'no-cycle-found' = there is NO statement of closure, only no evidence of a current round. These rows
// render in a separate, softer list ("We could not find a current round") with `checked` saying what we looked at.
// They must never be worded as ended.
// kind: 'veteran' (a veteran or small-business funding program) | 'federal' (a government program that closed)
// All rows read 11/17/2026.

export const ENDED_STAMP = '2026-11-17';

export const ENDED_PROGRAMS = [
  {
    id: 'second-service', kind: 'veteran', verdict: 'ended',
    name: 'Second Service Foundation (formerly StreetShares Foundation): Military Entrepreneur Challenge and Veteran Small Business Award',
    proofQuote: 'Following ten years of extraordinary impact on the military and veterans entrepreneurship community, the Second Service Foundation has been voluntarily shut down in order to transition into a new, faith-based mission.',
    proofUrl: 'https://www.secondservicefoundation.org/', proofDate: '2026-11-17', proofVia: 'live',
    says: 'The Second Service Foundation says it has been voluntarily shut down. Its Military Entrepreneur Challenge and Veteran Small Business Award pages no longer exist.',
    replacedBy: { text: 'The foundation says its resources will move to an existing faith-based nonprofit that it has not yet named.' }
  },
  {
    id: 'fedex-grant-contest', kind: 'veteran', verdict: 'ended',
    name: 'FedEx Small Business Grant Contest',
    proofQuote: 'While the program is retired, you can still learn from their journeys.',
    proofUrl: 'https://www.fedex.com/en-us/small-business/grant-contest.html', proofDate: '2026-11-17', proofVia: 'live',
    says: 'FedEx says its Small Business Grant Contest is retired. Its page lists past recipients through 2024.',
    replacedBy: { text: 'A separate program, the Hiring Our Heroes Small Business Grant, is supported by the FedEx Founder’s Fund. The grant lists above show whether it is open today.', url: 'https://www.hiringourheroes.org/small-business-grant/' }
  },
  {
    id: 'nav-grant', kind: 'veteran', verdict: 'paused',
    name: 'Nav Small Business Grant',
    proofQuote: 'We’re pausing this program for now so we can incorporate feedback from our customers and grant applicants, and so we can develop even more ways to support small businesses.',
    proofUrl: 'https://web.archive.org/web/20250522091729/https://www.nav.com/business-grant-contest/', proofDate: '2026-11-17', proofVia: 'archive', captureDate: '2025-05-22',
    says: 'Nav said in 2025 that it was pausing this grant. The grant page has since been taken down, and we found no new round.'
  },
  {
    id: 'penfed-veip', kind: 'veteran', verdict: 'changed',
    name: 'PenFed Foundation Veteran Entrepreneur Investment Program (VEIP)',
    proofQuote: 'We do not take any equity in the companies accepted into the program.',
    proofUrl: 'https://penfedfoundation.org/our-programs/accelerator/', proofDate: '2026-11-17', proofVia: 'live',
    says: 'The PenFed Foundation’s current Veteran Entrepreneur Program is free training in three tracks (incubator, accelerator, bootcamp). Its pages no longer describe a fund that invests in veteran startups.',
    replacedBy: { text: 'Veteran Entrepreneur Program (free training and mentoring, no cash).', url: 'https://penfedfoundation.org/our-programs/vep/' }
  },
  {
    id: 'bunker-labs', kind: 'veteran', verdict: 'changed',
    name: 'Bunker Labs',
    proofQuote: 'In 2024, IVMF acquired Bunker Labs.',
    proofUrl: 'https://ivmf.syracuse.edu/about/bunker-labs', proofDate: '2026-11-17', proofVia: 'live',
    says: 'Bunker Labs is no longer a separate organization. Its programs now run through the IVMF at Syracuse University, and its old web address forwards there.',
    replacedBy: { text: 'IVMF entrepreneurship programs.', url: 'https://ivmf.syracuse.edu/programs/entrepreneurship/' }
  },
  {
    id: 'patriot-express', kind: 'federal', verdict: 'ended',
    name: 'SBA Patriot Express loans',
    proofQuote: 'As part of an overall effort to streamline and simplify its loan application process, the SBA also eliminated several 7(a) subprograms, including the Patriot Express program.',
    proofUrl: 'https://www.everycrsreport.com/reports/R42695.html', proofDate: '2026-11-17', proofVia: 'live',
    proofSource: 'Congressional Research Service report R42695, SBA Veterans Assistance Programs',
    says: 'Patriot Express was a pilot that ran from 2007 to 2013. SBA eliminated it when it streamlined 7(a) lending on January 1, 2014.',
    replacedBy: { text: 'The $0 upfront fee on SBA Express loans for veteran-owned businesses (see the funding paths above).' }
  },
  {
    id: 'veterans-advantage', kind: 'federal', verdict: 'changed',
    name: 'SBA "Veterans Advantage" half-price fee on regular 7(a) loans',
    proofQuote: 'For all SBA Express loans made to businesses owned and controlled by a veteran or spouse of a veteran, the Upfront Fee will be $0 in accordance with section 7(a)(31)(G) of the Small Business Act',
    proofUrl: 'https://legacy.sba.gov/sites/default/files/2026-09/Info%20Notice%20-%207%28a%29%20Fees%20FY%202027%20.pdf', proofDate: '2026-11-17', proofVia: 'live',
    proofSource: 'SBA Information Notice 5000-881797 (fiscal year 2027 fees). That sentence is the only veteran fee relief in the notice. The Congressional Research Service records that the 50% waiver on other 7(a) loans last applied in fiscal year 2018.',
    proofUrl2: 'https://www.everycrsreport.com/reports/R42695.html',
    says: 'The half-off guaranty fee for veterans on regular 7(a) loans last applied in fiscal year 2018. For fiscal year 2027 the only veteran fee break is the $0 upfront fee on SBA Express loans. Articles that still describe a broader veteran discount are out of date.'
  },
  {
    id: 'ppp', kind: 'federal', verdict: 'ended',
    name: 'Paycheck Protection Program (PPP)',
    proofQuote: 'The PPP ended on May 31, 2021. Existing borrowers may be eligible for PPP loan forgiveness.',
    proofUrl: 'https://www.sba.gov/loans/covid-era-programs/', proofDate: '2026-11-17', proofVia: 'live',
    says: 'PPP stopped making loans on May 31, 2021, and no new PPP loans exist. Forgiveness was for existing borrowers who spent at least 60% of the forgiven amount on payroll during an 8 to 24 week covered period.',
    detail: [
      'SBA’s rule: “Borrowers can apply for forgiveness any time up to five years from the date that SBA issued the SBA loan number.” Because the last loans were made in 2021, that five-year window appears to have passed for nearly every loan by mid-2026. At least one large lender’s PPP page now says the eligibility period for requesting forgiveness has ended. SBA’s own page had not been updated to say so when we read it.',
      'If you still have an unforgiven PPP loan, call your lender first. The balance is owed at 1% interest, and SBA says borrowers in default “will be referred to Treasury for offset or cross servicing.” In plain terms, the U.S. Treasury can collect the debt, including by keeping tax refunds and other federal payments.',
      'SBA says it may review a PPP loan at any time.'
    ]
  },
  {
    id: 'covid-eidl', kind: 'federal', verdict: 'ended',
    name: 'COVID-19 Economic Injury Disaster Loan (EIDL) and EIDL Advance',
    proofQuote: 'As of January 1, 2022, SBA stopped accepting applications for new COVID-19 EIDL loans or advances.',
    proofUrl: 'https://web.archive.org/web/20260702/https://www.sba.gov/funding-programs/loans/covid-19-relief-options/eidl', proofDate: '2026-11-17', proofVia: 'archive', captureDate: '2026-07-02',
    says: 'SBA stopped accepting COVID-19 EIDL loan and advance applications on January 1, 2022. SBA has since folded that page into a general COVID-era programs page.'
  },
  {
    id: 'rrf', kind: 'federal', verdict: 'ended',
    name: 'Restaurant Revitalization Fund',
    proofQuote: 'announces the closure of the Restaurant Revitalization Fund (RRF)',
    proofUrl: 'https://www.sba.gov/sba-newsroom/2021/07/02/sba-administrator-announces-closure-restaurant-revitalization-fund-program/', proofDate: '2026-11-17', proofVia: 'live',
    says: 'SBA announced the closure of the Restaurant Revitalization Fund on July 2, 2021.'
  },

  // ── No statement of closure; only no sign of a current round. Never worded as ended. ──
  {
    id: 'comcast-rise', kind: 'veteran', verdict: 'no-cycle-found',
    name: 'Comcast RISE',
    says: 'Comcast RISE last took applications in May 2025. Its website now forwards to a different Comcast page, and we found no 2026 round. Comcast has not said the program is over.',
    checked: 'The program’s own site and archived copies of it from February, June, and July 2026.'
  },
  {
    id: 'veterans-business-fund', kind: 'veteran', verdict: 'no-cycle-found',
    name: 'Veterans Business Fund',
    says: 'We found no sign this fund is operating. The web address that older articles link to now belongs to an unrelated site, so do not use it.',
    checked: 'The old web address, opened 11/17/2026.'
  },
  {
    id: 'streetshares-loans', kind: 'veteran', verdict: 'no-cycle-found',
    name: 'StreetShares veteran business loans',
    says: 'StreetShares was acquired by a banking software company in 2022, and its website is gone. We found no way for a veteran to apply to it for a loan today.',
    checked: 'The StreetShares web address (no longer resolves) and archived copies from 2025 and 2026.'
  },
  {
    id: 'hello-alice-vet', kind: 'veteran', verdict: 'no-cycle-found',
    name: 'Hello Alice veteran grant',
    says: 'Hello Alice runs grant rounds with corporate partners, and some have been open to veterans among other groups. We found no current grant from it that is only for veterans.',
    checked: 'Searches on 11/17/2026. Its grants page blocked our reader, so check it yourself.'
  }
];
