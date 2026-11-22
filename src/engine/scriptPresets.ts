import {
  RobloxScriptClassName,
  RobloxScriptRunContext,
  RobloxServiceLocation,
  StudioSceneModel,
  StudioScriptNode,
} from './robloxTypes';

export interface ScriptTemplateEntry {
  id: string;
  label: string;
  description: string;
  className: RobloxScriptClassName;
  service: RobloxServiceLocation;
  parentFolder?: string;
  runContext: RobloxScriptRunContext;
  source: string;
}

export const SCRIPT_TEMPLATES: ScriptTemplateEntry[] = [
  {
    id: 'attack-combo',
    label: 'Attack Combo Module',
    description: 'ModuleScript tracking combo steps, damage multipliers, and animation stage transitions.',
    className: 'ModuleScript',
    service: 'ReplicatedStorage',
    parentFolder: 'Modules',
    runContext: 'Legacy',
    source: `-- AttackCombo (ModuleScript)
-- Shared combo metadata used by both Server Script and Client LocalScript
local AttackCombo = {}

AttackCombo.Steps = {
	{ Name = "ClawSlash", Stage = "Attack", Duration = 1.15, Damage = 28, Burst = 18 },
	{ Name = "JadeBreath", Stage = "Breathing", Duration = 1.60, Damage = 45, Burst = 36 },
	{ Name = "SkySweep", Stage = "Flying", Duration = 1.40, Damage = 32, Burst = 12 },
}

function AttackCombo.GetStep(index: number)
	local wrapped = ((index - 1) % #AttackCombo.Steps) + 1
	return AttackCombo.Steps[wrapped], wrapped
end

return AttackCombo
`,
  },
  {
    id: 'breath-ability',
    label: 'Breath Ability Server Handler',
    description: 'Server Script listening to RemoteEvent to trigger ParticleEmitters, PointLight pulse, Sound, and Stage animation.',
    className: 'Script',
    service: 'ServerScriptService',
    runContext: 'Server',
    source: `-- BreathAbilityServer (Script)
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local remotes = ReplicatedStorage:WaitForChild("Remotes")
local breathEvent = remotes:WaitForChild("BreathEvent")

local model = workspace:FindFirstChildWhichIsA("Model")

local function triggerEffects(burstCount: number)
	if not model then return end
	for _, desc in ipairs(model:GetDescendants()) do
		if desc:IsA("ParticleEmitter") then
			desc.Enabled = true
			desc:Emit(burstCount)
		elseif desc:IsA("PointLight") then
			desc.Enabled = true
			desc.Brightness = 4.2
		elseif desc:IsA("Sound") then
			desc:Play()
		end
	end
end

breathEvent.OnServerEvent:Connect(function(player, chargeLevel)
	local power = if typeof(chargeLevel) == "number" then chargeLevel else 1
	print("[Server] Breath attack triggered by", player and player.Name or "LocalTester", "power =", power)
	if model then
		model:SetAttribute("Stage", "Breathing")
	end
	triggerEffects(math.floor(24 * power))
	task.wait(1.3)
	if model then
		model:SetAttribute("Stage", "Idle")
	end
end)

print("[BreathAbilityServer] Ready on ServerScriptService")
`,
  },
  {
    id: 'client-keybind',
    label: 'Client Input LocalScript',
    description: 'StarterPlayerScripts LocalScript binding F / E / R keys to RemoteEvents.',
    className: 'LocalScript',
    service: 'StarterPlayerScripts',
    runContext: 'Client',
    source: `-- ClientInputController (LocalScript)
local UserInputService = game:GetService("UserInputService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local remotes = ReplicatedStorage:WaitForChild("Remotes")
local breathEvent = remotes:WaitForChild("BreathEvent")
local clawEvent = remotes:FindFirstChild("ClawEvent")

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end
	if input.KeyCode == Enum.KeyCode.F then
		print("[Client] Pressing [F] -> FireServer BreathEvent")
		breathEvent:FireServer(1.25)
	elseif input.KeyCode == Enum.KeyCode.E and clawEvent then
		print("[Client] Pressing [E] -> FireServer ClawEvent")
		clawEvent:FireServer("Combo")
	end
end)

print("[ClientInputController] Bound keys [F] Breath & [E] Claw")
`,
  },
  {
    id: 'patrol-orbit',
    label: 'Motor6D Patrol / Hover Motion',
    description: 'Workspace Script applying live CFrame / Motor6D.Transform oscillation via RunService.Heartbeat.',
    className: 'Script',
    service: 'WorkspaceModel',
    parentFolder: 'Scripts',
    runContext: 'Legacy',
    source: `-- PatrolHover (Script)
local RunService = game:GetService("RunService")
local model = script.Parent:IsA("Model") and script.Parent or workspace:FindFirstChildWhichIsA("Model")

local t = 0
local joints = {}
if model then
	for _, desc in ipairs(model:GetDescendants()) do
		if desc:IsA("Motor6D") then
			table.insert(joints, desc)
		end
	end
end

print("[PatrolHover] Driving", #joints, "Motor6D joints on Heartbeat")

RunService.Heartbeat:Connect(function(dt)
	t += dt
	if model and model.PrimaryPart then
		local bob = math.sin(t * 2.2) * 0.25
		local sway = math.sin(t * 1.4) * 0.08
		for i, joint in ipairs(joints) do
			local phase = i * 0.35
			joint.Transform = CFrame.Angles(math.sin(t * 2.4 + phase) * 0.06, sway, bob * 0.15)
		end
	end
end)
`,
  },
  {
    id: 'proximity-trigger',
    label: 'Energy Surge & Attribute Trigger',
    description: 'Script reacting to Stage attribute changes and tweening a selected part glow.',
    className: 'Script',
    service: 'WorkspaceModel',
    parentFolder: 'Scripts',
    runContext: 'Legacy',
    source: `-- EnergySurgeTrigger (Script)
local TweenService = game:GetService("TweenService")
local model = workspace:FindFirstChildWhichIsA("Model")

if model then
	model:GetAttributeChangedSignal("Stage"):Connect(function()
		local nextStage = model:GetAttribute("Stage")
		print("[EnergySurge] Stage changed to:", nextStage)
		for _, desc in ipairs(model:GetDescendants()) do
			if desc:IsA("PointLight") then
				local targetBrightness = if nextStage == "Idle" then 1.5 else 3.8
				local tw = TweenService:Create(desc, TweenInfo.new(0.35, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
					Brightness = targetBrightness,
				})
				tw:Play()
			end
		end
	end)
	print("[EnergySurge] Listening for Stage attribute updates on", model.Name)
end
`,
  },
];

export function getDefaultScriptsForModel(model: StudioSceneModel): StudioScriptNode[] {
  const safeName = model.name.trim() || 'Model';
  const clips = model.animations ?? [];
  const firstStage = clips[0]?.name ?? 'Idle';
  const breathStage = clips.find((c) => c.name.toLowerCase().includes('breath'))?.name ?? firstStage;
  const attackStage = clips.find((c) => c.name.toLowerCase().includes('attack'))?.name ?? firstStage;
  const flyStage = clips.find((c) => c.name.toLowerCase().includes('fly'))?.name ?? firstStage;
  const isDragonLike =
    safeName.toLowerCase().includes('dragon') ||
    clips.some((c) => c.name.toLowerCase().includes('breath'));

  const nodes: StudioScriptNode[] = [
    {
      id: 'scr_rem_breath',
      name: isDragonLike ? 'BreathEvent' : 'ActionEvent',
      className: 'RemoteEvent',
      service: 'ReplicatedStorage',
      parentFolder: 'Remotes',
      source: '',
      disabled: false,
      runContext: 'Legacy',
    },
    {
      id: 'scr_rem_claw',
      name: isDragonLike ? 'ClawEvent' : 'SecondaryEvent',
      className: 'RemoteEvent',
      service: 'ReplicatedStorage',
      parentFolder: 'Remotes',
      source: '',
      disabled: false,
      runContext: 'Legacy',
    },
    {
      id: 'scr_bind_stage',
      name: 'StageTrigger',
      className: 'BindableEvent',
      service: 'ReplicatedStorage',
      parentFolder: 'Events',
      source: '',
      disabled: false,
      runContext: 'Legacy',
    },
    {
      id: 'scr_val_power',
      name: isDragonLike ? 'DragonPower' : 'ModelPower',
      className: 'NumberValue',
      service: 'ReplicatedStorage',
      source: '',
      disabled: false,
      runContext: 'Legacy',
      value: 100,
    },
    {
      id: 'scr_mod_combo',
      name: 'AttackCombo',
      className: 'ModuleScript',
      service: 'ReplicatedStorage',
      parentFolder: 'Modules',
      disabled: false,
      runContext: 'Legacy',
      source: `-- AttackCombo (ModuleScript)
-- Shared configuration module required by Server and Workspace scripts
local AttackCombo = {}

AttackCombo.ModelName = ${JSON.stringify(safeName)}
AttackCombo.DefaultStage = ${JSON.stringify(firstStage)}
AttackCombo.Stages = {
	Idle = ${JSON.stringify(firstStage)},
	Fly = ${JSON.stringify(flyStage)},
	Breath = ${JSON.stringify(breathStage)},
	Attack = ${JSON.stringify(attackStage)},
}

function AttackCombo.GetDamage(baseDamage: number, powerValue: number): number
	local scale = math.clamp(powerValue / 100, 0.5, 2.5)
	return math.round(baseDamage * scale)
end

return AttackCombo
`,
    },
    {
      id: 'scr_srv_handler',
      name: isDragonLike ? 'DragonServerHandler' : 'ModelServerHandler',
      className: 'Script',
      service: 'ServerScriptService',
      disabled: false,
      runContext: 'Server',
      source: `-- ${isDragonLike ? 'DragonServerHandler' : 'ModelServerHandler'} (Server Script)
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local modulesFolder = ReplicatedStorage:WaitForChild("Modules")
local AttackCombo = require(modulesFolder:WaitForChild("AttackCombo"))

local remotes = ReplicatedStorage:WaitForChild("Remotes")
local primaryRemote = remotes:WaitForChild(${JSON.stringify(isDragonLike ? 'BreathEvent' : 'ActionEvent')})
local secondaryRemote = remotes:WaitForChild(${JSON.stringify(isDragonLike ? 'ClawEvent' : 'SecondaryEvent')})
local powerVal = ReplicatedStorage:FindFirstChild(${JSON.stringify(isDragonLike ? 'DragonPower' : 'ModelPower')})

local model = workspace:FindFirstChild(${JSON.stringify(safeName)}) or workspace:FindFirstChildWhichIsA("Model")

local function pulseModelFX(burstCount: number)
	if not model then return end
	for _, desc in ipairs(model:GetDescendants()) do
		if desc:IsA("ParticleEmitter") then
			desc:Emit(burstCount)
		elseif desc:IsA("PointLight") then
			desc.Enabled = true
			desc.Brightness = 3.6
		elseif desc:IsA("Sound") then
			desc:Play()
		end
	end
end

primaryRemote.OnServerEvent:Connect(function(player, charge)
	local power = if powerVal then powerVal.Value else 100
	local dmg = AttackCombo.GetDamage(35, power)
	print("[Server] Primary ability activated! Damage =", dmg, "charge =", charge or 1)
	if model then
		model:SetAttribute("Stage", AttackCombo.Stages.Breath)
	end
	pulseModelFX(28)
	task.delay(1.6, function()
		if model then
			model:SetAttribute("Stage", AttackCombo.DefaultStage)
		end
	end)
end)

secondaryRemote.OnServerEvent:Connect(function(player, style)
	local power = if powerVal then powerVal.Value else 100
	local dmg = AttackCombo.GetDamage(24, power)
	print("[Server] Secondary attack combo (" .. tostring(style or "Slash") .. ")! Damage =", dmg)
	if model then
		model:SetAttribute("Stage", AttackCombo.Stages.Attack)
	end
	pulseModelFX(16)
	task.delay(1.1, function()
		if model then
			model:SetAttribute("Stage", AttackCombo.DefaultStage)
		end
	end)
end)

print("[Server] Initialized handler for", AttackCombo.ModelName, "| Default stage:", AttackCombo.DefaultStage)
`,
    },
    {
      id: 'scr_cli_controls',
      name: isDragonLike ? 'DragonClientControls' : 'ModelClientControls',
      className: 'LocalScript',
      service: 'StarterPlayerScripts',
      disabled: false,
      runContext: 'Client',
      source: `-- ${isDragonLike ? 'DragonClientControls' : 'ModelClientControls'} (LocalScript)
local UserInputService = game:GetService("UserInputService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local remotes = ReplicatedStorage:WaitForChild("Remotes")
local primaryRemote = remotes:WaitForChild(${JSON.stringify(isDragonLike ? 'BreathEvent' : 'ActionEvent')})
local secondaryRemote = remotes:WaitForChild(${JSON.stringify(isDragonLike ? 'ClawEvent' : 'SecondaryEvent')})
local stageEvent = ReplicatedStorage:WaitForChild("Events"):FindFirstChild("StageTrigger")

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end
	if input.KeyCode == Enum.KeyCode.F then
		print("[Client] Input [F] -> Firing", primaryRemote.Name)
		primaryRemote:FireServer(1.25)
	elseif input.KeyCode == Enum.KeyCode.E then
		print("[Client] Input [E] -> Firing", secondaryRemote.Name)
		secondaryRemote:FireServer("ComboHit")
	elseif input.KeyCode == Enum.KeyCode.R and stageEvent then
		print("[Client] Input [R] -> Firing StageTrigger")
		stageEvent:Fire(${JSON.stringify(flyStage)})
	end
end)

print("[Client] Controls ready: Press [F] Breath/Action, [E] Attack, [R] Stage Trigger")
`,
    },
    {
      id: 'scr_ws_behavior',
      name: 'ModelBehavior',
      className: 'Script',
      service: 'WorkspaceModel',
      parentFolder: 'Scripts',
      disabled: false,
      runContext: 'Legacy',
      source: `-- ModelBehavior (Workspace Script)
-- Drives live stage transitions, KeyframeMarker events, and ambient Motor6D breathing
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local model = workspace:FindFirstChild(${JSON.stringify(safeName)}) or workspace:FindFirstChildWhichIsA("Model")
local animator = if model then model:FindFirstChild("Animator", true) else nil
local stageEvent = ReplicatedStorage:FindFirstChild("Events") and ReplicatedStorage.Events:FindFirstChild("StageTrigger")

local activeTrack = nil

local function playClipStage(stageName: string)
	if not model then return end
	if activeTrack and activeTrack.IsPlaying then
		activeTrack:Stop(0.15)
	end
	if animator then
		local track = animator:LoadAnimation(stageName)
		if track then
			track:GetMarkerReachedSignal("*"):Connect(function(markerName, markerVal)
				print("[Marker] Reached:", markerName, markerVal or "")
			end)
			track:Play(0.15)
			activeTrack = track
			print("[Behavior] Playing animation stage:", stageName)
		end
	end
end

if model then
	model:GetAttributeChangedSignal("Stage"):Connect(function()
		local requested = model:GetAttribute("Stage")
		if typeof(requested) == "string" and requested ~= "" then
			playClipStage(requested)
		end
	end)
end

if stageEvent then
	stageEvent.Event:Connect(function(stageName)
		if model and typeof(stageName) == "string" then
			model:SetAttribute("Stage", stageName)
		end
	end)
end

-- Subtle ambient Motor6D wave when idle
local elapsed = 0
local ambientJoint = if model then model:FindFirstChildWhichIsA("Motor6D", true) else nil
RunService.Heartbeat:Connect(function(dt)
	elapsed += dt
	if ambientJoint and (not activeTrack or not activeTrack.IsPlaying) then
		ambientJoint.Transform = CFrame.Angles(math.sin(elapsed * 2.0) * 0.04, 0, math.cos(elapsed * 1.5) * 0.03)
	end
end)

playClipStage(${JSON.stringify(firstStage)})
`,
    },
    {
      id: 'scr_char_aura',
      name: 'CharacterAuraClient',
      className: 'LocalScript',
      service: 'StarterCharacterScripts',
      disabled: true,
      runContext: 'Client',
      source: `-- CharacterAuraClient (StarterCharacterScripts LocalScript)
-- Optional client FX script enabled when attached to a player character
local Players = game:GetService("Players")
local localPlayer = Players.LocalPlayer

print("[CharacterAuraClient] Attached to character for", localPlayer and localPlayer.Name or "Player")
`,
    },
  ];

  return nodes;
}
