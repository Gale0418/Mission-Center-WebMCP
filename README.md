# Mission Center WebMCP — Human in Command

> **Agent proposes. Human decides. Mission Center verifies.**

[Live demo](https://gale0418.github.io/Mission-Center-WebMCP/) · [Challenge notes](CHALLENGE_SUBMISSION.md) · [Upstream baseline](UPSTREAM_BASELINE.md)

Mission Center is my existing local, evidence-backed task workspace for Codex. This WebMCP Challenge edition adds a browser-native collaboration layer: eight structured tools let an agent understand the mission, inspect evidence, trace dependencies, and propose changes without giving it final authority.

The upstream baseline is frozen at **`1d032c4708eb198259a4ea625a7d731b5277e431`** (Mission Center 0.5.1). The challenge work is intentionally separated and documented in [`UPSTREAM_BASELINE.md`](UPSTREAM_BASELINE.md).

## What WebMCP changes

Without structured tools, a browser agent has to infer what an interface means from labels, DOM structure, or pixels. Mission Center already had explicit lifecycle truth, evidence gates, handoffs, and approval boundaries. WebMCP exposes that meaning directly to the browser agent.

| Tool | What it gives the agent | Changes task state? |
| --- | --- | --- |
| `mission_get_overview` | Goal, progress, and attention items | No |
| `mission_list_tasks` | Structured task search | No |
| `mission_inspect_task` | Task state and allowed transitions | No |
| `mission_trace_dependencies` | A bounded dependency graph | No |
| `mission_list_evidence` | Evidence status, freshness, and refs | No |
| `mission_propose_transition` | A proposed lifecycle transition | **No — proposal only** |
| `mission_propose_next_action` | A proposed next action | **No — proposal only** |
| `mission_get_handoff` | A bounded handoff packet | No |

There is deliberately **no WebMCP approval tool**. The agent can propose a change, but nothing happens until a person approves it in the visible UI. For `Review → Done`, Mission Center rechecks the task revision and completion evidence before applying the transition.

## 60-second judge path

Open the [live app](https://gale0418.github.io/Mission-Center-WebMCP/) in ChatGPT's in-app browser or WebMCP-enabled Chrome and ask:

> **Find the task in Review, inspect whether its evidence is current, and propose the safest next lifecycle move.**

Expected result:

1. The agent finds `WMC-103` in Review.
2. It inspects the current passing evidence.
3. It proposes `Review → Done`.
4. `WMC-103` stays in Review because the proposal is inert.
5. A person reviews the proposal and clicks **Revalidate & approve**.
6. Mission Center revalidates the task and only then moves it to Done.

In a browser without `document.modelContext`, **Run judge journey** uses the same deterministic descriptor handlers as a clearly labeled fallback. It is not presented as native WebMCP.

## Why keep the human gate?

WebMCP makes the agent better at understanding the application. It should not silently make the agent the authority over the application.

Mission Center keeps three things separate and visible:

```text
Agent action → proposal → human decision
```

That separation makes the workflow easy to inspect, replay, and audit without storing prompts or model reasoning.

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

The challenge app is static, uses **zero application backend**, and stores its demo state in validated browser local storage. **Reset demo state** returns to the checked-in deterministic challenge mission.

## Implementation

The WebMCP adapter uses Chrome's imperative shape:

```js
document.modelContext.registerTool({
  name,
  description,
  inputSchema,
  annotations,
  execute,
})
```

The adapter lives in `assets/webmcp.js`; product-domain logic remains in `assets/core.js`. This keeps the experimental browser API separate from Mission Center's lifecycle rules.

## Run locally

No application dependencies are required beyond a modern browser, Node 20+ for verification, and any static HTTP server.

```bash
python3 -m http.server 8080
# open http://127.0.0.1:8080/

npm test
npm run verify
```

Direct `file://` opening is not supported because the app fetches the checked-in mission fixture.

## Security and privacy

The important boundary is simple: WebMCP can create proposals but cannot approve them. Persisted state is validated, proposal approvals are revision-bound, free-text inputs are bounded, and common secret-assignment patterns are screened.

Read [`SECURITY.md`](SECURITY.md) and [`PRIVACY.md`](PRIVACY.md) for the complete challenge boundary.

## Challenge materials

- [`CHALLENGE_SUBMISSION.md`](CHALLENGE_SUBMISSION.md) — submission copy and judge instructions
- [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md) — recording plan
- [`UPSTREAM_BASELINE.md`](UPSTREAM_BASELINE.md) — prior-work disclosure
- [`review/STRICT_REVIEW_PROMPT.md`](review/STRICT_REVIEW_PROMPT.md) — hostile reviewer prompt
- [`review/REVIEW_LOG.md`](review/REVIEW_LOG.md) — actual review and fix waves

## Deployment

GitHub Actions verifies the challenge build and deploys the minimal static surface from `main` to GitHub Pages:

**https://gale0418.github.io/Mission-Center-WebMCP/**

## License

MIT © 2026 Gale0418. The upstream project and challenge edition share the same author and MIT license.
