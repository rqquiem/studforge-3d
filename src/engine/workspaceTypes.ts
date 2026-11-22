import { StudioMapScene } from './mapTypes';
import { StudioSceneModel, StudioScriptNode } from './robloxTypes';

export interface WorkspaceModelItem {
  id: string;
  name: string;
  updatedAt: number;
  notes?: string;
  model: StudioSceneModel;
}

export interface WorkspaceMapItem {
  id: string;
  name: string;
  updatedAt: number;
  notes?: string;
  map: StudioMapScene;
}

export interface WorkspaceFolder {
  id: string;
  name: string;
  parentFolderId: string | null;
  color: string;
  createdAt: number;
  updatedAt: number;
  scripts: StudioScriptNode[];
  models: WorkspaceModelItem[];
  maps: WorkspaceMapItem[];
}

export interface StudioWorkspace {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  folders: WorkspaceFolder[];
}

export interface WorkspaceRegistryState {
  activeWorkspaceId: string;
  activeFolderId: string | null;
  workspaces: StudioWorkspace[];
}

export type WorkspaceAssetKind = 'script' | 'model' | 'map';

export interface WorkspaceValidationIssue {
  severity: 'info' | 'warning' | 'error';
  message: string;
}

export interface WorkspaceValidationReport {
  folderCount: number;
  scriptCount: number;
  modelCount: number;
  mapCount: number;
  rbxlxReady: boolean;
  issues: WorkspaceValidationIssue[];
}

export const FOLDER_ACCENT_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
] as const;
