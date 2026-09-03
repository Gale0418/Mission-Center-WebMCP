const VALID_STATUSES = ["Ready", "In Progress", "Blocked", "Review", "Done"];
const STATUS_ORDER = new Map(VALID_STATUSES.map((value, index) => [value, index]));
const TRANSITIONS = new Map([
  ["Ready", new Set(["In Progress", "Blocked"])],
  ["In Progress", new Set(["Review", "Blocked"])],
  ["Blocked", new Set(["In Progress"])],
  ["Review", new Set(["Done", "In Progress", "Blocked"])],
  ["Done", new Set(["In Progress"])],
]);
const MAX_REASON_LENGTH = 600;
const MAX_NEXT_ACTION_LENGTH = 500;
const MAX_AUDIT_ITEMS = 80;
const STORAGE_SCHEMA = 1;

function clone(value) {
  return structuredClone(value);
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function cleanText(value, maxLength, label) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} is required`);
  if (text.length > maxLength) throw new Error(`${label} is too long`);
  if (/\b(?:password|secret|token|authorization|credential|api[_-]?key)\b\s*[:=]/i.test(text)) {
    throw new Error(`${label} appears to contain sensitive material`);
  }
  return text;
}

export function validateMission(input) {
  assertPlainObject(input, "mission");
  if (input.schemaVersion !== "1.0") throw new Error("unsupported mission schema");
  if (!Array.isArray(input.tasks) || input.tasks.length < 1 || input.tasks.length > 30) {
    throw new Error("mission tasks must contain 1–30 items");
  }
  const ids = new Set();
  for (const task of input.tasks) {
    assertPlainObject(task, "task");
    if (!/^[A-Z][A-Z0-9-]{2,31}$/.test(task.id ?? "")) throw new Error(`invalid task id: ${task.id}`);
    if (ids.has(task.id)) throw new Error(`duplicate task id: ${task.id}`);
    ids.add(task.id);
    if (!VALID_STATUSES.includes(task.status)) throw new Error(`invalid status for ${task.id}`);
    if (!Number.isInteger(task.revision) || task.revision < 1) throw new Error(`invalid revision for ${task.id}`);
    if (!Array.isArray(task.dependencies)) throw new Error(`dependencies must be an array for ${task.id}`);
    if (task.verification !== null && task.verification !== undefined) {
      assertPlainObject(task.verification, `verification for ${task.id}`);
      if (!['pass', 'fail'].includes(task.verification.result)) throw new Error(`invalid verification result for ${task.id}`);
      if (!Array.isArray(task.verification.evidenceRefs)) throw new Error(`invalid evidence refs for ${task.id}`);
    }
  }
  for (const task of input.tasks) {
    for (const dependency of task.dependencies) {
      if (!ids.has(dependency)) throw new Error(`unknown dependency ${dependency} for ${task.id}`);
      if (dependency === task.id) throw new Error(`task ${task.id} depends on itself`);
    }
  }
  return clone(input);
}

export function defaultRuntimeState(mission) {
  return {
    storageSchema: STORAGE_SCHEMA,
    fixtureRevision: mission.revision,
    mission: validateMission(mission),
    proposals: [],
    audit: [{ at: new Date().toISOString(), kind: "system", action: "mission_loaded" }],
  };
}

export function validateRuntimeState(input, baselineMission) {
  assertPlainObject(input, "runtime state");
  if (input.storageSchema !== STORAGE_SCHEMA) throw new Error("unsupported storage schema");
  if (input.fixtureRevision !== baselineMission.revision) throw new Error("stored fixture revision mismatch");
  const mission = validateMission(input.mission);
  if (mission.missionId !== baselineMission.missionId) throw new Error("stored mission id mismatch");
  if (!Array.isArray(input.proposals) || input.proposals.length > 50) throw new Error("invalid proposals");
  if (!Array.isArray(input.audit) || input.audit.length > MAX_AUDIT_ITEMS) throw new Error("invalid audit log");
  for (const proposal of input.proposals) {
    assertPlainObject(proposal, "proposal");
    if (!/^proposal-[a-z0-9-]{6,80}$/i.test(proposal.id ?? "")) throw new Error("invalid proposal id");
    if (!mission.tasks.some((task) => task.id === proposal.taskId)) throw new Error("proposal references unknown task");
    if (!['transition', 'next_action'].includes(proposal.type)) throw new Error("invalid proposal type");
    if (!['pending', 'approved', 'rejected', 'stale'].includes(proposal.status)) throw new Error("invalid proposal status");
    if (!Number.isInteger(proposal.expectedRevision) || proposal.expectedRevision < 1) throw new Error("invalid proposal revision");
    if (typeof proposal.key !== "string" || proposal.key.length > 1200) throw new Error("invalid proposal key");
    if (typeof proposal.reason !== "string" || proposal.reason.length < 1 || proposal.reason.length > MAX_REASON_LENGTH) throw new Error("invalid proposal reason");
    if (!VALID_STATUSES.includes(proposal.fromStatus)) throw new Error("invalid proposal source status");
    assertPlainObject(proposal.payload, "proposal payload");
    if (proposal.type === "transition") {
      if (typeof proposal.payload.targetStatus !== "string" || !VALID_STATUSES.includes(proposal.payload.targetStatus)) throw new Error("invalid transition proposal payload");
    } else {
      if (typeof proposal.payload.nextAction !== "string" || proposal.payload.nextAction.length < 1 || proposal.payload.nextAction.length > MAX_NEXT_ACTION_LENGTH) throw new Error("invalid next-action proposal payload");
    }
  }
  for (const event of input.audit) {
    assertPlainObject(event, "audit event");
    if (!["system", "agent", "human"].includes(event.kind)) throw new Error("invalid audit actor");
    if (typeof event.action !== "string" || event.action.length < 1 || event.action.length > 80) throw new Error("invalid audit action");
    for (const key of Object.keys(event)) {
      if (!["at", "kind", "action", "taskId", "proposalId", "proposalType", "toolName"].includes(key)) throw new Error(`unsupported audit field: ${key}`);
    }
  }
  return { storageSchema: STORAGE_SCHEMA, fixtureRevision: input.fixtureRevision, mission, proposals: clone(input.proposals), audit: clone(input.audit) };
}

export function taskById(state, taskId) {
  const task = state.mission.tasks.find((candidate) => candidate.id === taskId);
  if (!task) throw new Error(`unknown task: ${taskId}`);
  return task;
}

export function missionOverview(state) {
  const counts = Object.fromEntries(VALID_STATUSES.map((status) => [status, 0]));
  for (const task of state.mission.tasks) counts[task.status] += 1;
  const done = counts.Done;
  const progress = Math.round((done / state.mission.tasks.length) * 100);
  const attention = state.mission.tasks
    .filter((task) => task.status === "Blocked" || task.status === "Review")
    .map((task) => ({ id: task.id, status: task.status, title: task.title }));
  return {
    missionId: state.mission.missionId,
    title: state.mission.title,
    goal: state.mission.goal,
    revision: state.mission.revision,
    updatedAt: state.mission.updatedAt,
    progress,
    counts,
    attention,
    pendingProposalCount: state.proposals.filter((proposal) => proposal.status === "pending").length,
  };
}

export function listTasks(state, filters = {}) {
  assertPlainObject(filters, "filters");
  const status = filters.status ? String(filters.status) : null;
  const priority = filters.priority ? String(filters.priority).toUpperCase() : null;
  const tag = filters.tag ? String(filters.tag).toLowerCase() : null;
  if (status && !VALID_STATUSES.includes(status)) throw new Error("unsupported status filter");
  return state.mission.tasks
    .filter((task) => !status || task.status === status)
    .filter((task) => !priority || task.priority === priority)
    .filter((task) => !tag || task.tags.some((candidate) => candidate.toLowerCase() === tag))
    .sort((left, right) => (left.priority.localeCompare(right.priority) || STATUS_ORDER.get(left.status) - STATUS_ORDER.get(right.status) || left.id.localeCompare(right.id)))
    .map((task) => ({ id: task.id, title: task.title, status: task.status, priority: task.priority, nextAction: task.nextAction, dependencies: [...task.dependencies], revision: task.revision }));
}

export function inspectTask(state, taskId) {
  const task = clone(taskById(state, cleanText(taskId, 40, "taskId")));
  const dependents = state.mission.tasks.filter((candidate) => candidate.dependencies.includes(task.id)).map((candidate) => candidate.id);
  const verificationCurrent = Boolean(task.verification && task.verification.result === "pass" && task.verification.taskRevision === task.revision);
  return { ...task, dependents, verificationCurrent, allowedTransitions: [...(TRANSITIONS.get(task.status) ?? [])] };
}

export function traceDependencies(state, taskId) {
  const start = taskById(state, cleanText(taskId, 40, "taskId"));
  const visited = new Set();
  const edges = [];
  const walk = (task, depth) => {
    if (depth > 12) throw new Error("dependency depth limit exceeded");
    if (visited.has(task.id)) return;
    visited.add(task.id);
    for (const dependencyId of task.dependencies) {
      edges.push({ from: dependencyId, to: task.id });
      walk(taskById(state, dependencyId), depth + 1);
    }
  };
  walk(start, 0);
  return { taskId: start.id, tasks: [...visited].map((id) => inspectTask(state, id)), edges };
}

export function listEvidence(state, taskId) {
  const task = taskById(state, cleanText(taskId, 40, "taskId"));
  if (!task.verification) return { taskId: task.id, status: "missing", current: false, evidenceRefs: [] };
  return {
    taskId: task.id,
    status: task.verification.result,
    current: task.verification.result === "pass" && task.verification.taskRevision === task.revision,
    taskRevision: task.revision,
    evidenceRevision: task.verification.taskRevision,
    checkedAt: task.verification.checkedAt,
    evidenceRefs: [...task.verification.evidenceRefs],
    unresolvedCritical: task.verification.unresolvedCritical ?? 0,
    unresolvedHigh: task.verification.unresolvedHigh ?? 0,
  };
}

function proposalKey(type, taskId, expectedRevision, payload) {
  return `${type}|${taskId}|${expectedRevision}|${JSON.stringify(payload)}`;
}

function createProposal(state, type, task, payload, reason) {
  const key = proposalKey(type, task.id, task.revision, payload);
  const duplicate = state.proposals.find((proposal) => proposal.status === "pending" && proposal.key === key);
  if (duplicate) return clone(duplicate);
  const id = `proposal-${crypto.randomUUID().toLowerCase()}`;
  const proposal = {
    id,
    key,
    type,
    taskId: task.id,
    expectedRevision: task.revision,
    fromStatus: task.status,
    payload,
    reason: cleanText(reason, MAX_REASON_LENGTH, "reason"),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  state.proposals.unshift(proposal);
  appendAudit(state, { kind: "agent", action: "proposal_created", taskId: task.id, proposalId: id, proposalType: type });
  return clone(proposal);
}

export function proposeTransition(state, input) {
  assertPlainObject(input, "transition proposal");
  const task = taskById(state, cleanText(input.taskId, 40, "taskId"));
  const targetStatus = cleanText(input.targetStatus, 40, "targetStatus");
  if (!VALID_STATUSES.includes(targetStatus)) throw new Error("unsupported target status");
  if (!(TRANSITIONS.get(task.status) ?? new Set()).has(targetStatus)) throw new Error(`transition ${task.status} → ${targetStatus} is not allowed`);
  return createProposal(state, "transition", task, { targetStatus }, input.reason);
}

export function proposeNextAction(state, input) {
  assertPlainObject(input, "next action proposal");
  const task = taskById(state, cleanText(input.taskId, 40, "taskId"));
  if (task.status === "Done") throw new Error("Done task must be reopened before changing next action");
  const nextAction = cleanText(input.nextAction, MAX_NEXT_ACTION_LENGTH, "nextAction");
  return createProposal(state, "next_action", task, { nextAction }, input.reason);
}

function completionGate(task) {
  if (!task.verification) return "passing verification is missing";
  if (task.verification.result !== "pass") return "verification result is not pass";
  if (task.verification.taskRevision !== task.revision) return "verification is stale for the current task revision";
  if ((task.verification.unresolvedCritical ?? 0) > 0) return "unresolved Critical findings remain";
  if ((task.verification.unresolvedHigh ?? 0) > 0) return "unresolved High findings remain";
  if (!Array.isArray(task.verification.evidenceRefs) || task.verification.evidenceRefs.length < 1) return "no evidence references are recorded";
  return null;
}

export function approveProposal(state, proposalId) {
  const proposal = state.proposals.find((candidate) => candidate.id === proposalId);
  if (!proposal) throw new Error("unknown proposal");
  if (proposal.status !== "pending") throw new Error("proposal is no longer pending");
  const task = taskById(state, proposal.taskId);
  if (task.revision !== proposal.expectedRevision || task.status !== proposal.fromStatus) {
    proposal.status = "stale";
    appendAudit(state, { kind: "human", action: "proposal_stale", taskId: task.id, proposalId: proposal.id });
    throw new Error("proposal is stale because the task changed after it was created");
  }
  if (proposal.type === "transition") {
    const target = proposal.payload.targetStatus;
    if (!(TRANSITIONS.get(task.status) ?? new Set()).has(target)) throw new Error("transition is no longer allowed");
    if (task.status === "Review" && target === "Done") {
      const failure = completionGate(task);
      if (failure) throw new Error(`cannot approve Done: ${failure}`);
    }
    task.status = target;
  } else if (proposal.type === "next_action") {
    task.nextAction = proposal.payload.nextAction;
  } else {
    throw new Error("unsupported proposal type");
  }
  task.revision += 1;
  state.mission.revision += 1;
  state.mission.updatedAt = new Date().toISOString();
  proposal.status = "approved";
  proposal.decidedAt = state.mission.updatedAt;
  appendAudit(state, { kind: "human", action: "proposal_approved", taskId: task.id, proposalId: proposal.id, proposalType: proposal.type });
  return { proposal: clone(proposal), task: clone(task) };
}

export function rejectProposal(state, proposalId) {
  const proposal = state.proposals.find((candidate) => candidate.id === proposalId);
  if (!proposal) throw new Error("unknown proposal");
  if (proposal.status !== "pending") throw new Error("proposal is no longer pending");
  proposal.status = "rejected";
  proposal.decidedAt = new Date().toISOString();
  appendAudit(state, { kind: "human", action: "proposal_rejected", taskId: proposal.taskId, proposalId: proposal.id, proposalType: proposal.type });
  return clone(proposal);
}

export function boundedHandoff(state, taskId = null) {
  const selected = taskId ? [inspectTask(state, taskId)] : state.mission.tasks
    .filter((task) => task.status !== "Done")
    .slice(0, 6)
    .map((task) => inspectTask(state, task.id));
  return {
    schemaVersion: "1.0",
    lifecycleSource: "browser challenge state",
    mission: { missionId: state.mission.missionId, goal: state.mission.goal, revision: state.mission.revision },
    tasks: selected.map((task) => ({ id: task.id, title: task.title, status: task.status, priority: task.priority, dependencies: task.dependencies, nextAction: task.nextAction, revision: task.revision })),
    pendingProposals: state.proposals.filter((proposal) => proposal.status === "pending").slice(0, 8).map((proposal) => ({ id: proposal.id, taskId: proposal.taskId, type: proposal.type, expectedRevision: proposal.expectedRevision })),
  };
}

export function appendAudit(state, event) {
  const safe = {
    at: new Date().toISOString(),
    kind: ["system", "agent", "human"].includes(event.kind) ? event.kind : "system",
    action: cleanText(event.action, 80, "audit action"),
  };
  for (const key of ["taskId", "proposalId", "proposalType", "toolName"]) {
    if (event[key]) safe[key] = cleanText(event[key], 100, key);
  }
  state.audit.unshift(safe);
  state.audit.length = Math.min(state.audit.length, MAX_AUDIT_ITEMS);
}

export function publicSnapshot(state) {
  return clone(state);
}
