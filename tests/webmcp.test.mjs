import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaultRuntimeState, validateMission } from '../assets/core.js';
import { createToolDescriptors, registerWebMCPTools } from '../assets/webmcp.js';

const fixture = JSON.parse(await readFile(new URL('../data/mission.json', import.meta.url), 'utf8'));
const state = defaultRuntimeState(validateMission(fixture));

test('exactly eight narrow WebMCP tools are exposed', () => {
  const descriptors = createToolDescriptors(() => state, () => {});
  assert.equal(descriptors.length, 8);
  assert.equal(new Set(descriptors.map((tool) => tool.name)).size, 8);
  assert.equal(descriptors.some((tool) => /approve|reject/i.test(tool.name)), false);
  assert.equal(descriptors.every((tool) => tool.name.startsWith('mission_')), true);
});

test('readOnlyHint matches proposal side effects', () => {
  const descriptors = createToolDescriptors(() => state, () => {});
  const mutable = descriptors.filter((tool) => tool.annotations?.readOnlyHint === false).map((tool) => tool.name).sort();
  assert.deepEqual(mutable, ['mission_propose_next_action', 'mission_propose_transition']);
});

test('all descriptors have bounded object schemas with additionalProperties false', () => {
  for (const tool of createToolDescriptors(() => state, () => {})) {
    assert.equal(tool.inputSchema.type, 'object');
    assert.equal(tool.inputSchema.additionalProperties, false);
    assert.equal(typeof tool.description, 'string');
    assert.ok(tool.description.length >= 30);
  }
});

test('native registration registers all descriptors when modelContext exists', async () => {
  const names = [];
  globalThis.document = { modelContext: { registerTool: async (descriptor) => names.push(descriptor.name) } };
  const result = await registerWebMCPTools(() => state, () => {});
  assert.equal(result.supported, true);
  assert.equal(result.registered, 8);
  assert.equal(names.length, 8);
  delete globalThis.document;
});

test('partial registration failure attempts rollback', async () => {
  const registered = [];
  const unregistered = [];
  globalThis.document = { modelContext: {
    registerTool: async (descriptor) => {
      if (registered.length === 3) throw new Error('synthetic registration failure');
      registered.push(descriptor.name);
    },
    unregisterTool: async (name) => unregistered.push(name),
  } };
  await assert.rejects(registerWebMCPTools(() => state, () => {}), /failed after 3 tools/);
  assert.deepEqual(unregistered.sort(), registered.sort());
  delete globalThis.document;
});

test('rejected read tool calls leave bounded rejection audit', async () => {
  const localState = defaultRuntimeState(validateMission(fixture));
  const descriptors = createToolDescriptors(() => localState, () => {});
  const inspect = descriptors.find((tool) => tool.name === 'mission_inspect_task');
  await assert.rejects(inspect.execute({ taskId: 'UNKNOWN' }), /unknown task/);
  assert.equal(localState.audit.some((event) => event.action === 'tool_rejected' && event.toolName === 'mission_inspect_task'), true);
});

test('static root uses deploy-safe relative asset and data paths', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../assets/app.js', import.meta.url), 'utf8');
  assert.match(html, /href="\.\/assets\/app\.css"/);
  assert.match(html, /src="\.\/assets\/app\.js"/);
  assert.match(app, /fetch\('\.\/data\/mission\.json'/);
});
