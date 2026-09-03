# Strict review log

This file records only reviews that were actually performed. Planned external review is not presented as completed evidence.

## Pass 1 — architecture and integrity review

Verdict before fixes: **REJECT**

Findings and fixes:

1. **MAJOR · stored-state drift** — persisted browser state was tied only to mission ID, so an older fixture could survive a challenge fixture update. **Fix:** runtime storage now carries `fixtureRevision` and fails closed when it does not match the checked-in baseline revision.
2. **MAJOR · stored proposal/audit validation** — persisted proposals and audit entries were insufficiently shape-checked. **Fix:** validate proposal payload/source status/reason/key plus allowlisted audit fields and actor/action bounds.
3. **MINOR · rejected tool audit** — a proposal tool that failed validation could lose its attempted-call audit event. **Fix:** rejected proposal calls persist a `tool_rejected` metadata event before rethrowing.
4. **MAJOR · deployment scope** — Pages initially uploaded repository root. **Fix:** `build:site` creates `_site` containing only `index.html`, `assets/`, and `data/`; Pages deploys only `_site`.
5. **MAJOR · mutable CI dependencies** — Actions used moving major tags. **Fix:** checkout/setup-node/configure-pages/upload-pages-artifact/deploy-pages are pinned to the exact commits resolved from their current major tags on 2026-09-03.
6. **MINOR · ineffective CSP directive** — `frame-ancestors` was present in a meta CSP where browsers ignore it. **Fix:** removed the ineffective directive rather than claiming protection it cannot provide on GitHub Pages.

Re-verification is required after this wave; this pass does **not** claim final acceptance.
