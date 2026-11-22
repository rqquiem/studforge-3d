import path from 'path';

export interface ConfinedFileTarget {
  relativePath: string;
  absolutePath: string;
}

export function sanitizeWorkspaceFolderName(rawName: string): string {
  const cleaned = rawName
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^[_-]+|[_-]+$/g, '');
  if (!cleaned || cleaned === '.' || cleaned === '..') {
    return 'RobloxModel';
  }
  return cleaned.slice(0, 64);
}

export function resolveConfinedWorkspaceRoot(appRootDir: string): string {
  return path.resolve(appRootDir, 'roblox-workspace');
}

export function resolveConfinedModelDir(appRootDir: string, folderName: string): string {
  const workspaceRoot = resolveConfinedWorkspaceRoot(appRootDir);
  const safeFolder = sanitizeWorkspaceFolderName(folderName);
  const modelDir = path.resolve(workspaceRoot, safeFolder);
  if (!modelDir.startsWith(workspaceRoot + path.sep)) {
    throw new Error('Invalid workspace folder path');
  }
  return modelDir;
}

export function resolveConfinedFileTarget(
  modelDir: string,
  rawRelativePath: string
): ConfinedFileTarget {
  if (!rawRelativePath || rawRelativePath.includes('\0')) {
    throw new Error('Invalid empty or null-byte file path');
  }
  if (path.isAbsolute(rawRelativePath) || /^[a-zA-Z]:/.test(rawRelativePath)) {
    throw new Error(`Absolute paths are not allowed: ${rawRelativePath}`);
  }
  const normalizedPosix = rawRelativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const segments = normalizedPosix.split('/').filter(Boolean);
  if (segments.length === 0 || segments.some((s) => s === '.' || s === '..')) {
    throw new Error(`Path traversal is not allowed: ${rawRelativePath}`);
  }
  const resolved = path.resolve(modelDir, ...segments);
  if (!resolved.startsWith(modelDir + path.sep)) {
    throw new Error(`Resolved path escapes workspace directory: ${rawRelativePath}`);
  }
  return {
    relativePath: segments.join('/'),
    absolutePath: resolved,
  };
}

export function sanitizeGitRepoSubpath(rawBasePath: string, relFilePath: string): string {
  const cleanRel = relFilePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const relSegments = cleanRel.split('/').filter(Boolean);
  if (relSegments.length === 0 || relSegments.some((s) => s === '.' || s === '..')) {
    throw new Error(`Invalid repository file path: ${relFilePath}`);
  }
  const baseSegments = (rawBasePath || '')
    .replace(/\\/g, '/')
    .split('/')
    .map((s) => s.trim())
    .filter((s) => s && s !== '.' && s !== '..');

  return [...baseSegments, ...relSegments].join('/');
}
