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
/*
 * 記憶體模式（IndexedDB 無法使用）的暫存：圖片、以及切換離開的專案與其生成紀錄。
 * 正常模式下不放這裡，避免所有圖片的 Blob 一直佔著記憶體
 */
const memoryAssets = new Map<string, Asset>();
const memoryProjects = new Map<string, Project>();
const memoryGenerations = new Map<string, Generation>();

/** 記憶體模式下，切換專案前把目前專案的完整內容留著，之後才切得回來 */
function stashCurrentProject(): void {
  if (state.persistent || !state.project) return;
  memoryProjects.set(state.project.id, state.project);
  for (const generation of state.generations) memoryGenerations.set(generation.id, generation);
}
/** 這個分頁裡仍在佇列或執行中的生成，切換專案時不能當成已中斷 */
const activeGenerations = new Set<string>();

export function setGenerationActive(id: string, active: boolean): void {
  if (active) activeGenerations.add(id);
  else activeGenerations.delete(id);
}

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
  stashCurrentProject();
  const inMemory = memoryProjects.get(id);
  const project = inMemory ?? (await safe(() => db.getProject(id), undefined));
  if (!project) return;
  const generations = inMemory
    ? [...memoryGenerations.values()].filter((g) => g.projectId === id).sort((a, b) => a.createdAt - b.createdAt)
    : await safe(() => db.listGenerations(id), []);
  // 上次關閉時還在跑的工作已經無法完成；這個分頁仍在跑的則保留，完成後會寫回
  const cleaned = generations.map((g) =>
    (g.status === "running" || g.status === "queued") && !activeGenerations.has(g.id)
      ? { ...g, status: "cancelled" as const }
      : g
  );
  setState({ project, generations: cleaned });
  await safe(() => db.setMeta("lastProjectId", id), undefined);
}

export async function newProject(kind: ProjectKind, settings: ProjectSettings, name: string): Promise<Project> {
  await flushSave();
  stashCurrentProject();
  const project = createProject(kind, settings, name);
  setState({ project, generations: [], projects: [toSummary(project), ...state.projects] });
  await safe(() => db.saveProject(project), undefined);
  await safe(() => db.setMeta("lastProjectId", project.id), undefined);
  return project;
}

export async function deleteProject(id: string): Promise<void> {
  await safe(() => db.deleteProject(id), undefined);
  memoryProjects.delete(id);
  for (const [key, generation] of memoryGenerations) {
    if (generation.projectId === id) memoryGenerations.delete(key);
  }
  for (const [key, asset] of memoryAssets) {
    if (asset.projectId === id) memoryAssets.delete(key);
  }
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

/**
 * 更新指定專案；不是目前開著的專案時，直接改暫存或資料庫裡的版本
 * （例如上傳轉檔期間使用者切換了專案）
 */
export async function updateProjectById(id: string, mutator: (project: Project) => Project): Promise<void> {
  if (state.project?.id === id) {
    updateProject(mutator);
    return;
  }
  const stored = memoryProjects.get(id) ?? (await safe(() => db.getProject(id), undefined));
  if (!stored) return;
  const next = { ...mutator(stored), updatedAt: Date.now() };
  if (memoryProjects.has(id)) memoryProjects.set(id, next);
  else await safe(() => db.saveProject(next), undefined);
  setState({ projects: state.projects.map((p) => (p.id === id ? toSummary(next) : p)) });
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
  const saved = await safe(async () => {
    await db.putAsset(asset);
    return true;
  }, false);
  if (!saved) memoryAssets.set(asset.id, asset);
  return asset.id;
}

/** 刪除不再被引用的圖片（例如被新合成圖取代的舊合成圖） */
export async function deleteAsset(id: string): Promise<void> {
  memoryAssets.delete(id);
  await safe(() => db.deleteAsset(id), undefined);
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

  if (
    generation.status === "done" &&
    generation.assetId &&
    state.project?.id === generation.projectId &&
    !state.project.coverAssetId
  ) {
    updateProject((p) => ({ ...p, coverAssetId: generation.assetId }));
  }
}

export function patchGeneration(id: string, patch: Partial<Generation>): void {
  const current = state.generations.find((g) => g.id === id);
  if (current) {
    upsertGeneration({ ...current, ...patch });
    return;
  }
  // 使用者已切到其他專案：直接更新暫存或資料庫裡的紀錄，切回來時才看得到結果
  const stashed = memoryGenerations.get(id);
  if (stashed) {
    memoryGenerations.set(id, { ...stashed, ...patch });
    return;
  }
  void safe(async () => {
    const stored = await db.getGeneration(id);
    if (stored) await db.saveGeneration({ ...stored, ...patch });
  }, undefined);
}

export async function removeGeneration(id: string): Promise<void> {
  const generation = state.generations.find((g) => g.id === id);
  if (!generation) return;
  setState({ generations: state.generations.filter((g) => g.id !== id) });
  memoryGenerations.delete(id);
  if (generation.assetId) memoryAssets.delete(generation.assetId);
  if (generation.compositeAssetId) memoryAssets.delete(generation.compositeAssetId);
  await safe(() => db.deleteGeneration(generation), undefined);
  if (state.project?.coverAssetId && state.project.coverAssetId === generation.assetId) {
    const next = state.generations.find((g) => g.status === "done" && g.assetId);
    updateProject((p) => ({ ...p, coverAssetId: next?.assetId }));
  }
}

/** 測試用 */
export function resetWorkspaceForTests({ persistent = true }: { persistent?: boolean } = {}): void {
  state = { ready: false, persistent, projects: [], project: null, generations: [] };
  memoryAssets.clear();
  memoryProjects.clear();
  memoryGenerations.clear();
  activeGenerations.clear();
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
