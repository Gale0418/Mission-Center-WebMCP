# WebMCP Challenge submission copy

## Project name

**Mission Center WebMCP — Human in Command**

## One-line pitch

A browser-native mission control where agents can inspect tasks, trace blockers, verify evidence, and propose next moves — while humans remain the only authority that can approve lifecycle changes.

## What it does

Mission Center turns agent interaction into a transparent command loop. Instead of asking an agent to infer a dashboard from pixels or DOM structure, the page exposes eight structured WebMCP tools for mission overview, task search, task inspection, dependency tracing, evidence inspection, bounded handoff, and proposal-only changes.

The key design choice is the absence of an agent approval tool. A transition proposal is only a proposal. The human sees its reason, expected task revision, and target state in the same page. Approval revalidates the task revision, requires dependencies to be complete, and requires current passing evidence before a Review task may become Done.

## Why WebMCP matters here

Without WebMCP, an agent must infer which visual card represents lifecycle truth and how a UI action maps to task semantics. With WebMCP, the app declares those semantics explicitly. The agent can ask for a Review task, inspect its verification evidence, and propose the legal next move using schemas the page owns.

This is not a generic MCP wrapper around an API. The tools share the same live in-page state, evidence model, proposal queue, human approval UI, and audit trail as the person viewing the mission control.

## Human-agent journey for judges

1. Open the live app in ChatGPT's in-app browser or WebMCP-enabled Chrome.
2. Ask: **“Find the task in Review, inspect whether its evidence is current, and propose the safest next lifecycle move.”**
3. The agent should discover `WMC-103`, inspect current passing evidence, and call `mission_propose_transition` with target `Done`.
4. Observe that the task remains in Review and a pending proposal appears.
5. Click **Approve** and then **Revalidate & approve**.
6. Mission Center checks dependencies, task revision, and completion evidence, then moves the task to Done while keeping the revalidated evidence current.
7. Reset the demo to repeat the journey.

If the browser does not expose WebMCP, **Run judge journey** executes the exact same tool descriptors/handlers locally so the product interaction remains inspectable. The page clearly labels this as fallback rather than native WebMCP.

## Prior work disclosure

This competition edition is derived from the existing MIT-licensed Codex Mission Center project. The frozen upstream baseline is documented in `UPSTREAM_BASELINE.md` at commit `1d032c4708eb198259a4ea625a7d731b5277e431`. Browser WebMCP support, agent tools, proposal workflow, judge UX, and this static deployment are challenge work.

## Technical shape

- static HTML/CSS/ES modules;
- zero backend and zero API keys;
- eight imperative WebMCP tools registered through `document.modelContext.registerTool`;
- browser-local validated state;
- proposal-only agent mutations;
- dependency + evidence + revision human gate;
- deterministic Node test and verification suite;
- GitHub Pages deployment from `main`.

## Repository

https://github.com/Gale0418/Mission-Center-WebMCP

## Live app

Deployed from `main` through the repository's verified GitHub Pages workflow:

https://gale0418.github.io/Mission-Center-WebMCP/

## Demo video

The Devpost submission includes the public demo video. [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md) keeps the reproducible recording path and judge prompt in the repository; the external video URL is managed in the Devpost submission rather than duplicated here.
