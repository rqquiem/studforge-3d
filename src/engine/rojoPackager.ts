import { exportModelToGlb } from './glbExporter';
import {
  generateFrameworkScripts,
  generateObjAndMtl,
  generateRbxmx,
  RobloxExportOptions,
  sanitizeIdentifier,
} from './robloxExporter';
import { RobloxServiceLocation, StudioSceneModel, StudioScriptNode } from './robloxTypes';

export interface SyncFileEntry {
  path: string;
  content: string;
  encoding: 'utf8' | 'base64';
  category: 'rojo' | 'script' | 'model' | 'mesh' | 'project';
}

export interface RojoBundleOptions {
  includeRbxmx?: boolean;
  includeRojoScripts?: boolean;
  includeObjMtl?: boolean;
  includeGlb?: boolean;
  includeStudforgeJson?: boolean;
  exportOptions?: RobloxExportOptions;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  return Buffer.from(bytes).toString('base64');
}

function sanitizeSegment(segment: string, fallback = 'Item'): string {
  const clean = segment.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/^\.+/, '');
  return clean || fallback;
}

function getRojoServiceFolderPath(service: RobloxServiceLocation, modelDirName: string): string {
  switch (service) {
    case 'WorkspaceModel':
      return `src/Workspace/${modelDirName}`;
    case 'ReplicatedStorage':
      return 'src/ReplicatedStorage';
    case 'ServerScriptService':
      return 'src/ServerScriptService';
    case 'StarterPlayerScripts':
      return 'src/StarterPlayer/StarterPlayerScripts';
    case 'StarterCharacterScripts':
      return 'src/StarterPlayer/StarterCharacterScripts';
  }
}

function emitScriptNodeToRojoFiles(
  node: StudioScriptNode,
  modelDirName: string,
  files: SyncFileEntry[]
) {
  const baseDir = getRojoServiceFolderPath(node.service, modelDirName);
  const subFolder = node.parentFolder
    ? node.parentFolder
        .split('/')
        .map((s) => sanitizeSegment(s))
        .filter(Boolean)
        .join('/')
    : '';
  const dir = subFolder ? `${baseDir}/${subFolder}` : baseDir;
  const safeName = sanitizeSegment(node.name, 'Script');

  if (node.className === 'Script') {
    files.push({
      path: `${dir}/${safeName}.server.luau`,
      content: node.source || '',
      encoding: 'utf8',
      category: 'script',
    });
    if (node.disabled || (node.runContext && node.runContext !== 'Legacy')) {
      files.push({
        path: `${dir}/${safeName}.meta.json`,
        content: JSON.stringify(
          {
            properties: {
              Disabled: node.disabled,
              ...(node.runContext && node.runContext !== 'Legacy'
                ? { RunContext: node.runContext }
                : {}),
            },
          },
          null,
          2
        ),
        encoding: 'utf8',
        category: 'rojo',
      });
    }
  } else if (node.className === 'LocalScript') {
    files.push({
      path: `${dir}/${safeName}.client.luau`,
      content: node.source || '',
      encoding: 'utf8',
      category: 'script',
    });
    if (node.disabled) {
      files.push({
        path: `${dir}/${safeName}.meta.json`,
        content: JSON.stringify({ properties: { Disabled: true } }, null, 2),
        encoding: 'utf8',
        category: 'rojo',
      });
    }
  } else if (node.className === 'ModuleScript') {
    files.push({
      path: `${dir}/${safeName}.luau`,
      content: node.source || '',
      encoding: 'utf8',
      category: 'script',
    });
  } else if (node.className === 'Folder') {
    files.push({
      path: `${dir}/${safeName}/init.meta.json`,
      content: JSON.stringify({ className: 'Folder' }, null, 2),
      encoding: 'utf8',
      category: 'rojo',
    });
  } else {
    // RemoteEvent, BindableEvent, StringValue, NumberValue, BoolValue, ObjectValue
    const props: Record<string, unknown> = {};
    if (
      node.className === 'StringValue' ||
      node.className === 'NumberValue' ||
      node.className === 'BoolValue'
    ) {
      props.Value = node.value ?? (node.className === 'NumberValue' ? 0 : node.className === 'BoolValue' ? false : '');
    }
    files.push({
      path: `${dir}/${safeName}.meta.json`,
      content: JSON.stringify(
        {
          className: node.className,
          ...(Object.keys(props).length > 0 ? { properties: props } : {}),
        },
        null,
        2
      ),
      encoding: 'utf8',
      category: 'rojo',
    });
  }
}

export async function generateRojoProjectBundle(
  model: StudioSceneModel,
  options: RojoBundleOptions = {}
): Promise<SyncFileEntry[]> {
  const includeRbxmx = options.includeRbxmx ?? true;
  const includeRojoScripts = options.includeRojoScripts ?? true;
  const includeObjMtl = options.includeObjMtl ?? true;
  const includeGlb = options.includeGlb ?? false;
  const includeStudforgeJson = options.includeStudforgeJson ?? true;

  const exportOpts: RobloxExportOptions = options.exportOptions ?? {
    scaleMode: 'studs',
    centerAtOrigin: true,
    exportAsPackage: true,
    includeAudioFolder: true,
    includeScriptsFolder: true,
  };

  const baseName = sanitizeIdentifier(model.name).replace(/\s+/g, '_') || 'RobloxModel';
  const files: SyncFileEntry[] = [];

  if (includeRojoScripts) {
    const projectTree: Record<string, unknown> = {
      name: baseName,
      tree: {
        $className: 'DataModel',
        ReplicatedStorage: {
          $className: 'ReplicatedStorage',
          $path: 'src/ReplicatedStorage',
        },
        ServerScriptService: {
          $className: 'ServerScriptService',
          $path: 'src/ServerScriptService',
        },
        StarterPlayer: {
          $className: 'StarterPlayer',
          StarterPlayerScripts: {
            $className: 'StarterPlayerScripts',
            $path: 'src/StarterPlayer/StarterPlayerScripts',
          },
          StarterCharacterScripts: {
            $className: 'StarterCharacterScripts',
            $path: 'src/StarterPlayer/StarterCharacterScripts',
          },
        },
        Workspace: {
          $className: 'Workspace',
          [baseName]: {
            $className: 'Folder',
            ...(includeRbxmx
              ? {
                  ModelPackage: {
                    $path: `model/${baseName}_Package.rbxmx`,
                  },
                }
              : {}),
            Scripts: {
              $path: `src/Workspace/${baseName}/Scripts`,
            },
          },
        },
      },
    };

    files.push({
      path: 'default.project.json',
      content: JSON.stringify(projectTree, null, 2),
      encoding: 'utf8',
      category: 'rojo',
    });

    // Generated Framework Modules inside src/Workspace/<ModelName>/Scripts/
    const fw = generateFrameworkScripts(model, exportOpts);
    files.push(
      {
        path: `src/Workspace/${baseName}/Scripts/StageConfig.luau`,
        content: fw.StageConfig,
        encoding: 'utf8',
        category: 'script',
      },
      {
        path: `src/Workspace/${baseName}/Scripts/FXController.luau`,
        content: fw.FXController,
        encoding: 'utf8',
        category: 'script',
      },
      {
        path: `src/Workspace/${baseName}/Scripts/SoundController.luau`,
        content: fw.SoundController,
        encoding: 'utf8',
        category: 'script',
      },
      {
        path: `src/Workspace/${baseName}/Scripts/RigAnimator.luau`,
        content: fw.RigAnimator,
        encoding: 'utf8',
        category: 'script',
      },
      {
        path: `src/Workspace/${baseName}/Scripts/ModelRuntime.server.luau`,
        content: fw.ModelRuntime,
        encoding: 'utf8',
        category: 'script',
      }
    );

    // Ensure service folders remain valid Rojo directories even if empty
    const serviceInitDirs = [
      'src/ReplicatedStorage',
      'src/ServerScriptService',
      'src/StarterPlayer/StarterPlayerScripts',
      'src/StarterPlayer/StarterCharacterScripts',
    ];
    for (const d of serviceInitDirs) {
      files.push({
        path: `${d}/.gitkeep`,
        content: '',
        encoding: 'utf8',
        category: 'rojo',
      });
    }

    for (const scriptNode of model.scripts ?? []) {
      emitScriptNodeToRojoFiles(scriptNode, baseName, files);
    }
  }

  if (includeRbxmx) {
    files.push({
      path: `model/${baseName}_Package.rbxmx`,
      content: generateRbxmx(model, exportOpts),
      encoding: 'utf8',
      category: 'model',
    });
  }

  if (includeObjMtl) {
    const { obj, mtl } = generateObjAndMtl(model, exportOpts);
    files.push(
      {
        path: `model/${baseName}.obj`,
        content: obj,
        encoding: 'utf8',
        category: 'mesh',
      },
      {
        path: `model/${baseName}.mtl`,
        content: mtl,
        encoding: 'utf8',
        category: 'mesh',
      }
    );
  }

  if (includeGlb) {
    const glbBuf = await exportModelToGlb(model, exportOpts);
    files.push({
      path: `model/${baseName}.glb`,
      content: arrayBufferToBase64(glbBuf),
      encoding: 'base64',
      category: 'mesh',
    });
  }

  if (includeStudforgeJson) {
    files.push({
      path: `model/${baseName}.studforge.json`,
      content: JSON.stringify(model, null, 2),
      encoding: 'utf8',
      category: 'project',
    });
  }

  files.push({
    path: 'README.md',
    content: [
      `# ${model.name} — Roblox Studio & Rojo Bundle`,
      ``,
      `Generated by StudForge 3D.`,
      ``,
      `## Contents`,
      ...(includeRbxmx ? [`- \`model/${baseName}_Package.rbxmx\`: Drag-and-drop into Roblox Studio Explorer (rigged Model, Motor6Ds, Attachments, FX, Audio, AnimSaves, and Services).`] : []),
      ...(includeRojoScripts ? [`- \`default.project.json\` & \`src/\`: Rojo 7 project mapping \`ReplicatedStorage\`, \`ServerScriptService\`, \`StarterPlayer\`, and \`Workspace/${baseName}\`.`] : []),
      ...(includeObjMtl ? [`- \`model/${baseName}.obj\` + \`.mtl\`: Wavefront OBJ mesh + material library.`] : []),
      ...(includeGlb ? [`- \`model/${baseName}.glb\`: Binary glTF 2.0 rigged mesh + animations.`] : []),
      ...(includeStudforgeJson ? [`- \`model/${baseName}.studforge.json\`: Full StudForge 3D project snapshot.`] : []),
      ``,
      `## Sync with Rojo`,
      `\`\`\`bash`,
      `rojo serve default.project.json`,
      `\`\`\``,
    ].join('\n'),
    encoding: 'utf8',
    category: 'project',
  });

  // Deduplicate by path (last write wins)
  const deduped = new Map<string, SyncFileEntry>();
  for (const f of files) {
    deduped.set(f.path, f);
  }
  return Array.from(deduped.values());
}
