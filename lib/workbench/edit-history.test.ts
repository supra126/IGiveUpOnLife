import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";

const image = { dataUrl: "data:image/png;base64,AAAA", model: "m", imageSize: "1K", aspectRatio: "1:1" };

vi.mock("@/lib/gemini/transport", () => ({
  IS_STATIC_BUILD: false,
  consumeStream: vi.fn(),
  gemini: {
    capabilities: vi.fn(),
    // 即使舊版 API 結果或傳輸層帶著簽章，也不能被存下來
    similarImage: vi.fn(async () => ({ ...image, thoughtSignature: "SIG_FROM_API" })),
    editImage: vi.fn(async () => image),
  },
}));

vi.mock("@/lib/image/blob", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/image/blob")>();
  return {
    ...actual,
    getImageSize: vi.fn(async () => ({ width: 1, height: 1 })),
    prepareImageForApi: vi.fn(async () => "data:image/png;base64,AAAA"),
  };
});

import * as db from "@/lib/project/db";
import { addAsset, getState, newProject, resetWorkspaceForTests, updateProject, upsertGeneration } from "@/lib/project/store";
import { createId, type Generation } from "@/lib/project/types";
import { gemini } from "@/lib/gemini/transport";
import { runEdit, runSimilar } from "./runner";

const settings = { imageModel: "m", textModel: "t", imageSize: "1K" as const };

beforeEach(async () => {
  vi.clearAllMocks();
  resetWorkspaceForTests();
  await db.resetDBForTests();
  indexedDB.deleteDatabase("igiveup");
});

/*
 * 修圖一律單輪：只送最新那張圖 + 指令。
 * 實測（1K，同一組圖與指令各跑 4 次）：多輪不帶簽章只有 1/4 保留上一輪的修改，
 * 單輪（最新圖）4/4 保留、和帶簽章一樣好。簽章與圖片一樣大（1K 約 1.4M 字元），
 * 帶著它會超過 schema 的 100,000 字元上限與 server action 的請求大小上限，所以不用它。
 */
describe("修圖只送最新那張圖（單輪、不帶簽章）", () => {
  it("新的生成結果不會把簽章存進紀錄", async () => {
    await newProject("similar", settings, "A");
    const reference = await addAsset(new Blob(["r"], { type: "image/png" }), "reference");
    const product = await addAsset(new Blob(["p"], { type: "image/png" }), "product");
    updateProject((p) => ({ ...p, similar: { ...p.similar, referenceAssetId: reference, productAssetId: product } }));

    await runSimilar(1);

    const [generation] = getState().generations;
    expect(generation.status).toBe("done");
    expect(generation).not.toHaveProperty("thoughtSignature");
  });

  it("已經修過好幾次的圖：歷史只有最新那張，沒有更早的回合與簽章，即使舊紀錄存著很大的簽章", async () => {
    await newProject("similar", settings, "A");
    const projectId = getState().project!.id;
    const base = { projectId, aspectRatio: "1:1" as const, model: "m", imageSize: "1K" as const, status: "done" as const, createdAt: 1 };
    const original: Generation = { ...base, id: createId(), source: "similar", assetId: await addAsset(new Blob(["a"], { type: "image/png" }), "generated") };
    // 舊版寫入的紀錄：簽章遠超過 schema 的 100,000 字元上限
    const firstEdit: Generation = {
      ...base,
      id: createId(),
      source: "edit",
      parentId: original.id,
      prompt: "make it blue",
      assetId: await addAsset(new Blob(["b"], { type: "image/png" }), "generated"),
      thoughtSignature: "LEGACY_SIG".repeat(200_000),
    };
    upsertGeneration(original);
    upsertGeneration(firstEdit);

    await runEdit(firstEdit, "add a leaf");

    expect(gemini.editImage).toHaveBeenCalledTimes(1);
    const { history, instruction } = vi.mocked(gemini.editImage).mock.calls[0][0] as {
      history: Array<{ role: string; image?: string; text?: string }>;
      instruction: string;
    };
    expect(history).toEqual([{ role: "user", image: "data:image/png;base64,AAAA" }]);
    expect(instruction).toBe("add a leaf");
    expect(JSON.stringify(history)).not.toContain("LEGACY_SIG");
  });

  it("最新那張圖不見時提示錯誤，不呼叫 API", async () => {
    await newProject("similar", settings, "A");
    const projectId = getState().project!.id;
    const missing: Generation = {
      id: createId(),
      projectId,
      source: "similar",
      aspectRatio: "1:1",
      model: "m",
      imageSize: "1K",
      status: "done",
      createdAt: 1,
      assetId: "no-such-asset",
    };
    upsertGeneration(missing);

    await runEdit(missing, "add a leaf");

    expect(gemini.editImage).not.toHaveBeenCalled();
  });
});
