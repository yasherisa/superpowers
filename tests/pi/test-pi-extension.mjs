import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');
const packageJsonPath = resolve(repoRoot, 'package.json');
const extensionPath = resolve(repoRoot, '.pi/extensions/superpowers.ts');
const piToolsPath = resolve(repoRoot, 'skills/using-superpowers/references/pi-tools.md');

async function readPackageJson() {
  return JSON.parse(await readFile(packageJsonPath, 'utf8'));
}

async function loadExtension() {
  const handlers = new Map();
  const pi = {
    on(event, handler) {
      if (!handlers.has(event)) handlers.set(event, []);
      handlers.get(event).push(handler);
    },
  };
  const mod = await import(pathToFileURL(extensionPath).href + `?cachebust=${Date.now()}-${Math.random()}`);
  mod.default(pi);
  return { handlers };
}

function firstHandler(handlers, event) {
  const eventHandlers = handlers.get(event) ?? [];
  assert.equal(eventHandlers.length, 1, `expected one ${event} handler`);
  return eventHandlers[0];
}

test('package.json declares a pi package with skills and extension resources', async () => {
  const pkg = await readPackageJson();

  assert.equal(pkg.name, 'superpowers');
  assert.ok(pkg.keywords.includes('pi-package'));
  assert.deepEqual(pkg.pi.skills, ['./skills']);
  assert.deepEqual(pkg.pi.extensions, ['./.pi/extensions/superpowers.ts']);
});

test('extension registers resource discovery and the per-run system prompt hook only', async () => {
  const { handlers } = await loadExtension();

  assert.deepEqual([...handlers.keys()].sort(), ['before_agent_start', 'resources_discover']);
});

test('resources_discover contributes the bundled skills directory', async () => {
  const { handlers } = await loadExtension();
  const discover = firstHandler(handlers, 'resources_discover');

  const result = await discover({ type: 'resources_discover', cwd: repoRoot, reason: 'startup' }, {});

  assert.deepEqual(result.skillPaths, [resolve(repoRoot, 'skills')]);
});

test('every agent run, not only the first, gets the bootstrap at the end of its system prompt', async () => {
  const { handlers } = await loadExtension();
  const beforeAgentStart = firstHandler(handlers, 'before_agent_start');
  const systemPrompt = 'You are a coding agent.';

  for (const prompt of ['Reply with exactly: one', "Let's make a react todo list"]) {
    const result = await beforeAgentStart({ type: 'before_agent_start', prompt, systemPrompt }, {});
    assert.ok(result.systemPrompt.startsWith(systemPrompt));
    assert.match(result.systemPrompt, /You have superpowers/);
    assert.match(result.systemPrompt, /Pi tool mapping/);
  }

  const already = await beforeAgentStart({ type: 'before_agent_start', prompt: 'x', systemPrompt: (await beforeAgentStart({ type: 'before_agent_start', prompt: 'x', systemPrompt }, {})).systemPrompt }, {});
  assert.equal(already, undefined, 'bootstrap should not duplicate when already present');
});

test("a harness catalog's clause against loading skills is replaced by using-superpowers' rule", async () => {
  const { handlers } = await loadExtension();
  const beforeAgentStart = firstHandler(handlers, 'before_agent_start');
  const catalog = "Use the read tool to load a skill's file when its description matches the task and its instructions would change the work; keyword overlap or mere availability is not a reason.";

  const result = await beforeAgentStart({ type: 'before_agent_start', prompt: 'x', systemPrompt: catalog }, {});

  assert.doesNotMatch(result.systemPrompt, /mere availability is not a reason/);
  assert.match(result.systemPrompt, /even a 1% chance a skill applies, load it before acting/);
});

test('pi tools reference documents pi-specific mappings', async () => {
  assert.equal(existsSync(piToolsPath), true, 'pi-tools.md should exist');
  const text = await readFile(piToolsPath, 'utf8');

  // Assert against the mapping-table rows only. The surrounding prose mentions
  // these same tokens, so matching the whole file would still pass if the table
  // were deleted — the exact regression this test exists to catch.
  const rows = text.split('\n').filter((line) => line.startsWith('|'));
  assert.ok(
    rows.some((row) => /subagent/i.test(row)),
    'mapping table documents subagent dispatch',
  );
  assert.ok(
    rows.some((row) => /todo|task/i.test(row)),
    'mapping table documents task tracking',
  );
});
