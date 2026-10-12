import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";

// 生圖 API 由測試控制何時回應
const pending: Array<(value: unknown) => void> = [];
vi.mock("@/lib/gemini/transport", () => ({
  IS_STATIC_BUILD: false,
  consumeStream: vi.fn(),
  gemini: {
    capabilities: vi.fn(async () => ({
      mode: "static",
      hasServerKey: false,
      defaults: { textModel: "", imageModel: "" },
      allowedImageModels: null,
      allowedTextModels: null,
      rateLimit: null,
    })),
    similarImage: vi.fn(
      () =>
        new Promise((resolve) => {
          pending.push(resolve);
        })
    ),
  },
}));

// jsdom 沒有 createImageBitmap / canvas，圖片處理改成直通
vi.mock("@/lib/image/blob", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/image/blob")>();
  return {
    ...actual,
    getImageSize: vi.fn(async () => ({ width: 1, height: 1 })),
    prepareImageForApi: vi.fn(async () => "data:image/png;base64,AAAA"),
  };
});

import * as db from "@/lib/project/db";
import { addAsset, deleteProject, getState, newProject, resetWorkspaceForTests, updateProject } from "@/lib/project/store";
import { cancelProjectJobs, runSimilar } from "./runner";

const settings = { imageModel: "m", textModel: "t", imageSize: "1K" as const };

beforeEach(async () => {
  pending.length = 0;
  resetWorkspaceForTests();
  await db.resetDBForTests();
  indexedDB.deleteDatabase("igiveup");
});

async function countAssets(projectId: string): Promise<number> {
  const all = await (await db.getDB()).getAll("assets");
  return all.filter((a) => a.projectId === projectId).length;
}

describe("刪除專案時進行中的生成", () => {
  it("API 之後才回應也不會存下沒人引用的圖", async () => {
    const project = await newProject("similar", settings, "A");
    const reference = await addAsset(new Blob(["r"], { type: "image/png" }), "reference");
    const product = await addAsset(new Blob(["p"], { type: "image/png" }), "product");
    updateProject((p) => ({ ...p, similar: { ...p.similar, referenceAssetId: reference, productAssetId: product, count: 1 } }));

    const job = runSimilar(1);
    await vi.waitFor(() => expect(pending).toHaveLength(1));

    cancelProjectJobs(project.id);
    await deleteProject(project.id);
    expect(getState().projects).toHaveLength(0);

    pending[0]({ dataUrl: "data:image/png;base64,AAAA", model: "m", imageSize: "1K", aspectRatio: "1:1" });
    await job;
    await new Promise((r) => setTimeout(r, 20));
    expect(await countAssets(project.id)).toBe(0);
  });
});
