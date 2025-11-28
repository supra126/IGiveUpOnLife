import { ArrangementStyle } from "@/types";

// 排列方式選項 - 使用函數返回以支援多語系
export const getArrangementOptions = (
  locale: "zh" | "en"
): { value: ArrangementStyle; label: string; description: string }[] => {
  if (locale === "en") {
    return [
      { value: "single", label: "Single", description: "Single product centered" },
      { value: "fan", label: "Fan", description: "Fan-shaped arrangement" },
      { value: "grid", label: "Grid", description: "Organized grid layout" },
      { value: "stack", label: "Stack", description: "Natural stacking" },
      { value: "custom", label: "Custom", description: "Use visual summary" },
    ];
  }
  return [
    { value: "single", label: "單品特寫", description: "單一產品置中展示" },
    { value: "fan", label: "扇形展開", description: "多產品呈扇形排列" },
    { value: "grid", label: "整齊並排", description: "產品整齊排列成行" },
    { value: "stack", label: "自然堆疊", description: "產品自然層疊擺放" },
    { value: "custom", label: "自訂", description: "使用構圖摘要描述" },
  ];
};

// 根據排列方式生成商業攝影的構圖摘要 placeholder
export const getCommercialPlaceholder = (
  arrangement: ArrangementStyle,
  locale: "zh" | "en"
): string => {
  if (locale === "en") {
    const base =
      "Clean solid color background #f6f6f6, professional product photography composition, emphasize product details, no clutter";
    switch (arrangement) {
      case "single":
        return `${base}, single product centered, product as absolute focal point`;
      case "fan":
        return `${base}, multiple products in fan-shaped spread, showcase product series`;
      case "grid":
        return `${base}, products arranged in neat rows, display rhythmic aesthetics`;
      case "stack":
        return `${base}, products naturally stacked, showcase richness`;
      case "custom":
        return "Describe your desired composition, background color, arrangement...";
      default:
        return base;
    }
  }
  const base = "乾淨的純色背景，色號#f6f6f6，專業商品攝影構圖，強調產品細節，無雜亂元素";
  switch (arrangement) {
    case "single":
      return `${base}，單一產品置中展示，讓產品成為絕對焦點`;
    case "fan":
      return `${base}，多片產品呈扇形展開排列，展現產品系列感`;
    case "grid":
      return `${base}，產品整齊並排展示，呈現規律美感`;
    case "stack":
      return `${base}，產品自然層疊堆放，展現豐富感`;
    case "custom":
      return "請自由描述您想要的構圖方式、背景色、排列方式等...";
    default:
      return base;
  }
};

// 根據排列方式生成英文 prompt 片段
export const getArrangementPrompt = (arrangement: ArrangementStyle): string => {
  switch (arrangement) {
    case "single":
      return "single product centered, hero shot composition";
    case "fan":
      return "multiple products arranged in elegant fan spread pattern, radiating outward";
    case "grid":
      return "products neatly arranged in organized grid or row, symmetrical layout";
    case "stack":
      return "products naturally stacked or layered, casual elegant arrangement";
    case "custom":
      return ""; // 自訂模式不加入預設排列
    default:
      return "single product centered";
  }
};

// 根據 ratio 取得背景色 class
export const getRatioBackgroundColor = (ratio: string): string => {
  switch (ratio) {
    case "1:1":
      return "bg-blue-500";
    case "9:16":
      return "bg-purple-500";
    case "4:5":
      return "bg-pink-500";
    case "16:9":
      return "bg-green-500";
    case "1:1-commercial":
      return "bg-amber-500";
    default:
      return "bg-orange-500";
  }
};

// 根據 ratio 取得 grid class
export const getRatioGridClass = (ratio: string): string => {
  switch (ratio) {
    case "1:1":
      return "grid-cols-1 sm:grid-cols-2 md:grid-cols-4";
    case "1:1-commercial":
      return "grid-cols-1 sm:grid-cols-2 md:grid-cols-4";
    case "9:16":
      return "grid-cols-1 sm:grid-cols-3 md:grid-cols-6";
    case "4:5":
      return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";
    case "16:9":
      return "grid-cols-1 sm:grid-cols-1 md:grid-cols-2";
    default:
      return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";
  }
};
