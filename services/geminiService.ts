/**
 * 舊 UI 用的相容層（Phase 3 換成新工作台後刪除）
 *
 * 保留舊函式簽章，內部改走 lib/gemini/transport。
 */
import type { ContentPlan, DirectorOutput, ImageRatio, Locale, MarketingRoute, ProductAnalysis } from "@/types";
import { ensureGeminiCompatibleFormat } from "@/lib/image-utils";
import { gemini } from "@/lib/gemini/transport";
import { formatToAspectRatio } from "@/lib/gemini/formats";
import type { ImageSize } from "@/lib/gemini/models";

type ResolutionLevel = "1k" | "2k" | "4k";

const toImageSize = (r: ResolutionLevel): ImageSize => r.toUpperCase() as ImageSize;

export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        resolve(await ensureGeminiCompatibleFormat(reader.result as string));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const hasServerApiKey = async (): Promise<boolean> => (await gemini.capabilities()).hasServerKey;

export const analyzeProductImage = async (
  file: File,
  productName: string,
  productInfo: string,
  productUrl: string,
  apiKey?: string,
  locale: Locale = "zh"
): Promise<DirectorOutput> =>
  gemini.analyze({ image: await fileToBase64(file), productName, productInfo, productUrl, locale }, { apiKey });

export const generateContentPlan = (
  route: MarketingRoute,
  analysis: ProductAnalysis,
  referenceCopy: string,
  selectedSizes: ImageRatio[],
  apiKey?: string,
  locale: Locale = "zh"
): Promise<ContentPlan> => gemini.plan({ route, analysis, referenceCopy, formats: selectedSizes, locale }, { apiKey });

export const generateMarketingImage = async (
  prompt: string,
  apiKey?: string,
  productImage?: string,
  aspectRatio: ImageRatio = "1:1",
  secondaryImage?: string | null,
  resolution: ResolutionLevel = "2k"
): Promise<string> => {
  if (!productImage) throw new Error("Product image required");
  const result = await gemini.promptImage(
    {
      prompt,
      productImage,
      secondaryImage: secondaryImage || undefined,
      formatId: aspectRatio,
      aspectRatio: formatToAspectRatio(aspectRatio),
      imageSize: toImageSize(resolution),
    },
    { apiKey }
  );
  return result.dataUrl;
};

export const regenerateVisualPrompt = (
  title: string,
  copy: string,
  ratio: ImageRatio,
  _sizeLabel: string,
  apiKey?: string,
  visualSummary?: string,
  locale: Locale = "zh"
): Promise<string> => gemini.regeneratePrompt({ title, copy, formatId: ratio, visualSummary, locale }, { apiKey });

export const generateImageFromReference = async (
  productImage: string,
  referenceImage: string,
  similarity: number,
  apiKey?: string,
  aspectRatio: ImageRatio = "1:1",
  _brandLogo?: string | null,
  _titleText?: string,
  _copyText?: string,
  _showText?: boolean,
  _titleWeight?: string,
  _copyWeight?: string,
  secondaryProduct?: string | null,
  resolution: ResolutionLevel = "2k"
): Promise<string> => {
  const result = await gemini.similarImage(
    {
      referenceImage,
      productImage,
      secondaryImage: secondaryProduct || undefined,
      similarity: similarity >= 70 ? "high" : similarity >= 40 ? "medium" : "low",
      aspectRatio: formatToAspectRatio(aspectRatio),
      imageSize: toImageSize(resolution),
    },
    { apiKey }
  );
  return result.dataUrl;
};
