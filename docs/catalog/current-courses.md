# Published Catalog, checked September 26, 2026

`ui/lib/data/catalog.json` is the versioned source of current Course identities and facts. All public Catalog, detail, Specialization course choices and Study Plan course choices consume it through `ui/lib/data/index.ts`.

The [official current-course list](https://omscs.gatech.edu/current-courses) contained 77 ongoing courses when checked. Seminars are excluded because they are not graduation or foundational credit. Every linked course page was checked for overview and suggested preparation. Descriptions are short attributed excerpts, not the previous generated descriptions. Preparation summaries describe published recommendations as recommendations, not enforced registration requirements. Pages without verified preparation show “unverified.” Consult each official page for full readiness questions and detailed requirements.

Credit hours were checked against each course's entry in the 2026-2027 Georgia Tech Catalog, using [CS](https://catalog.gatech.edu/coursesaz/cs/), [CSE](https://catalog.gatech.edu/coursesaz/cse/), [ECE](https://catalog.gatech.edu/coursesaz/ece/), [INTA](https://catalog.gatech.edu/coursesaz/inta/), [ISYE](https://catalog.gatech.edu/coursesaz/isye/), [MGT](https://catalog.gatech.edu/coursesaz/mgt/) and [PUBP](https://catalog.gatech.edu/coursesaz/pubp/). Each listed course is three credit hours, including CS 8803 special-topic sections. Each Course carries its individual course source, credit source and check date.

Former codes come only from explicit “formerly” annotations in the current-course list. In particular, CS 8803 GA resolves to CS 6515 and CS 8803 O02 resolves to CS 6200. Distinct CS 8803 sections remain distinct Courses. Aliases resolve to canonical detail URLs, search finds aliases, and existing local plan placements resolve and deduplicate without discarding unknown historical IDs. Unknown historical courses are excluded from new choices; preserving Imported Reviews for them belongs to issue #13.

Current-list inclusion does not verify any future term. The old unsourced offering patterns were removed. Students can choose any current Course for a future term while seeing that availability is unverified. Confirmed schedule data and historical patterns belong to issue #18.

Legacy specialization annotations are kept for existing filters, with pool IDs canonicalized and absent current courses excluded from choices. They are not presented as newly verified degree rules by this change; sourced rule replacement belongs to issue #15. Catalog review counts initialize at zero without generated reviews. Real review loading, outage states and aggregate comparisons are handled by subsequent review tickets.

Refresh this snapshot only after reviewing the official list, all changed individual pages and credit entries. The source-check workflow ticket will automate proposals rather than publication.
