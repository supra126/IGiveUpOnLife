import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";

const image = { dataUrl: "data:image/png;base64,AAAA", model: "m", imageSize: "1K", aspectRatio: "1:1" };

vi.mock("@/lib/gemini/transport", () => ({
  IS_STATIC_BUILD: false,
  consumeStream: vi.fn(),
  gemini: {
    capabilities: vi.fn(),
    // 真實 API 會回傳實際使用的比例
    similarImage: vi.fn(async (input: { aspectRatio: string }) => ({ ...image, aspectRatio: input.aspectRatio })),
    editImage: vi.fn(async () => image),
    promptImage: vi.fn(async () => image),
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
import {
  addAsset,
  getState,
  newProject,
  resetWorkspaceForTests,
  updateProject,
  upsertGeneration,
} from "@/lib/project/store";
import { createId, type Generation } from "@/lib/project/types";
import { gemini } from "@/lib/gemini/transport";
import { retryGeneration } from "./runner";

const settings = { imageModel: "m", textModel: "t", imageSize: "1K" as const };

beforeEach(async () => {
  vi.clearAllMocks();
  resetWorkspaceForTests();
  await db.resetDBForTests();
  indexedDB.deleteDatabase("igiveup");
});

async function asset(role: "reference" | "product" | "generated") {
  return addAsset(new Blob(["x"], { type: "image/png" }), role);
}

function generation(patch: Partial<Generation>): Generation {
  return {
    id: createId(),
    projectId: getState().project!.id,
    source: "similar",
    aspectRatio: "1:1",
    model: "m",
    imageSize: "1K",
    status: "error",
    createdAt: Date.now(),
    ...patch,
  };
}

const ids = () => getState().generations.map((g) => g.id);

describe("重試失敗的生成", () => {
  it("延伸比例失敗：以原圖重新延伸成同樣的比例，不會變成相似圖", async () => {
    await newProject("similar", settings, "A");
    const product = await asset("product");
    updateProject((p) => ({ ...p, similar: { ...p.similar, productAssetId: product, aspectRatio: "1:1" } }));
    const parent = generation({ status: "done", assetId: await asset("generated") });
    const failed = generation({ source: "extend", parentId: parent.id, aspectRatio: "9:16", similarity: "high" });
    upsertGeneration(parent);
    upsertGeneration(failed);

    await retryGeneration(failed);

    expect(gemini.similarImage).toHaveBeenCalledTimes(1);
    expect(vi.mocked(gemini.similarImage).mock.calls[0][0]).toMatchObject({ aspectRatio: "9:16", similarity: "high" });
    expect(ids()).not.toContain(failed.id);
    const created = getState().generations.find((g) => g.id !== parent.id)!;
    expect(created).toMatchObject({ source: "extend", parentId: parent.id, aspectRatio: "9:16", status: "done" });
  });

  it("修圖失敗：用原本的指令重新修圖", async () => {
    await newProject("similar", settings, "A");
    const parent = generation({ status: "done", assetId: await asset("generated") });
    const failed = generation({ source: "edit", parentId: parent.id, prompt: "make it blue" });
    upsertGeneration(parent);
    upsertGeneration(failed);

    await retryGeneration(failed);

    expect(gemini.editImage).toHaveBeenCalledTimes(1);
    expect(vi.mocked(gemini.editImage).mock.calls[0][0]).toMatchObject({ instruction: "make it blue" });
    expect(gemini.similarImage).not.toHaveBeenCalled();
    expect(ids()).not.toContain(failed.id);
  });

  it("找不到可用的原圖時保留失敗卡片，不呼叫 API", async () => {
    await newProject("similar", settings, "A");
    const failed = generation({ source: "extend", parentId: "missing", aspectRatio: "9:16" });
    upsertGeneration(failed);

    await retryGeneration(failed);

    expect(ids()).toEqual([failed.id]);
    expect(gemini.similarImage).not.toHaveBeenCalled();
  });

  it("相似圖失敗：重新生成一張，舊的失敗卡片被取代", async () => {
    await newProject("similar", settings, "A");
    const reference = await asset("reference");
    const product = await asset("product");
    updateProject((p) => ({ ...p, similar: { ...p.similar, referenceAssetId: reference, productAssetId: product } }));
    const failed = generation({});
    upsertGeneration(failed);

    await retryGeneration(failed);

    expect(gemini.similarImage).toHaveBeenCalledTimes(1);
    expect(ids()).not.toContain(failed.id);
    expect(getState().generations).toHaveLength(1);
    expect(getState().generations[0]).toMatchObject({ source: "similar", status: "done" });
  });

  it("相似圖失敗但圖片已被移除：保留失敗卡片", async () => {
    await newProject("similar", settings, "A");
    const failed = generation({});
    upsertGeneration(failed);

    await retryGeneration(failed);

    expect(ids()).toEqual([failed.id]);
    expect(gemini.similarImage).not.toHaveBeenCalled();
  });

  it("完整企劃失敗：只重生該內容組，並移除失敗卡片", async () => {
    await newProject("campaign", settings, "C");
    const product = await asset("product");
    const set = {
      id: "set-1",
      ratio: "1:1",
      set_number: 1,
      size_label: "IG",
      title: "t",
      copy: "c",
      visual_summary: "",
      visual_prompt_en: "a prompt",
    };
    updateProject((p) => ({
      ...p,
      campaign: { ...p.campaign, productAssetId: product, planId: "plan-1", contentSets: [set as never] },
    }));
    const failed = generation({ source: "campaign", contentSetId: "set-1", planId: "plan-1" });
    upsertGeneration(failed);

    await retryGeneration(failed);

    expect(gemini.promptImage).toHaveBeenCalledTimes(1);
    expect(vi.mocked(gemini.promptImage).mock.calls[0][0]).toMatchObject({ prompt: "a prompt" });
    expect(ids()).not.toContain(failed.id);
    expect(getState().generations).toHaveLength(1);
  });

  it("完整企劃：內容組已不存在時保留失敗卡片", async () => {
    await newProject("campaign", settings, "C");
    const failed = generation({ source: "campaign", contentSetId: "gone", planId: "plan-1" });
    upsertGeneration(failed);

    await retryGeneration(failed);

    expect(ids()).toEqual([failed.id]);
    expect(gemini.promptImage).not.toHaveBeenCalled();
  });
});
