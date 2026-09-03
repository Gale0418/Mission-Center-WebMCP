import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  approveProposal,
  boundedHandoff,
  defaultRuntimeState,
  inspectTask,
  listEvidence,
  listTasks,
  missionOverview,
  proposeNextAction,
  proposeTransition,
  rejectProposal,
  validateMission,
  validateRuntimeState,
} from '../assets/core.js';

const fixture = JSON.parse(await readFile(new URL('../data/mission.json', import.meta.url), 'utf8'));
const fresh = () => defaultRuntimeState(validateMission(fixture));

test('fixture validates and has unique task IDs', () => {
  const mission = validateMission(fixture);
  assert.equal(mission.tasks.length, 5);
  assert.equal(new Set(mission.tasks.map((task) => task.id)).size, mission.tasks.length);
});

test('overview reports attention and deterministic progress', () => {
  const overview = missionOverview(fresh());
  assert.equal(overview.progress, 20);
  assert.deepEqual(overview.attention.map((item) => item.id), ['WMC-103', 'WMC-104']);
});

test('task filters are structured and bounded', () => {
  const state = fresh();
  assert.deepEqual(listTasks(state, { status: 'Review' }).map((task) => task.id), ['WMC-103']);
  assert.throws(() => listTasks(state, { status: 'Banana' }), /unsupported status/);
});

test('inspect exposes current evidence and legal transitions', () => {
  const task = inspectTask(fresh(), 'WMC-103');
  assert.equal(task.verificationCurrent, true);
  assert.ok(task.allowedTransitions.includes('Done'));
});

test('proposal tool cannot apply a transition by itself', () => {
  const state = fresh();
  proposeTransition(state, { taskId: 'WMC-103', targetStatus: 'Done', reason: 'Evidence is current.' });
  assert.equal(inspectTask(state, 'WMC-103').status, 'Review');
  assert.equal(state.proposals[0].status, 'pending');
});

test('review-to-done approval succeeds only with current pass evidence', () => {
  const state = fresh();
  const proposal = proposeTransition(state, { taskId: 'WMC-103', targetStatus: 'Done', reason: 'Evidence is current and clean.' });
  approveProposal(state, proposal.id);
  assert.equal(inspectTask(state, 'WMC-103').status, 'Done');
  assert.equal(state.proposals[0].status, 'approved');
});

test('review-to-done fails when verification is stale', () => {
  const state = fresh();
  const proposal = proposeTransition(state, { taskId: 'WMC-103', targetStatus: 'Done', reason: 'Try completion.' });
  state.mission.tasks.find((task) => task.id === 'WMC-103').verification.taskRevision = 4;
  assert.throws(() => approveProposal(state, proposal.id), /verification is stale/);
  assert.equal(inspectTask(state, 'WMC-103').status, 'Review');
});

test('stale proposal is rejected after concurrent task change', () => {
  const state = fresh();
  const proposal = proposeTransition(state, { taskId: 'WMC-102', targetStatus: 'Review', reason: 'Implementation completed.' });
  state.mission.tasks.find((task) => task.id === 'WMC-102').revision += 1;
  assert.throws(() => approveProposal(state, proposal.id), /proposal is stale/);
  assert.equal(state.proposals[0].status, 'stale');
});

test('duplicate pending proposal is idempotent', () => {
  const state = fresh();
  const input = { taskId: 'WMC-103', targetStatus: 'Done', reason: 'Evidence is current.' };
  const a = proposeTransition(state, input);
  const b = proposeTransition(state, input);
  assert.equal(a.id, b.id);
  assert.equal(state.proposals.length, 1);
});

test('illegal lifecycle jumps fail closed', () => {
  const state = fresh();
  assert.throws(() => proposeTransition(state, { taskId: 'WMC-105', targetStatus: 'Done', reason: 'Skip everything.' }), /not allowed/);
});

test('sensitive strings are rejected from proposal reason', () => {
  const state = fresh();
  assert.throws(() => proposeNextAction(state, { taskId: 'WMC-102', nextAction: 'Run focused checks', reason: 'token=abc123' }), /sensitive material/);
});

test('Done task next action cannot be silently rewritten', () => {
  assert.throws(() => proposeNextAction(fresh(), { taskId: 'WMC-101', nextAction: 'Change it', reason: 'Update.' }), /must be reopened/);
});

test('human rejection preserves task lifecycle', () => {
  const state = fresh();
  const proposal = proposeTransition(state, { taskId: 'WMC-102', targetStatus: 'Review', reason: 'Ready to check.' });
  rejectProposal(state, proposal.id);
  assert.equal(inspectTask(state, 'WMC-102').status, 'In Progress');
  assert.equal(state.proposals[0].status, 'rejected');
});

test('evidence is honest when missing', () => {
  assert.deepEqual(listEvidence(fresh(), 'WMC-102'), { taskId: 'WMC-102', status: 'missing', current: false, evidenceRefs: [] });
});

test('bounded handoff never includes more than six unfinished tasks', () => {
  const handoff = boundedHandoff(fresh());
  assert.ok(handoff.tasks.length <= 6);
  assert.ok(handoff.tasks.every((task) => task.status !== 'Done'));
});

test('stored state rejects another mission id', () => {
  const state = fresh();
  state.mission.missionId = 'OTHER';
  assert.throws(() => validateRuntimeState(state, fixture), /mission id mismatch/);
});

test('stored state rejects oversized proposal collection', () => {
  const state = fresh();
  state.proposals = Array.from({ length: 51 }, (_, index) => ({ id: `proposal-${String(index).padStart(6,'0')}`, key: `k${index}`, type: 'transition', taskId: 'WMC-102', expectedRevision: 4, fromStatus: 'In Progress', payload: { targetStatus: 'Review' }, reason: 'x', status: 'pending', createdAt: new Date().toISOString() }));
  assert.throws(() => validateRuntimeState(state, fixture), /invalid proposals/);
});

test('stored state rejects fixture-version drift', () => {
  const state = fresh();
  state.fixtureRevision -= 1;
  assert.throws(() => validateRuntimeState(state, fixture), /fixture revision mismatch/);
});

test('stored state rejects hidden mission fields and dependency cycles', () => {
  const state = fresh();
  state.mission.unexpected = 'hidden';
  assert.throws(() => validateRuntimeState(state, fixture), /unsupported mission field/);
  delete state.mission.unexpected;
  const first = state.mission.tasks.find((task) => task.id === 'WMC-101');
  first.dependencies = ['WMC-103'];
  assert.throws(() => validateRuntimeState(state, fixture), /dependency cycle/);
});

test('stored audit cannot retain arbitrary or secret fields', () => {
  const state = fresh();
  state.audit[0].prompt = 'private prompt';
  assert.throws(() => validateRuntimeState(state, fixture), /unsupported audit field/);
});

test('stored proposal re-applies sensitive-text screening', () => {
  const state = fresh();
  const proposal = proposeNextAction(state, { taskId: 'WMC-102', nextAction: 'Run focused checks', reason: 'Ordinary reason' });
  state.proposals.find((candidate) => candidate.id === proposal.id).reason = 'token=abc123';
  assert.throws(() => validateRuntimeState(state, fixture), /sensitive material/);
});

test('stored proposal payload rejects hidden fields and key tampering', () => {
  const state = fresh();
  const proposal = proposeTransition(state, { taskId: 'WMC-103', targetStatus: 'Done', reason: 'Evidence is current.' });
  state.proposals[0].payload.hidden = 'surprise';
  assert.throws(() => validateRuntimeState(state, fixture), /unsupported transition proposal payload field/);
  delete state.proposals[0].payload.hidden;
  state.proposals[0].key = proposal.key + '-tampered';
  assert.throws(() => validateRuntimeState(state, fixture), /proposal key mismatch/);
});

test('stored proposal ids and pending keys must be unique', () => {
  const state = fresh();
  proposeTransition(state, { taskId: 'WMC-103', targetStatus: 'Done', reason: 'Evidence is current.' });
  state.proposals.push(structuredClone(state.proposals[0]));
  assert.throws(() => validateRuntimeState(state, fixture), /duplicate proposal id/);
});
