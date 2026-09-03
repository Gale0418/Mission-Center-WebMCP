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
  publicSnapshot,
  rejectProposal,
  validateMission,
  validateRuntimeState,
} from './core.js';
import { createToolDescriptors, registerWebMCPTools } from './webmcp.js';

const STORAGE_KEY = 'mission-center-webmcp-state-v1';
let baselineMission;
let state;
let activeTaskId = 'WMC-103';
let lastFocus = null;

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(publicSnapshot(state)));
}

function restore() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultRuntimeState(baselineMission);
  if (raw.length > 200_000) {
    localStorage.removeItem(STORAGE_KEY);
    return defaultRuntimeState(baselineMission);
  }
  try {
    return validateRuntimeState(JSON.parse(raw), baselineMission);
  } catch (error) {
    console.warn('Stored Mission Center state rejected:', error);
    localStorage.removeItem(STORAGE_KEY);
    return defaultRuntimeState(baselineMission);
  }
}

function tone(status) {
  return status.toLowerCase().replaceAll(' ', '-');
}

function renderOverview() {
  const overview = missionOverview(state);
  $('#missionTitle').textContent = overview.title;
  $('#missionGoal').textContent = overview.goal;
  $('#progressValue').textContent = `${overview.progress}%`;
  $('#progressBar').style.width = `${overview.progress}%`;
  $('#progressBar').setAttribute('aria-valuenow', String(overview.progress));
  $('#attentionCount').textContent = String(overview.attention.length);
  $('#pendingCount').textContent = String(overview.pendingProposalCount);
  $('#revisionValue').textContent = `R${overview.revision}`;
}

function renderBoard() {
  const zones = ['Ready', 'In Progress', 'Blocked', 'Review', 'Done'];
  const tasks = listTasks(state);
  for (const zone of zones) {
    const list = document.querySelector(`[data-zone-list="${zone}"]`);
    const count = document.querySelector(`[data-zone-count="${zone}"]`);
    const matching = tasks.filter((task) => task.status === zone);
    count.textContent = String(matching.length);
    list.replaceChildren();
    if (!matching.length) {
      const empty = document.createElement('li');
      empty.className = 'empty';
      empty.textContent = 'No tasks';
      list.appendChild(empty);
      continue;
    }
    for (const task of matching) {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.className = `task-card tone-${tone(zone)}`;
      button.type = 'button';
      button.dataset.taskId = task.id;
      button.setAttribute('aria-label', `${task.id}: ${task.title}. ${task.status}`);
      button.innerHTML = `<span class="task-meta"><strong>${escapeHtml(task.id)}</strong><span>${escapeHtml(task.priority)}</span></span><span class="task-title">${escapeHtml(task.title)}</span><span class="task-next">${escapeHtml(task.nextAction)}</span>`;
      button.addEventListener('click', () => selectTask(task.id));
      item.appendChild(button);
      list.appendChild(item);
    }
  }
}

function selectTask(taskId) {
  activeTaskId = taskId;
  const task = inspectTask(state, taskId);
  const evidence = listEvidence(state, taskId);
  $('#inspectorId').textContent = task.id;
  $('#inspectorTitle').textContent = task.title;
  $('#inspectorStatus').textContent = task.status;
  $('#inspectorStatus').className = `status-chip tone-${tone(task.status)}`;
  $('#inspectorNext').textContent = task.nextAction;
  $('#inspectorDeps').textContent = task.dependencies.length ? task.dependencies.join(' → ') : 'None';
  $('#inspectorAllowed').textContent = task.allowedTransitions.length ? task.allowedTransitions.join(', ') : 'None';
  $('#inspectorEvidence').textContent = evidence.status === 'missing' ? 'Missing' : `${evidence.status.toUpperCase()} · ${evidence.current ? 'CURRENT' : 'STALE'}`;
  $('#inspectorEvidence').dataset.current = String(evidence.current);
  $('#inspectorRefs').replaceChildren();
  for (const ref of evidence.evidenceRefs) {
    const li = document.createElement('li');
    li.textContent = ref;
    $('#inspectorRefs').appendChild(li);
  }
}

function renderProposals() {
  const list = $('#proposalList');
  const pending = state.proposals.filter((proposal) => proposal.status === 'pending');
  list.replaceChildren();
  if (!pending.length) {
    const li = document.createElement('li');
    li.className = 'proposal-empty';
    li.textContent = 'No pending proposals. Ask an agent to propose a safe next move.';
    list.appendChild(li);
    return;
  }
  for (const proposal of pending) {
    const li = document.createElement('li');
    li.className = 'proposal';
    const summary = proposal.type === 'transition'
      ? `${proposal.fromStatus} → ${proposal.payload.targetStatus}`
      : `Next action → ${proposal.payload.nextAction}`;
    li.innerHTML = `<div><span class="eyebrow">${escapeHtml(proposal.taskId)} · ${escapeHtml(proposal.type)}</span><strong>${escapeHtml(summary)}</strong><p>${escapeHtml(proposal.reason)}</p><small>Expected task revision R${proposal.expectedRevision}</small></div><div class="proposal-actions"><button type="button" data-action="approve">Approve</button><button type="button" data-action="reject" class="secondary">Reject</button></div>`;
    li.querySelector('[data-action="approve"]').addEventListener('click', () => openDecisionModal(proposal.id));
    li.querySelector('[data-action="reject"]').addEventListener('click', () => {
      try { rejectProposal(state, proposal.id); persist(); renderAll(); announce(`Rejected ${proposal.id}`); }
      catch (error) { announce(error.message, true); }
    });
    list.appendChild(li);
  }
}

function renderAudit() {
  const list = $('#auditList');
  list.replaceChildren();
  for (const event of state.audit.slice(0, 12)) {
    const li = document.createElement('li');
    li.innerHTML = `<time>${escapeHtml(event.at.slice(11,19))}</time><strong>${escapeHtml(event.kind.toUpperCase())}</strong><span>${escapeHtml(event.action)}</span>${event.taskId ? `<code>${escapeHtml(event.taskId)}</code>` : ''}`;
    list.appendChild(li);
  }
}

function renderAll() {
  renderOverview();
  renderBoard();
  renderProposals();
  renderAudit();
  selectTask(activeTaskId);
}

function announce(message, error = false) {
  const node = $('#notice');
  node.textContent = message;
  node.dataset.error = String(error);
}

function openDecisionModal(proposalId) {
  const proposal = state.proposals.find((candidate) => candidate.id === proposalId);
  if (!proposal) return;
  lastFocus = document.activeElement;
  const dialog = $('#decisionDialog');
  $('#decisionProposal').textContent = proposal.id;
  $('#decisionSummary').textContent = proposal.type === 'transition'
    ? `${proposal.taskId}: ${proposal.fromStatus} → ${proposal.payload.targetStatus}`
    : `${proposal.taskId}: update Next Action`;
  $('#decisionReason').textContent = proposal.reason;
  $('#confirmApproval').dataset.proposalId = proposal.id;
  dialog.showModal();
  $('#confirmApproval').focus();
}

function closeDecisionModal() {
  const dialog = $('#decisionDialog');
  if (dialog.open) dialog.close();
  lastFocus?.focus?.();
}

async function runTool(name, input) {
  const descriptors = createToolDescriptors(() => state, persist);
  const tool = descriptors.find((descriptor) => descriptor.name === name);
  if (!tool) throw new Error(`unknown tool ${name}`);
  const result = await tool.execute(input);
  renderAll();
  return result;
}

async function judgeJourney() {
  const output = $('#toolOutput');
  output.textContent = 'Running structured agent journey…';
  try {
    const overview = JSON.parse(await runTool('mission_get_overview', {}));
    const reviewTasks = JSON.parse(await runTool('mission_list_tasks', { status: 'Review' }));
    const task = reviewTasks.find((candidate) => candidate.id === 'WMC-103') ?? reviewTasks[0];
    if (!task) throw new Error('No Review task is available for the judge journey. Reset the demo state.');
    const evidence = JSON.parse(await runTool('mission_list_evidence', { taskId: task.id }));
    const proposal = JSON.parse(await runTool('mission_propose_transition', { taskId: task.id, targetStatus: 'Done', reason: 'Current passing evidence exists and no unresolved Critical or High findings are recorded.' }));
    output.textContent = JSON.stringify({ overview, selectedTask: task, evidence, proposal }, null, 2);
    announce('Agent journey finished at a human approval gate. Review the pending proposal below.');
  } catch (error) {
    output.textContent = error.message;
    announce(error.message, true);
  }
}

async function init() {
  baselineMission = validateMission(await fetch('./data/mission.json', { cache: 'no-store' }).then((response) => {
    if (!response.ok) throw new Error(`mission data HTTP ${response.status}`);
    return response.json();
  }));
  state = restore();
  renderAll();
  window.__missionCenterChallenge = { getState: () => publicSnapshot(state), runTool, boundedHandoff: (taskId) => boundedHandoff(state, taskId) };
  window.addEventListener('mission-state-changed', renderAll);

  $('#judgeJourney').addEventListener('click', judgeJourney);
  $('#resetDemo').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    state = defaultRuntimeState(baselineMission);
    activeTaskId = 'WMC-103';
    persist();
    renderAll();
    announce('Demo state reset to the checked-in mission fixture.');
  });
  $('#copyHandoff').addEventListener('click', async () => {
    const handoff = JSON.stringify(boundedHandoff(state, activeTaskId), null, 2);
    try { await navigator.clipboard.writeText(handoff); announce(`Copied bounded handoff for ${activeTaskId}.`); }
    catch { $('#toolOutput').textContent = handoff; announce('Clipboard unavailable; handoff is shown in Agent Lab.'); }
  });
  $('#confirmApproval').addEventListener('click', () => {
    const proposalId = $('#confirmApproval').dataset.proposalId;
    try {
      approveProposal(state, proposalId);
      persist();
      closeDecisionModal();
      renderAll();
      announce(`Human approved ${proposalId}. Lifecycle state changed only after revalidation.`);
    } catch (error) {
      persist();
      closeDecisionModal();
      renderAll();
      announce(error.message, true);
    }
  });
  $('#cancelApproval').addEventListener('click', closeDecisionModal);
  $('#decisionDialog').addEventListener('cancel', (event) => { event.preventDefault(); closeDecisionModal(); });

  try {
    const registration = await registerWebMCPTools(() => state, persist);
    $('#webmcpStatus').textContent = registration.supported ? `Native WebMCP · ${registration.registered} tools` : 'Judge fallback · WebMCP unavailable';
    $('#webmcpStatus').dataset.supported = String(registration.supported);
    if (!registration.supported) $('#webmcpHelp').hidden = false;
  } catch (error) {
    $('#webmcpStatus').textContent = 'WebMCP registration error';
    $('#webmcpStatus').dataset.supported = 'false';
    $('#webmcpHelp').hidden = false;
    announce(error.message, true);
  }
}

init().catch((error) => {
  document.body.dataset.bootError = 'true';
  announce(`Mission Center failed to boot: ${error.message}`, true);
});
