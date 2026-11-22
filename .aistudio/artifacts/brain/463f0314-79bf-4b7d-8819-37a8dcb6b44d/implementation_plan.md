# Roblox Script Workshop & GitHub Model-Script Sync

Integrates a live **Roblox Script Workshop** directly into StudForge 3D—supporting full Roblox service hierarchies (`ReplicatedStorage`, `ServerScriptService`, `StarterPlayerScripts`, `StarterCharacterScripts`, `Workspace`), Luau execution inside an in-browser sandbox wired to the live 3D rig, FX, Audio, and Output Console, plus unified **Rojo + `.rbxmx` + `.luau`** sync to both the local workspace folder and GitHub repositories.

## User Review & Critical Decisions

> [!IMPORTANT]
> All core architectural choices below reflect your confirmed preferences from the design interview. One GitHub OAuth configuration note is highlighted for live preview/deployment.

- **Workspace Placement (Confirmed)**: Added as a third top-level workspace tab (`Model | Animate | Scripts`) beside the existing Model and Animate modes, preserving split-screen access to the live 3D viewport while writing and testing Luau scripts.
- **Roblox Service Tree & Script Classes (Confirmed)**: Supports full Roblox service containers (`Workspace/<ModelName>`, `ReplicatedStorage`, `ServerScriptService`, `StarterPlayer/StarterPlayerScripts`, `StarterPlayer/StarterCharacterScripts`) with `Script`, `LocalScript`, `ModuleScript`, `RemoteEvent`, `BindableEvent`, and typed Value objects (`StringValue`, `NumberValue`, `BoolValue`, `ObjectValue`).
- **Live In-Browser Script Testing (Confirmed)**: Runs real Lua/Luau scripts inside a sandboxed VM connected directly to the 3D model's `Motor6D` joints, `ParticleEmitter`s, `Trail`s, `PointLight`s, `Sound` cues, `Animator` stage tracks, `KeyframeMarker` signals, and a live Output Console with Play/Stop and custom test events.
- **GitHub & Workspace Sync (Confirmed)**: Combines (1) **In-app GitHub Push** via Personal Access Token (PAT) or GitHub OAuth popup, (2) **Local Workspace Folder Sync** saving ready-to-commit files directly into the project repository, and (3) **Rojo-compatible project layout** (`default.project.json`, `.luau` service scripts, `.rbxmx` model package, and `.glb`/`.obj` 3D exports).

> [!NOTE]
> **GitHub OAuth Setup**: GitHub OAuth sign-in uses `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` environment variables with the exact OAuth callback URL displayed inside the GitHub Sync modal. Personal Access Token (PAT) push and Local Workspace Sync work immediately with zero server secret configuration.

---

## 1. Overview & Core Concept

- **What It Does**: Bridges 3D blocky modeling, Motor6D rigging/animation, Roblox Studio Luau scripting, live runtime testing, and version-controlled GitHub publishing in a single workspace. Users author `ServerScriptService`, `ReplicatedStorage`, and `StarterPlayer` scripts alongside their 3D model, test them live against the 3D dragon or custom model in-browser, and publish the entire model + script project to Roblox Studio (`.rbxmx` / Rojo) and GitHub.
- **Target Audience**: Roblox creators, scripters, and modelers prototyping animated NPCs, bosses, tools, and interactive props who want rapid iteration before importing into Roblox Studio or managing team projects via Rojo + GitHub.
- **Key Value**: Eliminates blind copy-pasting between 3D tools and Roblox Studio—users verify `Motor6D.Transform` updates, `GetMarkerReachedSignal` triggers, `RemoteEvent`/`BindableEvent` interactions, `ParticleEmitter:Emit()`, and `Stage` attribute listeners live on their 3D model, then push the exact playable bundle to GitHub and Studio in one flow.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Author & Organize Scripts (`Scripts` Workspace Tab)**:
     - Switching to `Scripts` opens a docked 3-column studio IDE beside/above the live 3D viewport: a collapsible **Roblox Service Explorer** on the left (grouped by `Workspace.<Model>`, `ReplicatedStorage`, `ServerScriptService`, `StarterPlayerScripts`, `StarterCharacterScripts`), a syntax-colored **Luau Code Editor** in the center with line numbers, instance metadata (`ClassName`, `RunContext`, `Disabled`), and starter templates (`AttackCombo`, `BreathAbility`, `ClientInput`, `PatrolAI`, `StageController`), and a split **Live 3D Preview + Output Console** on the right/bottom.
     - Pre-built framework modules (`ModelRuntime`, `RigAnimator`, `FXController`, `SoundController`, `StageConfig`) plus starter `LocalScript` / `ServerScript` examples load automatically and stay editable.
  2. **Test Scripts Live in Browser**:
     - Clicking **Run Scripts** executes enabled `ModuleScript` dependencies (on demand via `require`), `Script`s, and `LocalScript`s inside the Luau runtime sandbox.
     - Users see live `print` / `warn` / `error` logs with script source attribution and tabular timestamps in the Output Console, watch the 3D model animate/rotate joints/emit particles/pulse lights in real time, and can fire test events (`Fire RemoteEvent`, set `Stage` attribute, or click a **Simulate Client Trigger** action) while running, or click **Stop & Reset** to restore the model's rest pose cleanly.
  3. **Export & Push to GitHub / Workspace**:
     - Clicking **GitHub & Sync** (or opening **Export Roblox**) lets users **Sync to Workspace** (writes `.rbxmx`, `.luau` service tree, `default.project.json`, `.obj`/`.glb`, and project `.json` into a workspace export folder) and/or **Push to GitHub** by authenticating via **PAT** or **GitHub OAuth popup**, picking a repository/branch/commit message, previewing the exact manifest of files to be pushed, and committing everything in a single atomic push with a direct link to the resulting commit.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: High-precision dark developer studio matching StudForge 3D's existing workspace—crisp hairline borders, disciplined 60-30-10 dark slate surfaces, zero nested card clutter, and no fake telemetry tickers.
  - *Color Palette & Mood*: Deep obsidian canvas (`#0e1015`), charcoal structural panels (`#151821` and `#11141c`), muted border hairlines (`rgba(255,255,255,0.10)`), primary Cobalt Blue (`#2563EB`) for primary Run / Push actions, and strict semantic accents: Emerald (`#16A34A`) for running scripts / `Script` icons / sync success, Sky (`#38BDF8`) for `LocalScript`, Violet (`#A855F7`) for `ModuleScript`, Amber (`#D97706`) for warnings/events, and Crimson (`#DC2626`) for runtime script errors.
  - *Typography & Hierarchy*: Keeps existing `Plus Jakarta Sans` UI display/body typography paired strictly with `JetBrains Mono` (`tabular-nums`) for Luau code, line numbers, console timestamps, and file commit manifests.
- **Interactive Feedback & Motion**:
  - Instant (<150ms) state transitions between `Model`, `Animate`, and `Scripts` modes; clear Empty, Running, Error (highlighting failing script + line number in console), and Syncing/Pushing loading spinners with explicit error recovery messages.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Real In-Browser Lua VM + Luau Transpiler vs. Regex-Only Mock Runner**
  - *Chosen Approach*: Embed a genuine pure-JS Lua 5.3 VM (`fengari`) preceded by a lightweight Luau syntax normalizer (stripping type annotations, `export type` blocks, compound assignments `+=`/`-=`, ternary `if/then/else` expressions, `continue`, and backtick string interpolation) bound to a Roblox API shim.
  - *Why*: Users can write real loops, functions, tables, `task.wait` coroutines, `require()` across `ModuleScript`s, `Connect()` callbacks, and `TweenService` / `Motor6D` logic and see authentic runtime behavior and real line-numbered errors—not canned mock outputs.
  - *Alternatives Considered*: A custom JS parser/interpreter (would break on metatables, closures, and standard Lua patterns).
- **Decision 2: Unified Studio Project State Including Services & Scripts**
  - *Chosen Approach*: Extend the scene model schema with an optional `scripts` / `serviceInstances` collection covering `Script`, `LocalScript`, `ModuleScript`, `RemoteEvent`, `BindableEvent`, and Value objects, defaulting to synchronized framework + starter scripts per preset and surviving model switches/clones.
  - *Why*: Scripts travel seamlessly with `.studforge.json` saves, `.rbxmx` package exports (placed into their matching Roblox service folders inside the exported XML), Rojo `default.project.json`, local workspace sync, and GitHub commits.
- **Decision 3: Dual GitHub Auth (PAT + OAuth Popup) & Backend Express Proxy**
  - *Chosen Approach*: Upgrade the runtime to an Express + Vite full-stack server supporting (a) Local Workspace filesystem sync strictly confined to a dedicated export directory, (b) popup-based GitHub OAuth returning a short-lived in-memory bearer session token via `postMessage` (never stored in `localStorage`), and (c) direct PAT authentication passed in request headers solely for the active session, using the GitHub Git Data API for clean single-commit multi-file pushes.
  - *Why*: Satisfies both zero-config instant testing (PAT + local workspace sync) and full multi-user GitHub OAuth sign-in inside the iframe preview constraints.

---

## 4. Technical Architecture & Data Strategy

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          StudForge 3D Client (React)                      │
│  ┌─────────────┐   ┌──────────────────┐   ┌────────────────────────────┐  │
│  │ Model Mode  │   │ Animate Mode     │   │ Scripts Workshop Mode      │  │
│  │ Parts/Rig   │   │ Keyframes/FX/Mkr │   │ Service Explorer + Luau VM │  │
│  └──────┬──────┘   └────────┬─────────┘   └─────────────┬──────────────┘  │
│         └───────────────────┼───────────────────────────┘                 │
│                             ▼                                             │
│              ┌──────────────────────────────┐                             │
│              │ Unified StudioSceneModel     │                             │
│              │ (Parts, Joints, FX, Audio,   │                             │
│              │  Clips, Scripts, Services)   │                             │
│              └──────┬───────────────┬───────┘                             │
│                     │               │                                     │
│     ┌───────────────▼────┐    ┌─────▼──────────────────────────────┐      │
│     │ Luau Sandbox VM    │    │ Package & Rojo Bundle Builder      │      │
│     │ - Luau Preprocessor│    │ - .rbxmx (Model + Services + FX)   │      │
│     │ - Roblox API Shim  │    │ - default.project.json (Rojo)      │      │
│     │ - Drives 3D Rig/FX │    │ - .server.luau / .client.luau / .luau│     │
│     │   & Output Console │    │ - .obj + .mtl / .glb / .json       │      │
│     └────────────────────┘    └─────────────────┬──────────────────┘      │
└─────────────────────────────────────────────────┼─────────────────────────┘
                                                  │ HTTP / Bearer Auth
                                                  ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                    Express + Vite Server Runtime                          │
│  ┌───────────────────────────┐   ┌─────────────────────────────────────┐  │
│  │ /api/workspace/sync       │   │ /api/auth/github/url & /auth/callback│ │
│  │ Writes Rojo + .rbxmx +    │   │ /api/github/repos & /api/github/push│  │
│  │ scripts inside confined   │   │ Atomic Git Data API commits via PAT │  │
│  │ workspace export folder   │   │ or in-memory OAuth session token    │  │
│  └───────────────────────────┘   └─────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - **Service Nodes & Scripts**: Each script/instance node stores `id`, `name`, `className` (`Script`, `LocalScript`, `ModuleScript`, `RemoteEvent`, `BindableEvent`, `StringValue`, `NumberValue`, `BoolValue`, `ObjectValue`, `Folder`), `service` (`WorkspaceModel`, `ReplicatedStorage`, `ServerScriptService`, `StarterPlayerScripts`, `StarterCharacterScripts`), `parentFolder`, `source` (Luau code), `disabled`, `runContext`, and optional initial `value`.
  - **Runtime Bridge State**: Holds active `isScriptRunning`, timestamped console entries (`info`, `warn`, `error`, `system`), live runtime pose/appearance/attribute/FX overrides applied cleanly onto the Three.js `StudioViewport` during Playtest, and simulated `RemoteEvent` / `BindableEvent` dispatch controls.
  - **Export & Rojo Packaging**: Extending `.rbxmx` generation to emit `<Item class="Script|LocalScript|ModuleScript|RemoteEvent|BindableEvent|*Value">` cleanly into their target service folders alongside the rigged model, while generating a complete Rojo-compatible file map for workspace sync and GitHub pushes.
- **Interactive Component & State Mapping**:
  - *Service Explorer*: Tree filter, add script/event/value under any service folder, toggle `Disabled`, rename, delete, or apply starter templates.
  - *Luau Editor & Runner*: Live editor updates `StudioSceneModel.scripts`; **Run** transpiles & boots the Luau VM, connects `RunService.Heartbeat`, `GetAttributeChangedSignal`, `TweenService`, and `Motor6D.Transform` overrides back into the 3D viewport, and streams console logs; **Stop** tears down coroutines/timers and clears runtime overrides.
  - *GitHub & Workspace Sync Modal*: Allows choosing **PAT** or **GitHub OAuth** login, fetching repositories/branches, selecting which bundle outputs to include (`.rbxmx`, Rojo `.luau` scripts + `default.project.json`, `.obj`/`.glb` 3D mesh, project JSON), syncing directly to the local workspace directory, and executing atomic GitHub pushes with real progress and commit links.
- **Security & Trust Boundaries**:
  - Server filesystem sync normalizes paths with `path.resolve` and enforces strict containment inside the designated workspace export directory to prevent path traversal.
  - GitHub OAuth `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` stay strictly on the server via environment variables; session tokens and optional PATs remain in client React memory (never persisted to `localStorage` or disk) and are transmitted via `Authorization: Bearer` headers.
  - Luau execution runs inside an isolated Lua VM exposing only sandboxed Roblox API shims with bounded loop/coroutine iteration safeguards.
