"use client";

import React, { useState } from "react";
import { ContentSet, MarketingRoute } from "@/types";
import {
  generateMarketingImage,
  generateImageFromReference,
  fileToBase64,
} from "@/services/geminiService";
import { Spinner } from "@/components/Spinner";
import { getRatioColor, getRatioClass } from "@/lib/ratio-utils";
import { openImageInNewWindow } from "@/lib/image-utils";
import { ExtendModal } from "./ExtendModal";
import {
  PRODUCT_PROTECTION_PROMPT,
  NEGATIVE_PROMPT,
  getTextOverlayPrompt,
} from "@/lib/prompt-templates";

export type FontWeight = "regular" | "medium" | "bold" | "black";
export type GenerationMode = "prompt" | "reference";
export type SimilarityLevel = "low" | "medium" | "high";
export type ResolutionLevel = "1k" | "2k" | "4k";

// 全局設定
export interface GlobalProductionSettings {
  showText: boolean;
  titleWeight: FontWeight;
  copyWeight: FontWeight;
  similarityLevel: SimilarityLevel;
  resolution: ResolutionLevel;
}

interface ProductionCardProps {
  contentSet: ContentSet;
  apiKey?: string;
  productImage: string | null;
  secondaryProduct: string | null;
  brandLogo: string | null;
  onContentChange: (id: string, field: keyof ContentSet, value: string) => void;
  t: (key: string) => string;
  globalSettings: GlobalProductionSettings;
  marketingRoute: MarketingRoute;
}

export const ProductionCard: React.FC<ProductionCardProps> = ({
  contentSet,
  apiKey,
  productImage,
  secondaryProduct,
  brandLogo,
  onContentChange,
  t,
  globalSettings,
  marketingRoute,
}) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);

  // 每張卡片獨立的模式和參考圖
  const [generationMode, setGenerationMode] = useState<GenerationMode>("prompt");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);

  const {
    showText,
    titleWeight,
    copyWeight,
    similarityLevel,
    resolution,
  } = globalSettings;

  const handleGenerate = async () => {
    if (!productImage) {
      setError(t("production.uploadProductFirst"));
      return;
    }

    if (generationMode === "reference" && !referenceImage) {
      setError(t("production.uploadReferenceFirst"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let result: string;

      if (generationMode === "reference" && referenceImage) {
        const similarityValue =
          similarityLevel === "low" ? 20 : similarityLevel === "medium" ? 55 : 85;

        result = await generateImageFromReference(
          productImage,
          referenceImage,
          similarityValue,
          apiKey,
          contentSet.ratio,
          brandLogo,
          contentSet.title,
          contentSet.copy,
          showText,
          titleWeight,
          copyWeight,
          secondaryProduct,
          resolution
        );
      } else {
        // Build prompt with product protection at the start
        let enhancedPrompt = `${PRODUCT_PROTECTION_PROMPT} ${contentSet.visual_prompt_en}`;

        if (brandLogo) {
          enhancedPrompt +=
            " Place brand logo in corner subtly.";
        }

        if (showText) {
          enhancedPrompt += getTextOverlayPrompt(
            contentSet.title,
            contentSet.copy,
            titleWeight,
            copyWeight
          );
        }

        // Add negative prompt at the end
        enhancedPrompt += ` ${NEGATIVE_PROMPT}`;

        result = await generateMarketingImage(
          enhancedPrompt,
          apiKey,
          productImage,
          contentSet.ratio,
          secondaryProduct,
          resolution
        );
      }

      setImage(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("production.generateFailed");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col gap-2 group relative ${error ? 'ring-2 ring-red-500/30 rounded-xl' : ''}`}>
      {/* Image Display Area */}
      <div
        className={`relative rounded-xl overflow-hidden bg-[#15151a] border border-white/10 shadow-lg w-full ${getRatioClass(contentSet.ratio)}`}
      >
        {loading ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-linear-to-br from-white/5 to-white/10">
            <Spinner className="w-10 h-10 text-white mb-3" />
            <p className="text-sm text-white font-medium">{t("production.generating")}</p>
            <p className="text-xs text-gray-400 mt-1">{t("production.pleaseWait")}</p>
          </div>
        ) : image ? (
          <div className="relative w-full h-full">
            <img
              src={image}
              alt={contentSet.title}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => openImageInNewWindow(image, contentSet.title)}
            />
            {/* Desktop: Hover overlay */}
            <div className="absolute inset-0 bg-black/50 hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openImageInNewWindow(image, contentSet.title);
                }}
                className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm"
                title={t("extend.openInNewTab")}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
              <a
                href={image}
                download={`${contentSet.id}.png`}
                className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm"
                title={t("production.download")}
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title={t("production.redraw")}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => setIsExtendModalOpen(true)}
                className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm"
                title={t("extend.extendButton")}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            </div>
            {/* Mobile: Action bar below image */}
            <div className="absolute bottom-0 left-0 right-0 md:hidden flex justify-center gap-3 p-2 bg-gradient-to-t from-black/80 to-transparent">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openImageInNewWindow(image, contentSet.title);
                }}
                className="p-2.5 bg-white/20 active:bg-white/40 rounded-full text-white backdrop-blur-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
              <a
                href={image}
                download={`${contentSet.id}.png`}
                className="p-2.5 bg-white/20 active:bg-white/40 rounded-full text-white backdrop-blur-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="p-2.5 bg-white/20 active:bg-white/40 rounded-full text-white backdrop-blur-sm disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => setIsExtendModalOpen(true)}
                className="p-2.5 bg-white/20 active:bg-white/40 rounded-full text-white backdrop-blur-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center relative">
            {productImage && (
              <div className="absolute inset-0 opacity-20">
                <img
                  src={productImage}
                  className="w-full h-full object-cover blur-sm"
                  alt={t("alt.productBackground")}
                  loading="lazy"
                />
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={!productImage}
              className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white hover:text-black transition-all text-gray-500 border border-white/10 relative z-10 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          </div>
        )}
        <div
          className={`absolute top-2 left-2 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border backdrop-blur-sm z-20 ${getRatioColor(contentSet.ratio)}`}
        >
          {t("contentSuite.plan")} {contentSet.set_number}
        </div>
      </div>

      {/* Compact Info & Expand Toggle */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 truncate flex-1 pr-2" title={contentSet.title}>
          {contentSet.title}
        </p>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[10px] text-gray-500 hover:text-white transition-colors flex items-center gap-1"
        >
          {isExpanded ? t("production.collapse") : t("production.expand")}
          <svg
            className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expandable Controls Area */}
      {isExpanded && (
        <div className="space-y-4 p-4 sm:p-5 bg-white/5 rounded-xl border border-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Generation Mode Toggle */}
          <div>
            <label className="text-[10px] text-gray-500 mb-1.5 block">{t("production.generationMode")}</label>
            <div className="flex gap-2">
              <button
                onClick={() => setGenerationMode("prompt")}
                className={`flex-1 py-1.5 px-2 rounded text-xs font-bold transition-all ${
                  generationMode === "prompt"
                    ? "bg-white/10 text-white border border-white"
                    : "bg-white/5 text-gray-400 border border-transparent hover:bg-white/10 hover:text-white"
                }`}
              >
                {t("production.promptMode")}
              </button>
              <button
                onClick={() => setGenerationMode("reference")}
                className={`flex-1 py-1.5 px-2 rounded text-xs font-bold transition-all ${
                  generationMode === "reference"
                    ? "bg-white/10 text-white border border-white"
                    : "bg-white/5 text-gray-400 border border-transparent hover:bg-white/10 hover:text-white"
                }`}
              >
                {t("production.referenceMode")}
              </button>
            </div>
          </div>

          {/* Reference Image Upload (only when reference mode) */}
          {generationMode === "reference" && (
            <div className="pt-2 border-t border-white/10">
              <label className="text-[10px] text-gray-500 mb-1.5 block">{t("production.uploadReference")}</label>
              <label className="flex items-center justify-center w-full h-20 border border-dashed border-white/30 rounded-lg cursor-pointer hover:border-white hover:bg-white/5 transition-all relative overflow-hidden">
                {referenceImage ? (
                  <div className="w-full h-full relative group">
                    <img
                      src={referenceImage}
                      alt={t("alt.reference")}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-[10px]">{t("production.changeReference")}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-2">
                    <svg
                      className="w-5 h-5 mb-1 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-[10px] text-gray-400">{t("contentSuite.clickToUpload")}</p>
                  </div>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={async (e) => {
                    if (e.target.files && e.target.files[0]) {
                      const base64 = await fileToBase64(e.target.files[0]);
                      setReferenceImage(base64);
                    }
                  }}
                />
              </label>
            </div>
          )}

          {/* Editable Title & Copy (only when prompt mode) */}
          {generationMode === "prompt" && (
            <>
              <div className="pt-2 border-t border-white/10">
                <label className="text-[10px] text-gray-500 mb-1 block">{t("production.titleInput")}</label>
                <input
                  type="text"
                  value={contentSet.title}
                  onChange={(e) => onContentChange(contentSet.id, "title", e.target.value)}
                  className="w-full px-2 py-1.5 text-sm font-bold text-white bg-black/30 border border-white/10 rounded focus:border-white focus:outline-none"
                  placeholder={t("production.titlePlaceholder")}
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">{t("production.copyInput")}</label>
                <textarea
                  value={contentSet.copy}
                  onChange={(e) => onContentChange(contentSet.id, "copy", e.target.value)}
                  className="w-full px-2 py-1.5 text-xs text-gray-300 bg-black/30 border border-white/10 rounded focus:border-white focus:outline-none resize-none"
                  rows={2}
                  placeholder={t("production.copyPlaceholder")}
                />
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
              <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* Error display when collapsed */}
      {!isExpanded && error && (
        <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Extend Modal */}
      {image && (
        <ExtendModal
          isOpen={isExtendModalOpen}
          onClose={() => setIsExtendModalOpen(false)}
          sourceImage={image}
          sourceRatio={contentSet.ratio}
          productImage={productImage}
          brandLogo={brandLogo}
          secondaryProduct={secondaryProduct}
          marketingRoute={marketingRoute}
          contentTitle={contentSet.title}
          contentCopy={contentSet.copy}
          apiKey={apiKey}
          t={t}
        />
      )}
    </div>
  );
};
