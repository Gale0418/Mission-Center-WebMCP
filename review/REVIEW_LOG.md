# Strict review log

This file records only reviews that were actually performed. Planned external review is not presented as completed evidence.

## Pass 1 — architecture and integrity review

Verdict before fixes: **REJECT**

Findings and fixes:

1. **MAJOR · stored-state drift** — persisted browser state was tied only to mission ID, so an older fixture could survive a challenge fixture update. **Fix:** runtime storage now carries `fixtureRevision` and fails closed when it does not match the checked-in baseline revision.
2. **MAJOR · stored proposal/audit validation** — persisted proposals and audit entries were insufficiently shape-checked. **Fix:** validate proposal payload/source status/reason/key plus allowlisted audit fields and actor/action bounds.
3. **MINOR · rejected tool audit** — a proposal tool that failed validation could lose its attempted-call audit event. **Fix:** rejected proposal calls persist a bounded `tool_rejected` metadata event before rethrowing.
4. **MAJOR · deployment scope** — Pages initially uploaded the repository root. **Fix:** `build:site` creates `_site` containing only `index.html`, `assets/`, and `data/`; Pages deploys only that artifact.
5. **MAJOR · mutable CI dependencies** — Actions used moving major tags. **Fix:** checkout/setup-node/configure-pages/upload-pages-artifact/deploy-pages are pinned to exact commit SHAs resolved from their current major tags on 2026-09-03.
6. **MINOR · ineffective CSP directive** — `frame-ancestors` was present in a meta CSP where browsers ignore it. **Fix:** removed the ineffective directive rather than claiming protection it cannot provide on GitHub Pages.

Re-verification was required after this wave; this pass did **not** claim final acceptance.

## Pass 2 — persisted-state and deployment review

Verdict before fixes: **REJECT**

1. **MAJOR · persisted mission payload could hide oversized/unknown fields** — `validateMission` now allowlists mission/task/verification fields, enforces text/count/timestamp bounds, and rejects dependency cycles.
2. **MAJOR · restored proposal/audit privacy parity was incomplete** — persisted proposal reason/next-action values are re-screened, proposal/audit timestamps are validated, and proposal/audit shapes are allowlisted.
3. **MINOR · rejected read-tool attempts were not visible in audit** — failed read handlers now record bounded `tool_rejected` metadata before rethrowing.
4. **MINOR · live footer linked to Markdown not included in the Pages artifact** — footer links now target the public GitHub repository/submission document.
5. **MINOR · Pages permissions were wider than verification needs** — write permissions are scoped to the deploy job only.

Local re-verification after this wave passed, but this was not yet a final acceptance verdict.

## Pass 3 — replay integrity and live-path review

Verdict before fixes: **REJECT**

1. **MAJOR · stored proposal payload/key tampering** — proposal payload keys are type-specific allowlists, keys are recomputed from canonical proposal fields, and duplicate proposal IDs / duplicate pending keys fail closed.
2. **BLOCKER · root static deployment paths escaped the site** — `index.html` used `../assets/...` and `app.js` used `../data/...`; on a root Pages deployment these resolve outside the repository site. Paths are now `./assets/...` and `./data/...`, with regression coverage in both tests and the submission verifier.
3. **MAJOR · new repository had Pages disabled** — the first remote deploy job proved that the GitHub Actions token could not create the Pages site. The workflow was changed to make Pages enablement an explicit repository prerequisite; Pages was then enabled manually and subsequent deploy jobs succeeded.

Re-verification after this wave reached **30/30 tests passed** plus the submission verifier and minimal static artifact build. The review intentionally remained open until the hardened remote build was deployed and replayed again.

## Pass 4 — final lifecycle and judge-path review

Verdict before fixes: **REJECT**

The final replay found two correctness issues that the earlier tests did not cover:

1. **MAJOR · Review task depended on unfinished demo work** — `WMC-103` was presented as the safe `Review → Done` judge path while its fixture also depended on `WMC-102`, which was still `In Progress`. **Fix:** remove the false fixture dependency and make the completion gate fail closed whenever any declared dependency is not `Done`. A regression test now forces an unfinished dependency and verifies that human approval is rejected.
2. **MAJOR · successful approval immediately made evidence stale** — `Review → Done` incremented the task revision but left verification bound to the previous revision. **Fix:** only after the completion gate succeeds, the human approval rebinds the already-revalidated evidence to the new lifecycle revision and records the revalidation time. A regression assertion verifies that evidence remains current after the approved transition.
3. **MINOR · stale challenge packaging** — the fixture revision was bumped, opaque upload-staging payload files were removed, and `CHALLENGE_SUBMISSION.md` was updated to describe the deployed Pages site and final human gate rather than a future deployment.

### Remote verification evidence

Implementation commit **`7dc823ffd30724ddc07cfcfda7dda668ab556c4c`** was pushed directly to `main` with no feature branch. GitHub Actions run **#18 (`33821005219`)** completed successfully for that exact SHA:

- JavaScript syntax: **PASS**
- Unit tests, including the two new lifecycle regressions: **PASS**
- Submission verifier: **PASS**
- Minimal Pages artifact build: **PASS**
- GitHub Pages deployment: **PASS**

The WebMCP adapter and visible demo control names were not changed by this final lifecycle patch. Native eight-tool registration had already been manually observed in WebMCP-enabled Chrome, and the automated suite continues to verify exactly eight narrow tools with no agent approval/rejection tool.

## Final verdict

**PASS** for the public challenge slice.

Known scope remains explicit rather than hidden: this is a static, browser-local judging edition, not the upstream Rust plugin; it does not write to a real repository or claim production authentication/authorization guarantees. WebMCP itself remains experimental. These limitations do not contradict the demonstrated contract: **agent proposes, human decides, Mission Center verifies.**
