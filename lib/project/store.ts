"use client";

/**
 * 工作區 store：目前專案、專案列表與生成紀錄
 *
 * 自寫的 external store（useSyncExternalStore），依 selector 訂閱，
 * 打字時只有用到該欄位的元件會重繪。專案變更以 debounce 寫回 IndexedDB。
 */
import { useSyncExternalStore } from "react";
import * as db from "./db";
import {
  createId,
  createProject,
  toSummary,
  type Asset,
  type AssetRole,
  type Generation,
  type Project,
  type ProjectKind,
  type ProjectSettings,
  type ProjectSummary,
} from "./types";
import { getImageSize } from "@/lib/image/blob";

export interface WorkspaceState {
  ready: boolean;
  /** IndexedDB 無法使用（例如部分私密瀏覽模式）時改為只存在記憶體 */
  persistent: boolean;
  projects: ProjectSummary[];
  project: Project | null;
  generations: Generation[];
}

let state: WorkspaceState = {
  ready: false,
  persistent: true,
  projects: [],
  project: null,
  generations: [],
};

const listeners = new Set<() => void>();
const memoryAssets = new Map<string, Asset>();

function setState(patch: Partial<WorkspaceState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

export function getState(): WorkspaceState {
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const SERVER_SNAPSHOT: WorkspaceState = state;

export function useWorkspace<T>(selector: (s: WorkspaceState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(SERVER_SNAPSHOT)
  );
}

// --- 持久化 ---

let saveTimer: ReturnType<typeof setTimeout> | null = null;

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (!state.persistent) return fallback;
  try {
    return await fn();
  } catch (error) {
    console.warn("[workspace] IndexedDB 失敗，改用記憶體模式", error);
    setState({ persistent: false });
    return fallback;
  }
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 400);
}

export async function flushSave(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  const project = state.project;
  if (project) await safe(() => db.saveProject(project), undefined);
}

// --- 初始化 / 專案操作 ---

export async function initWorkspace(): Promise<void> {
  if (state.ready) return;
  const projects = await safe(() => db.listProjects(), []);
  const lastId = await safe(() => db.getMeta<string>("lastProjectId"), undefined);
  setState({ projects, ready: true });
  void db.requestPersistence();
  const target = projects.find((p) => p.id === lastId) ?? projects[0];
  if (target) await openProject(target.id);
}

export async function openProject(id: string): Promise<void> {
  await flushSave();
  const project = await safe(() => db.getProject(id), undefined);
  if (!project) return;
  const generations = await safe(() => db.listGenerations(id), []);
  // 上次關閉時還在跑的工作已經無法完成
  const cleaned = generations.map((g) =>
    g.status === "running" || g.status === "queued" ? { ...g, status: "cancelled" as const } : g
  );
  setState({ project, generations: cleaned });
  await safe(() => db.setMeta("lastProjectId", id), undefined);
}

export async function newProject(kind: ProjectKind, settings: ProjectSettings, name: string): Promise<Project> {
  await flushSave();
  const project = createProject(kind, settings, name);
  setState({ project, generations: [], projects: [toSummary(project), ...state.projects] });
  await safe(() => db.saveProject(project), undefined);
  await safe(() => db.setMeta("lastProjectId", project.id), undefined);
  return project;
}

export async function deleteProject(id: string): Promise<void> {
  await safe(() => db.deleteProject(id), undefined);
  const projects = state.projects.filter((p) => p.id !== id);
  if (state.project?.id === id) {
    setState({ projects, project: null, generations: [] });
    if (projects[0]) await openProject(projects[0].id);
  } else {
    setState({ projects });
  }
}

/** 以不可變方式更新目前專案，並排程寫回 */
export function updateProject(mutator: (project: Project) => Project): void {
  const current = state.project;
  if (!current) return;
  const next = { ...mutator(current), updatedAt: Date.now() };
  const summary = toSummary(next);
  setState({
    project: next,
    projects: [summary, ...state.projects.filter((p) => p.id !== next.id)],
  });
  scheduleSave();
}

// --- 圖片資產 ---

export async function addAsset(blob: Blob, role: AssetRole, projectId = state.project?.id): Promise<string> {
  if (!projectId) throw new Error("No project");
  let size: { width: number; height: number } | undefined;
  try {
    size = await getImageSize(blob);
  } catch {
    size = undefined;
  }
  const asset: Asset = {
    id: createId(),
    projectId,
    role,
    blob,
    mimeType: blob.type || "image/png",
    width: size?.width,
    height: size?.height,
    createdAt: Date.now(),
  };
  memoryAssets.set(asset.id, asset);
  await safe(() => db.putAsset(asset), undefined);
  return asset.id;
}

export async function getAssetRecord(id: string): Promise<Asset | undefined> {
  return memoryAssets.get(id) ?? (await safe(() => db.getAsset(id), undefined));
}

// --- 生成紀錄 ---

export function upsertGeneration(generation: Generation): void {
  const exists = state.generations.some((g) => g.id === generation.id);
  const generations = exists
    ? state.generations.map((g) => (g.id === generation.id ? generation : g))
    : [...state.generations, generation];
  setState({ generations });
  void safe(() => db.saveGeneration(generation), undefined);

  if (generation.status === "done" && generation.assetId && state.project && !state.project.coverAssetId) {
    updateProject((p) => ({ ...p, coverAssetId: generation.assetId }));
  }
}

export function patchGeneration(id: string, patch: Partial<Generation>): void {
  const current = state.generations.find((g) => g.id === id);
  if (current) upsertGeneration({ ...current, ...patch });
}

export async function removeGeneration(id: string): Promise<void> {
  const generation = state.generations.find((g) => g.id === id);
  if (!generation) return;
  setState({ generations: state.generations.filter((g) => g.id !== id) });
  await safe(() => db.deleteGeneration(generation), undefined);
  if (state.project?.coverAssetId && state.project.coverAssetId === generation.assetId) {
    const next = state.generations.find((g) => g.status === "done" && g.assetId);
    updateProject((p) => ({ ...p, coverAssetId: next?.assetId }));
  }
}

/** 測試用 */
export function resetWorkspaceForTests(): void {
  state = { ready: false, persistent: true, projects: [], project: null, generations: [] };
  memoryAssets.clear();
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    void flushSave();
  });
}

// --- 文字圖層 ---

export async function loadLayerDoc(generationId: string) {
  return safe(() => db.getLayerDoc(generationId), undefined);
}

export async function persistLayerDoc(generationId: string, doc: import("@/lib/editor/model").LayerDoc) {
  const projectId = state.project?.id;
  if (!projectId) return;
  await safe(() => db.saveLayerDoc(generationId, projectId, doc), undefined);
}
