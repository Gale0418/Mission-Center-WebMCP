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

Re-verification is required after this wave; this pass does **not** claim final acceptance.

## Pass 2 — persisted-state and deployment review

Verdict before fixes: **REJECT**

1. **MAJOR · persisted mission payload could hide oversized/unknown fields** — `validateMission` now allowlists mission/task/verification fields, enforces text/count/timestamp bounds, and rejects dependency cycles.
2. **MAJOR · restored proposal/audit privacy parity was incomplete** — persisted proposal reason/next-action values are re-screened, proposal/audit timestamps are validated, and proposal/audit shapes are allowlisted.
3. **MINOR · rejected read-tool attempts were not visible in audit** — failed read handlers now record bounded `tool_rejected` metadata before rethrowing.
4. **MINOR · live footer linked to Markdown not included in the Pages artifact** — footer links now target the public GitHub repository/submission document.
5. **MINOR · Pages permissions were wider than verification needs** — write permissions are scoped to the deploy job only.

Local re-verification after this wave: tests and submission verifier passed. This was not yet a final acceptance verdict.

## Pass 3 — replay integrity and live-path review

Verdict before fixes: **REJECT**

1. **MAJOR · stored proposal payload/key tampering** — proposal payload keys are type-specific allowlists, keys are recomputed from canonical proposal fields, and duplicate proposal IDs / duplicate pending keys fail closed.
2. **BLOCKER · root static deployment paths escaped the site** — `index.html` used `../assets/...` and `app.js` used `../data/...`; on a root Pages deployment these resolve outside the repository site. Paths are now `./assets/...` and `./data/...`, with regression coverage in both tests and the submission verifier.
3. **MAJOR · new repository has Pages disabled** — the first remote deploy job proved that the GitHub Actions token cannot create the Pages site for this repository. The workflow now treats Pages enablement as an explicit repository prerequisite and skips deployment when `repository.has_pages` is false instead of reporting a misleading deployment failure. After Pages is enabled in repository settings, the same workflow is ready to deploy the minimal `_site` artifact.

Local re-verification after this wave: **30/30 tests passed**, submission verifier passed, and the minimal static artifact build passed. Browser execution still requires a deployable host; local Chromium execution is blocked by this sandbox's administrator policy and is not claimed as passed.

Current review status: **NOT FINAL** until the hardened files are present on remote `main`, remote CI for that SHA succeeds, and the final remote delta is re-reviewed. GitHub Pages itself remains an external repository-setting prerequisite unless it is enabled and the live URL is verified.
