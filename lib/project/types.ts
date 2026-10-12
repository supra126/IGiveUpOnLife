/**
 * 專案資料模型（存在瀏覽器 IndexedDB）
 */
import type { ContentPlan, ContentSet, DirectorOutput, MarketingRoute } from "@/types";
import type { AspectRatio, ImageSize, ThinkingLevelName } from "@/lib/gemini/models";
import type { CopySpace, SimilarityLevel } from "@/lib/gemini/schemas";
import type { FormatId } from "@/lib/gemini/formats";

export const SCHEMA_VERSION = 1;

export type ProjectKind = "similar" | "campaign";

export interface ProjectSettings {
  imageModel: string;
  textModel: string;
  imageSize: ImageSize;
  thinkingLevel?: ThinkingLevelName;
}

export interface SimilarInputs {
  referenceAssetId?: string;
  productAssetId?: string;
  secondaryAssetId?: string;
  similarity: SimilarityLevel;
  aspectRatio: AspectRatio;
  count: number;
  copySpace: CopySpace;
  instructions: string;
}

export type CampaignStep = "input" | "strategy" | "suite";

export interface CampaignState {
  step: CampaignStep;
  productAssetId?: string;
  secondaryAssetId?: string;
  productName: string;
  productInfo: string;
  productUrl: string;
  referenceCopy: string;
  analysis?: DirectorOutput;
  routes: MarketingRoute[];
  activeRouteIndex: number;
  routeSupplements: string[];
  formats: FormatId[];
  plan?: ContentPlan;
  contentSets: ContentSet[];
}

export interface Project {
  id: string;
  kind: ProjectKind;
  name: string;
  createdAt: number;
  updatedAt: number;
  schemaVersion: number;
  settings: ProjectSettings;
  similar: SimilarInputs;
  campaign: CampaignState;
  /** 專案列表的縮圖 */
  coverAssetId?: string;
  /** 品牌 Logo，供文字編輯器使用（不送給 AI） */
  logoAssetId?: string;
}

export type AssetRole = "reference" | "product" | "secondary" | "logo" | "generated" | "composited";

export interface Asset {
  id: string;
  projectId: string;
  role: AssetRole;
  blob: Blob;
  mimeType: string;
  width?: number;
  height?: number;
  createdAt: number;
}

export type GenerationSource = "similar" | "campaign" | "extend" | "edit";
export type GenerationStatus = "queued" | "running" | "done" | "error" | "cancelled";

export interface Generation {
  id: string;
  projectId: string;
  batchId?: string;
  source: GenerationSource;
  /** 完整企劃流程對應的 content set */
  contentSetId?: string;
  /** 修圖 / 延伸的上一版 */
  parentId?: string;
  aspectRatio: AspectRatio;
  model: string;
  imageSize: ImageSize;
  similarity?: SimilarityLevel;
  /** 修圖指令或 visual prompt */
  prompt?: string;
  assetId?: string;
  /** 加上文字圖層後的合成圖 */
  compositeAssetId?: string;
  thoughtSignature?: string;
  status: GenerationStatus;
  errorCode?: string;
  /** 使用者標記為收藏 */
  starred?: boolean;
  /** 相似圖生成時使用的參考圖與產品圖，供檢視器對照 */
  referenceAssetId?: string;
  productAssetId?: string;
  createdAt: number;
}

export interface ProjectSummary {
  id: string;
  kind: ProjectKind;
  name: string;
  updatedAt: number;
  coverAssetId?: string;
}

export function toSummary(project: Project): ProjectSummary {
  return {
    id: project.id,
    kind: project.kind,
    name: project.name,
    updatedAt: project.updatedAt,
    coverAssetId: project.coverAssetId,
  };
}

export function createId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createProject(kind: ProjectKind, settings: ProjectSettings, name: string): Project {
  const now = Date.now();
  return {
    id: createId(),
    kind,
    name,
    createdAt: now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
    settings,
    similar: {
      similarity: "medium",
      aspectRatio: "1:1",
      count: 2,
      copySpace: "none",
      instructions: "",
    },
    campaign: {
      step: "input",
      productName: "",
      productInfo: "",
      productUrl: "",
      referenceCopy: "",
      routes: [],
      activeRouteIndex: 0,
      routeSupplements: [],
      formats: [],
      contentSets: [],
    },
  };
}
