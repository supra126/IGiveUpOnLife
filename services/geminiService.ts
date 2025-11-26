import { GoogleGenAI } from "@google/genai";
import { DIRECTOR_SYSTEM_PROMPT, CONTENT_PLANNER_SYSTEM_PROMPT } from "@/prompts";
import { DirectorOutput, ContentPlan, MarketingRoute, ProductAnalysis, ContentSet, ImageRatio } from "@/types";

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

// Note: Due to CORS restrictions, direct website fetching from the browser is not possible
// This function is kept for reference but will always return empty string in production
// Consider using a backend proxy or API service for production use
export const fetchWebsiteContent = async (url: string): Promise<string> => {
  console.warn('Website content fetching is disabled due to CORS restrictions.');
  console.warn('URL provided:', url);
  // Return empty string to avoid breaking the flow
  return '';
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

  // 整合所有資訊（網址抓取功能因 CORS 限制暫時停用）
  const contextParts: string[] = [];

  if (productInfo) {
    contextParts.push(`手動輸入資訊: ${productInfo}`);
  }

  if (productUrl && isValidUrl(productUrl)) {
    contextParts.push(`產品網址: ${productUrl}\n（注意：請根據此網址推測可能的品牌定位與產品特色）`);
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
      temperature: 1.0, // 增加創意變化性 (0.0 = 最穩定, 2.0 = 最隨機)
      topP: 0.95,       // 保持輸出品質的同時增加多樣性
    },
  });

  if (!response.text) {
    throw new Error("Gemini 沒有回應文字");
  }

  try {
    const cleaned = cleanJson(response.text);
    console.log("📝 小GG Raw Response:", response.text);
    console.log("🧹 小GG Cleaned Response:", cleaned);

    // Try to parse the JSON
    let parsed: DirectorOutput;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      // If JSON parsing fails, try to fix common issues
      console.warn("⚠️ JSON parsing failed, attempting to repair...", parseError);

      // Attempt to fix missing closing braces in arrays/objects
      let repaired = cleaned;

      // Count opening and closing braces
      const openBraces = (repaired.match(/{/g) || []).length;
      const closeBraces = (repaired.match(/}/g) || []).length;
      const openBrackets = (repaired.match(/\[/g) || []).length;
      const closeBrackets = (repaired.match(/]/g) || []).length;

      // Add missing closing braces
      if (openBraces > closeBraces) {
        const missing = openBraces - closeBraces;
        repaired = repaired + '}'.repeat(missing);
        console.log(`🔧 Added ${missing} missing closing brace(s)`);
      }

      // Add missing closing brackets
      if (openBrackets > closeBrackets) {
        const missing = openBrackets - closeBrackets;
        repaired = repaired + ']'.repeat(missing);
        console.log(`🔧 Added ${missing} missing closing bracket(s)`);
      }

      console.log("🔧 Repaired JSON:", repaired);

      try {
        parsed = JSON.parse(repaired);
        console.log("✅ JSON repair successful!");
      } catch (repairError) {
        console.error("❌ JSON repair failed:", repairError);
        console.error("Original response:", response.text);
        throw new Error("小GG 返回了無效的格式，且自動修復失敗。請再試一次。");
      }
    }

    return parsed;
  } catch (e) {
    console.error("❌ Failed to parse JSON", response.text);
    throw new Error("小GG 返回了無效的格式。請再試一次。");
  }
};

export const generateContentPlan = async (
    route: MarketingRoute,
    analysis: ProductAnalysis,
    referenceCopy: string,
    selectedSizes: ImageRatio[],
    apiKey: string
): Promise<ContentPlan> => {
    if (!apiKey) throw new Error("No API Key");

    const ai = new GoogleGenAI({ apiKey });

    // Map ratios to labels
    const sizeLabels: Record<ImageRatio, string> = {
      "1:1": "FB 貼文",
      "9:16": "限時動態 / Stories",
      "4:5": "IG 貼文",
      "16:9": "橫式貼文",
      "1:1-commercial": "商業攝影"
    };

    const sizeList = selectedSizes.map(s => `${s} (${sizeLabels[s]})`).join(", ");

    const promptText = `
      選定策略路線: ${route.route_name}
      主標題: ${route.headline_zh}
      副標題: ${route.subhead_zh}
      風格: ${route.style_brief_zh}
      目標受眾: ${route.target_audience_zh}

      產品名稱: ${analysis.name}
      產品特點: ${analysis.key_features_zh}

      參考文案/競品資訊: ${referenceCopy || "無 (請自行規劃最佳結構)"}

      選定的圖片尺寸: ${sizeList}

      請為每個選定的尺寸生成 3 組不同的內容方案 (JSON)。
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [{ text: promptText }] },
        config: {
            systemInstruction: CONTENT_PLANNER_SYSTEM_PROMPT,
            responseMimeType: "application/json",
            temperature: 1.0,  // 增加創意變化性
            topP: 0.95,        // 保持品質同時增加多樣性
            thinkingConfig: { thinkingBudget: 2048 }
        }
    });

    if (!response.text) throw new Error("Gemini Planning failed");

    try {
        const cleaned = cleanJson(response.text);
        console.log("📋 Content Plan Response:", cleaned);
        const parsed = JSON.parse(cleaned) as ContentPlan;

        // Validate response structure
        if (!parsed.content_sets || !Array.isArray(parsed.content_sets)) {
            console.error("❌ Invalid response structure:", parsed);
            throw new Error("API 返回格式錯誤：缺少 content_sets 陣列");
        }

        if (!parsed.selected_sizes || !Array.isArray(parsed.selected_sizes)) {
            console.error("❌ Invalid response structure:", parsed);
            throw new Error("API 返回格式錯誤：缺少 selected_sizes 陣列");
        }

        // Validate each content set has required fields
        const missingFields = parsed.content_sets.filter(set =>
            !set.id || !set.ratio || !set.title_zh || !set.copy_zh || !set.visual_prompt_en
        );

        if (missingFields.length > 0) {
            console.error("❌ Content sets with missing fields:", missingFields);
            throw new Error("部分內容方案缺少必要欄位");
        }

        console.log("✅ Content Plan validated successfully:", parsed);
        return parsed;
    } catch (e: any) {
        console.error("❌ Failed to parse content plan:", e);
        console.error("Raw response:", response.text);
        throw new Error(`企劃生成格式錯誤: ${e.message}`);
    }
};

export const generateMarketingImage = async (
    prompt: string,
    apiKey: string,
    referenceImageBase64?: string,
    aspectRatio: ImageRatio = '1:1',
    secondaryImageBase64?: string | null
): Promise<string> => {
  if (!apiKey) {
    throw new Error("找不到 API 金鑰。");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Map ImageRatio to actual API aspect ratio
  const apiAspectRatio: '1:1' | '9:16' | '4:5' | '16:9' =
    aspectRatio === '1:1-commercial' ? '1:1' :
    aspectRatio === '4:5' ? '4:5' :
    aspectRatio === '9:16' ? '9:16' :
    aspectRatio === '16:9' ? '16:9' : '1:1';

  // If secondary image is provided, add multi-product fusion instruction
  let enhancedPrompt = prompt;
  if (secondaryImageBase64) {
    enhancedPrompt += `\n\nIMPORTANT - MULTI-PRODUCT COMPOSITION: This image features TWO products that must appear together naturally in the same scene.
- PRIMARY PRODUCT (first image): Main focus, placed prominently in center or foreground
- SECONDARY PRODUCT (second image): Supporting element, placed naturally alongside, emerging from, or complementing the primary product
- Create a cohesive lifestyle/gift composition where both products appear together harmoniously
- Both products should maintain their original appearance and details
- The scene should tell a story of how these products relate to each other`;
  }

  const parts: any[] = [{ text: enhancedPrompt }];

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

  // Add secondary product image if provided
  if (secondaryImageBase64) {
    const secMatch = secondaryImageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (secMatch) {
      parts.push({
        inlineData: {
          data: secMatch[2],
          mimeType: secMatch[1]
        }
      });
    }
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: { parts: parts },
    config: {
      imageConfig: {
          aspectRatio: apiAspectRatio,
          imageSize: "1K"
      }
    },
  });

  const candidates = response.candidates;
  if (candidates && candidates.length > 0) {
    const content = candidates[0]?.content;
    if (content?.parts) {
      for (const part of content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
  }

  throw new Error("未生成圖片。");
};

export const regenerateVisualPrompt = async (
  titleZh: string,
  copyZh: string,
  ratio: ImageRatio,
  sizeLabel: string,
  apiKey: string,
  visualSummaryZh?: string // 新增：使用者可編輯的構圖摘要
): Promise<string> => {
  if (!apiKey) throw new Error("No API Key");

  const ai = new GoogleGenAI({ apiKey });

  // Ratio-specific prompt requirements
  const ratioRequirements: Record<ImageRatio, string> = {
    "1:1": "Square composition, 1:1 aspect ratio",
    "9:16": "Vertical composition, 9:16 aspect ratio, mobile screen layout",
    "4:5": "Vertical composition, 4:5 aspect ratio, Instagram feed optimized",
    "16:9": "Horizontal composition, 16:9 aspect ratio, widescreen layout, banner format",
    "1:1-commercial": "Professional commercial photography, square composition, 1:1 aspect ratio, CLEAN SOLID COLOR BACKGROUND (light gray #f6f6f6 or pure white #ffffff), NO props NO decorations NO distracting elements, studio lighting setup with soft diffused light, high-end DSLR camera quality (Canon EOS R5 or Sony A7R IV style), product as the ABSOLUTE focal point centered in frame, sharp focus on product details and texture, minimal harsh shadows, commercial e-commerce product photography aesthetic, high resolution, professional color grading, simple minimalist composition"
  };

  // 構建視覺摘要提示
  const visualSummarySection = visualSummaryZh
    ? `\n- 構圖摘要 (Visual Summary): ${visualSummaryZh}\n\n**重要：請務必根據「構圖摘要」的描述來生成視覺提示詞，這是使用者指定的視覺方向。**`
    : '';

  const systemPrompt = `你是一位專業的視覺設計 Prompt 工程師。

你的任務是根據提供的「中文標題」、「中文文案」和「構圖摘要」，生成一個專業的英文視覺提示詞 (Visual Prompt)，用於 Gemini 3 Pro Image 生成圖片。

**輸入資訊：**
- 標題 (Title): ${titleZh}
- 文案 (Copy): ${copyZh}
- 圖片尺寸: ${ratio} (${sizeLabel})${visualSummarySection}

**核心要求：**
1. **必須保持產品原貌**：使用者會提供產品參考圖，生成的圖片必須「保留產品的完整外觀、包裝設計、顏色、形狀」，不可改變產品本身
2. **只調整背景和氛圍**：根據標題、文案和構圖摘要調整「背景、光線、道具、氛圍」，但產品本身必須維持原樣
3. 必須包含尺寸規範：${ratioRequirements[ratio]}
4. ${visualSummaryZh ? '**最重要：構圖摘要中的指示優先級最高，必須完全遵循**' : ''}

**Prompt 寫作指南：**
- 在 Prompt 開頭加上：KEEP THE PRODUCT EXACTLY AS SHOWN IN THE REFERENCE IMAGE, DO NOT MODIFY THE PRODUCT ITSELF
- 使用 "product placement in center" 確保產品位置正確
- 描述背景、光線、氛圍時，明確說明「around the product」或「in the background」
- 使用專業的攝影和設計術語（英文）
- 只輸出英文 Prompt 文字，不要包含任何其他說明

**範例格式：**
"KEEP THE PRODUCT EXACTLY AS SHOWN IN THE REFERENCE IMAGE, DO NOT MODIFY THE PRODUCT ITSELF. ${ratioRequirements[ratio]}, product placement in center, [background description], [lighting description around the product], [mood and atmosphere], [additional props or elements in the background]"`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [{ text: "請根據上述資訊生成視覺提示詞。" }]
    },
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.8,
      topP: 0.9
    }
  });

  if (!response.text) {
    throw new Error("Failed to regenerate visual prompt");
  }

  return response.text.trim();
};

// Generate image based on reference image (for reference mode - all ratios)
export const generateImageFromReference = async (
    productImageBase64: string,
    referenceImageBase64: string,
    similarity: number, // 0-100, how similar to the reference
    apiKey: string,
    aspectRatio: ImageRatio = '1:1',
    brandLogoBase64?: string | null,
    titleText?: string,
    copyText?: string,
    showText?: boolean,
    titleWeight?: 'regular' | 'medium' | 'bold' | 'black',
    copyWeight?: 'regular' | 'medium' | 'bold' | 'black',
    secondaryProductBase64?: string | null
): Promise<string> => {
  if (!apiKey) {
    throw new Error("找不到 API 金鑰。");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Map ImageRatio to actual API aspect ratio
  const apiAspectRatio: '1:1' | '9:16' | '4:5' | '16:9' =
    aspectRatio === '1:1-commercial' ? '1:1' :
    aspectRatio === '4:5' ? '4:5' :
    aspectRatio === '9:16' ? '9:16' :
    aspectRatio === '16:9' ? '16:9' : '1:1';

  // Build aspect ratio description for prompt
  const aspectRatioDesc: Record<typeof apiAspectRatio, string> = {
    '1:1': '1:1 square format',
    '9:16': '9:16 vertical format for mobile screens',
    '4:5': '4:5 vertical format optimized for Instagram',
    '16:9': '16:9 horizontal widescreen format'
  };

  // Build similarity-based prompt with clear instructions
  let prompt: string;

  if (similarity >= 70) {
    // High similarity: closely match composition, layout, and styling
    prompt = `Create a professional product photography image very closely following the reference image. Match the composition, object placement, layout, lighting setup, color palette, background style, and overall aesthetic. Place the product from the product image as the main subject, maintaining its original appearance. Professional commercial photography quality, ${aspectRatioDesc[apiAspectRatio]}.`;
  } else if (similarity >= 40) {
    // Medium similarity: match lighting and mood, but allow some creative variation
    prompt = `Create a professional product photography image moderately following the reference image. Match the lighting style, color palette, and overall mood, but feel free to create a different composition and object arrangement. Place the product from the product image as the main subject, maintaining its original appearance. Professional commercial photography quality, ${aspectRatioDesc[apiAspectRatio]}.`;
  } else {
    // Low similarity: only inspired by color tone and atmosphere, completely different composition
    prompt = `Create a professional product photography image loosely inspired by the reference image. ONLY take inspiration from the color tone and atmospheric feeling. DO NOT copy the composition, layout, or object placement. Create a completely new and creative composition with the product as the main subject. The product should maintain its original appearance. Professional commercial photography quality, ${aspectRatioDesc[apiAspectRatio]}.`;
  }

  // Add logo placement instruction if logo is provided
  if (brandLogoBase64) {
    prompt += "\n\nIMPORTANT: Place the uploaded brand logo in one of the four corners (top-left, top-right, bottom-left, or bottom-right) in a subtle, non-intrusive way. The logo should be clearly visible but not dominate the composition.";
  }

  // Add multi-product fusion instruction if secondary product is provided
  if (secondaryProductBase64) {
    prompt += `\n\nIMPORTANT - MULTI-PRODUCT COMPOSITION: This image features TWO products that must appear together naturally in the same scene.
- PRIMARY PRODUCT: Main focus, placed prominently in center or foreground
- SECONDARY PRODUCT: Supporting element, placed naturally alongside, emerging from, or complementing the primary product
- Create a cohesive lifestyle/gift composition where both products appear together harmoniously
- Both products should maintain their original appearance and details
- The scene should tell a story of how these products relate to each other`;
  }

  // Add text overlay instruction if enabled
  if (showText && titleText && copyText) {
    // Map font weight to Noto Sans TC weight names
    const weightMap = {
      'regular': 'Regular (400)',
      'medium': 'Medium (500)',
      'bold': 'Bold (700)',
      'black': 'Black (900)'
    };

    const titleWeightStr = titleWeight ? weightMap[titleWeight] : 'Bold (700)';
    const copyWeightStr = copyWeight ? weightMap[copyWeight] : 'Regular (400)';

    prompt += `\n\nIMPORTANT: Overlay the following text on the image using Noto Sans TC (Noto Sans Traditional Chinese) font:\nTitle: "${titleText}" (Font: Noto Sans TC ${titleWeightStr})\nCopy: "${copyText}" (Font: Noto Sans TC ${copyWeightStr})\nUse appropriate positioning, size, and styling that complements the visual design. Make sure the font is Noto Sans TC (思源黑體).`;
  }

  const parts: any[] = [
    { text: prompt }
  ];

  // Add reference image first (style reference)
  const refMatch = referenceImageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (refMatch) {
    parts.push({
      inlineData: {
        data: refMatch[2],
        mimeType: refMatch[1]
      }
    });
  }

  // Add product image second (main subject)
  const prodMatch = productImageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (prodMatch) {
    parts.push({
      inlineData: {
        data: prodMatch[2],
        mimeType: prodMatch[1]
      }
    });
  }

  // Add brand logo third (if provided)
  if (brandLogoBase64) {
    const logoMatch = brandLogoBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (logoMatch) {
      parts.push({
        inlineData: {
          data: logoMatch[2],
          mimeType: logoMatch[1]
        }
      });
    }
  }

  // Add secondary product image fourth (if provided)
  if (secondaryProductBase64) {
    const secMatch = secondaryProductBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (secMatch) {
      parts.push({
        inlineData: {
          data: secMatch[2],
          mimeType: secMatch[1]
        }
      });
    }
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: { parts: parts },
    config: {
      imageConfig: {
        aspectRatio: apiAspectRatio,
        imageSize: "1K"
      }
    },
  });

  const candidates = response.candidates;
  if (candidates && candidates.length > 0) {
    const content = candidates[0]?.content;
    if (content?.parts) {
      for (const part of content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
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
  editedContentSets: ContentSet[]
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
  report += `Style: ${route.style_brief_zh}\n`;
  report += `Target Audience: ${route.target_audience_zh}\n\n`;

  report += `-------------------------------------------------\n`;
  report += `[CONTENT PLAN]\n`;
  report += `Plan Name: ${contentPlan.plan_name}\n`;
  report += `Selected Sizes: ${contentPlan.selected_sizes.join(", ")}\n\n`;

  editedContentSets.forEach((item) => {
    report += `--- ${item.size_label} Set ${item.set_number} (${item.ratio}) ---\n`;
    report += `Title: ${item.title_zh}\n`;
    report += `Copy: ${item.copy_zh}\n`;
    report += `Visual Summary: ${item.visual_summary_zh}\n`;
    report += `PROMPT:\n${item.visual_prompt_en}\n\n`;
  });

  return report;
};
