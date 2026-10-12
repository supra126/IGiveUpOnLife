import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import * as db from "../db";
import {
  addAsset,
  getAssetRecord,
  getState,
  newProject,
  openProject,
  patchGeneration,
  resetWorkspaceForTests,
  setGenerationActive,
  updateProjectById,
  upsertGeneration,
} from "../store";
import { createProject, isFromCurrentPlan, isPlanStale, type Generation } from "../types";

const settings = { imageModel: "m", textModel: "t", imageSize: "2K" as const };

beforeEach(async () => {
  resetWorkspaceForTests();
  await db.resetDBForTests();
  indexedDB.deleteDatabase("igiveup");
});

function queued(projectId: string): Generation {
  return {
    id: `g-${Math.random().toString(36).slice(2)}`,
    projectId,
    source: "similar",
    aspectRatio: "1:1",
    model: "m",
    imageSize: "2K",
    status: "queued",
    createdAt: Date.now(),
  };
}

describe("生成途中切換專案", () => {
  it("完成的結果會寫回原專案，切回來看得到", async () => {
    const a = await newProject("similar", settings, "A");
    const job = queued(a.id);
    upsertGeneration(job);
    setGenerationActive(job.id, true);

    await newProject("similar", settings, "B");
    expect(getState().generations).toHaveLength(0);

    patchGeneration(job.id, { status: "done", assetId: "asset-1" });
    await vi.waitFor(async () => expect((await db.getGeneration(job.id))?.status).toBe("done"));

    setGenerationActive(job.id, false);
    await openProject(a.id);
    expect(getState().generations).toEqual([expect.objectContaining({ id: job.id, status: "done", assetId: "asset-1" })]);
  });

  it("切回來時仍在跑的工作不會被標成已取消", async () => {
    const a = await newProject("similar", settings, "A");
    const running = queued(a.id);
    const stale = queued(a.id);
    upsertGeneration(running);
    upsertGeneration(stale);
    setGenerationActive(running.id, true);

    await newProject("similar", settings, "B");
    await openProject(a.id);
    const byId = new Map(getState().generations.map((g) => [g.id, g.status]));
    expect(byId.get(running.id)).toBe("queued");
    expect(byId.get(stale.id)).toBe("cancelled");
  });

  it("其他專案的圖完成時不會變成目前專案的封面", async () => {
    const a = await newProject("similar", settings, "A");
    const job = queued(a.id);
    upsertGeneration(job);
    const b = await newProject("similar", settings, "B");

    upsertGeneration({ ...job, status: "done", assetId: "asset-a" });
    expect(getState().project?.id).toBe(b.id);
    expect(getState().project?.coverAssetId).toBeUndefined();
  });
});

describe("記憶體模式（IndexedDB 無法使用）", () => {
  it("切換專案後還能切回來，生成紀錄與圖片都在", async () => {
    resetWorkspaceForTests({ persistent: false });
    const a = await newProject("similar", settings, "A");
    const assetId = await addAsset(new Blob(["png"], { type: "image/png" }), "generated");
    upsertGeneration({ ...queued(a.id), status: "done", assetId });

    await newProject("similar", settings, "B");
    expect(getState().generations).toHaveLength(0);

    await openProject(a.id);
    expect(getState().project?.name).toBe("A");
    expect(getState().generations).toEqual([expect.objectContaining({ assetId })]);
    expect(await getAssetRecord(assetId)).toBeDefined();
  });

  it("背景完成的工作會寫回暫存中的專案", async () => {
    resetWorkspaceForTests({ persistent: false });
    const a = await newProject("similar", settings, "A");
    const job = queued(a.id);
    upsertGeneration(job);
    setGenerationActive(job.id, true);
    await newProject("similar", settings, "B");

    patchGeneration(job.id, { status: "done", assetId: "asset-1" });
    setGenerationActive(job.id, false);
    await openProject(a.id);
    expect(getState().generations).toEqual([expect.objectContaining({ id: job.id, status: "done" })]);
  });
});

describe("正常模式", () => {
  it("圖片存進資料庫，不另外留在記憶體", async () => {
    await newProject("similar", settings, "A");
    const assetId = await addAsset(new Blob(["png"], { type: "image/png" }), "generated");
    expect(await db.getAsset(assetId)).toBeDefined();
  });
});

describe("updateProjectById", () => {
  it("可以更新沒有開著的專案（上傳轉檔期間切換專案）", async () => {
    const a = await newProject("similar", settings, "A");
    await newProject("similar", settings, "B");
    await updateProjectById(a.id, (p) => ({ ...p, similar: { ...p.similar, referenceAssetId: "ref-1" } }));

    expect(getState().project?.name).toBe("B");
    expect(getState().project?.similar.referenceAssetId).toBeUndefined();
    expect((await db.getProject(a.id))?.similar.referenceAssetId).toBe("ref-1");
  });
});

describe("完整企劃的規劃版本", () => {
  const base = createProject("campaign", settings, "C").campaign;
  const g = (patch: Partial<Generation>): Generation => ({ ...queued("p"), contentSetId: "1-1_set1", ...patch });

  it("只有同一次規劃的圖算在目前內容組", () => {
    const campaign = { ...base, planId: "plan-2" };
    expect(isFromCurrentPlan(g({ planId: "plan-2" }), campaign)).toBe(true);
    expect(isFromCurrentPlan(g({ planId: "plan-1" }), campaign)).toBe(false);
    expect(isFromCurrentPlan(g({ planId: "plan-2", contentSetId: undefined }), campaign)).toBe(false);
  });

  it("舊資料兩邊都沒有規劃編號時仍視為同一份", () => {
    expect(isFromCurrentPlan(g({}), base)).toBe(true);
  });

  it("規劃後改選別的路線，規劃就過期", () => {
    const plan = { plan_name: "x", content_sets: [] } as unknown as NonNullable<typeof base.plan>;
    expect(isPlanStale({ ...base, plan, planRouteIndex: 0, activeRouteIndex: 0 })).toBe(false);
    expect(isPlanStale({ ...base, plan, planRouteIndex: 0, activeRouteIndex: 1 })).toBe(true);
    expect(isPlanStale({ ...base, plan: undefined, planRouteIndex: 0, activeRouteIndex: 1 })).toBe(false);
  });
});
