import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FolderSync,
  GitBranch,
  GitCommitHorizontal,
  KeyRound,
  Loader2,
  LogOut,
  RefreshCw,
  UploadCloud,
  X,
} from 'lucide-react';
import { sanitizeIdentifier } from '../engine/robloxExporter';
import { generateRojoProjectBundle, SyncFileEntry } from '../engine/rojoPackager';
import { StudioSceneModel } from '../engine/robloxTypes';

interface GitHubUser {
  login: string;
  name: string | null;
  avatarUrl: string;
}

interface GitHubRepoItem {
  fullName: string;
  name: string;
  owner: string;
  defaultBranch: string;
  private: boolean;
  htmlUrl: string;
}

export interface GitHubAuthMemoryState {
  mode: 'pat' | 'oauth';
  pat: string;
  sessionToken: string | null;
  user: GitHubUser | null;
}

interface GitHubSyncModalProps {
  model: StudioSceneModel;
  authState: GitHubAuthMemoryState;
  onChangeAuthState: (next: GitHubAuthMemoryState) => void;
  onClose: () => void;
}

export function GitHubSyncModal({
  model,
  authState,
  onChangeAuthState,
  onClose,
}: GitHubSyncModalProps) {
  const safeSlug = useMemo(
    () => sanitizeIdentifier(model.name).replace(/\s+/g, '_') || 'RobloxModel',
    [model.name]
  );

  // OAuth server config
  const [oauthConfigured, setOauthConfigured] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState('');
  const [copiedCallback, setCopiedCallback] = useState(false);

  // Repo/branch state
  const [repos, setRepos] = useState<GitHubRepoItem[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [repoInput, setRepoInput] = useState('');
  const [branchInput, setBranchInput] = useState('main');
  const [basePathInput, setBasePathInput] = useState(`roblox/${safeSlug}`);
  const [commitMessage, setCommitMessage] = useState(
    `feat(roblox): sync ${safeSlug} model, scripts, and Rojo config`
  );

  // Bundle options
  const [includeRbxmx, setIncludeRbxmx] = useState(true);
  const [includeRojoScripts, setIncludeRojoScripts] = useState(true);
  const [includeObjMtl, setIncludeObjMtl] = useState(true);
  const [includeGlb, setIncludeGlb] = useState(false);
  const [includeStudforgeJson, setIncludeStudforgeJson] = useState(true);

  const [bundleFiles, setBundleFiles] = useState<SyncFileEntry[]>([]);
  const [buildingBundle, setBuildingBundle] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [syncingLocal, setSyncingLocal] = useState(false);
  const [pushingGithub, setPushingGithub] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [workspaceResult, setWorkspaceResult] = useState<{
    relativeFolder: string;
    count: number;
  } | null>(null);
  const [pushResult, setPushResult] = useState<{
    commitSha: string;
    commitUrl: string;
    branch: string;
    filesCount: number;
  } | null>(null);

  const buildAuthHeaders = useCallback((): Record<string, string> => {
    if (authState.mode === 'oauth' && authState.sessionToken) {
      return { Authorization: `Bearer ${authState.sessionToken}` };
    }
    if (authState.mode === 'pat' && authState.pat.trim()) {
      return { 'X-GitHub-Token': authState.pat.trim() };
    }
    return {};
  }, [authState]);

  const hasAuth =
    (authState.mode === 'oauth' && Boolean(authState.sessionToken)) ||
    (authState.mode === 'pat' && authState.pat.trim().length > 0);

  // Load server OAuth config
  useEffect(() => {
    fetch('/api/auth/github/config')
      .then((r) => r.json())
      .then((data: { oauthConfigured?: boolean; callbackUrl?: string }) => {
        setOauthConfigured(Boolean(data.oauthConfigured));
        setCallbackUrl(data.callbackUrl || '');
      })
      .catch(() => {});
  }, []);

  // Build Rojo + Asset file manifest whenever model/options change
  useEffect(() => {
    let cancelled = false;
    setBuildingBundle(true);
    generateRojoProjectBundle(model, {
      includeRbxmx,
      includeRojoScripts,
      includeObjMtl,
      includeGlb,
      includeStudforgeJson,
    })
      .then((files) => {
        if (!cancelled) setBundleFiles(files);
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : 'Failed to package bundle');
        }
      })
      .finally(() => {
        if (!cancelled) setBuildingBundle(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    model,
    includeRbxmx,
    includeRojoScripts,
    includeObjMtl,
    includeGlb,
    includeStudforgeJson,
  ]);

  const loadRepositories = useCallback(async () => {
    const headers = buildAuthHeaders();
    if (Object.keys(headers).length === 0) return;
    setLoadingRepos(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/github/repos', { headers });
      const data = (await res.json()) as {
        error?: string;
        user?: GitHubUser | null;
        repos?: GitHubRepoItem[];
      };
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to authenticate with GitHub.');
        return;
      }
      const list = data.repos ?? [];
      setRepos(list);
      if (data.user) {
        onChangeAuthState({ ...authState, user: data.user });
      }
      if (!repoInput && list.length > 0) {
        setRepoInput(list[0].fullName);
        setBranchInput(list[0].defaultBranch || 'main');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error loading repositories');
    } finally {
      setLoadingRepos(false);
    }
  }, [buildAuthHeaders, authState, onChangeAuthState, repoInput]);

  useEffect(() => {
    if (authState.mode === 'oauth' && authState.sessionToken && repos.length === 0) {
      loadRepositories();
    }
  }, [authState.mode, authState.sessionToken, repos.length, loadRepositories]);

  // Listen for OAuth popup postMessage completion
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const payload = event.data as
        | { type?: string; sessionToken?: string; user?: GitHubUser; error?: string }
        | undefined;
      if (!payload || typeof payload !== 'object') return;
      if (payload.type === 'GITHUB_OAUTH_SUCCESS' && payload.sessionToken) {
        setErrorMsg(null);
        onChangeAuthState({
          ...authState,
          mode: 'oauth',
          sessionToken: payload.sessionToken,
          user: payload.user ?? null,
        });
      } else if (payload.type === 'GITHUB_OAUTH_ERROR') {
        setErrorMsg(payload.error || 'GitHub OAuth authorization was cancelled or failed.');
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [authState, onChangeAuthState]);

  // Fetch branches when repo changes
  useEffect(() => {
    const cleanRepo = repoInput.trim();
    if (!hasAuth || !/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(cleanRepo)) {
      return;
    }
    const headers = buildAuthHeaders();
    fetch(`/api/github/branches?repo=${encodeURIComponent(cleanRepo)}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { branches?: string[] } | null) => {
        if (data?.branches && data.branches.length > 0) {
          setBranches(data.branches);
        }
      })
      .catch(() => {});
  }, [repoInput, hasAuth, buildAuthHeaders]);

  const handleStartOAuth = async () => {
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/github/url');
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setErrorMsg(data.error || 'Unable to start GitHub OAuth flow.');
        return;
      }
      const w = 620;
      const h = 720;
      const left = window.screenX + (window.outerWidth - w) / 2;
      const top = window.screenY + (window.outerHeight - h) / 2;
      window.open(
        data.url,
        'github_oauth_popup',
        `width=${w},height=${h},left=${left},top=${top}`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to open GitHub OAuth popup.');
    }
  };

  const handleLogoutOAuth = async () => {
    if (authState.sessionToken) {
      await fetch('/api/auth/github/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authState.sessionToken}` },
      }).catch(() => {});
    }
    setRepos([]);
    setBranches([]);
    onChangeAuthState({ ...authState, sessionToken: null, user: null, pat: '' });
  };

  const handleSyncToLocalWorkspace = async () => {
    if (bundleFiles.length === 0) return;
    setSyncingLocal(true);
    setErrorMsg(null);
    setWorkspaceResult(null);
    try {
      const res = await fetch('/api/workspace/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderName: safeSlug,
          files: bundleFiles.map((f) => ({
            path: f.path,
            content: f.content,
            encoding: f.encoding,
          })),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        relativeFolder?: string;
        filesWritten?: string[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'Failed to save bundle into local workspace.');
        return;
      }
      setWorkspaceResult({
        relativeFolder: data.relativeFolder || `roblox-workspace/${safeSlug}`,
        count: data.filesWritten?.length ?? bundleFiles.length,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Workspace sync request failed');
    } finally {
      setSyncingLocal(false);
    }
  };

  const handlePushToGitHub = async () => {
    if (!hasAuth) {
      setErrorMsg('Authenticate with a GitHub PAT or OAuth first.');
      return;
    }
    if (!repoInput.trim()) {
      setErrorMsg('Select or enter a target repository (owner/repo).');
      return;
    }
    setPushingGithub(true);
    setErrorMsg(null);
    setPushResult(null);
    try {
      const res = await fetch('/api/github/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildAuthHeaders(),
        },
        body: JSON.stringify({
          repo: repoInput.trim(),
          branch: branchInput.trim() || 'main',
          basePath: basePathInput.trim(),
          commitMessage: commitMessage.trim(),
          files: bundleFiles.map((f) => ({
            path: f.path,
            content: f.content,
            encoding: f.encoding,
          })),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        commitSha?: string;
        commitUrl?: string;
        branch?: string;
        filesCount?: number;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.commitSha) {
        setErrorMsg(data.error || 'GitHub push failed.');
        return;
      }
      setPushResult({
        commitSha: data.commitSha,
        commitUrl: data.commitUrl || '',
        branch: data.branch || branchInput,
        filesCount: data.filesCount ?? bundleFiles.length,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'GitHub push request failed');
    } finally {
      setPushingGithub(false);
    }
  };

  const handleCopyCallback = async () => {
    if (!callbackUrl) return;
    await navigator.clipboard.writeText(callbackUrl).catch(() => {});
    setCopiedCallback(true);
    setTimeout(() => setCopiedCallback(false), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="github-sync-title"
    >
      <div className="w-full max-w-4xl bg-[#151821] border border-white/12 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 id="github-sync-title" className="text-base font-semibold text-white">
              Sync &amp; Push to GitHub / Rojo Workspace
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {model.name} · {bundleFiles.length} bundle file{bundleFiles.length === 1 ? '' : 's'} (Model, Service Scripts, Rojo &amp; Meshes)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close GitHub Sync modal"
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto studio-scroll p-5 space-y-4">
          {/* Section 1: Local Workspace Sync */}
          <div className="bg-[#0e1015] border border-white/10 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <FolderSync className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                <span>Local Workspace Folder Sync</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Writes <code className="font-mono-tabular text-slate-200">default.project.json</code>,{' '}
                <code className="font-mono-tabular text-slate-200">.luau</code> scripts,{' '}
                <code className="font-mono-tabular text-slate-200">.rbxmx</code>, and mesh assets into{' '}
                <code className="font-mono-tabular text-emerald-300">roblox-workspace/{safeSlug}/</code>.
              </p>
            </div>
            <button
              type="button"
              disabled={syncingLocal || buildingBundle || bundleFiles.length === 0}
              onClick={handleSyncToLocalWorkspace}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {syncingLocal ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <FolderSync className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{syncingLocal ? 'Syncing...' : 'Save to Workspace'}</span>
            </button>
          </div>

          {workspaceResult && (
            <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                Saved {workspaceResult.count} files into{' '}
                <code className="font-mono-tabular text-white">{workspaceResult.relativeFolder}</code>
              </span>
            </div>
          )}

          {/* Section 2: GitHub Authentication + Target Config */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Auth + Repo/Branch */}
            <div className="bg-[#0e1015] border border-white/10 rounded-lg p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">GitHub Authentication</span>
                <div className="inline-flex bg-[#151821] border border-white/10 rounded-md p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => onChangeAuthState({ ...authState, mode: 'pat' })}
                    className={`px-2.5 py-1 rounded font-medium cursor-pointer transition-colors ${
                      authState.mode === 'pat'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Token (PAT)
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeAuthState({ ...authState, mode: 'oauth' })}
                    className={`px-2.5 py-1 rounded font-medium cursor-pointer transition-colors ${
                      authState.mode === 'oauth'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    GitHub OAuth
                  </button>
                </div>
              </div>

              {authState.mode === 'pat' ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" aria-hidden="true" />
                      <input
                        type="password"
                        aria-label="GitHub Personal Access Token"
                        value={authState.pat}
                        onChange={(e) =>
                          onChangeAuthState({ ...authState, pat: e.target.value })
                        }
                        placeholder="ghp_... or github_pat_..."
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs font-mono-tabular bg-[#151821] border border-white/10 rounded text-slate-100 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!authState.pat.trim() || loadingRepos}
                      onClick={loadRepositories}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 rounded text-slate-200 disabled:opacity-40 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingRepos ? 'animate-spin' : ''}`} aria-hidden="true" />
                      <span>Load</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Token stays in browser memory only (never saved to localStorage) and pushes with{' '}
                    <code className="font-mono-tabular text-slate-300">repo</code> scope.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {authState.sessionToken && authState.user ? (
                    <div className="flex items-center justify-between bg-[#151821] border border-emerald-500/30 rounded-md px-3 py-2">
                      <div className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                        <span className="text-white font-semibold">@{authState.user.login}</span>
                        {authState.user.name && (
                          <span className="text-slate-400">({authState.user.name})</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleLogoutOAuth}
                        className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white cursor-pointer"
                      >
                        <LogOut className="w-3 h-3" aria-hidden="true" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        type="button"
                        disabled={!oauthConfigured}
                        onClick={handleStartOAuth}
                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white border border-white/15 transition-colors cursor-pointer"
                      >
                        <UploadCloud className="w-4 h-4" aria-hidden="true" />
                        <span>
                          {oauthConfigured
                            ? 'Sign in with GitHub'
                            : 'OAuth Unavailable (Configure Server Client ID/Secret)'}
                        </span>
                      </button>
                      {callbackUrl && (
                        <div className="text-[10px] text-slate-400 flex items-center justify-between gap-2 bg-[#151821] border border-white/10 rounded px-2 py-1.5">
                          <span className="truncate font-mono-tabular">
                            Callback: {callbackUrl}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyCallback}
                            className="text-slate-300 hover:text-white shrink-0 cursor-pointer"
                            aria-label="Copy OAuth callback URL"
                          >
                            {copiedCallback ? (
                              <Check className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                            ) : (
                              <Copy className="w-3 h-3" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Repo & Branch */}
              <div className="pt-2 border-t border-white/10 space-y-2.5 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Target Repository (owner/repo)
                  </label>
                  {repos.length > 0 ? (
                    <select
                      aria-label="Select GitHub Repository"
                      value={repoInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRepoInput(val);
                        const match = repos.find((r) => r.fullName === val);
                        if (match) setBranchInput(match.defaultBranch || 'main');
                      }}
                      className="w-full px-2.5 py-1.5 text-xs font-mono-tabular bg-[#151821] border border-white/10 rounded text-white focus:outline-none focus:border-blue-500"
                    >
                      {repos.map((r) => (
                        <option key={r.fullName} value={r.fullName}>
                          {r.fullName} {r.private ? '(private)' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      aria-label="GitHub Repository owner/repo"
                      value={repoInput}
                      onChange={(e) => setRepoInput(e.target.value)}
                      placeholder="username/my-roblox-project"
                      className="w-full px-2.5 py-1.5 text-xs font-mono-tabular bg-[#151821] border border-white/10 rounded text-white focus:outline-none focus:border-blue-500"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                      <GitBranch className="w-3 h-3" aria-hidden="true" />
                      <span>Branch</span>
                    </label>
                    <input
                      list="github-branch-list"
                      aria-label="Target Git branch"
                      value={branchInput}
                      onChange={(e) => setBranchInput(e.target.value)}
                      placeholder="main"
                      className="w-full px-2.5 py-1.5 text-xs font-mono-tabular bg-[#151821] border border-white/10 rounded text-white focus:outline-none focus:border-blue-500"
                    />
                    <datalist id="github-branch-list">
                      {branches.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Target Repo Folder
                    </label>
                    <input
                      aria-label="Target subfolder in repo"
                      value={basePathInput}
                      onChange={(e) => setBasePathInput(e.target.value)}
                      placeholder="(repo root)"
                      className="w-full px-2.5 py-1.5 text-xs font-mono-tabular bg-[#151821] border border-white/10 rounded text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                    <GitCommitHorizontal className="w-3 h-3" aria-hidden="true" />
                    <span>Commit Message</span>
                  </label>
                  <input
                    aria-label="Commit message"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#151821] border border-white/10 rounded text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Right: Bundle Options & File Manifest */}
            <div className="bg-[#0e1015] border border-white/10 rounded-lg p-3.5 flex flex-col space-y-3 min-h-[260px]">
              <div className="text-xs font-semibold text-white">Included Bundle Artifacts</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeRbxmx}
                    onChange={(e) => setIncludeRbxmx(e.target.checked)}
                    className="accent-blue-500"
                  />
                  <span>.rbxmx Package</span>
                </label>
                <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeRojoScripts}
                    onChange={(e) => setIncludeRojoScripts(e.target.checked)}
                    className="accent-blue-500"
                  />
                  <span>Rojo + .luau Scripts</span>
                </label>
                <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeObjMtl}
                    onChange={(e) => setIncludeObjMtl(e.target.checked)}
                    className="accent-blue-500"
                  />
                  <span>.obj + .mtl Mesh</span>
                </label>
                <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeGlb}
                    onChange={(e) => setIncludeGlb(e.target.checked)}
                    className="accent-blue-500"
                  />
                  <span>.glb Rigged 3D</span>
                </label>
                <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer col-span-2">
                  <input
                    type="checkbox"
                    checked={includeStudforgeJson}
                    onChange={(e) => setIncludeStudforgeJson(e.target.checked)}
                    className="accent-blue-500"
                  />
                  <span>.studforge.json Project Snapshot</span>
                </label>
              </div>

              <div className="flex-1 min-h-0 flex flex-col border-t border-white/10 pt-2">
                <div className="text-[11px] font-medium text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>File Manifest ({bundleFiles.length})</span>
                  {buildingBundle && <span className="text-blue-400">Packaging...</span>}
                </div>
                <div className="flex-1 max-h-44 overflow-y-auto studio-scroll space-y-1 font-mono-tabular text-[11px]">
                  {bundleFiles.map((f) => (
                    <div
                      key={f.path}
                      className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-[#151821]/70 text-slate-300"
                    >
                      <span className="truncate">{f.path}</span>
                      <span className="text-[10px] text-slate-500 shrink-0 uppercase">
                        {f.category}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          {pushResult && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  Committed {pushResult.filesCount} files to{' '}
                  <code className="font-mono-tabular text-white">{pushResult.branch}</code> (
                  <code className="font-mono-tabular text-white">
                    {pushResult.commitSha.slice(0, 7)}
                  </code>
                  )
                </span>
              </div>
              {pushResult.commitUrl && (
                <a
                  href={pushResult.commitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-200 hover:text-white underline"
                >
                  <span>View Commit</span>
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-[#11141c] flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400">
            Atomic commit preserves existing repository files outside target path.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              disabled={!hasAuth || pushingGithub || buildingBundle || bundleFiles.length === 0}
              onClick={handlePushToGitHub}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-colors cursor-pointer"
            >
              {pushingGithub ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <UploadCloud className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{pushingGithub ? 'Pushing...' : 'Push to GitHub'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
