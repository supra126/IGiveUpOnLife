/**
 * Gemini 操作（前後端共用）
 *
 * 所有函式都接受一個 GoogleGenAI 實例與「已驗證」的輸入，失敗時丟出 GeminiError。
 * server action 和瀏覽器 transport 只負責取得 ai 實例、驗證輸入與轉換錯誤。
 */
import type {
  Content,
  GenerateContentConfig,
  GenerateContentParameters,
  GoogleGenAI,
  Part,
  ThinkingLevel,
} from "@google/genai";
import type { z } from "zod";
import type { ContentPlan, DirectorOutput } from "@/types";
import { GeminiError } from "./errors";
import { withRetry } from "./retry";
import {
  getImageModelSpec,
  clampImageOptions,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_TEXT_MODEL,
  type ThinkingLevelName,
} from "./models";
import { FORMATS } from "./formats";
import {
  AnalyzeInputSchema,
  CONTENT_PLAN_JSON_SCHEMA,
  ContentPlanSchema,
  DIRECTOR_OUTPUT_JSON_SCHEMA,
  DirectorOutputSchema,
  EditImageInputSchema,
  PlanInputSchema,
  PromptImageInputSchema,
  RegeneratePromptInputSchema,
  SimilarImageInputSchema,
} from "./schemas";
import { getContentPlannerSystemPrompt, getDirectorSystemPrompt } from "./prompts/campaign";
import {
  buildCampaignImagePrompt,
  buildRegeneratePromptUserText,
  VISUAL_PROMPT_SYSTEM,
  wrapUserInput,
} from "./prompts/image";
import { buildSimilarInstruction, IMAGE_LABELS } from "./prompts/similar";
import { buildEditInstruction } from "./prompts/edit";
import { assertNotBlocked, extractImage, parseStructured } from "./responses";
import { streamStructured, type StreamEvent } from "./stream";

export { assertNotBlocked, extractImage, parseStructured };

export interface OperationOptions {
  signal?: AbortSignal;
  textModel?: string;
  imageModel?: string;
}

export interface GeneratedImage {
  dataUrl: string;
  mimeType: string;
  /** 模型額外回傳的文字（若有） */
  text?: string;
  model: string;
  aspectRatio: string;
  imageSize: string;
}

// --- 輸入驗證 ---

export function parseInput<S extends z.ZodType>(schema: S, raw: unknown): z.output<S> {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new GeminiError("INVALID_INPUT", issue ? `${issue.path.join(".")}: ${issue.message}` : undefined);
  }
  return result.data;
}

// --- 共用工具 ---

export function dataUrlToPart(dataUrl: string): Part {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new GeminiError("INVALID_INPUT", "Invalid image data URL");
  return { inlineData: { mimeType: match[1], data: match[2] } };
}

function toThinkingLevel(level: ThinkingLevelName | undefined): { thinkingLevel: ThinkingLevel } | undefined {
  return level ? { thinkingLevel: level.toUpperCase() as ThinkingLevel } : undefined;
}

function imageConfigFor(
  input: { model?: string; aspectRatio?: string; imageSize?: string; thinkingLevel?: ThinkingLevelName },
  opts: OperationOptions,
  signal?: AbortSignal
): { model: string; config: GenerateContentConfig; aspectRatio: string; imageSize: string } {
  const spec = getImageModelSpec(input.model || opts.imageModel || DEFAULT_IMAGE_MODEL);
  const clamped = clampImageOptions(spec, {
    size: input.imageSize as never,
    aspectRatio: input.aspectRatio as never,
    thinkingLevel: input.thinkingLevel,
  });
  const thinkingConfig = toThinkingLevel(clamped.thinkingLevel);
  return {
    model: spec.id,
    aspectRatio: clamped.aspectRatio,
    imageSize: clamped.size,
    config: {
      responseModalities: ["IMAGE", "TEXT"],
      imageConfig: { aspectRatio: clamped.aspectRatio, imageSize: clamped.size },
      ...(thinkingConfig ? { thinkingConfig } : {}),
      abortSignal: signal,
    },
  };
}

async function generateImageWith(
  ai: GoogleGenAI,
  contents: Content[],
  setup: ReturnType<typeof imageConfigFor>,
  signal?: AbortSignal
): Promise<GeneratedImage> {
  const response = await withRetry(
    () => ai.models.generateContent({ model: setup.model, contents, config: setup.config }),
    { signal }
  );
  // thoughtSignature 和圖片一樣大（1K 約 1.4M 字元、4K 約 12.7M），不往外傳：
  // 帶著它會讓 server action 的回應與每筆紀錄暴增，下一輪修圖再送回時也會超過 schema 與請求大小上限。
  // 多輪修圖只靠圖片與指令，實測沒有簽章品質相當
  const { thoughtSignature: _signature, ...image } = extractImage(response);
  return {
    ...image,
    model: setup.model,
    aspectRatio: setup.aspectRatio,
    imageSize: setup.imageSize,
  };
}

// --- 完整企劃：分析 ---

export function buildAnalyzeRequest(
  input: z.output<typeof AnalyzeInputSchema>,
  opts: OperationOptions = {}
): GenerateContentParameters {
  const zh = input.locale === "zh";
  const lines = [
    `${zh ? "產品名稱" : "Product name"}: ${input.productName || (zh ? "未提供" : "Not provided")}`,
    input.productInfo ? `${zh ? "品牌 / 產品資訊" : "Brand / product info"}: ${input.productInfo}` : "",
    input.productUrl ? `${zh ? "產品網址（僅供參考，無法開啟）" : "Product URL (reference only, not fetched)"}: ${input.productUrl}` : "",
  ].filter(Boolean);

  return {
    model: input.model || opts.textModel || DEFAULT_TEXT_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          dataUrlToPart(input.image),
          {
            text: `${wrapUserInput("product_brief", lines.join("\n"))}\n\n${
              zh ? "請根據圖片與上述資訊執行分析任務。" : "Analyze the image and the brief above."
            }`,
          },
        ],
      },
    ],
    config: {
      systemInstruction: getDirectorSystemPrompt(input.locale),
      responseMimeType: "application/json",
      responseJsonSchema: DIRECTOR_OUTPUT_JSON_SCHEMA,
      temperature: 1.0,
    },
  };
}

export async function analyzeProduct(
  ai: GoogleGenAI,
  input: z.output<typeof AnalyzeInputSchema>,
  opts: OperationOptions = {}
): Promise<DirectorOutput> {
  const request = buildAnalyzeRequest(input, opts);
  const response = await withRetry(
    () => ai.models.generateContent({ ...request, config: { ...request.config, abortSignal: opts.signal } }),
    { signal: opts.signal }
  );
  return parseStructured(response, DirectorOutputSchema);
}

export function streamAnalyze(
  ai: GoogleGenAI,
  input: z.output<typeof AnalyzeInputSchema>,
  opts: OperationOptions = {}
): AsyncGenerator<StreamEvent<DirectorOutput>> {
  return streamStructured(ai, buildAnalyzeRequest(input, opts), DirectorOutputSchema, {
    signal: opts.signal,
    total: 3,
    countPattern: /"route_name"/g,
  });
}

// --- 完整企劃：內容規劃 ---

const SIZE_LABELS = {
  zh: { "1:1": "FB 貼文", "9:16": "限時動態 / Stories", "4:5": "IG 貼文", "16:9": "橫式貼文", "1:1-commercial": "商業攝影" },
  en: { "1:1": "FB Post", "9:16": "Stories", "4:5": "IG Post", "16:9": "Landscape", "1:1-commercial": "Commercial" },
} as const;

type PlanFormat = keyof (typeof SIZE_LABELS)["zh"];

export function buildPlanRequest(
  input: z.output<typeof PlanInputSchema>,
  opts: OperationOptions = {}
): GenerateContentParameters {
  const zh = input.locale === "zh";
  const labels = SIZE_LABELS[input.locale];
  const formats = input.formats as PlanFormat[];
  const sizeList = formats.map((f) => `${f} (${labels[f]})`).join(", ");
  const brief = [
    `${zh ? "策略路線" : "Strategy route"}: ${input.route.route_name}`,
    `${zh ? "主標題" : "Headline"}: ${input.route.headline}`,
    `${zh ? "副標題" : "Subhead"}: ${input.route.subhead}`,
    `${zh ? "風格" : "Style"}: ${input.route.style_brief}`,
    `${zh ? "目標受眾" : "Target audience"}: ${input.route.target_audience}`,
    input.supplement ? `${zh ? "策略補充" : "Strategy notes"}: ${input.supplement}` : "",
    `${zh ? "產品名稱" : "Product"}: ${input.analysis.name}`,
    `${zh ? "產品特點" : "Key features"}: ${input.analysis.key_features}`,
    `${zh ? "參考文案" : "Reference copy"}: ${input.referenceCopy || (zh ? "無（請自行規劃最佳結構）" : "None (plan the best structure)")}`,
    `${zh ? "選定尺寸" : "Selected sizes"}: ${sizeList}`,
  ].filter(Boolean);

  return {
    model: input.model || opts.textModel || DEFAULT_TEXT_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${wrapUserInput("campaign_brief", brief.join("\n"))}\n\n${
              zh ? "請為每個選定尺寸產生 3 組內容方案。" : "Generate 3 content sets for each selected size."
            }`,
          },
        ],
      },
    ],
    config: {
      systemInstruction: getContentPlannerSystemPrompt(input.locale),
      responseMimeType: "application/json",
      responseJsonSchema: CONTENT_PLAN_JSON_SCHEMA,
      temperature: 1.0,
      maxOutputTokens: 32768,
    },
  };
}

/** 只保留使用者選的尺寸，並確保 id 唯一 */
export function finalizePlan(raw: z.output<typeof ContentPlanSchema>, formats: string[]): ContentPlan {
  const plan = raw as ContentPlan;
  const seen = new Set<string>();
  plan.content_sets = plan.content_sets
    .filter((set) => formats.includes(set.ratio))
    .map((set) => {
      let id = set.id;
      while (seen.has(id)) id = `${id}_dup`;
      seen.add(id);
      return { ...set, id };
    });
  if (plan.content_sets.length === 0) throw new GeminiError("INVALID_RESPONSE", "No content sets");
  return plan;
}

export async function planContent(
  ai: GoogleGenAI,
  input: z.output<typeof PlanInputSchema>,
  opts: OperationOptions = {}
): Promise<ContentPlan> {
  const request = buildPlanRequest(input, opts);
  const response = await withRetry(
    () => ai.models.generateContent({ ...request, config: { ...request.config, abortSignal: opts.signal } }),
    { signal: opts.signal }
  );
  return finalizePlan(parseStructured(response, ContentPlanSchema), input.formats);
}

export async function* streamPlan(
  ai: GoogleGenAI,
  input: z.output<typeof PlanInputSchema>,
  opts: OperationOptions = {}
): AsyncGenerator<StreamEvent<ContentPlan>> {
  const events = streamStructured(ai, buildPlanRequest(input, opts), ContentPlanSchema, {
    signal: opts.signal,
    total: input.formats.length * 3,
    countPattern: /"visual_prompt_en"\s*:\s*"(?:[^"\\]|\\.)*"/g,
  });
  for await (const event of events) {
    yield event.type === "result" ? { type: "result", data: finalizePlan(event.data, input.formats) } : event;
  }
}

// --- 完整企劃：重新生成 visual prompt ---

export async function regenerateVisualPrompt(
  ai: GoogleGenAI,
  input: z.output<typeof RegeneratePromptInputSchema>,
  opts: OperationOptions = {}
): Promise<string> {
  const response = await withRetry(
    () =>
      ai.models.generateContent({
        model: input.model || opts.textModel || DEFAULT_TEXT_MODEL,
        contents: [
          {
            role: "user",
            parts: [{ text: buildRegeneratePromptUserText({ ...input, formatId: input.formatId as keyof typeof FORMATS }) }],
          },
        ],
        config: { systemInstruction: VISUAL_PROMPT_SYSTEM, temperature: 0.8, abortSignal: opts.signal },
      }),
    { signal: opts.signal }
  );
  assertNotBlocked(response);
  const text = response.text?.trim();
  if (!text) throw new GeminiError("INVALID_RESPONSE", "Empty prompt");
  return text;
}

// --- 完整企劃：以 visual prompt 生圖 ---

export async function generatePromptImage(
  ai: GoogleGenAI,
  input: z.output<typeof PromptImageInputSchema>,
  opts: OperationOptions = {}
): Promise<GeneratedImage> {
  const formatId = input.formatId as keyof typeof FORMATS | undefined;
  const aspectRatio = formatId ? FORMATS[formatId].aspectRatio : input.aspectRatio;
  const setup = imageConfigFor({ ...input, aspectRatio }, opts, opts.signal);
  const parts: Part[] = [
    { text: "PRODUCT IMAGE — reproduce this product exactly:" },
    dataUrlToPart(input.productImage),
  ];
  if (input.secondaryImage) {
    parts.push({ text: "SECONDARY PRODUCT:" }, dataUrlToPart(input.secondaryImage));
  }
  parts.push({ text: buildCampaignImagePrompt(input.prompt, formatId, Boolean(input.secondaryImage)) });
  return generateImageWith(ai, [{ role: "user", parts }], setup, opts.signal);
}

// --- 相似圖 ---

export function buildSimilarParts(input: z.output<typeof SimilarImageInputSchema>, aspectRatio: string): Part[] {
  const parts: Part[] = [
    { text: IMAGE_LABELS.reference },
    dataUrlToPart(input.referenceImage),
    { text: IMAGE_LABELS.product },
    dataUrlToPart(input.productImage),
  ];
  if (input.secondaryImage) {
    parts.push({ text: IMAGE_LABELS.secondary }, dataUrlToPart(input.secondaryImage));
  }
  parts.push({
    text: buildSimilarInstruction({
      similarity: input.similarity,
      aspectRatio,
      hasSecondary: Boolean(input.secondaryImage),
      copySpace: input.copySpace,
      instructions: input.instructions,
      variantIndex: input.variantIndex,
      variantCount: input.variantCount,
    }),
  });
  return parts;
}

export async function generateSimilarImage(
  ai: GoogleGenAI,
  input: z.output<typeof SimilarImageInputSchema>,
  opts: OperationOptions = {}
): Promise<GeneratedImage> {
  const setup = imageConfigFor(input, opts, opts.signal);
  return generateImageWith(ai, [{ role: "user", parts: buildSimilarParts(input, setup.aspectRatio) }], setup, opts.signal);
}

// --- 對話式修圖 ---

/** 合併相鄰同角色的 turn，讓 contents 保持 user / model 交替 */
export function buildEditContents(input: z.output<typeof EditImageInputSchema>, aspectRatio: string): Content[] {
  const contents: Content[] = [];
  const push = (role: "user" | "model", parts: Part[]) => {
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts = [...(last.parts ?? []), ...parts];
    else contents.push({ role, parts });
  };

  for (const turn of input.history) {
    const parts: Part[] = [];
    if (turn.text) parts.push({ text: turn.text });
    if (turn.image) {
      const imagePart = dataUrlToPart(turn.image);
      if (turn.role === "model" && turn.thoughtSignature) imagePart.thoughtSignature = turn.thoughtSignature;
      parts.push(imagePart);
    }
    if (parts.length) push(turn.role, parts);
  }
  push("user", [{ text: buildEditInstruction(input.instruction, aspectRatio) }]);
  return contents;
}

export async function editImage(
  ai: GoogleGenAI,
  input: z.output<typeof EditImageInputSchema>,
  opts: OperationOptions = {}
): Promise<GeneratedImage> {
  const setup = imageConfigFor(input, opts, opts.signal);
  try {
    return await generateImageWith(ai, buildEditContents(input, setup.aspectRatio), setup, opts.signal);
  } catch (error) {
    // 多輪歷史被拒（例如簽章失效）時，退回單輪：只送最新的圖 + 指令
    const hasModelTurn = input.history.some((t) => t.role === "model");
    if (!(error instanceof GeminiError) || error.code !== "INVALID_INPUT" || !hasModelTurn) throw error;
    const latest = [...input.history].reverse().find((t) => t.image);
    if (!latest?.image) throw error;
    return generateImageWith(
      ai,
      buildEditContents({ ...input, history: [{ role: "user", image: latest.image }] }, setup.aspectRatio),
      setup,
      opts.signal
    );
  }
}
