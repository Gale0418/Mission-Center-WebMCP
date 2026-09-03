# Security model

This challenge edition deliberately exposes a **small capability surface**.

## Trust boundary

WebMCP agents may read structured mission state and create proposals. They cannot approve, reject, or directly apply lifecycle mutations through WebMCP. Human approval is a browser UI action that revalidates the task revision and completion evidence at decision time.

## Stored data

The app is static and has no backend. Browser-local state is stored in `localStorage` and is schema-validated on load. Corrupt, oversized, incompatible, or foreign-mission state is discarded and reset to the checked-in fixture.

The audit trail stores allowlisted metadata only: timestamp, actor class, action, optional task/proposal/tool identifiers. The app does not intentionally store prompts, reasoning, authentication headers, credentials, environment variables, or arbitrary tool arguments.

## Fail-closed rules

- unknown task IDs are rejected;
- illegal lifecycle transitions are rejected;
- stale proposals are marked stale;
- `Review -> Done` requires current passing verification evidence;
- unresolved Critical/High findings block completion;
- proposal reason and next-action fields are bounded and reject common secret-assignment patterns;
- WebMCP registration failure does not create a fallback mutation channel.

## Deliberate limitation

This is a public judging slice, not the upstream Rust plugin. It demonstrates the human-agent interaction contract using browser-local challenge state. It does not write to a real repository or claim production authentication/authorization guarantees.
