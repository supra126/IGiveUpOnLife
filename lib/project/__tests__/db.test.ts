import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import * as db from "../db";
import { createProject, type Generation } from "../types";

const settings = { imageModel: "m", textModel: "t", imageSize: "2K" as const };

beforeEach(async () => {
  await db.resetDBForTests();
  indexedDB.deleteDatabase("igiveup");
});

function generation(projectId: string, assetId: string): Generation {
  return {
    id: `g-${assetId}`,
    projectId,
    source: "similar",
    aspectRatio: "1:1",
    model: "m",
    imageSize: "2K",
    assetId,
    status: "done",
    createdAt: Date.now(),
  };
}

describe("IndexedDB 專案儲存", () => {
  it("專案依更新時間排序", async () => {
    const a = { ...createProject("similar", settings, "A"), updatedAt: 1 };
    const b = { ...createProject("campaign", settings, "B"), updatedAt: 2 };
    await db.saveProject(a);
    await db.saveProject(b);
    expect((await db.listProjects()).map((p) => p.name)).toEqual(["B", "A"]);
  });

  it("刪除專案會連帶刪除圖片、生成紀錄與圖層", async () => {
    const project = createProject("similar", settings, "P");
    const other = createProject("similar", settings, "O");
    await db.saveProject(project);
    await db.saveProject(other);
    const blob = new Blob(["x"], { type: "image/png" });
    await db.putAsset({ id: "a1", projectId: project.id, role: "generated", blob, mimeType: "image/png", createdAt: 0 });
    await db.putAsset({ id: "a2", projectId: other.id, role: "generated", blob, mimeType: "image/png", createdAt: 0 });
    await db.saveGeneration(generation(project.id, "a1"));
    await db.saveGeneration(generation(other.id, "a2"));
    await db.saveLayerDoc("g-a1", project.id, { version: 1, layers: [], updatedAt: 0 });

    await db.deleteProject(project.id);

    expect(await db.getProject(project.id)).toBeUndefined();
    expect(await db.getAsset("a1")).toBeUndefined();
    expect(await db.listGenerations(project.id)).toEqual([]);
    expect(await db.getLayerDoc("g-a1")).toBeUndefined();
    // 其他專案不受影響
    expect(await db.getAsset("a2")).toBeDefined();
    expect(await db.listGenerations(other.id)).toHaveLength(1);
  });

  it("刪除單一生成紀錄會一起刪掉圖片", async () => {
    const project = createProject("similar", settings, "P");
    const blob = new Blob(["x"], { type: "image/png" });
    await db.putAsset({ id: "a1", projectId: project.id, role: "generated", blob, mimeType: "image/png", createdAt: 0 });
    const g = generation(project.id, "a1");
    await db.saveGeneration(g);
    await db.deleteGeneration(g);
    expect(await db.getAsset("a1")).toBeUndefined();
  });

  it("meta 存取", async () => {
    await db.setMeta("lastProjectId", "x");
    expect(await db.getMeta("lastProjectId")).toBe("x");
  });
});
