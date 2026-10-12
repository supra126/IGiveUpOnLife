#!/usr/bin/env node
/**
 * 手動執行的模型煙霧測試（不進 CI，會實際消耗 API 額度）
 *
 * 用法：GEMINI_API_KEY=xxx node scripts/smoke-models.mjs [--images] [--sizes]
 *   預設只測文字模型；--images 會對每個生圖模型打一次 1K 1:1；
 *   --sizes 另外測試各模型的比例 / 尺寸組合（較貴）
 */
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("請設定 GEMINI_API_KEY");
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const ai = new GoogleGenAI({ apiKey });

const TEXT_MODELS = ["gemini-3.8-flash", "gemini-3.1-pro-preview"];
const IMAGE_MODELS = [
  "gemini-nano-banana-2.1",
  "gemini-3-pro-image",
  "gemini-3.1-flash-lite-image",
];
const RATIOS = ["4:5", "9:16", "16:9", "3:2", "21:9"];
const SIZES = ["2K", "4K"];

async function check(label, fn) {
  const start = Date.now();
  try {
    const detail = await fn();
    console.log(`✓ ${label} (${Date.now() - start}ms) ${detail ?? ""}`);
  } catch (e) {
    console.log(`✗ ${label} — ${e?.status ?? ""} ${String(e?.message ?? e).slice(0, 200)}`);
  }
}

async function genImage(model, aspectRatio, imageSize) {
  const res = await ai.models.generateContent({
    model,
    contents: "A small red ceramic mug on a plain white table, studio light",
    config: {
      responseModalities: ["IMAGE"],
      imageConfig: { aspectRatio, imageSize },
    },
  });
  const cand = res.candidates?.[0];
  const img = cand?.content?.parts?.find((p) => p.inlineData?.data);
  if (!img) throw new Error(`沒有圖片，finishReason=${cand?.finishReason}`);
  const kb = Math.round((img.inlineData.data.length * 3) / 4 / 1024);
  return `${img.inlineData.mimeType} ${kb}KB thoughtSignature=${Boolean(img.thoughtSignature)}`;
}

for (const model of TEXT_MODELS) {
  await check(`text ${model}`, async () => {
    const res = await ai.models.generateContent({
      model,
      contents: 'Reply with JSON {"ok": true}',
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          properties: { ok: { type: "boolean" } },
          required: ["ok"],
        },
        thinkingConfig: { thinkingLevel: "LOW" },
      },
    });
    return res.text;
  });
}

if (args.has("--images")) {
  for (const model of IMAGE_MODELS) {
    await check(`image ${model} 1:1 1K`, () => genImage(model, "1:1", "1K"));
  }
}

if (args.has("--sizes")) {
  for (const model of IMAGE_MODELS) {
    for (const ratio of RATIOS) {
      await check(`image ${model} ${ratio} 1K`, () => genImage(model, ratio, "1K"));
    }
    for (const size of SIZES) {
      await check(`image ${model} 1:1 ${size}`, () => genImage(model, "1:1", size));
    }
  }
}
