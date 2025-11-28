"use client";

import React from "react";
import { useLocale } from "@/contexts/LocaleContext";

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  const { t, locale } = useLocale();

  if (!isOpen) return null;

  // Chinese content
  const zhContent = {
    step1: {
      title: "上傳與資訊輸入｜一次填完所有資訊",
      desc: "上傳產品圖後，可以選填以下資訊（填越多，AI 越懂你）：",
      items: [
        { label: "產品名稱", desc: "讓 AI 認得你的產品" },
        { label: "產品資訊", desc: "品牌故事、核心價值、產品特色" },
        { label: "產品網址", desc: "AI 會自動抓取官網內容進行分析" },
        { label: "參考文案 / 競品參考", desc: "貼上同類商品的熱銷文案，AI 會拆解其說服邏輯" },
      ],
      tip: "💡 小提示：所有資訊一次填完，就不用在流程中重複輸入了",
    },
    step2: {
      title: "Phase 1：策略選擇｜秒速決定視覺方向",
      desc: "AI 會分析產品後，立即提供",
      descHighlight: "三條截然不同的視覺策略",
      descSuffix: "，每條路線包含：",
      items: ["主打標語與副標題", "視覺風格描述（色調、氛圍、設計元素）", "目標受眾定位"],
      tip: "👉 點選一個你喜歡的路線，系統會自動進入 Phase 2 開始規劃完整內容",
    },
    step3: {
      title: "選擇圖片尺寸｜多平台支援",
      desc: "選擇策略路線後，系統會自動進入尺寸選擇畫面，勾選你需要的尺寸：",
      items: [
        { label: "1:1 方形圖", desc: "適合 FB 貼文、IG 輪播、電商主圖" },
        { label: "9:16 直式長圖", desc: "適合限時動態、Instagram Stories、Reels" },
        { label: "4:5 直式圖", desc: "適合 IG Feed 主頁、優化手機瀏覽" },
        { label: "16:9 橫式長圖", desc: "適合封面、廣告圖片、橫幅設計" },
        { label: "1:1 商業攝影", desc: "專業商品攝影風格（工作室燈光、高端相機質感）" },
      ],
      tip: "AI 會為每個選定的尺寸生成 3 組不同的內容方案（功能導向、情感導向、數據導向）",
    },
    step4: {
      title: "上傳產品圖與 Logo｜產圖前置準備",
      desc: "在「爆肝產圖設定」區域，上傳以下素材（這些設定會在所有方案間共用）：",
      items: [
        { label: "📸 產品圖片", desc: "必要，用於圖片生成的主要素材" },
        { label: "🏷️ 品牌 Logo", desc: "選填，會自動放置在圖片角落" },
      ],
    },
    step5: {
      title: "腳本審閱模式｜內容來嘴看看",
      desc: "切換至「內容來嘴看看」模式，可以：",
      items: ["查看所有方案的標題、文案、視覺摘要", "編輯任何不滿意的文案", "調整 AI Prompt（進階功能）", "為每個方案重新生成 Prompt"],
    },
    step6: {
      title: "圖片製作模式｜爆肝產圖",
      desc: "切換至「爆肝產圖」模式，針對每個方案可以：",
      sections: [
        {
          title: "✅ 文字與字體控制",
          items: [
            "勾選「顯示內容（標題 + 文案）」決定是否在圖片上疊加文字",
            "直接在產圖模式修改標題和文案",
            "選擇字體粗細（Regular、Medium、Bold、Black）",
            "所有文字使用開源字體思源黑體（Noto Sans TC），無版權問題",
          ],
        },
        {
          title: "🎨 雙模式生成",
          items: [
            "提詞版（預設）：使用 AI 自動生成的視覺 Prompt 創作",
            "參考版：上傳參考圖片，選擇相似度（低 / 中 / 高）",
          ],
        },
        {
          title: "📥 生成與下載",
          items: ["點擊播放按鈕開始生成（約 10-20 秒）", "滑鼠移至圖片上方可下載或重繪"],
        },
      ],
    },
  };

  // English content
  const enContent = {
    step1: {
      title: "Upload & Input | Fill in all info at once",
      desc: "After uploading product image, you can fill in the following (the more you fill, the better AI understands):",
      items: [
        { label: "Product Name", desc: "Help AI recognize your product" },
        { label: "Product Info", desc: "Brand story, core values, product features" },
        { label: "Product URL", desc: "AI will automatically fetch and analyze the website content" },
        { label: "Reference Copy / Competitor Reference", desc: "Paste successful ad copy from similar products, AI will analyze its persuasion logic" },
      ],
      tip: "💡 Tip: Fill in all info at once, so you don't need to repeat it later",
    },
    step2: {
      title: "Phase 1: Strategy Selection | Instant visual direction",
      desc: "After analyzing your product, AI provides",
      descHighlight: "three different visual strategies",
      descSuffix: ", each including:",
      items: ["Headline and subheadline", "Visual style description (colors, mood, design elements)", "Target audience positioning"],
      tip: "👉 Select a route you like, system will automatically enter Phase 2 to plan complete content",
    },
    step3: {
      title: "Select Image Sizes | Multi-platform support",
      desc: "After selecting a strategy, system will enter size selection screen. Check the sizes you need:",
      items: [
        { label: "1:1 Square", desc: "For FB posts, IG carousel, e-commerce main image" },
        { label: "9:16 Vertical", desc: "For Stories, Instagram Reels, full-screen mobile" },
        { label: "4:5 Portrait", desc: "For IG Feed, optimized for mobile" },
        { label: "16:9 Landscape", desc: "For covers, ad banners" },
        { label: "1:1 Commercial", desc: "Professional product photography style (studio lighting, premium camera quality)" },
      ],
      tip: "AI will generate 3 different content sets for each selected size (functional, emotional, data-driven)",
    },
    step4: {
      title: "Upload Product & Logo | Pre-generation setup",
      desc: "In the 'Image Generation Settings' area, upload the following assets (shared across all plans):",
      items: [
        { label: "📸 Product Image", desc: "Required, main asset for image generation" },
        { label: "🏷️ Brand Logo", desc: "Optional, will be placed in corner automatically" },
      ],
    },
    step5: {
      title: "Review Mode | Check the content",
      desc: "Switch to 'Review Content' mode to:",
      items: ["View all plans' titles, copy, visual summary", "Edit any unsatisfactory copy", "Adjust AI Prompt (advanced)", "Regenerate Prompt for each plan"],
    },
    step6: {
      title: "Production Mode | Generate images",
      desc: "Switch to 'Generate Images' mode, for each plan you can:",
      sections: [
        {
          title: "✅ Text & Font Control",
          items: [
            "Toggle 'Show content (Title + Copy)' to decide whether to overlay text",
            "Edit title and copy directly in production mode",
            "Choose font weight (Regular, Medium, Bold, Black)",
            "All text uses open source Noto Sans TC font, no copyright issues",
          ],
        },
        {
          title: "🎨 Dual Generation Modes",
          items: [
            "Prompt Mode (default): Use AI-generated visual prompt",
            "Reference Mode: Upload reference image, select similarity (Low / Medium / High)",
          ],
        },
        {
          title: "📥 Generate & Download",
          items: ["Click play button to generate (about 10-20 seconds)", "Hover over image to download or regenerate"],
        },
      ],
    },
  };

  const content = locale === "zh" ? zhContent : enContent;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Content */}
      <div className="relative bg-[#1a1a1f] border border-white/10 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-purple-900/20 animate-in fade-in zoom-in duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-2"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="p-8">
          <h2 className="text-3xl font-bold serif text-white mb-8">{t("guideModal.title")}</h2>

          {/* API Key Notice */}
          <div className="mb-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
            <div className="flex items-start gap-3">
              <span className="text-blue-400 text-xl">🔑</span>
              <div>
                <p className="text-blue-300 font-semibold mb-1">{t("guideModal.apiKeyNotice")}</p>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {t("guideModal.apiKeyDesc")}{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    {t("guideModal.apiKeyLink")}
                  </a>{" "}
                  {t("guideModal.apiKeyDesc2")}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold text-lg border border-purple-600/30">
                1
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{content.step1.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-3">{content.step1.desc}</p>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1.5 ml-1">
                  {content.step1.items.map((item, idx) => (
                    <li key={idx}>
                      <strong className="text-white">{item.label}</strong>
                      {locale === "zh" ? "：" : ": "}{item.desc}
                    </li>
                  ))}
                </ul>
                <p className="text-gray-500 text-xs mt-3">{content.step1.tip}</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-lg border border-blue-600/30">
                2
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{content.step2.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-2">
                  {content.step2.desc}{" "}
                  <strong className="text-white">{content.step2.descHighlight}</strong>
                  {content.step2.descSuffix}
                </p>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1 ml-1 mb-3">
                  {content.step2.items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
                <p className="text-gray-400 text-sm leading-relaxed">{content.step2.tip}</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-pink-600/20 text-pink-400 flex items-center justify-center font-bold text-lg border border-pink-600/30">
                3
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{content.step3.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-2">{content.step3.desc}</p>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1 ml-1 mb-3">
                  {content.step3.items.map((item, idx) => (
                    <li key={idx}>
                      <strong className="text-white">{item.label}</strong>
                      {locale === "zh" ? "：" : ": "}{item.desc}
                    </li>
                  ))}
                </ul>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {content.step3.tip}
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-green-600/20 text-green-400 flex items-center justify-center font-bold text-lg border border-green-600/30">
                4
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{content.step4.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-3">{content.step4.desc}</p>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1.5 ml-1">
                  {content.step4.items.map((item, idx) => (
                    <li key={idx}>
                      <strong className="text-white">{item.label}</strong>
                      {locale === "zh" ? "：" : ": "}{item.desc}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-yellow-600/20 text-yellow-400 flex items-center justify-center font-bold text-lg border border-yellow-600/30">
                5
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{content.step5.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-3">{content.step5.desc}</p>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1.5 ml-1">
                  {content.step5.items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Step 6 */}
            <div className="flex gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-orange-600/20 text-orange-400 flex items-center justify-center font-bold text-lg border border-orange-600/30">
                6
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{content.step6.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-2">{content.step6.desc}</p>

                <div className="space-y-3">
                  {content.step6.sections.map((section, idx) => (
                    <div key={idx}>
                      <p className="text-white text-sm font-semibold mb-1.5">{section.title}</p>
                      <ul className="list-disc list-inside text-sm text-gray-400 space-y-1 ml-1">
                        {section.items.map((item, itemIdx) => (
                          <li key={itemIdx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
