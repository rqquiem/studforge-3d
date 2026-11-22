import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fengari from 'fengari';
import { transpileLuauToLua } from './luauTranspiler';
import { MODEL_PRESETS } from './presets';
import { RobloxSandboxRunner, SandboxLogEntry, SandboxRuntimeUpdate } from './robloxSandbox';
import { getDefaultScriptsForModel } from './scriptPresets';
import {
  resolveConfinedFileTarget,
  resolveConfinedModelDir,
  resolveConfinedWorkspaceRoot,
  sanitizeGitRepoSubpath,
  sanitizeWorkspaceFolderName,
} from '../server/workspaceConfinement';

test('transpileLuauToLua converts Luau type annotations, compound ops, inline if, continue, and string interpolation', () => {
  const luau = `
export type AttackStep = {
  Name: string,
  Damage: number,
}
type Callback = (x: number) -> boolean

local count: number = 0
local msg: string = ""
for i = 1, 5 do
  if i == 3 then
    continue
  end
  count += i
  msg ..= tostring(i)
end

local function scaleDamage(base: number, mult: number?): number
  local factor = if mult then mult else 1
  return (base :: number) * factor
end

local summary = \`Count={count},Dmg={scaleDamage(10, 2)}\`
local obj = { Ping = function(self, v) return v end }
local echoed = obj:Ping("ok")
return count, msg, summary, echoed
`;

  const lua = transpileLuauToLua(luau);
  assert.ok(!lua.includes('export type'));
  assert.ok(!lua.includes('+='));
  assert.ok(!lua.includes('..='));
  assert.ok(lua.includes('::__sf_cont_'));
  assert.ok(lua.includes('obj:Ping("ok")'));

  // Execute transpiled Lua directly inside Fengari to verify valid Lua 5.3 semantics
  const { lua: flua, lauxlib, lualib, to_luastring } = fengari;
  const L = lauxlib.luaL_newstate();
  lualib.luaL_openlibs(L);
  const bytes = to_luastring(lua);
  assert.equal(lauxlib.luaL_loadbuffer(L, bytes, bytes.length, to_luastring('@test')), flua.LUA_OK);
  assert.equal(flua.lua_pcall(L, 0, 4, 0), flua.LUA_OK);
  assert.equal(flua.lua_tonumber(L, -4), 12);
  assert.equal(flua.lua_tojsstring(L, -3), '1245');
  assert.equal(flua.lua_tojsstring(L, -2), 'Count=12,Dmg=20');
  assert.equal(flua.lua_tojsstring(L, -1), 'ok');
});

test('RobloxSandboxRunner executes Jade Dragon starter scripts, handles keybind -> RemoteEvent -> FX & Stage playback', () => {
  const baseDragon = MODEL_PRESETS[0].model;
  const scripts = getDefaultScriptsForModel(baseDragon);
  const dragon = { ...baseDragon, scripts };

  const logs: SandboxLogEntry[] = [];
  const emittedBursts: Array<{ effectId: string; count: number }> = [];
  const pulsedLights: string[] = [];
  let latestUpdate: SandboxRuntimeUpdate | null = null;

  const runner = new RobloxSandboxRunner(dragon, scripts, {
    onLog: (entry) => logs.push(entry),
    onRuntimeUpdate: (u) => {
      latestUpdate = u;
    },
    onEmitParticles: (effectId, count) => emittedBursts.push({ effectId, count }),
    onPulseLight: (effectId) => pulsedLights.push(effectId),
  });

  const started = runner.start(false);
  assert.equal(started, true);
  assert.equal(
    logs.some((l) => l.level === 'error'),
    false,
    `Expected zero boot errors, got: ${JSON.stringify(logs.filter((l) => l.level === 'error'))}`
  );
  assert.ok(
    logs.some((l) => l.message.includes('Initialized handler') || l.message.includes('Controls ready')),
    'Should log initial script boot output'
  );

  // Trigger simulated F key (Client LocalScript -> BreathEvent:FireServer -> Server Handler)
  runner.triggerKey('F');
  assert.ok(
    logs.some((l) => l.message.includes('Breath') || l.message.includes('F]')),
    'Pressing F should trigger breath handler logs'
  );
  assert.ok(emittedBursts.length > 0, 'Breath server handler should trigger ParticleEmitter:Emit');
  assert.ok(pulsedLights.length > 0, 'Breath server handler should pulse PointLight');

  // Trigger E key (Attack combo using AttackCombo ModuleScript via require)
  runner.triggerKey('E');
  assert.ok(
    logs.some((l) => l.message.includes('Combo Step') || l.message.includes('Attack')),
    'Pressing E should invoke AttackCombo module and log combo step'
  );

  // Step Heartbeat simulation and ensure Motor6D poses update without runtime errors
  for (let i = 0; i < 8; i++) {
    runner.step(0.033);
  }
  assert.equal(
    logs.some((l) => l.level === 'error'),
    false,
    `Expected zero runtime errors after step, got: ${JSON.stringify(logs.filter((l) => l.level === 'error'))}`
  );
  assert.ok(latestUpdate !== null);
  assert.ok(Object.keys((latestUpdate as SandboxRuntimeUpdate).poses).length > 0);

  runner.stop(true);
  assert.ok(logs.some((l) => l.message.includes('Stopped scripts')));
});

test('RobloxSandboxRunner catches syntax/runtime errors and aborts infinite loops via instruction budget', () => {
  const base = MODEL_PRESETS[0].model;
  const badModel = {
    ...base,
    scripts: [
      {
        id: 'scr_loop',
        name: 'InfiniteLoopScript',
        className: 'Script' as const,
        service: 'ServerScriptService' as const,
        source: `
          local x = 0
          while true do
            x += 1
          end
        `,
        disabled: false,
        runContext: 'Server' as const,
      },
      {
        id: 'scr_err',
        name: 'SyntaxErrScript',
        className: 'Script' as const,
        service: 'WorkspaceModel' as const,
        source: `local a = (1 + `,
        disabled: false,
        runContext: 'Legacy' as const,
      },
    ],
  };

  const logs: SandboxLogEntry[] = [];
  const runner = new RobloxSandboxRunner(badModel, badModel.scripts, {
    onLog: (entry) => logs.push(entry),
    onRuntimeUpdate: () => {},
    onEmitParticles: () => {},
    onPulseLight: () => {},
  });

  runner.start(false);
  const errorLogs = logs.filter((l) => l.level === 'error');
  assert.ok(errorLogs.length >= 2, 'Both infinite loop and syntax error should emit error logs');
  assert.ok(
    errorLogs.some((l) => l.message.toLowerCase().includes('budget')),
    'Infinite loop should trigger instruction budget abort'
  );
  runner.stop(false);
});

test('workspaceConfinement prevents path traversal and resolves confined workspace targets safely', () => {
  assert.equal(sanitizeWorkspaceFolderName('../../etc/passwd'), 'etc_passwd');
  assert.equal(sanitizeWorkspaceFolderName('Jade Blocky Dragon!'), 'Jade_Blocky_Dragon');

  const root = resolveConfinedWorkspaceRoot('/app/applet');
  assert.equal(root, path.resolve('/app/applet', 'roblox-workspace'));

  const modelDir = resolveConfinedModelDir('/app/applet', 'JadeDragon');
  assert.equal(modelDir, path.resolve('/app/applet/roblox-workspace', 'JadeDragon'));

  const validFile = resolveConfinedFileTarget(
    modelDir,
    'src/ReplicatedStorage/Modules/AttackCombo.luau'
  );
  assert.equal(
    validFile.absolutePath,
    path.resolve('/app/applet/roblox-workspace/JadeDragon/src/ReplicatedStorage/Modules/AttackCombo.luau')
  );

  assert.throws(() => resolveConfinedFileTarget(modelDir, '../outside.txt'), /not allowed|escapes/);
  assert.throws(() => resolveConfinedFileTarget(modelDir, '/etc/passwd'), /Absolute|escapes/);
  assert.throws(() => resolveConfinedFileTarget(modelDir, 'C:\\evil.lua'), /Absolute|Invalid/);
  assert.throws(() => resolveConfinedFileTarget(modelDir, 'bad\0file.lua'), /Invalid/);

  assert.equal(
    sanitizeGitRepoSubpath('/roblox/Dragon/', 'default.project.json'),
    'roblox/Dragon/default.project.json'
  );
  assert.throws(() => sanitizeGitRepoSubpath('roblox', '../secret'), /Invalid/);
});
