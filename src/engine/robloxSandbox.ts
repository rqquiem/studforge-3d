import fengari from 'fengari';
import * as THREE from 'three';
import {
  evaluateClipAtTime,
  EvaluatedPartPose,
  evaluateTriggeredMarkers,
} from './animationEngine';
import { transpileLuauToLua } from './luauTranspiler';
import {
  AnimationClip,
  StudioEffectNode,
  StudioPartNode,
  StudioSceneModel,
  StudioScriptNode,
  StudioSoundNode,
} from './robloxTypes';

const { lua, lauxlib, lualib, to_luastring, to_jsstring } = fengari;

export type SandboxLogLevel = 'info' | 'warn' | 'error' | 'system';

export interface SandboxLogEntry {
  id: string;
  timeSec: number;
  timestamp: string;
  level: SandboxLogLevel;
  source: string;
  message: string;
}

export interface SandboxRuntimeUpdate {
  poses: Record<string, EvaluatedPartPose>;
  effectStates: Record<string, boolean>;
  lightUpdates: Record<
    string,
    { enabled?: boolean; brightness?: number; color?: string; range?: number }
  >;
  attributes: Record<string, string | number | boolean>;
  activeStageName: string | null;
}

export interface RobloxSandboxCallbacks {
  onLog: (entry: SandboxLogEntry) => void;
  onRuntimeUpdate: (update: SandboxRuntimeUpdate) => void;
  onEmitParticles: (effectId: string, count: number) => void;
  onPulseLight: (effectId: string) => void;
  onPlaySound?: (sound: StudioSoundNode) => void;
}

function formatTimeStamp(sec: number): string {
  const s = Math.max(0, sec);
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(mins).padStart(2, '0')}:${rem.toFixed(2).padStart(5, '0')}`;
}

function round3(n: number): number {
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? 0 : r;
}

function hexToRgbTuple(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return [163, 162, 165];
  return [
    parseInt(clean.slice(0, 2), 16) || 0,
    parseInt(clean.slice(2, 4), 16) || 0,
    parseInt(clean.slice(4, 6), 16) || 0,
  ];
}

function buildRobloxLuaShim(snapshotJson: string): string {
  // Pass snapshot JSON safely inside long brackets with safe level
  const jsonSafe = snapshotJson.replace(/\]\]/g, '] ]');
  return `
-- Sandbox safety: remove OS/IO/file hooks from user environment
if os then
  os.execute = nil
  os.exit = nil
  os.remove = nil
  os.rename = nil
  os.setlocale = nil
  os.tmpname = nil
end
io = nil
dofile = nil
loadfile = nil
local __sf_debug_sethook = debug and debug.sethook
debug = nil

local __SF_SIM_TIME = 0
local __SF_CURRENT_SOURCE = "Runtime"
local __SF_OP_COUNT = 0
local __SF_OP_BUDGET = 250000

local function __sf_budget_hook()
  __SF_OP_COUNT = __SF_OP_COUNT + 2500
  if __SF_OP_COUNT >= __SF_OP_BUDGET then
    error("Execution budget exceeded (missing task.wait() inside loop?)", 2)
  end
end

local function __sf_attach_co_budget(co, maxOps)
  __SF_OP_COUNT = 0
  __SF_OP_BUDGET = maxOps or 250000
  if __sf_debug_sethook and co then
    __sf_debug_sethook(co, __sf_budget_hook, "", 2500)
  end
end

local function __sf_join(...)
  local n = select("#", ...)
  local parts = {}
  for i = 1, n do
    parts[i] = tostring(select(i, ...))
  end
  return table.concat(parts, " ")
end

function print(...)
  __sf_host_log("info", __SF_CURRENT_SOURCE, __sf_join(...))
end

function warn(...)
  __sf_host_log("warn", __SF_CURRENT_SOURCE, __sf_join(...))
end

function typeof(v)
  local t = type(v)
  if t == "table" then
    if v.__rbxType then return v.__rbxType end
    if v.ClassName then return "Instance" end
  end
  return t
end

-- Math helpers matching Luau
math.clamp = math.clamp or function(x, mn, mx)
  if x < mn then return mn end
  if x > mx then return mx end
  return x
end
math.round = math.round or function(x)
  if x >= 0 then return math.floor(x + 0.5) else return math.ceil(x - 0.5) end
end
math.sign = math.sign or function(x)
  if x > 0 then return 1 elseif x < 0 then return -1 else return 0 end
end

-- Vector3
Vector3 = {}
local Vector3_mt = {}
Vector3_mt.__index = Vector3

function Vector3.new(x, y, z)
  return setmetatable({
    __rbxType = "Vector3",
    X = tonumber(x) or 0,
    Y = tonumber(y) or 0,
    Z = tonumber(z) or 0,
  }, Vector3_mt)
end

Vector3.zero = Vector3.new(0, 0, 0)
Vector3.one = Vector3.new(1, 1, 1)

function Vector3:Lerp(goal, alpha)
  return Vector3.new(
    self.X + (goal.X - self.X) * alpha,
    self.Y + (goal.Y - self.Y) * alpha,
    self.Z + (goal.Z - self.Z) * alpha
  )
end

function Vector3_mt.__add(a, b)
  return Vector3.new(a.X + b.X, a.Y + b.Y, a.Z + b.Z)
end
function Vector3_mt.__sub(a, b)
  return Vector3.new(a.X - b.X, a.Y - b.Y, a.Z - b.Z)
end
function Vector3_mt.__mul(a, b)
  if type(a) == "number" then return Vector3.new(a * b.X, a * b.Y, a * b.Z) end
  if type(b) == "number" then return Vector3.new(a.X * b, a.Y * b, a.Z * b) end
  return Vector3.new(a.X * b.X, a.Y * b.Y, a.Z * b.Z)
end
function Vector3_mt.__unm(a)
  return Vector3.new(-a.X, -a.Y, -a.Z)
end
function Vector3_mt.__tostring(v)
  return string.format("%.3f, %.3f, %.3f", v.X, v.Y, v.Z)
end

-- Color3
Color3 = {}
local Color3_mt = {}
Color3_mt.__index = Color3

function Color3.new(r, g, b)
  return setmetatable({
    __rbxType = "Color3",
    R = math.clamp(tonumber(r) or 0, 0, 1),
    G = math.clamp(tonumber(g) or 0, 0, 1),
    B = math.clamp(tonumber(b) or 0, 0, 1),
  }, Color3_mt)
end

function Color3.fromRGB(r, g, b)
  return Color3.new((tonumber(r) or 0) / 255, (tonumber(g) or 0) / 255, (tonumber(b) or 0) / 255)
end

function Color3:Lerp(goal, alpha)
  return Color3.new(
    self.R + (goal.R - self.R) * alpha,
    self.G + (goal.G - self.G) * alpha,
    self.B + (goal.B - self.B) * alpha
  )
end

function Color3:ToHex()
  return string.format("#%02X%02X%02X", math.round(self.R * 255), math.round(self.G * 255), math.round(self.B * 255))
end

-- NumberRange, NumberSequence, ColorSequence
NumberRange = { new = function(a, b) return { __rbxType = "NumberRange", Min = a or 0, Max = b or a or 0 } end }
NumberSequenceKeypoint = { new = function(t, v, env) return { Time = t, Value = v, Envelope = env or 0 } end }
NumberSequence = { new = function(a) return { __rbxType = "NumberSequence", Keypoints = type(a) == "table" and a or { { Time = 0, Value = a or 1 }, { Time = 1, Value = a or 1 } } } end }
ColorSequenceKeypoint = { new = function(t, c) return { Time = t, Value = c } end }
ColorSequence = { new = function(a, b) return { __rbxType = "ColorSequence", Keypoints = { { Time = 0, Value = a }, { Time = 1, Value = b or a } } } end }

-- CFrame (position + 3x3 rotation matrix stored in R00..R22)
CFrame = {}
local CFrame_mt = {}
CFrame_mt.__index = function(self, k)
  if k == "Position" or k == "p" then
    return Vector3.new(self.X, self.Y, self.Z)
  end
  return CFrame[k]
end

local function makeCFrame(x, y, z, r00, r01, r02, r10, r11, r12, r20, r21, r22)
  return setmetatable({
    __rbxType = "CFrame",
    X = x or 0, Y = y or 0, Z = z or 0,
    R00 = r00 or 1, R01 = r01 or 0, R02 = r02 or 0,
    R10 = r10 or 0, R11 = r11 or 1, R12 = r12 or 0,
    R20 = r20 or 0, R21 = r21 or 0, R22 = r22 or 1,
  }, CFrame_mt)
end

function CFrame.new(x, y, z, r00, r01, r02, r10, r11, r12, r20, r21, r22)
  if type(x) == "table" and x.__rbxType == "Vector3" then
    return makeCFrame(x.X, x.Y, x.Z)
  end
  if r00 ~= nil and r22 ~= nil then
    return makeCFrame(x, y, z, r00, r01, r02, r10, r11, r12, r20, r21, r22)
  end
  return makeCFrame(x or 0, y or 0, z or 0)
end

function CFrame.Angles(rx, ry, rz)
  rx = tonumber(rx) or 0
  ry = tonumber(ry) or 0
  rz = tonumber(rz) or 0
  local cx, sx = math.cos(rx), math.sin(rx)
  local cy, sy = math.cos(ry), math.sin(ry)
  local cz, sz = math.cos(rz), math.sin(rz)
  -- XYZ Euler: R = Rx * Ry * Rz
  local r00 = cy * cz
  local r01 = -cy * sz
  local r02 = sy
  local r10 = cx * sz + sx * sy * cz
  local r11 = cx * cz - sx * sy * sz
  local r12 = -sx * cy
  local r20 = sx * sz - cx * sy * cz
  local r21 = sx * cz + cx * sy * sz
  local r22 = cx * cy
  return makeCFrame(0, 0, 0, r00, r01, r02, r10, r11, r12, r20, r21, r22)
end

CFrame.fromEulerAnglesXYZ = CFrame.Angles

function CFrame:ToEulerAnglesXYZ()
  local sy = math.clamp(self.R02, -1, 1)
  local ry = math.asin(sy)
  local rx, rz
  if math.abs(sy) < 0.99999 then
    rx = math.atan(-self.R12, self.R22)
    rz = math.atan(-self.R01, self.R00)
  else
    rx = math.atan(self.R21, self.R11)
    rz = 0
  end
  return rx, ry, rz
end

function CFrame:Inverse()
  local r00, r01, r02 = self.R00, self.R10, self.R20
  local r10, r11, r12 = self.R01, self.R11, self.R21
  local r20, r21, r22 = self.R02, self.R12, self.R22
  local x = -(r00 * self.X + r01 * self.Y + r02 * self.Z)
  local y = -(r10 * self.X + r11 * self.Y + r12 * self.Z)
  local z = -(r20 * self.X + r21 * self.Y + r22 * self.Z)
  return makeCFrame(x, y, z, r00, r01, r02, r10, r11, r12, r20, r21, r22)
end

function CFrame:Lerp(goal, alpha)
  local x = self.X + (goal.X - self.X) * alpha
  local y = self.Y + (goal.Y - self.Y) * alpha
  local z = self.Z + (goal.Z - self.Z) * alpha
  local ax, ay, az = self:ToEulerAnglesXYZ()
  local bx, by, bz = goal:ToEulerAnglesXYZ()
  local cf = CFrame.Angles(ax + (bx - ax) * alpha, ay + (by - ay) * alpha, az + (bz - az) * alpha)
  cf.X, cf.Y, cf.Z = x, y, z
  return cf
end

function CFrame_mt.__mul(a, b)
  if type(b) == "table" and b.__rbxType == "Vector3" then
    return Vector3.new(
      a.R00 * b.X + a.R01 * b.Y + a.R02 * b.Z + a.X,
      a.R10 * b.X + a.R11 * b.Y + a.R12 * b.Z + a.Y,
      a.R20 * b.X + a.R21 * b.Y + a.R22 * b.Z + a.Z
    )
  end
  local r00 = a.R00 * b.R00 + a.R01 * b.R10 + a.R02 * b.R20
  local r01 = a.R00 * b.R01 + a.R01 * b.R11 + a.R02 * b.R21
  local r02 = a.R00 * b.R02 + a.R01 * b.R12 + a.R02 * b.R22
  local r10 = a.R10 * b.R00 + a.R11 * b.R10 + a.R12 * b.R20
  local r11 = a.R10 * b.R01 + a.R11 * b.R11 + a.R12 * b.R21
  local r12 = a.R10 * b.R02 + a.R11 * b.R12 + a.R12 * b.R22
  local r20 = a.R20 * b.R00 + a.R21 * b.R10 + a.R22 * b.R20
  local r21 = a.R20 * b.R01 + a.R21 * b.R11 + a.R22 * b.R21
  local r22 = a.R20 * b.R02 + a.R21 * b.R12 + a.R22 * b.R22
  local x = a.R00 * b.X + a.R01 * b.Y + a.R02 * b.Z + a.X
  local y = a.R10 * b.X + a.R11 * b.Y + a.R12 * b.Z + a.Y
  local z = a.R20 * b.X + a.R21 * b.Y + a.R22 * b.Z + a.Z
  return makeCFrame(x, y, z, r00, r01, r02, r10, r11, r12, r20, r21, r22)
end

-- Enum tables
local function makeEnumGroup(names)
  local g = {}
  for idx, name in ipairs(names) do
    g[name] = { __rbxType = "EnumItem", Name = name, Value = idx - 1 }
  end
  return setmetatable(g, {
    __index = function(_, key)
      local item = { __rbxType = "EnumItem", Name = tostring(key), Value = 0 }
      g[key] = item
      return item
    end
  })
end

Enum = {
  EasingStyle = makeEnumGroup({ "Linear", "Sine", "Back", "Quad", "Quart", "Quint", "Bounce", "Elastic", "Exponential", "Circular", "Cubic", "Constant" }),
  EasingDirection = makeEnumGroup({ "In", "Out", "InOut" }),
  AnimationPriority = makeEnumGroup({ "Core", "Idle", "Movement", "Action", "Action2", "Action3", "Action4" }),
  Material = makeEnumGroup({ "SmoothPlastic", "Plastic", "Metal", "Neon", "Glass", "Wood", "Granite", "Cobblestone", "DiamondPlate", "CorrodedMetal", "ForceField" }),
  PartType = makeEnumGroup({ "Ball", "Block", "Cylinder" }),
  KeyCode = makeEnumGroup({ "F", "E", "R", "Q", "G", "Space", "LeftShift", "One", "Two", "Three", "W", "A", "S", "D" }),
  UserInputType = makeEnumGroup({ "Keyboard", "MouseButton1", "MouseButton2", "Touch" }),
}

TweenInfo = {}
function TweenInfo.new(time, style, direction, repeatCount, reverses, delayTime)
  return {
    __rbxType = "TweenInfo",
    Time = tonumber(time) or 1,
    EasingStyle = style or Enum.EasingStyle.Quad,
    EasingDirection = direction or Enum.EasingDirection.Out,
    RepeatCount = tonumber(repeatCount) or 0,
    Reverses = reverses == true,
    DelayTime = tonumber(delayTime) or 0,
  }
end

-- RBXScriptSignal + Coroutine Task Scheduler
local __SF_TASKS = {}
local __SF_SIGNALS = {}

local function __sf_createSignal(name)
  local listeners = {}
  local sig = { __rbxType = "RBXScriptSignal", _name = name }
  function sig:Connect(fn)
    if type(fn) ~= "function" then
      error("Signal:Connect expects a function", 2)
    end
    local entry = { fn = fn, connected = true, source = __SF_CURRENT_SOURCE }
    table.insert(listeners, entry)
    return {
      __rbxType = "RBXScriptConnection",
      Connected = true,
      Disconnect = function(cSelf)
        entry.connected = false
        cSelf.Connected = false
      end,
    }
  end
  function sig:Once(fn)
    local conn
    conn = sig:Connect(function(...)
      if conn then conn:Disconnect() end
      fn(...)
    end)
    return conn
  end
  function sig:Wait()
    local co = coroutine.running()
    if not co then return end
    local fired = false
    local packed = nil
    sig:Once(function(...)
      fired = true
      packed = table.pack(...)
      if coroutine.status(co) == "suspended" then
        table.insert(__SF_TASKS, { co = co, wakeTime = __SF_SIM_TIME, source = __SF_CURRENT_SOURCE, args = packed })
      end
    end)
    return coroutine.yield("__sf_signal_wait")
  end
  function sig:_fire(...)
    local snapshot = {}
    for _, entry in ipairs(listeners) do
      if entry.connected then
        table.insert(snapshot, entry)
      end
    end
    for _, entry in ipairs(snapshot) do
      local args = table.pack(...)
      local co = coroutine.create(function()
        __SF_CURRENT_SOURCE = entry.source or __SF_CURRENT_SOURCE
        entry.fn(table.unpack(args, 1, args.n))
      end)
      local prevSource = __SF_CURRENT_SOURCE
      __SF_CURRENT_SOURCE = entry.source or prevSource
      local ok, res = coroutine.resume(co)
      __SF_CURRENT_SOURCE = prevSource
      if not ok then
        __sf_host_log("error", entry.source or "Callback", tostring(res))
      elseif coroutine.status(co) == "suspended" and type(res) == "table" and res._wait ~= nil then
        table.insert(__SF_TASKS, { co = co, wakeTime = __SF_SIM_TIME + res._wait, source = entry.source })
      end
    end
  end
  return sig
end

task = {}
function task.wait(sec)
  local d = tonumber(sec) or 0
  local co = coroutine.running()
  if not co then return 0 end
  return coroutine.yield({ _wait = math.max(0, d) })
end
function task.spawn(fn, ...)
  local args = table.pack(...)
  local src = __SF_CURRENT_SOURCE
  local co = coroutine.create(function()
    __SF_CURRENT_SOURCE = src
    fn(table.unpack(args, 1, args.n))
  end)
  local ok, res = coroutine.resume(co)
  if not ok then
    __sf_host_log("error", src, tostring(res))
  elseif coroutine.status(co) == "suspended" and type(res) == "table" and res._wait ~= nil then
    table.insert(__SF_TASKS, { co = co, wakeTime = __SF_SIM_TIME + res._wait, source = src })
  end
  return co
end
function task.delay(sec, fn, ...)
  local args = table.pack(...)
  local d = tonumber(sec) or 0
  local src = __SF_CURRENT_SOURCE
  local co = coroutine.create(function()
    __SF_CURRENT_SOURCE = src
    task.wait(d)
    fn(table.unpack(args, 1, args.n))
  end)
  local ok, res = coroutine.resume(co)
  if not ok then
    __sf_host_log("error", src, tostring(res))
  elseif coroutine.status(co) == "suspended" and type(res) == "table" and res._wait ~= nil then
    table.insert(__SF_TASKS, { co = co, wakeTime = __SF_SIM_TIME + res._wait, source = src })
  end
  return co
end
wait = task.wait
spawn = task.spawn
delay = task.delay

-- Instance Tree & Metadata Registry
local __SF_INSTANCES_BY_ID = {}
local __SF_PARTS = {}
local __SF_JOINTS = {}
local __SF_EFFECTS = {}
local __SF_SOUNDS = {}
local __SF_ANIM_TRACKS = {}
local __SF_ACTIVE_TWEENS = {}
local __SF_MODULE_CACHE = {}

local InstanceMethods = {}
local function attachHierarchyMethods(obj)
  obj._children = obj._children or {}
  obj._attrs = obj._attrs or {}
  obj._attrSignals = obj._attrSignals or {}

  function obj:IsA(clsName)
    if self.ClassName == clsName then return true end
    if clsName == "BasePart" and (self.ClassName == "Part" or self.ClassName == "WedgePart" or self.ClassName == "CornerWedgePart" or self.ClassName == "MeshPart") then
      return true
    end
    if clsName == "LuaSourceContainer" and (self.ClassName == "Script" or self.ClassName == "LocalScript" or self.ClassName == "ModuleScript") then
      return true
    end
    if clsName == "Instance" or clsName == "PVInstance" then return true end
    return false
  end

  function obj:GetChildren()
    local copy = {}
    for i, ch in ipairs(self._children) do copy[i] = ch end
    return copy
  end

  function obj:GetDescendants()
    local list = {}
    local function walk(node)
      for _, ch in ipairs(node._children) do
        table.insert(list, ch)
        walk(ch)
      end
    end
    walk(self)
    return list
  end

  function obj:FindFirstChild(name, recursive)
    for _, ch in ipairs(self._children) do
      if ch.Name == name then return ch end
      if recursive then
        local found = ch:FindFirstChild(name, true)
        if found then return found end
      end
    end
    return nil
  end

  function obj:FindFirstChildWhichIsA(clsName, recursive)
    for _, ch in ipairs(self._children) do
      if ch:IsA(clsName) then return ch end
      if recursive then
        local found = ch:FindFirstChildWhichIsA(clsName, true)
        if found then return found end
      end
    end
    return nil
  end

  function obj:WaitForChild(name, _timeout)
    return self:FindFirstChild(name)
  end

  function obj:SetAttribute(key, val)
    self._attrs[key] = val
    if self.__isTargetModel then
      __sf_host_set_attr(tostring(key), val)
    end
    local sig = self._attrSignals[key]
    if sig then sig:_fire() end
  end

  function obj:GetAttribute(key)
    return self._attrs[key]
  end

  function obj:GetAttributeChangedSignal(key)
    if not self._attrSignals[key] then
      self._attrSignals[key] = __sf_createSignal("Attr_" .. tostring(key))
    end
    return self._attrSignals[key]
  end

  function obj:Destroy()
    if self.Parent and self.Parent._children then
      for idx, ch in ipairs(self.Parent._children) do
        if ch == self then
          table.remove(self.Parent._children, idx)
          break
        end
      end
    end
    self.Parent = nil
  end
  return obj
end

local function makeChildParentMt(rawObj)
  return setmetatable(rawObj, {
    __index = function(t, k)
      if k == "Value" and t._value ~= nil then return t._value end
      if k == "Enabled" and t._enabled ~= nil then return t._enabled end
      if k == "Brightness" and t._brightness ~= nil then return t._brightness end
      if k == "Range" and t._range ~= nil then return t._range end
      if k == "Color" and t._color ~= nil then return t._color end
      if k == "Transform" and t._transform ~= nil then return t._transform end
      if k == "CFrame" and t._cframe ~= nil then return t._cframe end
      if k == "Size" and t._size ~= nil then return t._size end
      if k == "Transparency" and t._transparency ~= nil then return t._transparency end
      for _, ch in ipairs(t._children) do
        if ch.Name == k then return ch end
      end
      return nil
    end,
    __newindex = function(t, k, v)
      if k == "Parent" then
        local oldP = rawget(t, "_parentRef")
        if oldP and oldP._children then
          for idx, ch in ipairs(oldP._children) do
            if ch == t then table.remove(oldP._children, idx) break end
          end
        end
        rawset(t, "_parentRef", v)
        if type(v) == "table" and v._children then
          table.insert(v._children, t)
        end
        return
      end
      if k == "Value" and t.ClassName:find("Value") then
        t._value = v
        if t.Changed then t.Changed:_fire(v) end
        return
      end
      if k == "Enabled" and t._effectKind then
        t._enabled = v == true
        __sf_host_fx_enabled(t._effectId, t._enabled)
        return
      end
      if (k == "Brightness" or k == "Range" or k == "Color") and t._effectKind == "PointLight" then
        if k == "Brightness" then t._brightness = tonumber(v) or t._brightness end
        if k == "Range" then t._range = tonumber(v) or t._range end
        if k == "Color" and type(v) == "table" and v.ToHex then t._color = v end
        __sf_host_light_update(t._effectId, t._enabled, t._brightness, t._color and t._color:ToHex() or "#FFFFFF", t._range)
        return
      end
      if k == "Transform" and t.ClassName == "Motor6D" then
        t._transform = v
        t._transformDirty = true
        return
      end
      if k == "CFrame" and t._partId then
        t._cframe = v
        t._cframeDirty = true
        return
      end
      if k == "Size" and t._partId then
        t._size = v
        t._propsDirty = true
        return
      end
      if k == "Color" and t._partId then
        t._color = v
        t._propsDirty = true
        return
      end
      if k == "Transparency" and t._partId then
        t._transparency = tonumber(v) or 0
        t._propsDirty = true
        return
      end
      rawset(t, k, v)
    end,
  })
end

local function createInstance(className, name, parent)
  local inst = attachHierarchyMethods({
    ClassName = className,
    Name = name or className,
    _parentRef = nil,
  })
  if className == "RemoteEvent" then
    inst.OnServerEvent = __sf_createSignal(inst.Name .. ".OnServerEvent")
    inst.OnClientEvent = __sf_createSignal(inst.Name .. ".OnClientEvent")
    function inst:FireServer(...)
      inst.OnServerEvent:_fire(Players.LocalPlayer, ...)
    end
    function inst:FireClient(_player, ...)
      inst.OnClientEvent:_fire(...)
    end
    function inst:FireAllClients(...)
      inst.OnClientEvent:_fire(...)
    end
  elseif className == "BindableEvent" then
    inst.Event = __sf_createSignal(inst.Name .. ".Event")
    function inst:Fire(...)
      inst.Event:_fire(...)
    end
  elseif className == "StringValue" or className == "NumberValue" or className == "BoolValue" or className == "ObjectValue" then
    inst._value = className == "NumberValue" and 0 or (className == "BoolValue" and false or "")
    inst.Changed = __sf_createSignal(inst.Name .. ".Changed")
  end
  local proxy = makeChildParentMt(inst)
  if parent then proxy.Parent = parent end
  return proxy
end

Instance = {}
function Instance.new(className, parent)
  return createInstance(className, className, parent)
end

-- Build Services & Model from Host Snapshot
local __snap = __sf_parse_snapshot([[${jsonSafe}]])

workspace = createInstance("Workspace", "Workspace", nil)
ReplicatedStorage = createInstance("ReplicatedStorage", "ReplicatedStorage", nil)
ServerScriptService = createInstance("ServerScriptService", "ServerScriptService", nil)
StarterPlayer = createInstance("StarterPlayer", "StarterPlayer", nil)
StarterPlayerScripts = createInstance("StarterPlayerScripts", "StarterPlayerScripts", StarterPlayer)
StarterCharacterScripts = createInstance("StarterCharacterScripts", "StarterCharacterScripts", StarterPlayer)
Players = createInstance("Players", "Players", nil)
RunService = createInstance("RunService", "RunService", nil)
RunService.Heartbeat = __sf_createSignal("RunService.Heartbeat")
RunService.RenderStepped = __sf_createSignal("RunService.RenderStepped")
RunService.Stepped = __sf_createSignal("RunService.Stepped")
function RunService:IsClient() return true end
function RunService:IsServer() return true end
function RunService:IsStudio() return true end

UserInputService = createInstance("UserInputService", "UserInputService", nil)
UserInputService.InputBegan = __sf_createSignal("UserInputService.InputBegan")
UserInputService.InputEnded = __sf_createSignal("UserInputService.InputEnded")

Debris = createInstance("Debris", "Debris", nil)
function Debris:AddItem(inst, lifetime)
  task.delay(tonumber(lifetime) or 5, function()
    if inst and inst.Destroy then inst:Destroy() end
  end)
end

-- TweenService
local function evalEase(alpha, styleName, dirName)
  local u = math.clamp(alpha, 0, 1)
  local function easeIn(t)
    if styleName == "Linear" then return t
    elseif styleName == "Constant" then return t >= 1 and 1 or 0
    elseif styleName == "Sine" then return 1 - math.cos(t * math.pi / 2)
    elseif styleName == "Quad" then return t * t
    elseif styleName == "Cubic" then return t * t * t
    elseif styleName == "Back" then local c1 = 1.70158; return (c1 + 1) * t * t * t - c1 * t * t
    else return t * t end
  end
  if styleName == "Linear" or styleName == "Constant" or dirName == "In" then return easeIn(u)
  elseif dirName == "Out" then return 1 - easeIn(1 - u)
  else
    if u < 0.5 then return easeIn(u * 2) / 2 else return 1 - easeIn((1 - u) * 2) / 2 end
  end
end

TweenService = createInstance("TweenService", "TweenService", nil)
function TweenService:GetValue(alpha, style, dir)
  local sName = type(style) == "table" and style.Name or "Linear"
  local dName = type(dir) == "table" and dir.Name or "Out"
  return evalEase(alpha, sName, dName)
end

function TweenService:Create(target, info, props)
  local tw = {
    __rbxType = "Tween",
    Completed = __sf_createSignal("Tween.Completed"),
    _playing = false,
  }
  function tw:Play()
    local initial = {}
    for k, _ in pairs(props) do
      initial[k] = target[k]
    end
    tw._playing = true
    table.insert(__SF_ACTIVE_TWEENS, {
      tween = tw,
      target = target,
      info = info,
      props = props,
      initial = initial,
      elapsed = 0,
    })
  end
  function tw:Cancel()
    tw._playing = false
  end
  return tw
end

-- Populate Workspace Model + Parts + Joints + Attachments + Effects + Sounds + AnimSaves
local __modelInst = createInstance("Model", __snap.modelName, workspace)
__modelInst.__isTargetModel = true

Players.LocalPlayer = {
  __rbxType = "Player",
  Name = "StudioTester",
  DisplayName = "StudioTester",
  UserId = 1,
  Character = __modelInst,
}

local __partsById = {}
for _, p in ipairs(__snap.parts) do
  local clsName = (p.shape == "Wedge" and "WedgePart") or (p.shape == "CornerWedge" and "CornerWedgePart") or "Part"
  local partInst = createInstance(clsName, p.name, __modelInst)
  partInst._partId = p.id
  partInst._size = Vector3.new(p.size[1], p.size[2], p.size[3])
  partInst._color = Color3.fromRGB(p.rgb[1], p.rgb[2], p.rgb[3])
  partInst._transparency = p.transparency
  partInst._cframe = CFrame.new(p.pos[1], p.pos[2], p.pos[3]) * CFrame.Angles(math.rad(p.rot[1]), math.rad(p.rot[2]), math.rad(p.rot[3]))
  partInst.Anchored = p.anchored
  __partsById[p.id] = partInst
  __SF_PARTS[p.id] = partInst
  if p.id == __snap.primaryPartId then
    __modelInst.PrimaryPart = partInst
  end

  local attById = {}
  for _, att in ipairs(p.attachments or {}) do
    local attInst = createInstance("Attachment", att.name, partInst)
    attInst.CFrame = CFrame.new(att.position[1], att.position[2], att.position[3])
    attById[att.id] = attInst
  end

  for _, fx in ipairs(p.effects or {}) do
    local fxParent = (fx.attachmentId and attById[fx.attachmentId]) or partInst
    local fxInst = createInstance(fx.kind, fx.name, fxParent)
    fxInst._effectKind = fx.kind
    fxInst._effectId = fx.id
    fxInst._enabled = fx.enabled
    if fx.kind == "ParticleEmitter" then
      function fxInst:Emit(cnt)
        __sf_host_emit(fx.id, math.max(1, tonumber(cnt) or fx.burstCount or 16))
      end
    elseif fx.kind == "PointLight" then
      fxInst._brightness = fx.brightness or 1.5
      fxInst._range = fx.range or 10
      fxInst._color = Color3.fromRGB(fx.rgb[1], fx.rgb[2], fx.rgb[3])
    end
    __SF_EFFECTS[fx.id] = fxInst
  end

  for _, snd in ipairs(p.sounds or {}) do
    local sndInst = createInstance("Sound", snd.name, partInst)
    sndInst._soundId = snd.id
    sndInst.SoundId = snd.soundId
    sndInst.Volume = snd.volume
    sndInst.PlaybackSpeed = snd.playbackSpeed
    sndInst.Looped = snd.looped
    sndInst.IsPlaying = false
    sndInst.TimePosition = 0
    function sndInst:Play()
      sndInst.IsPlaying = true
      __sf_host_sound_play(snd.id, sndInst.Volume, sndInst.PlaybackSpeed)
    end
    function sndInst:Stop()
      sndInst.IsPlaying = false
    end
    __SF_SOUNDS[snd.id] = sndInst
  end
end

-- Joints
for _, j in ipairs(__snap.joints) do
  local p0 = __partsById[j.parentId]
  local p1 = __partsById[j.partId]
  if p0 and p1 then
    local joint = createInstance("Motor6D", "Joint_" .. p1.Name, p1)
    joint._partId = j.partId
    joint.Part0 = p0
    joint.Part1 = p1
    joint.C0 = CFrame.new(j.c0Pos[1], j.c0Pos[2], j.c0Pos[3])
    joint.C1 = CFrame.new(j.c1Pos[1], j.c1Pos[2], j.c1Pos[3])
    joint._transform = CFrame.new()
    __SF_JOINTS[j.partId] = joint
  end
end

-- Audio folder mirror inside model for SoundController compatibility
local __audioFolder = createInstance("Folder", "Audio", __modelInst)
for _, sndInst in pairs(__SF_SOUNDS) do
  local cloneRef = createInstance("Sound", sndInst.Name, __audioFolder)
  cloneRef.SoundId = sndInst.SoundId
  cloneRef.Volume = sndInst.Volume
  cloneRef.PlaybackSpeed = sndInst.PlaybackSpeed
  function cloneRef:Play() sndInst:Play() end
  function cloneRef:Stop() sndInst:Stop() end
end

-- AnimationController + Animator + AnimSaves
local __animCtrl = createInstance("AnimationController", "AnimationController", __modelInst)
local __animator = createInstance("Animator", "Animator", __animCtrl)
local __animSaves = createInstance("Folder", "AnimSaves", __modelInst)

local __clipsByName = {}
for _, clip in ipairs(__snap.animations or {}) do
  local kfSeq = createInstance("KeyframeSequence", clip.name, __animSaves)
  kfSeq.Loop = clip.loop
  __clipsByName[string.lower(clip.name)] = clip
end

function __animator:LoadAnimation(animArg)
  local reqName = ""
  if type(animArg) == "string" then
    reqName = animArg
  elseif type(animArg) == "table" then
    reqName = animArg.Name or animArg.AnimationId or ""
  end
  local clip = __clipsByName[string.lower(tostring(reqName))]
  if not clip and __snap.animations and #__snap.animations > 0 then
    clip = __snap.animations[1]
  end
  local track = {
    __rbxType = "AnimationTrack",
    Name = clip and clip.name or tostring(reqName),
    Length = clip and clip.duration or 1.0,
    Looped = clip and clip.loop or false,
    IsPlaying = false,
    TimePosition = 0,
    Speed = 1,
    Weight = 1,
    _clipId = clip and clip.id or nil,
    _markerSignals = {},
    _wildcardSignals = {},
  }
  function track:GetMarkerReachedSignal(markerName)
    local sig = __sf_createSignal("Marker_" .. tostring(markerName))
    if markerName == "*" then
      table.insert(track._wildcardSignals, sig)
    else
      track._markerSignals[markerName] = track._markerSignals[markerName] or {}
      table.insert(track._markerSignals[markerName], sig)
    end
    return sig
  end
  function track:Play(_fadeTime, weight, speed)
    if weight then track.Weight = tonumber(weight) or 1 end
    if speed then track.Speed = tonumber(speed) or 1 end
    track.TimePosition = 0
    track.IsPlaying = true
    if track._clipId then
      __SF_ANIM_TRACKS[track] = track
      __sf_host_set_stage(track.Name)
    end
  end
  function track:Stop(_fadeTime)
    track.IsPlaying = false
    __SF_ANIM_TRACKS[track] = nil
  end
  function track:AdjustWeight(w)
    track.Weight = tonumber(w) or 1
  end
  return track
end

-- Populate Script/Event/Value nodes into Roblox Services
local function ensureFolder(serviceRoot, folderPath)
  if not folderPath or folderPath == "" then return serviceRoot end
  local cur = serviceRoot
  for seg in string.gmatch(folderPath, "[^/]+") do
    local existing = cur:FindFirstChild(seg)
    if not existing then
      existing = createInstance("Folder", seg, cur)
    end
    cur = existing
  end
  return cur
end

local __serviceRoots = {
  WorkspaceModel = __modelInst,
  ReplicatedStorage = ReplicatedStorage,
  ServerScriptService = ServerScriptService,
  StarterPlayerScripts = StarterPlayerScripts,
  StarterCharacterScripts = StarterCharacterScripts,
}

for _, node in ipairs(__snap.scripts or {}) do
  local svc = __serviceRoots[node.service] or __modelInst
  local parent = ensureFolder(svc, node.parentFolder)
  local inst = createInstance(node.className, node.name, parent)
  inst._scriptId = node.id
  inst.Disabled = node.disabled == true
  if node.value ~= nil and (inst.ClassName == "StringValue" or inst.ClassName == "NumberValue" or inst.ClassName == "BoolValue") then
    inst._value = node.value
  end
  __SF_INSTANCES_BY_ID[node.id] = inst
end

game = createInstance("DataModel", "Game", nil)
local __servicesByName = {
  Workspace = workspace,
  ReplicatedStorage = ReplicatedStorage,
  ServerScriptService = ServerScriptService,
  StarterPlayer = StarterPlayer,
  Players = Players,
  RunService = RunService,
  TweenService = TweenService,
  UserInputService = UserInputService,
  Debris = Debris,
}
function game:GetService(svcName)
  return __servicesByName[svcName]
end

-- require(moduleScript) implementation backed by JS Fengari compiler
function require(modInst)
  if type(modInst) ~= "table" or not modInst._scriptId then
    error("require() expects a valid ModuleScript Instance", 2)
  end
  local sid = modInst._scriptId
  if __SF_MODULE_CACHE[sid] ~= nil then
    return __SF_MODULE_CACHE[sid]
  end
  local prevScript = script
  local prevSource = __SF_CURRENT_SOURCE
  script = modInst
  __SF_CURRENT_SOURCE = modInst.Name
  local chunkFn, err = __sf_host_compile_module(sid)
  if not chunkFn then
    script = prevScript
    __SF_CURRENT_SOURCE = prevSource
    error("Failed loading module " .. modInst.Name .. ": " .. tostring(err), 2)
  end
  local ok, res = pcall(chunkFn)
  script = prevScript
  __SF_CURRENT_SOURCE = prevSource
  if not ok then
    error("Module runtime error in " .. modInst.Name .. ": " .. tostring(res), 2)
  end
  __SF_MODULE_CACHE[sid] = res
  return res
end

function __SF_BOOT_SCRIPT(scriptId)
  local inst = __SF_INSTANCES_BY_ID[scriptId]
  if not inst then return end
  script = inst
  __SF_CURRENT_SOURCE = inst.Name
  local chunkFn, err = __sf_host_compile_module(scriptId)
  if not chunkFn then
    __sf_host_log("error", inst.Name, tostring(err))
    return
  end
  local co = coroutine.create(function()
    __SF_CURRENT_SOURCE = inst.Name
    script = inst
    chunkFn()
  end)
  __sf_attach_co_budget(co, 250000)
  local ok, res = coroutine.resume(co)
  if not ok then
    __sf_host_log("error", inst.Name, tostring(res))
  elseif coroutine.status(co) == "suspended" and type(res) == "table" and res._wait ~= nil then
    table.insert(__SF_TASKS, { co = co, wakeTime = __SF_SIM_TIME + res._wait, source = inst.Name })
  end
end

function __SF_FIRE_KEY(keyName)
  local item = Enum.KeyCode[keyName] or Enum.KeyCode.F
  UserInputService.InputBegan:_fire({
    KeyCode = item,
    UserInputType = Enum.UserInputType.Keyboard,
  }, false)
end

function __SF_FIRE_NODE_EVENT(scriptId, ...)
  local inst = __SF_INSTANCES_BY_ID[scriptId]
  if not inst then return end
  if inst.ClassName == "RemoteEvent" then
    inst.OnServerEvent:_fire(Players.LocalPlayer, ...)
    inst.OnClientEvent:_fire(...)
  elseif inst.ClassName == "BindableEvent" then
    inst.Event:_fire(...)
  end
end

function __SF_SET_MODEL_ATTR(key, val)
  __modelInst:SetAttribute(key, val)
end

function __SF_STEP(dt)
  __SF_SIM_TIME = __SF_SIM_TIME + dt

  -- 1. Advance AnimationTracks and notify marker listeners
  for tr, _ in pairs(__SF_ANIM_TRACKS) do
    if tr.IsPlaying and tr._clipId then
      local prevT = tr.TimePosition
      local nextT = prevT + dt * (tr.Speed or 1)
      local wrapped = false
      if nextT >= tr.Length then
        if tr.Looped then
          nextT = nextT % math.max(0.01, tr.Length)
          wrapped = true
        else
          nextT = tr.Length
          tr.IsPlaying = false
        end
      end
      tr.TimePosition = nextT
      local hitMarkers = __sf_host_eval_markers(tr._clipId, prevT, nextT, wrapped)
      if hitMarkers then
        for _, mk in ipairs(hitMarkers) do
          for _, ws in ipairs(tr._wildcardSignals) do
            ws:_fire(mk.name, mk.value)
          end
          local exactList = tr._markerSignals[mk.name]
          if exactList then
            for _, sig in ipairs(exactList) do
              sig:_fire(mk.value)
            end
          end
        end
      end
      if not tr.IsPlaying then
        __SF_ANIM_TRACKS[tr] = nil
      end
    else
      __SF_ANIM_TRACKS[tr] = nil
    end
  end

  -- 2. Advance active Tweens
  for i = #__SF_ACTIVE_TWEENS, 1, -1 do
    local tw = __SF_ACTIVE_TWEENS[i]
    if not tw.tween._playing then
      table.remove(__SF_ACTIVE_TWEENS, i)
    else
      tw.elapsed = tw.elapsed + dt
      local dur = math.max(0.001, tw.info.Time)
      local alpha = math.clamp(tw.elapsed / dur, 0, 1)
      local eased = TweenService:GetValue(alpha, tw.info.EasingStyle, tw.info.EasingDirection)
      for k, goalVal in pairs(tw.props) do
        local startVal = tw.initial[k]
        if type(goalVal) == "number" and type(startVal) == "number" then
          tw.target[k] = startVal + (goalVal - startVal) * eased
        elseif type(goalVal) == "table" and goalVal.Lerp and type(startVal) == "table" then
          tw.target[k] = startVal:Lerp(goalVal, eased)
        end
      end
      if alpha >= 1 then
        tw.tween._playing = false
        table.remove(__SF_ACTIVE_TWEENS, i)
        tw.tween.Completed:_fire()
      end
    end
  end

  -- 3. Resume ready scheduled coroutines
  local pending = {}
  local ready = {}
  for _, t in ipairs(__SF_TASKS) do
    if t.wakeTime <= __SF_SIM_TIME then
      table.insert(ready, t)
    else
      table.insert(pending, t)
    end
  end
  __SF_TASKS = pending

  for _, t in ipairs(ready) do
    local prevSource = __SF_CURRENT_SOURCE
    __SF_CURRENT_SOURCE = t.source or prevSource
    __sf_attach_co_budget(t.co, 250000)
    local ok, res
    if t.args then
      ok, res = coroutine.resume(t.co, table.unpack(t.args, 1, t.args.n))
    else
      ok, res = coroutine.resume(t.co)
    end
    __SF_CURRENT_SOURCE = prevSource
    if not ok then
      __sf_host_log("error", t.source or "Task", tostring(res))
    elseif coroutine.status(t.co) == "suspended" and type(res) == "table" and res._wait ~= nil then
      table.insert(__SF_TASKS, { co = t.co, wakeTime = __SF_SIM_TIME + res._wait, source = t.source })
    end
  end

  -- 4. Fire RunService Heartbeat
  RunService.Heartbeat:_fire(dt)

  -- 5. Sync playing AnimationTracks + Motor6D.Transform + Part properties back to Host
  for tr, _ in pairs(__SF_ANIM_TRACKS) do
    if tr.IsPlaying and tr._clipId then
      __sf_host_sync_track(tr._clipId, tr.TimePosition, tr.Weight or 1)
    end
  end

  for partId, joint in pairs(__SF_JOINTS) do
    if joint._transformDirty and joint._transform then
      local tr = joint._transform
      local rx, ry, rz = tr:ToEulerAnglesXYZ()
      __sf_host_sync_joint_delta(partId, tr.X, tr.Y, tr.Z, math.deg(rx), math.deg(ry), math.deg(rz))
      joint._transformDirty = false
    end
  end

  for partId, partInst in pairs(__SF_PARTS) do
    if partInst._cframeDirty and partInst._cframe then
      local cf = partInst._cframe
      local rx, ry, rz = cf:ToEulerAnglesXYZ()
      __sf_host_sync_part_cframe(partId, cf.X, cf.Y, cf.Z, math.deg(rx), math.deg(ry), math.deg(rz))
      partInst._cframeDirty = false
    end
    if partInst._propsDirty then
      local sz = partInst._size
      local colHex = partInst._color and partInst._color:ToHex() or "#FFFFFF"
      __sf_host_sync_part_props(partId, sz.X, sz.Y, sz.Z, colHex, partInst._transparency or 0)
      partInst._propsDirty = false
    end
  end
end
`;
}

export class RobloxSandboxRunner {
  private model: StudioSceneModel;
  private scripts: StudioScriptNode[];
  private callbacks: RobloxSandboxCallbacks;
  private L: fengari.LuaState | null = null;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private simTime = 0;
  private logSeq = 0;
  private scriptById = new Map<string, StudioScriptNode>();
  private clipById = new Map<string, AnimationClip>();
  private soundById = new Map<string, StudioSoundNode>();

  // Accumulated runtime overrides flushed per step
  private runtimePoses: Record<string, EvaluatedPartPose> = {};
  private runtimeJointDeltas = new Map<
    string,
    { pos: [number, number, number]; rotDeg: [number, number, number] }
  >();
  private runtimeTrackSample: { clipId: string; time: number; weight: number } | null = null;
  private runtimeEffectStates: Record<string, boolean> = {};
  private runtimeLightUpdates: Record<
    string,
    { enabled?: boolean; brightness?: number; color?: string; range?: number }
  > = {};
  private runtimeAttributes: Record<string, string | number | boolean> = {};
  private activeStageName: string | null = null;

  constructor(
    model: StudioSceneModel,
    scripts: StudioScriptNode[],
    callbacks: RobloxSandboxCallbacks
  ) {
    this.model = model;
    this.scripts = scripts;
    this.callbacks = callbacks;
    for (const s of scripts) this.scriptById.set(s.id, s);
    for (const c of model.animations ?? []) this.clipById.set(c.id, c);
    for (const p of model.parts) {
      for (const snd of p.sounds ?? []) this.soundById.set(snd.id, snd);
    }
  }

  public isRunning(): boolean {
    return this.running;
  }

  private emitLog(level: SandboxLogLevel, source: string, message: string) {
    this.callbacks.onLog({
      id: `log_${++this.logSeq}`,
      timeSec: round3(this.simTime),
      timestamp: formatTimeStamp(this.simTime),
      level,
      source,
      message,
    });
  }

  private resetInstructionBudget(maxOps = 250000) {
    if (!this.L) return;
    const L = this.L;
    let ops = 0;
    const luaAny = lua as unknown as {
      lua_sethook: (L: fengari.LuaState, fn: (() => void) | null, mask: number, count: number) => void;
      LUA_MASKCOUNT: number;
    };
    luaAny.lua_sethook(
      L,
      () => {
        ops += 5000;
        if (ops >= maxOps) {
          lauxlib.luaL_error(
            L,
            to_luastring('Execution budget exceeded (missing task.wait() inside loop?)')
          );
        }
      },
      luaAny.LUA_MASKCOUNT,
      5000
    );
  }

  private buildSnapshotPayload() {
    const activeParts = this.model.parts.filter((p) => p.visible);
    const activeIds = new Set(activeParts.map((p) => p.id));

    return {
      modelName: this.model.name.trim() || 'Model',
      primaryPartId: this.model.primaryPartId,
      parts: activeParts.map((p) => ({
        id: p.id,
        name: p.name,
        shape: p.shape,
        pos: p.position,
        rot: p.rotation,
        size: p.size,
        rgb: hexToRgbTuple(p.color),
        transparency: p.transparency,
        anchored: p.anchored,
        attachments: (p.attachments ?? []).map((a) => ({
          id: a.id,
          name: a.name,
          position: a.position,
        })),
        effects: (p.effects ?? []).map((fx: StudioEffectNode) => ({
          id: fx.id,
          name: fx.name,
          kind: fx.kind,
          enabled: fx.enabled,
          attachmentId: 'attachmentId' in fx ? fx.attachmentId ?? null : null,
          burstCount: fx.kind === 'ParticleEmitter' ? fx.burstCount : 16,
          brightness: fx.kind === 'PointLight' ? fx.brightness : undefined,
          range: fx.kind === 'PointLight' ? fx.range : undefined,
          rgb: hexToRgbTuple(fx.color),
        })),
        sounds: (p.sounds ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          soundId: s.soundId,
          volume: s.volume,
          playbackSpeed: s.playbackSpeed,
          looped: s.looped,
        })),
      })),
      joints: activeParts
        .filter((p) => p.parentId && activeIds.has(p.parentId))
        .map((p) => ({
          partId: p.id,
          parentId: p.parentId!,
          c0Pos: p.position,
          c1Pos: p.pivotOffset ?? [0, 0, 0],
        })),
      animations: (this.model.animations ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        duration: c.duration,
        loop: c.loop,
      })),
      scripts: this.scripts.map((s) => ({
        id: s.id,
        name: s.name,
        className: s.className,
        service: s.service,
        parentFolder: s.parentFolder ?? '',
        disabled: s.disabled,
        value: s.value ?? null,
      })),
    };
  }

  private registerHostBridges(L: fengari.LuaState) {
    const pushJsValue = (val: unknown) => {
      if (val === null || val === undefined) {
        lua.lua_pushnil(L);
      } else if (typeof val === 'boolean') {
        lua.lua_pushboolean(L, val);
      } else if (typeof val === 'number') {
        lua.lua_pushnumber(L, val);
      } else if (typeof val === 'string') {
        lua.lua_pushstring(L, to_luastring(val));
      } else if (Array.isArray(val)) {
        lua.lua_newtable(L);
        val.forEach((item, idx) => {
          pushJsValue(item);
          lua.lua_rawseti(L, -2, idx + 1);
        });
      } else if (typeof val === 'object') {
        lua.lua_newtable(L);
        for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
          pushJsValue(v);
          lua.lua_setfield(L, -2, to_luastring(k));
        }
      } else {
        lua.lua_pushnil(L);
      }
    };

    const registerFn = (name: string, fn: (state: fengari.LuaState) => number) => {
      lua.lua_pushjsfunction(L, fn);
      lua.lua_setglobal(L, to_luastring(name));
    };

    registerFn('__sf_host_log', (state) => {
      const levelRaw = lua.lua_tojsstring(state, 1) || 'info';
      const source = lua.lua_tojsstring(state, 2) || 'Script';
      const message = lua.lua_tojsstring(state, 3) || '';
      const level: SandboxLogLevel =
        levelRaw === 'warn' || levelRaw === 'error' || levelRaw === 'system'
          ? levelRaw
          : 'info';
      this.emitLog(level, source, message);
      return 0;
    });

    registerFn('__sf_parse_snapshot', (state) => {
      const jsonStr = lua.lua_tojsstring(state, 1) || '{}';
      const parsed = JSON.parse(jsonStr);
      pushJsValue(parsed);
      return 1;
    });

    registerFn('__sf_host_compile_module', (state) => {
      const scriptId = lua.lua_tojsstring(state, 1) || '';
      const node = this.scriptById.get(scriptId);
      if (!node) {
        lua.lua_pushnil(state);
        lua.lua_pushstring(state, to_luastring(`Unknown script id: ${scriptId}`));
        return 2;
      }
      try {
        const luaCode = transpileLuauToLua(node.source);
        const bytes = to_luastring(luaCode);
        const status = lauxlib.luaL_loadbuffer(
          state,
          bytes,
          bytes.length,
          to_luastring(`@${node.name}`)
        );
        if (status !== lua.LUA_OK) {
          const errMsg = lua.lua_tojsstring(state, -1) || 'Syntax error';
          lua.lua_pop(state, 1);
          lua.lua_pushnil(state);
          lua.lua_pushstring(state, to_luastring(errMsg));
          return 2;
        }
        return 1;
      } catch (err) {
        lua.lua_pushnil(state);
        lua.lua_pushstring(
          state,
          to_luastring(err instanceof Error ? err.message : 'Transpile error')
        );
        return 2;
      }
    });

    registerFn('__sf_host_emit', (state) => {
      const effectId = lua.lua_tojsstring(state, 1) || '';
      const count = Math.max(1, Math.round(lua.lua_tonumber(state, 2) || 16));
      if (effectId) this.callbacks.onEmitParticles(effectId, count);
      return 0;
    });

    registerFn('__sf_host_fx_enabled', (state) => {
      const effectId = lua.lua_tojsstring(state, 1) || '';
      const enabled = lua.lua_toboolean(state, 2);
      if (effectId) {
        this.runtimeEffectStates[effectId] = enabled;
      }
      return 0;
    });

    registerFn('__sf_host_light_update', (state) => {
      const effectId = lua.lua_tojsstring(state, 1) || '';
      const enabled = lua.lua_toboolean(state, 2);
      const brightness = lua.lua_tonumber(state, 3);
      const color = lua.lua_tojsstring(state, 4) || '#FFFFFF';
      const range = lua.lua_tonumber(state, 5);
      if (effectId) {
        this.runtimeLightUpdates[effectId] = { enabled, brightness, color, range };
        this.runtimeEffectStates[effectId] = enabled;
        this.callbacks.onPulseLight(effectId);
      }
      return 0;
    });

    registerFn('__sf_host_sound_play', (state) => {
      const soundId = lua.lua_tojsstring(state, 1) || '';
      const vol = lua.lua_tonumber(state, 2);
      const speed = lua.lua_tonumber(state, 3);
      const snd = this.soundById.get(soundId);
      if (snd) {
        this.emitLog('system', 'Audio', `Sound:Play() -> ${snd.name} (vol ${vol.toFixed(2)}, ${speed.toFixed(2)}x)`);
        this.callbacks.onPlaySound?.(snd);
      }
      return 0;
    });

    registerFn('__sf_host_set_attr', (state) => {
      const key = lua.lua_tojsstring(state, 1) || '';
      const typ = lua.lua_type(state, 2);
      let val: string | number | boolean = '';
      if (typ === lua.LUA_TBOOLEAN) val = lua.lua_toboolean(state, 2);
      else if (typ === lua.LUA_TNUMBER) val = lua.lua_tonumber(state, 2);
      else val = lua.lua_tojsstring(state, 2) || '';
      if (key) {
        this.runtimeAttributes[key] = val;
        if (key === 'Stage' && typeof val === 'string') {
          this.activeStageName = val;
        }
      }
      return 0;
    });

    registerFn('__sf_host_set_stage', (state) => {
      const stageName = lua.lua_tojsstring(state, 1) || '';
      if (stageName) this.activeStageName = stageName;
      return 0;
    });

    registerFn('__sf_host_eval_markers', (state) => {
      const clipId = lua.lua_tojsstring(state, 1) || '';
      const prevT = lua.lua_tonumber(state, 2);
      const nextT = lua.lua_tonumber(state, 3);
      const wrapped = lua.lua_toboolean(state, 4);
      const clip = this.clipById.get(clipId);
      const hits = evaluateTriggeredMarkers(clip, prevT, nextT, wrapped);
      pushJsValue(
        hits.map((m) => {
          if (m.effectId) {
            if (m.effectAction === 'enable') {
              this.runtimeEffectStates[m.effectId] = true;
            } else if (m.effectAction === 'disable') {
              this.runtimeEffectStates[m.effectId] = false;
            } else if (m.effectAction === 'pulse') {
              this.callbacks.onPulseLight(m.effectId);
              this.callbacks.onEmitParticles(m.effectId, m.burstCount ?? 20);
            } else {
              this.callbacks.onEmitParticles(m.effectId, m.burstCount ?? 20);
            }
          }
          return { name: m.name, value: m.value };
        })
      );
      return 1;
    });

    registerFn('__sf_host_sync_track', (state) => {
      const clipId = lua.lua_tojsstring(state, 1) || '';
      const time = lua.lua_tonumber(state, 2);
      const weight = lua.lua_tonumber(state, 3) || 1;
      this.runtimeTrackSample = { clipId, time, weight };
      return 0;
    });

    registerFn('__sf_host_sync_joint_delta', (state) => {
      const partId = lua.lua_tojsstring(state, 1) || '';
      const dx = lua.lua_tonumber(state, 2);
      const dy = lua.lua_tonumber(state, 3);
      const dz = lua.lua_tonumber(state, 4);
      const rx = lua.lua_tonumber(state, 5);
      const ry = lua.lua_tonumber(state, 6);
      const rz = lua.lua_tonumber(state, 7);
      if (partId) {
        this.runtimeJointDeltas.set(partId, {
          pos: [dx, dy, dz],
          rotDeg: [rx, ry, rz],
        });
      }
      return 0;
    });

    registerFn('__sf_host_sync_part_cframe', (state) => {
      const partId = lua.lua_tojsstring(state, 1) || '';
      const x = lua.lua_tonumber(state, 2);
      const y = lua.lua_tonumber(state, 3);
      const z = lua.lua_tonumber(state, 4);
      const rx = lua.lua_tonumber(state, 5);
      const ry = lua.lua_tonumber(state, 6);
      const rz = lua.lua_tonumber(state, 7);
      const part = this.model.parts.find((p) => p.id === partId);
      if (part) {
        const cur = this.runtimePoses[partId] ?? {
          position: [...part.position],
          rotation: [...part.rotation],
          size: [...part.size],
          color: part.color,
          transparency: part.transparency,
        };
        cur.position = [round3(x), round3(y), round3(z)];
        cur.rotation = [round3(rx), round3(ry), round3(rz)];
        this.runtimePoses[partId] = cur;
      }
      return 0;
    });

    registerFn('__sf_host_sync_part_props', (state) => {
      const partId = lua.lua_tojsstring(state, 1) || '';
      const sx = lua.lua_tonumber(state, 2);
      const sy = lua.lua_tonumber(state, 3);
      const sz = lua.lua_tonumber(state, 4);
      const color = lua.lua_tojsstring(state, 5) || '#FFFFFF';
      const transp = lua.lua_tonumber(state, 6);
      const part = this.model.parts.find((p) => p.id === partId);
      if (part) {
        const cur = this.runtimePoses[partId] ?? {
          position: [...part.position],
          rotation: [...part.rotation],
          size: [...part.size],
          color: part.color,
          transparency: part.transparency,
        };
        cur.size = [Math.max(0.05, round3(sx)), Math.max(0.05, round3(sy)), Math.max(0.05, round3(sz))];
        cur.color = color;
        cur.transparency = Math.max(0, Math.min(0.99, round3(transp)));
        this.runtimePoses[partId] = cur;
      }
      return 0;
    });
  }

  public start(autoTick = true): boolean {
    this.stop(false);
    this.simTime = 0;
    this.runtimePoses = {};
    this.runtimeJointDeltas.clear();
    this.runtimeTrackSample = null;
    this.runtimeEffectStates = {};
    this.runtimeLightUpdates = {};
    this.runtimeAttributes = {};
    this.activeStageName = null;

    const L = lauxlib.luaL_newstate();
    lualib.luaL_openlibs(L);
    this.L = L;
    this.registerHostBridges(L);
    this.resetInstructionBudget(350000);

    const shim = buildRobloxLuaShim(JSON.stringify(this.buildSnapshotPayload()));
    const shimBytes = to_luastring(shim);
    const loadRes = lauxlib.luaL_loadbuffer(L, shimBytes, shimBytes.length, to_luastring('@RobloxShim'));
    if (loadRes !== lua.LUA_OK || lua.lua_pcall(L, 0, 0, 0) !== lua.LUA_OK) {
      const msg = lua.lua_tojsstring(L, -1) || 'Failed to initialize Roblox runtime shim';
      this.emitLog('error', 'Runtime', msg);
      this.L = null;
      return false;
    }

    const runnable = this.scripts.filter(
      (s) => !s.disabled && (s.className === 'Script' || s.className === 'LocalScript')
    );

    this.running = true;
    this.emitLog(
      'system',
      'StudioVM',
      `Booted Luau sandbox (${runnable.length} active script${runnable.length === 1 ? '' : 's'})`
    );

    for (const s of runnable) {
      this.resetInstructionBudget(250000);
      lua.lua_getglobal(L, to_luastring('__SF_BOOT_SCRIPT'));
      lua.lua_pushstring(L, to_luastring(s.id));
      if (lua.lua_pcall(L, 1, 0, 0) !== lua.LUA_OK) {
        const errMsg = lua.lua_tojsstring(L, -1) || 'Boot error';
        lua.lua_pop(L, 1);
        this.emitLog('error', s.name, errMsg);
      }
    }

    this.flushRuntimeVisuals();

    if (autoTick && typeof setInterval !== 'undefined') {
      this.timerId = setInterval(() => {
        if (this.running) this.step(0.033);
      }, 33);
    }

    return true;
  }

  public step(dtSec: number) {
    if (!this.running || !this.L) return;
    const dt = Math.max(0.001, Math.min(0.1, dtSec));
    this.simTime += dt;
    this.runtimeTrackSample = null;
    this.resetInstructionBudget(250000);

    lua.lua_getglobal(this.L, to_luastring('__SF_STEP'));
    lua.lua_pushnumber(this.L, dt);
    if (lua.lua_pcall(this.L, 1, 0, 0) !== lua.LUA_OK) {
      const errMsg = lua.lua_tojsstring(this.L, -1) || 'Step runtime error';
      lua.lua_pop(this.L, 1);
      this.emitLog('error', 'Heartbeat', errMsg);
    }

    this.flushRuntimeVisuals();
  }

  private flushRuntimeVisuals() {
    const mergedPoses: Record<string, EvaluatedPartPose> = {};

    // Start from playing animation track poses if any
    if (this.runtimeTrackSample) {
      const clip = this.clipById.get(this.runtimeTrackSample.clipId);
      if (clip) {
        const clipPoses = evaluateClipAtTime(
          this.model,
          { ...clip, defaultWeight: this.runtimeTrackSample.weight },
          this.runtimeTrackSample.time
        );
        for (const [pid, pose] of Object.entries(clipPoses)) {
          mergedPoses[pid] = pose;
        }
      }
    }

    // Apply explicit part mutations from Lua
    for (const [pid, pose] of Object.entries(this.runtimePoses)) {
      mergedPoses[pid] = { ...pose };
    }

    // Compose Motor6D.Transform deltas on top
    const eDelta = new THREE.Euler();
    const qBase = new THREE.Quaternion();
    const qDelta = new THREE.Quaternion();
    const eBase = new THREE.Euler();
    for (const [partId, delta] of this.runtimeJointDeltas.entries()) {
      const part = this.model.parts.find((p) => p.id === partId);
      if (!part) continue;
      const base: EvaluatedPartPose = mergedPoses[partId] ?? {
        position: [...part.position],
        rotation: [...part.rotation],
        size: [...part.size],
        color: part.color,
        transparency: part.transparency,
      };
      eBase.set(
        THREE.MathUtils.degToRad(base.rotation[0]),
        THREE.MathUtils.degToRad(base.rotation[1]),
        THREE.MathUtils.degToRad(base.rotation[2]),
        'XYZ'
      );
      eDelta.set(
        THREE.MathUtils.degToRad(delta.rotDeg[0]),
        THREE.MathUtils.degToRad(delta.rotDeg[1]),
        THREE.MathUtils.degToRad(delta.rotDeg[2]),
        'XYZ'
      );
      qBase.setFromEuler(eBase);
      qDelta.setFromEuler(eDelta);
      qBase.multiply(qDelta);
      eBase.setFromQuaternion(qBase, 'XYZ');

      mergedPoses[partId] = {
        ...base,
        position: [
          round3(base.position[0] + delta.pos[0]),
          round3(base.position[1] + delta.pos[1]),
          round3(base.position[2] + delta.pos[2]),
        ],
        rotation: [
          round3(THREE.MathUtils.radToDeg(eBase.x)),
          round3(THREE.MathUtils.radToDeg(eBase.y)),
          round3(THREE.MathUtils.radToDeg(eBase.z)),
        ],
      };
    }

    this.callbacks.onRuntimeUpdate({
      poses: mergedPoses,
      effectStates: { ...this.runtimeEffectStates },
      lightUpdates: { ...this.runtimeLightUpdates },
      attributes: { ...this.runtimeAttributes },
      activeStageName: this.activeStageName,
    });
  }

  public triggerKey(keyName: string) {
    if (!this.running || !this.L) return;
    this.resetInstructionBudget(250000);
    lua.lua_getglobal(this.L, to_luastring('__SF_FIRE_KEY'));
    lua.lua_pushstring(this.L, to_luastring(keyName));
    if (lua.lua_pcall(this.L, 1, 0, 0) !== lua.LUA_OK) {
      const errMsg = lua.lua_tojsstring(this.L, -1) || 'Key trigger error';
      lua.lua_pop(this.L, 1);
      this.emitLog('error', 'Input', errMsg);
    }
    this.flushRuntimeVisuals();
  }

  public fireEvent(nodeId: string, arg?: string | number | boolean) {
    if (!this.running || !this.L) return;
    const node = this.scriptById.get(nodeId);
    this.emitLog('system', 'Trigger', `Fired ${node?.name ?? nodeId}`);
    this.resetInstructionBudget(250000);
    lua.lua_getglobal(this.L, to_luastring('__SF_FIRE_NODE_EVENT'));
    lua.lua_pushstring(this.L, to_luastring(nodeId));
    let nargs = 1;
    if (arg !== undefined) {
      if (typeof arg === 'boolean') lua.lua_pushboolean(this.L, arg);
      else if (typeof arg === 'number') lua.lua_pushnumber(this.L, arg);
      else lua.lua_pushstring(this.L, to_luastring(String(arg)));
      nargs = 2;
    }
    if (lua.lua_pcall(this.L, nargs, 0, 0) !== lua.LUA_OK) {
      const errMsg = lua.lua_tojsstring(this.L, -1) || 'Event dispatch error';
      lua.lua_pop(this.L, 1);
      this.emitLog('error', node?.name ?? 'Event', errMsg);
    }
    this.flushRuntimeVisuals();
  }

  public setModelAttribute(key: string, val: string | number | boolean) {
    if (!this.running || !this.L) return;
    this.resetInstructionBudget(250000);
    lua.lua_getglobal(this.L, to_luastring('__SF_SET_MODEL_ATTR'));
    lua.lua_pushstring(this.L, to_luastring(key));
    if (typeof val === 'boolean') lua.lua_pushboolean(this.L, val);
    else if (typeof val === 'number') lua.lua_pushnumber(this.L, val);
    else lua.lua_pushstring(this.L, to_luastring(String(val)));
    if (lua.lua_pcall(this.L, 2, 0, 0) !== lua.LUA_OK) {
      const errMsg = lua.lua_tojsstring(this.L, -1) || 'SetAttribute error';
      lua.lua_pop(this.L, 1);
      this.emitLog('error', 'Attribute', errMsg);
    }
    this.flushRuntimeVisuals();
  }

  public stop(logStop = true) {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    const wasRunning = this.running;
    this.running = false;
    this.L = null;
    this.runtimePoses = {};
    this.runtimeJointDeltas.clear();
    this.runtimeTrackSample = null;
    this.runtimeEffectStates = {};
    this.runtimeLightUpdates = {};
    this.runtimeAttributes = {};
    this.activeStageName = null;

    if (wasRunning && logStop) {
      this.emitLog('system', 'StudioVM', 'Stopped scripts and reset 3D rig to rest pose.');
    }
    this.callbacks.onRuntimeUpdate({
      poses: {},
      effectStates: {},
      lightUpdates: {},
      attributes: {},
      activeStageName: null,
    });
  }
}
