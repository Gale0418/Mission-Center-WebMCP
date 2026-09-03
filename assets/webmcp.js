import {
  appendAudit,
  boundedHandoff,
  inspectTask,
  listEvidence,
  listTasks,
  missionOverview,
  proposeNextAction,
  proposeTransition,
  traceDependencies,
} from './core.js';

const jsonResult = (value) => JSON.stringify(value, null, 2);

export function createToolDescriptors(getState, persist) {
  const executeRead = (toolName, fn) => async (input = {}) => {
    const state = getState();
    appendAudit(state, { kind: 'agent', action: 'tool_called', toolName, taskId: input.taskId });
    try {
      const result = fn(state, input);
      persist();
      return jsonResult(result);
    } catch (error) {
      appendAudit(state, { kind: 'agent', action: 'tool_rejected', toolName, taskId: input.taskId });
      persist();
      throw error;
    }
  };
  const executeProposal = (toolName, fn) => async (input = {}) => {
    const state = getState();
    appendAudit(state, { kind: 'agent', action: 'tool_called', toolName, taskId: input.taskId });
    try {
      const result = fn(state, input);
      persist();
      window.dispatchEvent(new CustomEvent('mission-state-changed', { detail: { source: 'webmcp', toolName } }));
      return jsonResult({ message: 'Proposal created. A human must approve or reject it in Mission Center.', proposal: result });
    } catch (error) {
      appendAudit(state, { kind: 'agent', action: 'tool_rejected', toolName, taskId: input.taskId });
      persist();
      throw error;
    }
  };
  return [
    {
      name: 'mission_get_overview',
      description: 'Read the current Mission Center goal, progress, lifecycle counts, attention items, and pending proposal count. This never changes task state.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: executeRead('mission_get_overview', (state) => missionOverview(state)),
    },
    {
      name: 'mission_list_tasks',
      description: 'List Mission Center tasks. Optional filters: status, priority, or exact tag. Use this before guessing which task needs attention.',
      inputSchema: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['Ready', 'In Progress', 'Blocked', 'Review', 'Done'] },
          priority: { type: 'string', enum: ['P0', 'P1', 'P2'] },
          tag: { type: 'string', maxLength: 40 },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: executeRead('mission_list_tasks', (state, input) => listTasks(state, input)),
    },
    {
      name: 'mission_inspect_task',
      description: 'Inspect one task by exact ID, including dependencies, dependents, next action, verification freshness, and currently allowed lifecycle transitions.',
      inputSchema: { type: 'object', properties: { taskId: { type: 'string', pattern: '^[A-Z][A-Z0-9-]{2,31}$' } }, required: ['taskId'], additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: executeRead('mission_inspect_task', (state, input) => inspectTask(state, input.taskId)),
    },
    {
      name: 'mission_trace_dependencies',
      description: 'Trace the bounded dependency chain for one task. Use this to identify why a task is blocked or what must complete first.',
      inputSchema: { type: 'object', properties: { taskId: { type: 'string', pattern: '^[A-Z][A-Z0-9-]{2,31}$' } }, required: ['taskId'], additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: executeRead('mission_trace_dependencies', (state, input) => traceDependencies(state, input.taskId)),
    },
    {
      name: 'mission_list_evidence',
      description: 'Read the recorded verification evidence for a task and whether that evidence is current for the task revision. This does not infer success when evidence is absent or stale.',
      inputSchema: { type: 'object', properties: { taskId: { type: 'string', pattern: '^[A-Z][A-Z0-9-]{2,31}$' } }, required: ['taskId'], additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: executeRead('mission_list_evidence', (state, input) => listEvidence(state, input.taskId)),
    },
    {
      name: 'mission_propose_transition',
      description: 'Propose one legal task lifecycle transition. This tool NEVER approves or applies the transition. A human must review and approve the proposal in the page, and Mission Center revalidates task revision and evidence at approval time.',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', pattern: '^[A-Z][A-Z0-9-]{2,31}$' },
          targetStatus: { type: 'string', enum: ['Ready', 'In Progress', 'Blocked', 'Review', 'Done'] },
          reason: { type: 'string', minLength: 3, maxLength: 600 },
        },
        required: ['taskId', 'targetStatus', 'reason'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: executeProposal('mission_propose_transition', proposeTransition),
    },
    {
      name: 'mission_propose_next_action',
      description: 'Propose a replacement Next Action for a non-Done task. The proposal does not alter lifecycle truth until a human approves it in the page.',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', pattern: '^[A-Z][A-Z0-9-]{2,31}$' },
          nextAction: { type: 'string', minLength: 3, maxLength: 500 },
          reason: { type: 'string', minLength: 3, maxLength: 600 },
        },
        required: ['taskId', 'nextAction', 'reason'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: executeProposal('mission_propose_next_action', proposeNextAction),
    },
    {
      name: 'mission_get_handoff',
      description: 'Return a bounded handoff packet for one task or up to six unfinished tasks, including canonical next actions and pending proposal references. This never mutates task state.',
      inputSchema: { type: 'object', properties: { taskId: { type: 'string', pattern: '^[A-Z][A-Z0-9-]{2,31}$' } }, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: executeRead('mission_get_handoff', (state, input) => boundedHandoff(state, input.taskId || null)),
    },
  ];
}

export async function registerWebMCPTools(getState, persist) {
  const modelContext = document.modelContext;
  if (!modelContext || typeof modelContext.registerTool !== 'function') {
    return { supported: false, registered: 0, reason: 'document.modelContext.registerTool is unavailable' };
  }
  const descriptors = createToolDescriptors(getState, persist);
  const registered = [];
  try {
    for (const descriptor of descriptors) {
      await modelContext.registerTool(descriptor);
      registered.push(descriptor.name);
    }
  } catch (error) {
    if (typeof modelContext.unregisterTool === 'function') {
      await Promise.allSettled(registered.map((name) => modelContext.unregisterTool(name)));
    }
    throw new Error(`WebMCP registration failed after ${registered.length} tools: ${error?.message || error}`);
  }
  return { supported: true, registered: registered.length, names: registered };
}
