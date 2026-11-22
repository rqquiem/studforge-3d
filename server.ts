import 'dotenv/config';
import crypto from 'crypto';
import express, { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import {
  resolveConfinedFileTarget,
  resolveConfinedModelDir,
  resolveConfinedWorkspaceRoot,
  sanitizeGitRepoSubpath,
  sanitizeWorkspaceFolderName,
} from './src/server/workspaceConfinement.ts';

interface SyncFileInput {
  path: string;
  content: string;
  encoding?: 'utf8' | 'base64';
}

interface GitHubUserSession {
  githubToken: string;
  user: {
    login: string;
    name: string | null;
    avatarUrl: string;
  };
  createdAt: number;
}

interface PendingOAuthState {
  redirectUri: string;
  createdAt: number;
}

const PORT = Number(process.env.PORT) || 3000;
const APP_ROOT = process.cwd();
const SESSION_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
const OAUTH_STATE_TTL_MS = 1000 * 60 * 10; // 10 minutes

const oauthStateStore = new Map<string, PendingOAuthState>();
const sessionStore = new Map<string, GitHubUserSession>();

function cleanupExpiredStores() {
  const now = Date.now();
  for (const [k, v] of oauthStateStore.entries()) {
    if (now - v.createdAt > OAUTH_STATE_TTL_MS) oauthStateStore.delete(k);
  }
  for (const [k, v] of sessionStore.entries()) {
    if (now - v.createdAt > SESSION_TTL_MS) sessionStore.delete(k);
  }
}

function getCallbackUrl(req: Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured && configured !== 'MY_APP_URL') {
    return `${configured.replace(/\/$/, '')}/auth/callback`;
  }
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('x-forwarded-host') || req.get('host') || `localhost:${PORT}`;
  return `${proto}://${host}/auth/callback`;
}

function resolveGitHubToken(req: Request): string | null {
  const patHeader = req.get('x-github-token')?.trim();
  if (patHeader) return patHeader;

  const authHeader = req.get('authorization')?.trim();
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const sessionToken = authHeader.slice(7).trim();
    const session = sessionStore.get(sessionToken);
    if (session && Date.now() - session.createdAt <= SESSION_TTL_MS) {
      return session.githubToken;
    }
  }
  return null;
}

async function githubFetch(
  token: string,
  urlPath: string,
  init: RequestInit = {}
): Promise<globalThis.Response> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/vnd.github+json');
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('User-Agent', 'StudForge-3D-Sync');
  headers.set('X-GitHub-Api-Version', '2022-11-28');
  return fetch(`https://api.github.com${urlPath}`, {
    ...init,
    headers,
  });
}

async function startServer() {
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/auth/github/config', (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID?.trim();
    const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
    res.json({
      oauthConfigured: Boolean(clientId && clientSecret),
      callbackUrl: getCallbackUrl(req),
    });
  });

  app.get('/api/auth/github/url', (req, res) => {
    cleanupExpiredStores();
    const clientId = process.env.GITHUB_CLIENT_ID?.trim();
    const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
      res.status(501).json({
        error:
          'GitHub OAuth is not configured on this server (set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET). Use Personal Access Token (PAT) or Local Workspace Sync.',
        callbackUrl: getCallbackUrl(req),
      });
      return;
    }

    const redirectUri = getCallbackUrl(req);
    const state = crypto.randomBytes(16).toString('hex');
    oauthStateStore.set(state, { redirectUri, createdAt: Date.now() });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'repo read:user',
      state,
    });
    res.json({
      url: `https://github.com/login/oauth/authorize?${params.toString()}`,
      callbackUrl: redirectUri,
    });
  });

  const handleOAuthCallback = async (req: Request, res: Response) => {
    cleanupExpiredStores();
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const oauthErr = typeof req.query.error === 'string' ? req.query.error : '';

    const sendPopupResponse = (payload: Record<string, unknown>) => {
      const serialized = JSON.stringify(payload).replace(/</g, '\\u003c');
      res.status(200).type('html').send(`<!doctype html>
<html>
  <head><title>GitHub Auth</title></head>
  <body style="background:#0e1015;color:#f1f5f9;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
    <p>Completing GitHub authorization...</p>
    <script>
      (function () {
        var msg = ${serialized};
        if (window.opener) {
          window.opener.postMessage(msg, '*');
        }
        window.close();
      })();
    </script>
  </body>
</html>`);
    };

    if (oauthErr) {
      sendPopupResponse({ type: 'GITHUB_OAUTH_ERROR', error: `GitHub returned: ${oauthErr}` });
      return;
    }
    const pending = oauthStateStore.get(state);
    oauthStateStore.delete(state);
    if (!code || !pending) {
      sendPopupResponse({
        type: 'GITHUB_OAUTH_ERROR',
        error: 'Invalid or expired OAuth state. Please try signing in again.',
      });
      return;
    }

    const clientId = process.env.GITHUB_CLIENT_ID?.trim() || '';
    const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim() || '';

    try {
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: pending.redirectUri,
        }),
      });
      const tokenJson = (await tokenRes.json()) as {
        access_token?: string;
        error?: string;
        error_description?: string;
      };
      if (!tokenJson.access_token) {
        sendPopupResponse({
          type: 'GITHUB_OAUTH_ERROR',
          error: tokenJson.error_description || tokenJson.error || 'Failed to exchange OAuth code.',
        });
        return;
      }

      const userRes = await githubFetch(tokenJson.access_token, '/user');
      if (!userRes.ok) {
        sendPopupResponse({
          type: 'GITHUB_OAUTH_ERROR',
          error: 'Unable to fetch authenticated GitHub profile.',
        });
        return;
      }
      const userJson = (await userRes.json()) as {
        login: string;
        name: string | null;
        avatar_url: string;
      };

      const sessionToken = crypto.randomBytes(32).toString('hex');
      const userInfo = {
        login: userJson.login,
        name: userJson.name,
        avatarUrl: userJson.avatar_url,
      };
      sessionStore.set(sessionToken, {
        githubToken: tokenJson.access_token,
        user: userInfo,
        createdAt: Date.now(),
      });

      sendPopupResponse({
        type: 'GITHUB_OAUTH_SUCCESS',
        sessionToken,
        user: userInfo,
      });
    } catch (err) {
      sendPopupResponse({
        type: 'GITHUB_OAUTH_ERROR',
        error: err instanceof Error ? err.message : 'GitHub OAuth callback error',
      });
    }
  };

  app.get('/auth/callback', handleOAuthCallback);
  app.get('/auth/callback/', handleOAuthCallback);

  app.post('/api/auth/github/logout', (req, res) => {
    const authHeader = req.get('authorization')?.trim();
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      sessionStore.delete(authHeader.slice(7).trim());
    }
    res.json({ ok: true });
  });

  app.get('/api/github/repos', async (req, res) => {
    const token = resolveGitHubToken(req);
    if (!token) {
      res.status(401).json({ error: 'GitHub authentication required.' });
      return;
    }

    try {
      const [userRes, reposRes] = await Promise.all([
        githubFetch(token, '/user'),
        githubFetch(
          token,
          '/user/repos?sort=updated&per_page=50&affiliation=owner,collaborator,organization_member'
        ),
      ]);
      if (!reposRes.ok) {
        const errBody = (await reposRes.json().catch(() => ({}))) as { message?: string };
        res.status(reposRes.status).json({
          error: errBody.message || `GitHub API error (${reposRes.status})`,
        });
        return;
      }
      const userData = userRes.ok
        ? ((await userRes.json()) as { login: string; name: string | null; avatar_url: string })
        : null;
      const reposRaw = (await reposRes.json()) as Array<{
        full_name: string;
        name: string;
        owner: { login: string };
        default_branch: string;
        private: boolean;
        html_url: string;
      }>;
      res.json({
        user: userData
          ? { login: userData.login, name: userData.name, avatarUrl: userData.avatar_url }
          : null,
        repos: reposRaw.map((r) => ({
          fullName: r.full_name,
          name: r.name,
          owner: r.owner.login,
          defaultBranch: r.default_branch,
          private: r.private,
          htmlUrl: r.html_url,
        })),
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to list repositories',
      });
    }
  });

  app.get('/api/github/branches', async (req, res) => {
    const token = resolveGitHubToken(req);
    if (!token) {
      res.status(401).json({ error: 'GitHub authentication required.' });
      return;
    }
    const repo = typeof req.query.repo === 'string' ? req.query.repo.trim() : '';
    if (!/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(repo)) {
      res.status(400).json({ error: 'Invalid repository identifier (expected owner/repo).' });
      return;
    }
    try {
      const brRes = await githubFetch(token, `/repos/${repo}/branches?per_page=50`);
      if (!brRes.ok) {
        const errBody = (await brRes.json().catch(() => ({}))) as { message?: string };
        res.status(brRes.status).json({ error: errBody.message || 'Failed to fetch branches' });
        return;
      }
      const branches = (await brRes.json()) as Array<{ name: string }>;
      res.json({ branches: branches.map((b) => b.name) });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Branch lookup failed' });
    }
  });

  app.post('/api/github/push', async (req, res) => {
    const token = resolveGitHubToken(req);
    if (!token) {
      res.status(401).json({ error: 'GitHub authentication required.' });
      return;
    }

    const body = req.body as {
      repo?: string;
      branch?: string;
      basePath?: string;
      commitMessage?: string;
      files?: SyncFileInput[];
    };

    const repo = (body.repo || '').trim();
    const requestedBranch = (body.branch || '').trim();
    const basePath = (body.basePath || '').trim();
    const commitMessage =
      (body.commitMessage || '').trim() || 'feat: sync Roblox model, scripts & Rojo bundle';
    const files = Array.isArray(body.files) ? body.files : [];

    if (!/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(repo)) {
      res.status(400).json({ error: 'Invalid repository identifier (expected owner/repo).' });
      return;
    }
    if (files.length === 0) {
      res.status(400).json({ error: 'No files provided in bundle.' });
      return;
    }
    if (files.length > 200) {
      res.status(400).json({ error: 'Bundle exceeds maximum of 200 files per commit.' });
      return;
    }

    try {
      const normalizedFiles = files.map((f) => ({
        repoPath: sanitizeGitRepoSubpath(basePath, f.path),
        content: typeof f.content === 'string' ? f.content : '',
        encoding: f.encoding === 'base64' ? ('base64' as const) : ('utf-8' as const),
      }));

      // 1. Inspect repo metadata
      const repoRes = await githubFetch(token, `/repos/${repo}`);
      if (!repoRes.ok) {
        const errBody = (await repoRes.json().catch(() => ({}))) as { message?: string };
        res.status(repoRes.status).json({
          error: errBody.message || `Cannot access repository ${repo}`,
        });
        return;
      }
      const repoInfo = (await repoRes.json()) as {
        default_branch: string;
        html_url: string;
      };
      const targetBranch = requestedBranch || repoInfo.default_branch || 'main';
      if (!/^[a-zA-Z0-9._/-]+$/.test(targetBranch) || targetBranch.includes('..')) {
        res.status(400).json({ error: 'Invalid branch name.' });
        return;
      }

      // 2. Locate target branch HEAD or create from default branch (or bootstrap empty repo)
      let headCommitSha: string | null = null;
      let refCreated = false;

      const refRes = await githubFetch(
        token,
        `/repos/${repo}/git/ref/heads/${encodeURIComponent(targetBranch)}`
      );
      if (refRes.ok) {
        const refData = (await refRes.json()) as { object: { sha: string } };
        headCommitSha = refData.object.sha;
      } else {
        // Check default branch to fork from
        const defaultRefRes = await githubFetch(
          token,
          `/repos/${repo}/git/ref/heads/${encodeURIComponent(repoInfo.default_branch)}`
        );
        if (defaultRefRes.ok) {
          const defData = (await defaultRefRes.json()) as { object: { sha: string } };
          const createRefRes = await githubFetch(token, `/repos/${repo}/git/refs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ref: `refs/heads/${targetBranch}`,
              sha: defData.object.sha,
            }),
          });
          if (!createRefRes.ok) {
            const errBody = (await createRefRes.json().catch(() => ({}))) as { message?: string };
            res.status(createRefRes.status).json({
              error: errBody.message || `Failed to create branch ${targetBranch}`,
            });
            return;
          }
          headCommitSha = defData.object.sha;
          refCreated = true;
        } else {
          // Completely empty repo: initialize via Contents API with first file
          const first = normalizedFiles[0];
          const initB64 =
            first.encoding === 'base64'
              ? first.content
              : Buffer.from(first.content, 'utf8').toString('base64');
          const initRes = await githubFetch(
            token,
            `/repos/${repo}/contents/${first.repoPath.split('/').map(encodeURIComponent).join('/')}`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: commitMessage,
                content: initB64,
                branch: targetBranch,
              }),
            }
          );
          if (!initRes.ok) {
            const errBody = (await initRes.json().catch(() => ({}))) as { message?: string };
            res.status(initRes.status).json({
              error: errBody.message || 'Failed to initialize empty repository',
            });
            return;
          }
          const initJson = (await initRes.json()) as { commit: { sha: string; html_url: string } };
          headCommitSha = initJson.commit.sha;
          if (normalizedFiles.length === 1) {
            res.json({
              ok: true,
              commitSha: headCommitSha,
              commitUrl: initJson.commit.html_url,
              branch: targetBranch,
              filesCount: 1,
            });
            return;
          }
        }
      }

      // 3. Get base tree SHA from head commit
      const commitInfoRes = await githubFetch(token, `/repos/${repo}/git/commits/${headCommitSha}`);
      if (!commitInfoRes.ok) {
        res.status(commitInfoRes.status).json({ error: 'Failed to inspect target branch commit.' });
        return;
      }
      const commitInfo = (await commitInfoRes.json()) as { tree: { sha: string } };

      // 4. Upload file blobs in small concurrent batches
      const treeEntries: Array<{ path: string; mode: '100644'; type: 'blob'; sha: string }> = [];
      const BATCH_SIZE = 8;
      for (let i = 0; i < normalizedFiles.length; i += BATCH_SIZE) {
        const chunk = normalizedFiles.slice(i, i + BATCH_SIZE);
        const uploaded = await Promise.all(
          chunk.map(async (f) => {
            const blobRes = await githubFetch(token, `/repos/${repo}/git/blobs`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: f.content,
                encoding: f.encoding,
              }),
            });
            if (!blobRes.ok) {
              const errBody = (await blobRes.json().catch(() => ({}))) as { message?: string };
              throw new Error(
                `Blob upload failed for ${f.repoPath}: ${errBody.message || blobRes.status}`
              );
            }
            const blobJson = (await blobRes.json()) as { sha: string };
            return {
              path: f.repoPath,
              mode: '100644' as const,
              type: 'blob' as const,
              sha: blobJson.sha,
            };
          })
        );
        treeEntries.push(...uploaded);
      }

      // 5. Create new tree & atomic commit
      const treeRes = await githubFetch(token, `/repos/${repo}/git/trees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_tree: commitInfo.tree.sha,
          tree: treeEntries,
        }),
      });
      if (!treeRes.ok) {
        const errBody = (await treeRes.json().catch(() => ({}))) as { message?: string };
        res.status(treeRes.status).json({ error: errBody.message || 'Failed to create Git tree.' });
        return;
      }
      const treeJson = (await treeRes.json()) as { sha: string };

      const newCommitRes = await githubFetch(token, `/repos/${repo}/git/commits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: commitMessage,
          tree: treeJson.sha,
          parents: [headCommitSha],
        }),
      });
      if (!newCommitRes.ok) {
        const errBody = (await newCommitRes.json().catch(() => ({}))) as { message?: string };
        res.status(newCommitRes.status).json({ error: errBody.message || 'Failed to create commit.' });
        return;
      }
      const newCommitJson = (await newCommitRes.json()) as { sha: string; html_url: string };

      // 6. Advance branch reference
      const updateRefRes = await githubFetch(
        token,
        `/repos/${repo}/git/refs/heads/${encodeURIComponent(targetBranch)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sha: newCommitJson.sha, force: false }),
        }
      );
      if (!updateRefRes.ok) {
        const errBody = (await updateRefRes.json().catch(() => ({}))) as { message?: string };
        res.status(updateRefRes.status).json({
          error: errBody.message || 'Failed to update branch ref.',
        });
        return;
      }

      res.json({
        ok: true,
        commitSha: newCommitJson.sha,
        commitUrl: newCommitJson.html_url || `${repoInfo.html_url}/commit/${newCommitJson.sha}`,
        branch: targetBranch,
        branchCreated: refCreated,
        filesCount: treeEntries.length,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'GitHub push failed',
      });
    }
  });

  app.get('/api/workspace/status', async (_req, res) => {
    try {
      const wsRoot = resolveConfinedWorkspaceRoot(APP_ROOT);
      const entries = await fs.readdir(wsRoot, { withFileTypes: true }).catch(() => []);
      const folders = entries.filter((e) => e.isDirectory()).map((e) => e.name);
      res.json({ ok: true, workspaceDir: 'roblox-workspace', folders });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to inspect workspace' });
    }
  });

  app.post('/api/workspace/sync', async (req, res) => {
    const body = req.body as {
      folderName?: string;
      files?: SyncFileInput[];
    };
    const folderName = sanitizeWorkspaceFolderName(body.folderName || 'RobloxModel');
    const files = Array.isArray(body.files) ? body.files : [];

    if (files.length === 0) {
      res.status(400).json({ error: 'No files provided to sync.' });
      return;
    }

    try {
      const modelDir = resolveConfinedModelDir(APP_ROOT, folderName);
      await fs.mkdir(modelDir, { recursive: true });

      const filesWritten: string[] = [];
      for (const f of files) {
        const target = resolveConfinedFileTarget(modelDir, f.path);
        await fs.mkdir(path.dirname(target.absolutePath), { recursive: true });
        if (f.encoding === 'base64') {
          await fs.writeFile(target.absolutePath, Buffer.from(f.content || '', 'base64'));
        } else {
          await fs.writeFile(target.absolutePath, f.content || '', 'utf8');
        }
        filesWritten.push(target.relativePath);
      }

      res.json({
        ok: true,
        relativeFolder: `roblox-workspace/${folderName}`,
        filesWritten,
      });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Workspace sync failed',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(APP_ROOT, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StudForge 3D server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
