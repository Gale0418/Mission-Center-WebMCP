import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'index.html','assets/app.css','assets/app.js','assets/core.js','assets/webmcp.js','data/mission.json',
  'README.md','LICENSE','UPSTREAM_BASELINE.md','CHALLENGE_SUBMISSION.md','DEMO_SCRIPT.md','SECURITY.md','PRIVACY.md',
  'review/STRICT_REVIEW_PROMPT.md','review/REVIEW_LOG.md','.github/workflows/ci.yml','package.json','scripts/build-site.mjs'
];
const failures = [];
for (const relative of required) {
  try { if (!(await stat(path.join(root, relative))).isFile()) failures.push(`${relative}: not a file`); }
  catch { failures.push(`${relative}: missing`); }
}
const html = await readFile(path.join(root, 'index.html'), 'utf8');
const webmcp = await readFile(path.join(root, 'assets/webmcp.js'), 'utf8');
const app = await readFile(path.join(root, 'assets/app.js'), 'utf8');
const readme = await readFile(path.join(root, 'README.md'), 'utf8');
if (!html.includes('Content-Security-Policy')) failures.push('index.html: CSP meta missing');
if (!html.includes('href="./assets/app.css"') || !html.includes('src="./assets/app.js"')) failures.push('index.html: root-safe asset paths missing');
if (!app.includes("fetch('./data/mission.json'")) failures.push('app.js: root-safe mission data path missing');
if (!webmcp.includes('document.modelContext') && !webmcp.includes('document.modelContext'.replace('document.',''))) failures.push('WebMCP modelContext integration missing');
const toolNames = [...webmcp.matchAll(/name:\s*'([^']+)'/g)].map((match) => match[1]).filter((name) => name.startsWith('mission_'));
if (new Set(toolNames).size !== 8) failures.push(`expected 8 WebMCP tools, found ${new Set(toolNames).size}`);
if (webmcp.includes('approve_proposal') || webmcp.includes('mission_approve')) failures.push('agent approval tool must not exist');
if (!app.includes('approveProposal')) failures.push('human approval handler missing');
if (!readme.includes('1d032c4708eb198259a4ea625a7d731b5277e431')) failures.push('README must disclose upstream baseline commit');
const forbidden = ['OPENAI_API_KEY', 'BEGIN PRIVATE KEY', 'sk-proj-', 'ghp_'];
for (const file of ['assets/app.js','assets/core.js','assets/webmcp.js','data/mission.json','README.md']) {
  const text = await readFile(path.join(root, file), 'utf8');
  for (const needle of forbidden) if (text.includes(needle)) failures.push(`${file}: forbidden secret-like marker ${needle}`);
}
const entries = await readdir(root);
if (entries.includes('node_modules')) failures.push('node_modules must not be committed');
const workflow = await readFile(path.join(root, '.github/workflows/ci.yml'), 'utf8');
if (/uses:\s+[^@\s]+@v\d+/m.test(workflow)) failures.push('GitHub Actions must be pinned to immutable commit SHAs');
if (!workflow.includes('path: _site')) failures.push('Pages workflow must deploy only the minimal _site artifact');
if (failures.length) {
  console.error('VERIFY FAILED\n' + failures.map((f) => `- ${f}`).join('\n'));
  process.exit(1);
}
console.log(`VERIFY PASS · ${required.length} required files · ${new Set(toolNames).size} WebMCP tools · no agent approval tool`);
