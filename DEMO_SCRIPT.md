# Demo script — target 1:45–2:20

> Do not claim the video exists until it has actually been recorded, uploaded, processed, and tested from a public/incognito session.

## 0:00–0:20 — The problem

“Mission Center is a task control system built around one rule: agents can help, but they must not silently turn their observations into lifecycle truth. For WebMCP, I turned that rule into a browser-native collaboration surface.”

Show the board, mission goal, and the **Human approval required** badge.

## 0:20–0:55 — Native tools

Open the WebMCP-capable agent and ask:

**Find the task in Review, inspect whether its evidence is current, and propose the safest next lifecycle move.**

As the agent works, call out that it discovers the page's structured tools rather than interpreting visual cards.

Expected tool path:

1. `mission_get_overview`
2. `mission_list_tasks` with `status = Review`
3. `mission_list_evidence` or `mission_inspect_task` for `WMC-103`
4. `mission_propose_transition` to `Done`

## 0:55–1:25 — Human command gate

Point out that `WMC-103` is **still in Review**. The agent created a proposal, not a state change.

Open the proposal and click Approve. In the confirmation dialog say:

“Approval is not a blind button. Mission Center rechecks that the task revision did not change and that Review-to-Done still has current passing evidence with no unresolved Critical or High findings.”

Click **Revalidate & approve** and show the task moving to Done.

## 1:25–1:45 — Auditability

Show the bounded audit trail and evidence inspector.

“The agent tool call, proposal, and human approval are visible as separate events. The audit log stores metadata, not prompts or reasoning.”

## 1:45–2:05 — Why WebMCP

“WebMCP makes the semantics explicit: find tasks, inspect evidence, trace dependencies, propose changes. Human control stays in the page. The result is less UI guessing without giving the agent an invisible approval channel.”

End on the mission control screen and repository URL.
