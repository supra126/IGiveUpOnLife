/**
 * Gemini 請求 / 回應的 zod schema（前後端共用）
 */
import { z } from "zod";
import { ASPECT_RATIOS, IMAGE_SIZES, THINKING_LEVELS } from "./models";
import { FORMAT_IDS } from "./formats";

// --- 基本型別 ---

export const LocaleSchema = z.enum(["zh", "en"]).default("zh");

/** 約 15MB 的 base64 字串，超過就交給前端先縮圖 */
const MAX_DATA_URL_LENGTH = 20_000_000;

/** 只接受 data URL；raw base64 直接拒絕，不再靜默丟掉 */
export const DataUrlImageSchema = z
  .string()
  .max(MAX_DATA_URL_LENGTH, "Image too large")
  .regex(/^data:image\/(png|jpeg|webp|heic|heif|gif);base64,[A-Za-z0-9+/=]+$/, "Invalid image data URL");

export const AspectRatioSchema = z.enum(ASPECT_RATIOS);
export const ImageSizeSchema = z.enum(IMAGE_SIZES);
export const ThinkingLevelSchema = z.enum(THINKING_LEVELS);
export const FormatIdSchema = z.enum(FORMAT_IDS as [string, ...string[]]);
export const ModelIdSchema = z.string().regex(/^[a-z0-9.\-]{3,64}$/, "Invalid model id");
export const SimilarityLevelSchema = z.enum(["low", "medium", "high"]);
export const CopySpaceSchema = z.enum(["none", "top", "bottom", "left", "right"]);

const shortText = (max: number) => z.string().trim().max(max);

const ImageOptionsSchema = z.object({
  model: ModelIdSchema.optional(),
  aspectRatio: AspectRatioSchema.default("1:1"),
  imageSize: ImageSizeSchema.optional(),
  thinkingLevel: ThinkingLevelSchema.optional(),
});

// --- 請求 ---

export const AnalyzeInputSchema = z.object({
  image: DataUrlImageSchema,
  productName: shortText(200).default(""),
  productInfo: shortText(4000).default(""),
  productUrl: shortText(500).default(""),
  model: ModelIdSchema.optional(),
  locale: LocaleSchema,
});

export const MarketingRouteSchema = z.object({
  route_name: shortText(200).min(1),
  headline: shortText(300).min(1),
  subhead: shortText(500).min(1),
  style_brief: shortText(2000).min(1),
  target_audience: shortText(1000).min(1),
});

export const ProductAnalysisSchema = z.object({
  name: shortText(200).min(1),
  visual_description: shortText(4000).min(1),
  key_features: shortText(4000).min(1),
});

export const PlanInputSchema = z.object({
  route: MarketingRouteSchema,
  analysis: ProductAnalysisSchema,
  supplement: shortText(2000).default(""),
  referenceCopy: shortText(4000).default(""),
  formats: z.array(FormatIdSchema).min(1).max(5),
  model: ModelIdSchema.optional(),
  locale: LocaleSchema,
});

export const RegeneratePromptInputSchema = z.object({
  title: shortText(300).min(1),
  copy: shortText(1000).min(1),
  formatId: FormatIdSchema,
  visualSummary: shortText(2000).optional(),
  model: ModelIdSchema.optional(),
  locale: LocaleSchema,
});

export const PromptImageInputSchema = ImageOptionsSchema.extend({
  prompt: shortText(4000).min(1),
  formatId: FormatIdSchema.optional(),
  productImage: DataUrlImageSchema,
  secondaryImage: DataUrlImageSchema.optional(),
});

export const SimilarImageInputSchema = ImageOptionsSchema.extend({
  referenceImage: DataUrlImageSchema,
  productImage: DataUrlImageSchema,
  secondaryImage: DataUrlImageSchema.optional(),
  similarity: SimilarityLevelSchema,
  copySpace: CopySpaceSchema.default("none"),
  instructions: shortText(500).default(""),
  variantIndex: z.number().int().min(0).max(15).default(0),
  variantCount: z.number().int().min(1).max(16).default(1),
});

export const EditTurnSchema = z.object({
  role: z.enum(["user", "model"]),
  text: shortText(2000).optional(),
  image: DataUrlImageSchema.optional(),
  thoughtSignature: z.string().max(100_000).optional(),
});

export const EditImageInputSchema = ImageOptionsSchema.extend({
  /** 至少要有原圖；最多帶最近幾輪 */
  history: z.array(EditTurnSchema).min(1).max(8),
  instruction: shortText(1000).min(1),
});

export type AnalyzeInput = z.input<typeof AnalyzeInputSchema>;
export type PlanInput = z.input<typeof PlanInputSchema>;
export type RegeneratePromptInput = z.input<typeof RegeneratePromptInputSchema>;
export type PromptImageInput = z.input<typeof PromptImageInputSchema>;
export type SimilarImageInput = z.input<typeof SimilarImageInputSchema>;
export type EditTurn = z.infer<typeof EditTurnSchema>;
export type EditImageInput = z.input<typeof EditImageInputSchema>;
export type SimilarityLevel = z.infer<typeof SimilarityLevelSchema>;
export type CopySpace = z.infer<typeof CopySpaceSchema>;

// --- 回應 ---

export const DirectorOutputSchema = z.object({
  product_analysis: ProductAnalysisSchema,
  marketing_routes: z.array(MarketingRouteSchema).min(1).max(5),
});

export const ArrangementStyleSchema = z.enum(["single", "fan", "grid", "stack", "custom"]);

export const ContentSetSchema = z.object({
  id: z.string().min(1),
  ratio: FormatIdSchema,
  size_label: z.string().min(1),
  set_number: z.number().int().min(1).max(3),
  title: z.string().min(1),
  copy: z.string().min(1),
  visual_prompt_en: z.string().min(1),
  visual_summary: z.string(),
  arrangement_style: ArrangementStyleSchema.optional(),
});

export const ContentPlanSchema = z.object({
  plan_name: z.string().min(1),
  selected_sizes: z.array(FormatIdSchema).min(1),
  content_sets: z.array(ContentSetSchema).min(1),
});

/**
 * 給 Gemini responseJsonSchema 用的精簡 JSON Schema。
 * 手寫而非 z.toJSONSchema：避免帶入 Gemini 不支援的關鍵字（$schema、pattern 等），
 * 長度等細節仍由 zod 在收到回應後驗證。
 */
const str = { type: "string" } as const;

const routeJsonSchema = {
  type: "object",
  properties: {
    route_name: str,
    headline: str,
    subhead: str,
    style_brief: str,
    target_audience: str,
  },
  required: ["route_name", "headline", "subhead", "style_brief", "target_audience"],
};

export const DIRECTOR_OUTPUT_JSON_SCHEMA = {
  type: "object",
  properties: {
    product_analysis: {
      type: "object",
      properties: { name: str, visual_description: str, key_features: str },
      required: ["name", "visual_description", "key_features"],
    },
    marketing_routes: { type: "array", items: routeJsonSchema, minItems: 3, maxItems: 3 },
  },
  required: ["product_analysis", "marketing_routes"],
};

export const CONTENT_PLAN_JSON_SCHEMA = {
  type: "object",
  properties: {
    plan_name: str,
    selected_sizes: { type: "array", items: { type: "string", enum: FORMAT_IDS } },
    content_sets: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: str,
          ratio: { type: "string", enum: FORMAT_IDS },
          size_label: str,
          set_number: { type: "integer" },
          title: str,
          copy: str,
          visual_summary: str,
          visual_prompt_en: str,
        },
        required: ["id", "ratio", "size_label", "set_number", "title", "copy", "visual_summary", "visual_prompt_en"],
      },
    },
  },
  required: ["plan_name", "selected_sizes", "content_sets"],
};
