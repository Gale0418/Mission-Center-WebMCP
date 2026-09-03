# Privacy

Mission Center WebMCP is a static competition demo with no application backend and no analytics code.

- The checked-in mission fixture is synthetic challenge data.
- Browser state stays in local storage on the visitor's device.
- WebMCP tool handlers operate on the same browser-local state used by the visible UI.
- The app does not intentionally persist prompts, chain-of-thought/reasoning, tokens, passwords, API keys, authorization headers, environment variables, or complete arbitrary tool arguments.
- Reset Demo State deletes the competition state from local storage and reloads the checked-in fixture.

Hosting providers (for example GitHub Pages) may independently process ordinary HTTP request metadata under their own policies; this repository does not add tracking scripts.
