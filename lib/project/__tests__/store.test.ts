import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import * as db from "../db";
import {
  getState,
  newProject,
  openProject,
  patchGeneration,
  resetWorkspaceForTests,
  setGenerationActive,
  upsertGeneration,
} from "../store";
import type { Generation } from "../types";

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
