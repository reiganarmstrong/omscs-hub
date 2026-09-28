# OMSCS Hub Public Beta

OMSCS Hub is an unofficial planning and review site for Georgia Tech's OMSCS
program. Use it for guidance. It is not an official degree audit, registration
guarantee, or record of your grades.

## What the beta includes

- **Catalog.** Anyone can browse the 77 current OMSCS Courses without signing
  in. Former course codes (19 aliases) open their current Course. Historical
  courses that have real reviews keep a labeled review page and cannot be
  picked for future terms.
- **Course facts.** Credit hours, description, preparation guidance, and the
  official source link, each with a last-checked date. Unverified facts are
  labeled.
- **Reviews.** Full-text OMSCentral Imported Reviews with a link to each
  original review, plus Hub Reviews from verified Georgia Tech accounts shown
  under a stable pseudonym. Counts, averages, and distributions use only these
  real reviews.
- **Specializations.** All six current Specializations, including the current
  Artificial Intelligence name, with sourced requirements.
- **Study Plan.** Guests keep one plan in their browser. A verified Georgia
  Tech account keeps one private plan across devices. At sign-in you choose
  whether to merge, keep the account plan, or replace it with the local one.
  Planning covers a rolling six-year Spring/Summer/Fall window. Earlier terms
  can hold recorded Course Attempts.
- **Progress and Estimated GPA.** Planned and earned progress appear
  separately, following the current catalog rules: B or better fills
  Specialization slots, C or better can count toward degree credit or a free
  elective, and a repeated course counts once, using the latest attempt. The
  Estimated GPA averages every graded attempt you enter, repeats included.
- **Your data.** Signed-in students can export their plan and attempts and
  delete their account and private academic data.
- **Hub Reviews.** Verified authors can publish, edit, and delete one active
  review per Course.

## Current-catalog guidance

- Degree rules, Specialization requirements, and progress follow the current
  published Georgia Tech catalog and OMSCS Specialization pages, last checked
  2026-09-26. If an older catalog applies to you, your official requirements
  may differ. Confirm important decisions with the
  [degree requirements](https://omscs.gatech.edu/degree-requirements) and your
  Degree Works audit.
- An offering is **confirmed** only when an official dated term schedule lists
  it. The current evidence covers Fall 2026. A **typically offered** label
  comes from historical patterns and guarantees nothing. Other future picks are
  marked **unverified**.
- Scheduled GitHub Actions check the official current-course list,
  Specialization pages, and Registrar schedules. Changes arrive as draft pull
  requests for human review and are never published automatically.

## Known beta limits

- Sign-in requires a verified primary `@gatech.edu` email. There is no other
  login method or account recovery. Export your data if you may lose access to
  that address.
- Transfer credit, approved grade substitutions, older catalog-year rules, and
  seminar credit are not modeled. Your official GPA can differ from the
  Estimated GPA.
- Seat availability, enrollment, and graduation eligibility are not checked.
- If the review service is unavailable, pages keep Course facts and hide
  reviews, review statistics, and review writing until it recovers. No demo or
  estimated reviews are shown.
- Moderation is limited to a restricted operator hide action. There is no
  in-app report queue, and reports are not monitored.
- Imported Reviews are refreshed only when a release runs the OMSCentral
  import.

## Release verification

Every release runs `.github/workflows/release-beta.yml`. It runs the API,
UI, and browser journey checks, validates configuration, migrates and imports
D1 data, deploys, and then runs the deployed smoke suite on desktop and mobile
layouts. See [deployment.md](../deployment.md#10-post-deploy-checks).
