import { z } from "zod";

// --- Server Actions Input Schemas ---

// Locale Schema
export const LocaleSchema = z.enum(["zh", "en"]).optional();

// Image Ratio Schema (for inputs)
export const ImageRatioSchema = z.enum(["1:1", "9:16", "4:5", "16:9", "1:1-commercial"]);

// Base64 Image Schema
const Base64ImageSchema = z.string().refine(
  (val) => !val || val.startsWith("data:image/") || /^[A-Za-z0-9+/=]+$/.test(val),
  { message: "Invalid base64 image format" }
);

// Analyze Product Input Schema
export const AnalyzeProductInputSchema = z.object({
  imageBase64: z.string().min(1, "Image is required"),
  imageMimeType: z.string().min(1, "Image MIME type is required"),
  productName: z.string().default(""),
  productInfo: z.string().default(""),
  productUrl: z.string().default(""),
  userApiKey: z.string().optional(),
  locale: LocaleSchema,
});

// Marketing Route Schema (for input validation)
export const MarketingRouteInputSchema = z.object({
  route_name: z.string().min(1, "Route name is required"),
  headline: z.string().min(1, "Headline is required"),
  subhead: z.string().min(1, "Subhead is required"),
  style_brief: z.string().min(1, "Style brief is required"),
  target_audience: z.string().min(1, "Target audience is required"),
});

// Product Analysis Input Schema
export const ProductAnalysisInputSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  visual_description: z.string().default(""),
  key_features: z.string().min(1, "Key features are required"),
});

// Generate Content Plan Input Schema
export const GenerateContentPlanInputSchema = z.object({
  route: MarketingRouteInputSchema,
  analysis: ProductAnalysisInputSchema,
  referenceCopy: z.string().default(""),
  selectedSizes: z.array(ImageRatioSchema).min(1, "At least one size must be selected"),
  userApiKey: z.string().optional(),
  locale: LocaleSchema,
});

// Resolution Level Schema
export const ResolutionLevelSchema = z.enum(["1k", "2k", "4k"]);

// Generate Image Input Schema
export const GenerateImageInputSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  referenceImageBase64: Base64ImageSchema.optional(),
  aspectRatio: ImageRatioSchema.optional(),
  secondaryImageBase64: Base64ImageSchema.nullable().optional(),
  resolution: ResolutionLevelSchema.optional(),
  userApiKey: z.string().optional(),
  locale: LocaleSchema,
});

// Regenerate Prompt Input Schema
export const RegeneratePromptInputSchema = z.object({
  titleZh: z.string().min(1, "Title is required"),
  copyZh: z.string().min(1, "Copy is required"),
  ratio: ImageRatioSchema,
  sizeLabel: z.string().min(1, "Size label is required"),
  visualSummaryZh: z.string().optional(),
  userApiKey: z.string().optional(),
  locale: LocaleSchema,
});

// Font Weight Schema
const FontWeightSchema = z.enum(["regular", "medium", "bold", "black"]);

// Generate From Reference Input Schema
export const GenerateFromReferenceInputSchema = z.object({
  productImageBase64: z.string().min(1, "Product image is required"),
  referenceImageBase64: z.string().min(1, "Reference image is required"),
  similarity: z.number().min(0).max(100),
  aspectRatio: ImageRatioSchema.optional(),
  brandLogoBase64: Base64ImageSchema.nullable().optional(),
  titleText: z.string().optional(),
  copyText: z.string().optional(),
  showText: z.boolean().optional(),
  titleWeight: FontWeightSchema.optional(),
  copyWeight: FontWeightSchema.optional(),
  secondaryProductBase64: Base64ImageSchema.nullable().optional(),
  resolution: ResolutionLevelSchema.optional(),
  userApiKey: z.string().optional(),
  locale: LocaleSchema,
});

// --- AI Response Validation Schemas ---

// Product Analysis Schema
export const ProductAnalysisSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  visual_description: z.string().min(1, "Visual description is required"),
  key_features: z.string().min(1, "Key features are required"),
});

// Marketing Route Schema
export const MarketingRouteSchema = z.object({
  route_name: z.string().min(1, "Route name is required"),
  headline: z.string().min(1, "Headline is required"),
  subhead: z.string().min(1, "Subhead is required"),
  style_brief: z.string().min(1, "Style brief is required"),
  target_audience: z.string().min(1, "Target audience is required"),
});

// Director Output Schema (Phase 1 AI Response)
export const DirectorOutputSchema = z.object({
  product_analysis: ProductAnalysisSchema,
  marketing_routes: z
    .array(MarketingRouteSchema)
    .min(1, "At least one marketing route is required")
    .max(5, "Maximum 5 marketing routes allowed"),
});

// Arrangement Style Schema
export const ArrangementStyleSchema = z.enum(["single", "fan", "grid", "stack", "custom"]);

// Content Set Schema
export const ContentSetSchema = z.object({
  id: z.string().min(1, "ID is required"),
  ratio: ImageRatioSchema,
  size_label: z.string().min(1, "Size label is required"),
  set_number: z.number().int().min(1).max(3),
  title: z.string().min(1, "Title is required"),
  copy: z.string().min(1, "Copy is required"),
  visual_prompt_en: z.string().min(1, "Visual prompt is required"),
  visual_summary: z.string(),
  arrangement_style: ArrangementStyleSchema.optional(),
});

// Content Plan Schema (Phase 2 AI Response)
export const ContentPlanSchema = z.object({
  plan_name: z.string().min(1, "Plan name is required"),
  selected_sizes: z.array(ImageRatioSchema).min(1, "At least one size must be selected"),
  content_sets: z
    .array(ContentSetSchema)
    .min(1, "At least one content set is required"),
});

// Type exports inferred from schemas
export type ValidatedProductAnalysis = z.infer<typeof ProductAnalysisSchema>;
export type ValidatedMarketingRoute = z.infer<typeof MarketingRouteSchema>;
export type ValidatedDirectorOutput = z.infer<typeof DirectorOutputSchema>;
export type ValidatedContentSet = z.infer<typeof ContentSetSchema>;
export type ValidatedContentPlan = z.infer<typeof ContentPlanSchema>;

// Validation helper functions
export function validateDirectorOutput(data: unknown): ValidatedDirectorOutput {
  return DirectorOutputSchema.parse(data);
}

export function validateContentPlan(data: unknown): ValidatedContentPlan {
  return ContentPlanSchema.parse(data);
}

// Safe validation (returns result object instead of throwing)
export function safeValidateDirectorOutput(data: unknown) {
  return DirectorOutputSchema.safeParse(data);
}

export function safeValidateContentPlan(data: unknown) {
  return ContentPlanSchema.safeParse(data);
}
