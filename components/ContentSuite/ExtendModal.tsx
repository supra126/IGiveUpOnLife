"use client";

import React, { useState } from "react";
import { ImageRatio, MarketingRoute } from "@/types";
import { generateImageFromReference } from "@/services/geminiService";
import { Spinner } from "@/components/Spinner";
import { getRatioClass, getRatioColor } from "@/lib/ratio-utils";
import { openImageInNewWindow } from "@/lib/image-utils";

// 所有可用尺寸 - 使用 locale 鍵值
const getAllRatios = (t: (key: string) => string): { ratio: ImageRatio; label: string; description: string }[] => [
  { ratio: "1:1", label: t("extend.sizeLabels.fb"), description: t("extend.sizeDescriptions.square") },
  { ratio: "9:16", label: t("extend.sizeLabels.story"), description: t("extend.sizeDescriptions.vertical") },
  { ratio: "4:5", label: t("extend.sizeLabels.ig"), description: t("extend.sizeDescriptions.portrait") },
  { ratio: "16:9", label: t("extend.sizeLabels.landscape"), description: t("extend.sizeDescriptions.horizontal") },
  { ratio: "1:1-commercial", label: t("extend.sizeLabels.commercial"), description: t("extend.sizeDescriptions.commercial") },
];

// 社群文案結果
interface SocialCopyResult {
  platform: string;
  title: string;
  content: string;
  hashtags: string[];
}

// 靜態社群文案生成函數（可在初始化時使用）
const generateSocialCopiesStatic = (
  route: MarketingRoute,
  title: string,
  copy: string,
  t: (key: string) => string
): SocialCopyResult[] => {
  const routeName = route.route_name.replace(/\s/g, "");
  const hashtags = [
    `#${routeName}`,
    t("extend.hashtags.newProduct"),
    t("extend.hashtags.recommended"),
    t("extend.hashtags.mustBuy"),
    t("extend.hashtags.quality"),
  ];

  return [
    {
      platform: t("extend.socialTemplates.instagram"),
      title: route.headline,
      content: `${route.headline}\n\n${copy}\n\n───\n\n${route.subhead}\n\n${route.style_brief ? `${t("extendTemplates.styleLabel")}${route.style_brief}\n` : ""}${route.target_audience ? `${t("extendTemplates.suitableFor")}${route.target_audience}\n` : ""}\n${t("extendTemplates.clickToLearnMore")}\n${t("extendTemplates.dmForDiscount")}\n\n${hashtags.join(" ")}`,
      hashtags,
    },
    {
      platform: t("extend.socialTemplates.facebook"),
      title: route.headline,
      content: `【${title}】\n${route.headline}\n\n${copy}\n\n━━━━━━━━━━\n\n${route.subhead}\n\n${route.style_brief ? `${t("extendTemplates.styleFeature")}${route.style_brief}\n` : ""}${route.target_audience ? `${t("extendTemplates.targetAudience")}${route.target_audience}\n` : ""}\n${t("extendTemplates.limitedOffer")}\n${t("extendTemplates.freeShipping")}\n\n${t("extendTemplates.comment1ForDm")}\n${t("extendTemplates.learnMoreLink")}\n\n${hashtags.slice(0, 4).join(" ")}`,
      hashtags: hashtags.slice(0, 4),
    },
    {
      platform: t("extend.socialTemplates.story"),
      title: title,
      content: `${route.headline}\n\n${t("extendTemplates.swipeUpToLearnMore")}\n\n${route.subhead}`,
      hashtags: hashtags.slice(0, 2),
    },
  ];
};

// 延伸產出結果
interface ExtendedResult {
  ratio: ImageRatio;
  label: string;
  image: string | null;
  loading: boolean;
  error: string | null;
}

interface ExtendModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceImage: string;
  sourceRatio: ImageRatio;
  productImage: string | null;
  brandLogo: string | null;
  secondaryProduct: string | null;
  marketingRoute: MarketingRoute;
  contentTitle: string;
  contentCopy: string;
  apiKey?: string;
  t: (key: string) => string;
}

export const ExtendModal: React.FC<ExtendModalProps> = ({
  isOpen,
  onClose,
  sourceImage,
  sourceRatio,
  productImage,
  brandLogo,
  secondaryProduct,
  marketingRoute,
  contentTitle,
  contentCopy,
  apiKey,
  t,
}) => {
  // 獲取所有尺寸選項
  const ALL_RATIOS = getAllRatios(t);

  // 可選尺寸（排除當前尺寸）
  const availableRatios = ALL_RATIOS.filter((r) => r.ratio !== sourceRatio);

  // 勾選的尺寸
  const [selectedRatios, setSelectedRatios] = useState<ImageRatio[]>([]);

  // 產圖結果
  const [results, setResults] = useState<ExtendedResult[]>([]);

  // 社群文案 - 初始化時就生成
  const [socialCopies, setSocialCopies] = useState<SocialCopyResult[]>(() =>
    generateSocialCopiesStatic(marketingRoute, contentTitle, contentCopy, t)
  );

  // 複製提示
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // 整體狀態
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState<"select" | "generating" | "results">("select");

  // 複製並顯示提示
  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const toggleRatio = (ratio: ImageRatio) => {
    setSelectedRatios((prev) =>
      prev.includes(ratio) ? prev.filter((r) => r !== ratio) : [...prev, ratio]
    );
  };

  const handleStartExtend = async () => {
    if (selectedRatios.length === 0) return;

    setIsGenerating(true);
    setCurrentStep("generating");

    // 初始化結果
    const initialResults: ExtendedResult[] = selectedRatios.map((ratio) => {
      const info = ALL_RATIOS.find((r) => r.ratio === ratio)!;
      return {
        ratio,
        label: info.label,
        image: null,
        loading: true,
        error: null,
      };
    });
    setResults(initialResults);

    // 批次產圖
    const updatedResults = [...initialResults];
    for (let i = 0; i < selectedRatios.length; i++) {
      const ratio = selectedRatios[i];
      try {
        const image = await generateImageFromReference(
          productImage!,
          sourceImage,
          85, // 高相似度
          apiKey,
          ratio,
          brandLogo,
          contentTitle,
          contentCopy,
          false, // showText
          "bold",
          "regular",
          secondaryProduct
        );
        updatedResults[i] = { ...updatedResults[i], image, loading: false };
      } catch (err) {
        updatedResults[i] = {
          ...updatedResults[i],
          loading: false,
          error: err instanceof Error ? err.message : t("extend.generationFailed"),
        };
      }
      setResults([...updatedResults]);
    }

    // 生成社群文案
    const copies = generateSocialCopies(marketingRoute, contentTitle, contentCopy);
    setSocialCopies(copies);

    setIsGenerating(false);
    setCurrentStep("results");
  };

  // 社群文案生成 - 根據行銷策略產出豐富內容
  const generateSocialCopies = (
    route: MarketingRoute,
    title: string,
    copy: string
  ): SocialCopyResult[] => {
    const routeName = route.route_name.replace(/\s/g, "");
    const hashtags = [
      `#${routeName}`,
      t("extend.hashtags.newProduct"),
      t("extend.hashtags.recommended"),
      t("extend.hashtags.mustBuy"),
      t("extend.hashtags.quality"),
    ];

    return [
      {
        platform: t("extend.socialTemplates.instagram"),
        title: route.headline,
        content: `${route.headline}\n\n${copy}\n\n───\n\n${route.subhead}\n\n${route.style_brief ? `風格：${route.style_brief}\n` : ""}${route.target_audience ? `適合：${route.target_audience}\n` : ""}\n點擊連結了解更多\n私訊小編享專屬優惠\n\n${hashtags.join(" ")}`,
        hashtags,
      },
      {
        platform: t("extend.socialTemplates.facebook"),
        title: route.headline,
        content: `【${title}】\n${route.headline}\n\n${copy}\n\n━━━━━━━━━━\n\n${route.subhead}\n\n${route.style_brief ? `▸ 風格特色：${route.style_brief}\n` : ""}${route.target_audience ? `▸ 適合對象：${route.target_audience}\n` : ""}\n▸ 限時優惠進行中\n▸ 全館滿額免運\n\n留言 +1 小編私訊您\n立即了解更多：[連結]\n\n${hashtags.slice(0, 4).join(" ")}`,
        hashtags: hashtags.slice(0, 4),
      },
      {
        platform: t("extend.socialTemplates.story"),
        title: title,
        content: `${route.headline}\n\n上滑了解更多\n\n${route.subhead}`,
        hashtags: hashtags.slice(0, 2),
      },
    ];
  };

  const handleClose = () => {
    setSelectedRatios([]);
    setResults([]);
    setSocialCopies([]);
    setCurrentStep("select");
    onClose();
  };

  const handleRetry = (index: number) => {
    const ratio = results[index].ratio;
    setResults((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], loading: true, error: null };
      return updated;
    });

    generateImageFromReference(
      productImage!,
      sourceImage,
      85,
      apiKey,
      ratio,
      brandLogo,
      contentTitle,
      contentCopy,
      false,
      "bold",
      "regular",
      secondaryProduct
    )
      .then((image) => {
        setResults((prev) => {
          const updated = [...prev];
          updated[index] = { ...updated[index], image, loading: false };
          return updated;
        });
      })
      .catch((err) => {
        setResults((prev) => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            loading: false,
            error: err instanceof Error ? err.message : t("extend.generationFailed"),
          };
          return updated;
        });
      });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop - 生成中或有結果時不允許點擊關閉 */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={currentStep === "select" ? handleClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0a0a0f] border border-white/10 rounded-2xl shadow-2xl m-4">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-white/10 bg-[#0a0a0f]">
          <h2 className="text-lg font-bold text-white">{t("extend.title")}</h2>
          {/* 生成中時不顯示關閉按鈕 */}
          {currentStep !== "generating" && (
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title={t("common.close")}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Select Ratios */}
          {currentStep === "select" && (
            <div className="space-y-6">
              {/* Source Preview */}
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 rounded-lg overflow-hidden border border-white/20 shrink-0">
                  <img src={sourceImage} alt={t("alt.source")} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">{t("extend.sourceImage")}</p>
                  <p className="text-white font-medium">{contentTitle}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {ALL_RATIOS.find((r) => r.ratio === sourceRatio)?.label} ({sourceRatio})
                  </p>
                </div>
              </div>

              {/* Ratio Selection */}
              <div>
                <p className="text-sm text-gray-400 mb-3">{t("extend.selectRatios")}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {availableRatios.map((item) => (
                    <button
                      key={item.ratio}
                      onClick={() => toggleRatio(item.ratio)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        selectedRatios.includes(item.ratio)
                          ? "border-white bg-white/10 text-white"
                          : "border-white/10 bg-white/5 text-gray-400 hover:border-white/30"
                      }`}
                    >
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs opacity-70">{item.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={handleStartExtend}
                disabled={selectedRatios.length === 0 || !productImage}
                className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {t("extend.startExtend")} ({selectedRatios.length})
              </button>

              {/* Social Copy - 一開始就顯示 */}
              <div className="pt-6 border-t border-white/10">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {t("extend.socialCopy")}
                </h3>

                {/* Headline & Subhead */}
                <div className="mb-4 p-4 bg-white/5 rounded-lg border border-white/10">
                  <p className="text-xs text-gray-500 mb-1">{t("extend.headline")}</p>
                  <p className="text-white font-bold text-lg mb-3">{marketingRoute.headline}</p>
                  <p className="text-xs text-gray-500 mb-1">{t("extend.subhead")}</p>
                  <p className="text-gray-300">{marketingRoute.subhead}</p>
                </div>

                {/* Platform-specific copies */}
                <div className="space-y-3">
                  {socialCopies.map((copy, idx) => (
                    <div key={idx} className="p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-white">{copy.platform}</span>
                        <button
                          onClick={() => handleCopy(`${copy.title}\n\n${copy.content}`, idx)}
                          className={`text-xs transition-colors ${
                            copiedIndex === idx
                              ? "text-green-400"
                              : "text-gray-400 hover:text-white"
                          }`}
                        >
                          {copiedIndex === idx ? t("extend.copied") : t("extend.copy")}
                        </button>
                      </div>
                      <p className="text-sm text-white font-medium mb-1">{copy.title}</p>
                      <p className="text-xs text-gray-300 whitespace-pre-wrap">{copy.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Generating */}
          {currentStep === "generating" && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <Spinner className="w-12 h-12 text-white mx-auto mb-4" />
                <p className="text-white font-medium">{t("extend.generating")}</p>
                <p className="text-sm text-gray-400 mt-1">
                  {results.filter((r) => !r.loading).length} / {results.length}
                </p>
              </div>

              {/* Progress Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {results.map((result, idx) => (
                  <div
                    key={result.ratio}
                    className="p-3 rounded-lg border border-white/10 bg-white/5"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {result.loading ? (
                        <Spinner className="w-4 h-4 text-white" />
                      ) : result.error ? (
                        <span className="text-red-400">✕</span>
                      ) : (
                        <span className="text-green-400">✓</span>
                      )}
                      <span className="text-sm text-white">{result.label}</span>
                    </div>
                    {result.image && (
                      <div className="w-full aspect-square rounded overflow-hidden">
                        <img src={result.image} alt={result.label} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Results */}
          {currentStep === "results" && (
            <div className="space-y-8">
              {/* Generated Images */}
              <div>
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {t("extend.generatedImages")}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {results.map((result, idx) => (
                    <div key={result.ratio} className="space-y-2">
                      <div
                        className={`relative rounded-lg overflow-hidden border border-white/10 bg-[#15151a] ${getRatioClass(result.ratio)}`}
                      >
                        {result.loading ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <Spinner className="w-8 h-8 text-white" />
                          </div>
                        ) : result.error ? (
                          <div className="w-full h-full flex flex-col items-center justify-center p-4">
                            <p className="text-xs text-red-400 text-center mb-2">{result.error}</p>
                            <button
                              onClick={() => handleRetry(idx)}
                              className="text-xs text-white underline"
                            >
                              {t("extend.retry")}
                            </button>
                          </div>
                        ) : result.image ? (
                          <div className="relative w-full h-full group/card">
                            <img
                              src={result.image}
                              alt={result.label}
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={() => openImageInNewWindow(result.image!, result.label)}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-100 md:opacity-0 md:group-hover/card:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                              <a
                                href={result.image}
                                download={`${result.ratio.replace(":", "x")}.png`}
                                className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white pointer-events-auto"
                                title={t("production.download")}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </a>
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <p className="text-xs text-center text-gray-400">
                        {result.label} ({result.ratio})
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Social Copy Suggestions */}
              <div>
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {t("extend.socialCopy")}
                </h3>

                {/* Headline & Subhead */}
                <div className="mb-4 p-4 bg-white/5 rounded-lg border border-white/10">
                  <p className="text-xs text-gray-500 mb-1">{t("extend.headline")}</p>
                  <p className="text-white font-bold text-lg mb-3">{marketingRoute.headline}</p>
                  <p className="text-xs text-gray-500 mb-1">{t("extend.subhead")}</p>
                  <p className="text-gray-300">{marketingRoute.subhead}</p>
                </div>

                {/* Platform-specific copies */}
                <div className="space-y-3">
                  {socialCopies.map((copy, idx) => (
                    <div key={idx} className="p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-white">{copy.platform}</span>
                        <button
                          onClick={() => handleCopy(`${copy.title}\n\n${copy.content}`, idx)}
                          className={`text-xs transition-colors ${
                            copiedIndex === idx
                              ? "text-green-400"
                              : "text-gray-400 hover:text-white"
                          }`}
                        >
                          {copiedIndex === idx ? t("extend.copied") : t("extend.copy")}
                        </button>
                      </div>
                      <p className="text-sm text-white font-medium mb-1">{copy.title}</p>
                      <p className="text-xs text-gray-300 whitespace-pre-wrap">{copy.content}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setCurrentStep("select");
                    setSelectedRatios([]);
                  }}
                  className="flex-1 py-3 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition-colors"
                >
                  {t("extend.addMore")}
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t("extend.done")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
