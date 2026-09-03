# Mission Center WebMCP — Human in Command

> **Agent proposes. Human decides. Mission Center verifies.**

Mission Center WebMCP is the judge-facing competition edition of [Codex Mission Center](https://github.com/Gale0418/Codex-Mission-Center). It exposes the mission lifecycle to browser agents through eight structured WebMCP tools without giving the agent an invisible approval channel.

The upstream baseline is frozen at **`1d032c4708eb198259a4ea625a7d731b5277e431`** (Mission Center 0.5.1). See [`UPSTREAM_BASELINE.md`](UPSTREAM_BASELINE.md) for prior-work disclosure and the intentionally preserved product rules.

## Why this exists

Normal web agents often have to infer application semantics from pixels, labels, or DOM structure. Mission Center already had explicit task lifecycle, evidence, handoff, and human-approval rules. WebMCP turns those rules into a native browser tool surface:

| Tool | Capability | Can change lifecycle truth? |
| --- | --- | --- |
| `mission_get_overview` | Goal, progress, attention | No |
| `mission_list_tasks` | Structured task search | No |
| `mission_inspect_task` | Task state + legal transitions | No |
| `mission_trace_dependencies` | Bounded dependency graph | No |
| `mission_list_evidence` | Evidence freshness and refs | No |
| `mission_propose_transition` | Create a transition proposal | **No — proposal only** |
| `mission_propose_next_action` | Create a next-action proposal | **No — proposal only** |
| `mission_get_handoff` | Bounded handoff packet | No |

There is deliberately **no agent tool for approval**. Human approval happens in the visible page and rechecks task revision plus completion evidence before applying a state change.

## Judge journey

Open the live app in ChatGPT's in-app browser or WebMCP-enabled Chrome and ask:

> **Find the task in Review, inspect whether its evidence is current, and propose the safest next lifecycle move.**

Expected behavior:

1. the agent discovers `WMC-103`;
2. it sees current passing evidence;
3. it creates a `Review → Done` proposal;
4. `WMC-103` remains in Review;
5. a person reviews the proposal and clicks **Revalidate & approve**;
6. only then does Mission Center move the task to Done.

In an ordinary browser without `document.modelContext`, **Run judge journey** exercises the exact same descriptor handlers as a deterministic inspection fallback. The page clearly labels this as fallback, not native WebMCP.

## Run locally

No dependencies are required beyond a modern browser, Node 20+, and any static HTTP server.

```bash
python3 -m http.server 8080
# open http://127.0.0.1:8080/

npm test
npm run verify
```

Direct `file://` opening is not supported because the app fetches the checked-in mission fixture.

## Architecture

```text
Human UI ─────────────┐
                     ▼
               Browser state
                     ▲
WebMCP agent ─ tools ─┤
       read / inspect │
       propose only   │
                     ▼
             Pending proposal
                     │
             Human approval
                     │
      revision + evidence gate
                     ▼
               lifecycle state
```

The app is static, uses no application backend, and keeps challenge state in validated browser local storage. Reset returns to the checked-in synthetic fixture.

## Current official WebMCP shape

The challenge edition uses the imperative API documented by Chrome: `document.modelContext.registerTool({ name, description, inputSchema, annotations, execute })`. WebMCP is experimental and subject to change; this adapter is isolated from the product-domain functions in `assets/core.js`.

## Security and privacy

Read [`SECURITY.md`](SECURITY.md) and [`PRIVACY.md`](PRIVACY.md). The important boundary is simple: WebMCP can create proposals but cannot approve them, and free-text inputs are bounded and screened for common secret-assignment patterns.

## Challenge materials

- [`CHALLENGE_SUBMISSION.md`](CHALLENGE_SUBMISSION.md) — submission copy and judge instructions
- [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md) — <3 minute recording plan
- [`review/STRICT_REVIEW_PROMPT.md`](review/STRICT_REVIEW_PROMPT.md) — hostile reviewer prompt
- [`review/REVIEW_LOG.md`](review/REVIEW_LOG.md) — actual fix/review waves only

## Deployment

The included GitHub Pages workflow deploys the repository's static challenge surface from `main`. The expected public URL is:

**https://gale0418.github.io/Mission-Center-WebMCP/**

Do not treat that URL as verified merely because it is expected; submission readiness requires opening the deployed URL after the Pages workflow succeeds.

## License

MIT © 2026 Gale0418. The upstream and challenge edition share the same author and MIT license.
