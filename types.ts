
export interface ProductAnalysis {
  name: string;
  visual_description: string;
  key_features: string;
}

export interface MarketingRoute {
  route_name: string;
  headline: string;
  subhead: string;
  style_brief: string;
  target_audience: string;
}

export interface DirectorOutput {
  product_analysis: ProductAnalysis;
  marketing_routes: MarketingRoute[];
}

// 完整企劃流程的輸出版型（"1:1-commercial" 是 1:1 加商業攝影規則）
export type ImageRatio = '1:1' | '9:16' | '4:5' | '16:9' | '1:1-commercial';

// 商業攝影排列方式
export type ArrangementStyle = 'single' | 'fan' | 'grid' | 'stack' | 'custom';

// New content set structure (3 sets per selected size)
export interface ContentSet {
  id: string;
  ratio: ImageRatio;
  size_label: string;  // e.g., "產品圖", "限時動態", "IG"
  set_number: number;  // 1, 2, or 3
  title: string;
  copy: string;
  visual_prompt_en: string;
  visual_summary: string;
  arrangement_style?: ArrangementStyle;  // 商業攝影排列方式（僅 1:1-commercial）
}

// Updated ContentPlan structure
export interface ContentPlan {
  plan_name: string;
  selected_sizes: ImageRatio[];
  content_sets: ContentSet[];  // 3 sets per selected size
}


export type Locale = "zh" | "en";
