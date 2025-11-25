
export interface ProductAnalysis {
  name: string;
  visual_description: string;
  key_features_zh: string;
}

export interface PromptData {
  prompt_en: string;
  summary_zh: string;
}

export interface MarketingRoute {
  route_name: string;
  headline_zh: string;
  subhead_zh: string;
  style_brief_zh: string;
  target_audience_zh: string;
}

export interface DirectorOutput {
  product_analysis: ProductAnalysis;
  marketing_routes: MarketingRoute[];
}

// --- PRO Version Types ---

// Image ratio types
export type ImageRatio = '1:1' | '9:16' | '4:5' | '16:9' | '1:1-commercial';

// 商業攝影排列方式
export type ArrangementStyle = 'single' | 'fan' | 'grid' | 'stack' | 'custom';

// Size selection state (multi-select checkboxes)
export interface SizeSelection {
  '1:1': boolean;      // FB 貼文
  '9:16': boolean;     // 限時動態
  '4:5': boolean;      // IG
  '16:9': boolean;     // 橫式貼文
  '1:1-commercial': boolean;  // 商業攝影
}

// New content set structure (3 sets per selected size)
export interface ContentSet {
  id: string;
  ratio: ImageRatio;
  size_label: string;  // e.g., "產品圖", "限時動態", "IG"
  set_number: number;  // 1, 2, or 3
  title_zh: string;
  copy_zh: string;
  visual_prompt_en: string;
  visual_summary_zh: string;
  arrangement_style?: ArrangementStyle;  // 商業攝影排列方式（僅 1:1-commercial）
}

// Updated ContentPlan structure
export interface ContentPlan {
  plan_name: string;
  selected_sizes: ImageRatio[];
  content_sets: ContentSet[];  // 3 sets per selected size
}

export enum AppState {
  IDLE,
  ANALYZING,
  RESULTS, // Phase 1 Done (Routes visible)
  SIZE_SELECTION, // Phase 2 Step 1: Select sizes
  PLANNING, // Phase 2 Step 2: Generating content sets
  SUITE_READY, // Phase 2 Script Ready (Review Mode)
  ERROR
}
