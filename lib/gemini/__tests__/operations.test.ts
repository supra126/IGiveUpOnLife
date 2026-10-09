import { describe, it, expect } from "vitest";
import type { GenerateContentResponse } from "@google/genai";
import {
  buildEditContents,
  buildSimilarParts,
  extractImage,
  parseInput,
  parseStructured,
} from "../operations";
import { DirectorOutputSchema, EditImageInputSchema, SimilarImageInputSchema } from "../schemas";
import { buildSimilarInstruction, SIMILARITY_RULES, DIMENSIONS } from "../prompts/similar";
import { clampImageOptions, getImageModelSpec } from "../models";

const IMG = "data:image/png;base64,iVBORw0KGgo=";
const IMG2 = "data:image/jpeg;base64,/9j/4AAQ";

function response(partial: Partial<GenerateContentResponse> & { text?: string }): GenerateContentResponse {
  return partial as GenerateContentResponse;
}

describe("extractImage", () => {
  it("取最後一張非 thought 的圖，並帶出 thoughtSignature", () => {
    const res = response({
      candidates: [
        {
          finishReason: "STOP" as never,
          content: {
            parts: [
              { thought: true, inlineData: { data: "draft", mimeType: "image/png" } },
              { inlineData: { data: "final", mimeType: "image/jpeg" }, thoughtSignature: "sig" },
            ],
          },
        },
      ],
    });
    const image = extractImage(res);
    expect(image.dataUrl).toBe("data:image/jpeg;base64,final");
    expect(image.thoughtSignature).toBe("sig");
  });

  it("IMAGE_SAFETY 視為被擋", () => {
    const res = response({ candidates: [{ finishReason: "IMAGE_SAFETY" as never, content: { parts: [] } }] });
    expect(() => extractImage(res)).toThrow(expect.objectContaining({ code: "CONTENT_BLOCKED" }));
  });

  it("沒有圖片時丟出 NO_IMAGE", () => {
    const res = response({ candidates: [{ finishReason: "STOP" as never, content: { parts: [{ text: "hi" }] } }] });
    expect(() => extractImage(res)).toThrow(expect.objectContaining({ code: "NO_IMAGE" }));
  });

  it("promptFeedback.blockReason 視為被擋", () => {
    const res = response({ promptFeedback: { blockReason: "SAFETY" as never } });
    expect(() => extractImage(res)).toThrow(expect.objectContaining({ code: "CONTENT_BLOCKED" }));
  });
});

describe("parseStructured", () => {
  const valid = {
    product_analysis: { name: "杯子", visual_description: "紅色陶瓷", key_features: "耐熱" },
    marketing_routes: [
      { route_name: "A", headline: "h", subhead: "s", style_brief: "b", target_audience: "t" },
    ],
  };

  it("解析並驗證 JSON", () => {
    const res = response({ text: JSON.stringify(valid), candidates: [{ finishReason: "STOP" as never }] });
    expect(parseStructured(res, DirectorOutputSchema).product_analysis.name).toBe("杯子");
  });

  it("MAX_TOKENS 回報截斷", () => {
    const res = response({ text: "{", candidates: [{ finishReason: "MAX_TOKENS" as never }] });
    expect(() => parseStructured(res, DirectorOutputSchema)).toThrow(
      expect.objectContaining({ code: "RESPONSE_TRUNCATED" })
    );
  });

  it("欄位不符時回報 INVALID_RESPONSE", () => {
    const res = response({ text: '{"product_analysis":{}}', candidates: [{ finishReason: "STOP" as never }] });
    expect(() => parseStructured(res, DirectorOutputSchema)).toThrow(
      expect.objectContaining({ code: "INVALID_RESPONSE" })
    );
  });
});

describe("parseInput", () => {
  it("拒絕非 data URL 的圖片", () => {
    expect(() =>
      parseInput(SimilarImageInputSchema, { referenceImage: "abc", productImage: IMG, similarity: "low" })
    ).toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));
  });

  it("補上預設值", () => {
    const input = parseInput(SimilarImageInputSchema, {
      referenceImage: IMG,
      productImage: IMG2,
      similarity: "high",
    });
    expect(input).toMatchObject({ aspectRatio: "1:1", copySpace: "none", variantCount: 1 });
  });
});

describe("相似圖 prompt", () => {
  it("每張圖前都有標籤，順序為參考圖、產品圖、副產品、指令", () => {
    const input = parseInput(SimilarImageInputSchema, {
      referenceImage: IMG,
      productImage: IMG2,
      secondaryImage: IMG,
      similarity: "medium",
    });
    const parts = buildSimilarParts(input, "4:5");
    expect(parts[0].text).toMatch(/^IMAGE A — STYLE REFERENCE/);
    expect(parts[1].inlineData?.mimeType).toBe("image/png");
    expect(parts[2].text).toMatch(/^IMAGE B — OUR PRODUCT/);
    expect(parts[3].inlineData?.mimeType).toBe("image/jpeg");
    expect(parts[4].text).toMatch(/^IMAGE C/);
    expect(parts[6].text).toContain("aspect ratio 4:5");
  });

  it("每個等級的保留 / 改變剛好涵蓋所有維度", () => {
    for (const rule of Object.values(SIMILARITY_RULES)) {
      expect([...rule.keep, ...rule.change].sort()).toEqual([...DIMENSIONS].sort());
    }
  });

  it("高相似度沒有 CHANGE 區塊，低相似度只保留色調", () => {
    const high = buildSimilarInstruction({ similarity: "high", aspectRatio: "1:1" });
    expect(high).not.toContain("CHANGE —");
    const low = buildSimilarInstruction({ similarity: "low", aspectRatio: "1:1" });
    expect(low.split("CHANGE —")[0]).toContain("Color —");
    expect(low.split("CHANGE —")[0]).not.toContain("Lighting —");
  });

  it("多張變體加上不同的變化提示，使用者指示包在 user 區塊", () => {
    const a = buildSimilarInstruction({ similarity: "medium", aspectRatio: "1:1", variantIndex: 0, variantCount: 3 });
    const b = buildSimilarInstruction({ similarity: "medium", aspectRatio: "1:1", variantIndex: 1, variantCount: 3 });
    expect(a).toContain("VARIATION 1 of 3");
    expect(a).not.toBe(b);
    const withUser = buildSimilarInstruction({ similarity: "low", aspectRatio: "1:1", instructions: "更暖" });
    expect(withUser).toContain("<user_direction>\n更暖\n</user_direction>");
  });

  it("copySpace 會要求留白", () => {
    expect(buildSimilarInstruction({ similarity: "high", aspectRatio: "1:1", copySpace: "top" })).toContain(
      "top third"
    );
  });
});

describe("buildEditContents", () => {
  it("合併相鄰同角色並保留 model 的 thoughtSignature", () => {
    const input = parseInput(EditImageInputSchema, {
      history: [
        { role: "user", image: IMG },
        { role: "model", image: IMG2, thoughtSignature: "sig-1" },
      ],
      instruction: "背景換成藍色",
    });
    const contents = buildEditContents(input, "1:1");
    expect(contents.map((c) => c.role)).toEqual(["user", "model", "user"]);
    expect(contents[1].parts?.[0].thoughtSignature).toBe("sig-1");
    expect(contents[2].parts?.[0].text).toContain("背景換成藍色");
  });

  it("只有原圖時，原圖與指令合併為同一個 user turn", () => {
    const input = parseInput(EditImageInputSchema, { history: [{ role: "user", image: IMG }], instruction: "x" });
    const contents = buildEditContents(input, "1:1");
    expect(contents).toHaveLength(1);
    expect(contents[0].parts).toHaveLength(2);
  });
});

describe("clampImageOptions", () => {
  it("Lite 只能 1K，未知模型給寬鬆設定", () => {
    const lite = getImageModelSpec("gemini-3.1-flash-lite-image");
    expect(clampImageOptions(lite, { size: "4K", aspectRatio: "9:16" })).toMatchObject({
      size: "1K",
      aspectRatio: "9:16",
    });
    expect(getImageModelSpec("gemini-future-image").sizes).toContain("4K");
  });

  it("不支援的 thinking level 會被移除", () => {
    const pro = getImageModelSpec("gemini-3-pro-image");
    expect(clampImageOptions(pro, { thinkingLevel: "high" }).thinkingLevel).toBeUndefined();
  });
});
