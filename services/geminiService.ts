
import { GoogleGenAI } from "@google/genai";
import { DIRECTOR_SYSTEM_PROMPT, CONTENT_PLANNER_SYSTEM_PROMPT } from "../prompts";
import { DirectorOutput, ContentPlan, MarketingRoute, ProductAnalysis, ContentItem } from "../types";

// --- Helpers ---

const cleanJson = (text: string): string => {
  let clean = text.trim();
  if (clean.startsWith("```json")) {
    clean = clean.replace(/^```json/, "").replace(/```$/, "");
  } else if (clean.startsWith("```")) {
    clean = clean.replace(/^```/, "").replace(/```$/, "");
  }
  return clean.trim();
};

const isValidUrl = (string: string): boolean => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

export const fetchWebsiteContent = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ProductAnalyzer/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();

    // 簡單的 HTML 解析：移除 script、style 標籤，提取文字
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 移除不需要的元素
    const unwantedTags = ['script', 'style', 'nav', 'footer', 'header'];
    unwantedTags.forEach(tag => {
      const elements = doc.getElementsByTagName(tag);
      Array.from(elements).forEach(el => el.remove());
    });

    // 提取文字內容
    const textContent = doc.body.textContent || '';

    // 清理多餘空白
    const cleaned = textContent
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 3000); // 限制字數避免超過 token 限制

    return cleaned;
  } catch (error) {
    console.error('Failed to fetch website content:', error);
    return ''; // 如果失敗，返回空字串，不中斷整個流程
  }
};

export const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  const base64String = await fileToBase64(file);
  const base64EncodedData = base64String.split(",")[1];
  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: file.type,
    },
  };
};

// --- API Calls ---

export const analyzeProductImage = async (
    file: File,
    productName: string,
    productInfo: string,
    productUrl: string,
    apiKey: string
): Promise<DirectorOutput> => {
  if (!apiKey) {
    throw new Error("找不到 API 金鑰。請在設定中輸入金鑰。");
  }

  const ai = new GoogleGenAI({ apiKey });
  const imagePart = await fileToGenerativePart(file);

  // 如果有提供網址，嘗試抓取內容
  let websiteContent = '';
  if (productUrl && isValidUrl(productUrl)) {
    console.log('正在抓取網址內容:', productUrl);
    websiteContent = await fetchWebsiteContent(productUrl);
    if (websiteContent) {
      console.log('成功抓取網址內容，長度:', websiteContent.length);
    }
  }

  // 整合所有資訊
  const contextParts: string[] = [];

  if (productInfo) {
    contextParts.push(`手動輸入資訊: ${productInfo}`);
  }

  if (websiteContent) {
    contextParts.push(`官網內容摘要: ${websiteContent}`);
  }

  const combinedContext = contextParts.length > 0
    ? contextParts.join('\n\n')
    : '未提供';

  const promptText = `
    產品名稱: ${productName || "未提供"}
    品牌/產品資訊: ${combinedContext}
    ${productUrl ? `產品網址: ${productUrl}` : ''}

    請根據上述資訊與圖片，執行視覺行銷總監的分析任務。
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [imagePart, { text: promptText }],
    },
    config: {
      systemInstruction: DIRECTOR_SYSTEM_PROMPT,
      responseMimeType: "application/json",
    },
  });

  if (!response.text) {
    throw new Error("Gemini 沒有回應文字");
  }

  try {
    const cleaned = cleanJson(response.text);
    return JSON.parse(cleaned) as DirectorOutput;
  } catch (e) {
    console.error("Failed to parse JSON", response.text);
    throw new Error("AI 總監返回了無效的格式。請再試一次。");
  }
};

export const generateContentPlan = async (
    route: MarketingRoute,
    analysis: ProductAnalysis,
    referenceCopy: string,
    apiKey: string
): Promise<ContentPlan> => {
    if (!apiKey) throw new Error("No API Key");

    const ai = new GoogleGenAI({ apiKey });

    const promptText = `
      選定策略路線: ${route.route_name}
      主標題: ${route.headline_zh}
      風格: ${route.style_brief_zh}
      
      產品名稱: ${analysis.name}
      產品特點: ${analysis.key_features_zh}
      
      參考文案/競品資訊: ${referenceCopy || "無 (請自行規劃最佳結構)"}
      
      請生成 8 張圖的完整內容企劃 (JSON)。
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [{ text: promptText }] },
        config: {
            systemInstruction: CONTENT_PLANNER_SYSTEM_PROMPT,
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 2048 } 
        }
    });

    if (!response.text) throw new Error("Gemini Planning failed");

    try {
        return JSON.parse(cleanJson(response.text)) as ContentPlan;
    } catch (e) {
        throw new Error("企劃生成格式錯誤");
    }
};

export const generateMarketingImage = async (
    prompt: string, 
    apiKey: string,
    referenceImageBase64?: string,
    aspectRatio: '1:1' | '9:16' | '3:4' | '4:3' | '16:9' = '3:4'
): Promise<string> => {
  if (!apiKey) {
    throw new Error("找不到 API 金鑰。");
  }

  const ai = new GoogleGenAI({ apiKey });

  const parts: any[] = [{ text: prompt }];

  if (referenceImageBase64) {
    const match = referenceImageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (match) {
        parts.push({
            inlineData: {
                data: match[2],
                mimeType: match[1]
            }
        });
    }
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: { parts: parts },
    config: {
      imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: "1K" 
      }
    },
  });

  const candidates = response.candidates;
  if (candidates && candidates.length > 0) {
    const parts = candidates[0].content.parts;
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }
  }
  
  throw new Error("未生成圖片。");
};

export const generateFullReport = (
  analysis: ProductAnalysis,
  routes: MarketingRoute[],
  selectedRouteIndex: number,
  contentPlan: ContentPlan,
  editedPlanItems: ContentItem[]
): string => {
  const route = routes[selectedRouteIndex];
  const date = new Date().toLocaleDateString();

  let report = `不想怒力了 I give up on life - Product Marketing Strategy Report\n`;
  report += `Date: ${date}\n`;
  report += `=================================================\n\n`;

  report += `[PRODUCT ANALYSIS]\n`;
  report += `Name: ${analysis.name}\n`;
  report += `Visual Description: ${analysis.visual_description}\n`;
  report += `Key Features: ${analysis.key_features_zh}\n\n`;

  report += `[SELECTED STRATEGY: ${route.route_name}]\n`;
  report += `Headline: ${route.headline_zh}\n`;
  report += `Subhead: ${route.subhead_zh}\n`;
  report += `Style: ${route.style_brief_zh}\n\n`;

  report += `[PHASE 1: CONCEPT VISUALS]\n`;
  route.image_prompts.forEach((p, i) => {
    report += `Poster ${i + 1}:\n`;
    report += `Summary: ${p.summary_zh}\n`;
    report += `Prompt: ${p.prompt_en}\n\n`;
  });

  report += `-------------------------------------------------\n`;
  report += `[PHASE 2: CONTENT SUITE PLAN]\n`;
  report += `Plan Name: ${contentPlan.plan_name}\n\n`;

  editedPlanItems.forEach((item) => {
    report += `--- Slide: ${item.type} (${item.ratio}) ---\n`;
    report += `Title: ${item.title_zh}\n`;
    report += `Copy: ${item.copy_zh}\n`;
    report += `Visual Summary: ${item.visual_summary_zh}\n`;
    report += `PROMPT:\n${item.visual_prompt_en}\n\n`;
  });

  return report;
};
