/**
 * IndexedDB 存取層
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Asset, Generation, Project, ProjectSummary } from "./types";
import { toSummary } from "./types";
import type { LayerDoc } from "@/lib/editor/model";

interface IGiveUpDB extends DBSchema {
  projects: { key: string; value: Project; indexes: { updatedAt: number } };
  assets: { key: string; value: Asset; indexes: { projectId: string } };
  generations: { key: string; value: Generation; indexes: { projectId: string } };
  layerDocs: { key: string; value: LayerDoc & { generationId: string; projectId: string } };
  meta: { key: string; value: unknown };
}

const DB_NAME = "igiveup";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<IGiveUpDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<IGiveUpDB>> {
  if (!dbPromise) {
    dbPromise = openDB<IGiveUpDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const projects = db.createObjectStore("projects", { keyPath: "id" });
        projects.createIndex("updatedAt", "updatedAt");
        const assets = db.createObjectStore("assets", { keyPath: "id" });
        assets.createIndex("projectId", "projectId");
        const generations = db.createObjectStore("generations", { keyPath: "id" });
        generations.createIndex("projectId", "projectId");
        db.createObjectStore("layerDocs", { keyPath: "generationId" });
        db.createObjectStore("meta");
      },
    });
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

/** 測試用：關閉並重設連線 */
export async function resetDBForTests(): Promise<void> {
  if (dbPromise) (await dbPromise).close();
  dbPromise = null;
}

// --- projects ---

export async function listProjects(): Promise<ProjectSummary[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("projects", "updatedAt");
  return all.reverse().map(toSummary);
}

export async function getProject(id: string): Promise<Project | undefined> {
  return (await getDB()).get("projects", id);
}

export async function saveProject(project: Project): Promise<void> {
  await (await getDB()).put("projects", project);
}

/** 刪除專案並連帶刪除它的圖片、生成紀錄與圖層 */
export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["projects", "assets", "generations", "layerDocs"], "readwrite");
  const [assetKeys, generationKeys] = await Promise.all([
    tx.objectStore("assets").index("projectId").getAllKeys(id),
    tx.objectStore("generations").index("projectId").getAllKeys(id),
  ]);
  await Promise.all([
    tx.objectStore("projects").delete(id),
    ...assetKeys.map((key) => tx.objectStore("assets").delete(key)),
    ...generationKeys.map((key) => tx.objectStore("generations").delete(key)),
    ...generationKeys.map((key) => tx.objectStore("layerDocs").delete(key)),
  ]);
  await tx.done;
}

// --- assets ---

export async function putAsset(asset: Asset): Promise<void> {
  await (await getDB()).put("assets", asset);
}

export async function getAsset(id: string): Promise<Asset | undefined> {
  return (await getDB()).get("assets", id);
}

export async function deleteAsset(id: string): Promise<void> {
  await (await getDB()).delete("assets", id);
}

// --- generations ---

export async function listGenerations(projectId: string): Promise<Generation[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("generations", "projectId", projectId);
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveGeneration(generation: Generation): Promise<void> {
  await (await getDB()).put("generations", generation);
}

export async function deleteGeneration(generation: Generation): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["generations", "assets", "layerDocs"], "readwrite");
  await Promise.all([
    tx.objectStore("generations").delete(generation.id),
    tx.objectStore("layerDocs").delete(generation.id),
    generation.assetId ? tx.objectStore("assets").delete(generation.assetId) : Promise.resolve(),
    generation.compositeAssetId ? tx.objectStore("assets").delete(generation.compositeAssetId) : Promise.resolve(),
  ]);
  await tx.done;
}

// --- layer docs ---

export async function getLayerDoc(generationId: string): Promise<LayerDoc | undefined> {
  return (await getDB()).get("layerDocs", generationId);
}

export async function saveLayerDoc(generationId: string, projectId: string, doc: LayerDoc): Promise<void> {
  await (await getDB()).put("layerDocs", { ...doc, generationId, projectId });
}

// --- meta ---

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await (await getDB()).get("meta", key)) as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await (await getDB()).put("meta", value, key);
}

/** 要求瀏覽器持久保存，並回傳目前用量 */
export async function getStorageInfo(): Promise<{ usage: number; quota: number; persisted: boolean } | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  const [estimate, persisted] = await Promise.all([
    navigator.storage.estimate(),
    navigator.storage.persisted?.() ?? Promise.resolve(false),
  ]);
  return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0, persisted };
}

export async function requestPersistence(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
