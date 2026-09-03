# Upstream baseline

This competition repository is a judge-facing WebMCP adaptation of **Codex Mission Center**.

- Upstream repository: `Gale0418/Codex-Mission-Center`
- Baseline branch: `main`
- Baseline commit: `1d032c4708eb198259a4ea625a7d731b5277e431`
- Baseline commit date: 2026-09-02
- Upstream stable product version: `0.5.1`
- License: MIT

## What was copied first

The challenge build starts from Mission Center's existing product contract rather than inventing a new task system. The copied baseline in `upstream-baseline/` preserves the upstream product purpose and license. The challenge UI then reimplements the judge-facing surface as a small static web app so judges are not asked to build the Rust plugin, install Codex integration, or inspect historical maintenance artifacts.

The following upstream invariants are intentionally preserved:

1. one canonical task lifecycle model;
2. `Review -> Done` requires current passing evidence;
3. stale state must be disclosed rather than presented as fresh;
4. runtime/agent observations never silently become lifecycle truth;
5. consequential agent actions are proposals until a human approves them;
6. handoffs are bounded and evidence remains traceable.

## Competition-only additions

Everything below is new for the WebMCP challenge edition:

- browser-native WebMCP tool registration;
- structured task discovery and inspection for agents;
- dependency tracing and evidence inspection tools;
- proposal-only mutation tools;
- human approval/rejection UI with revision revalidation;
- browser-local audit trail;
- judge journey and deterministic fallback for non-WebMCP browsers;
- minimal GitHub Pages deployment.

## What was intentionally not copied

The judge-facing repository does not vendor the upstream Rust toolchain, package binaries, local plugin installer, historical MissionCenter workspace, or maintainer-only release machinery. Those are not required to judge the WebMCP interaction and would obscure the challenge delta.

The original repository remains the authoring and production source. This repository is intentionally the artifact that a challenge judge should inspect and run.
