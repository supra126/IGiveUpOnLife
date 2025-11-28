"use client";

import React, { useState } from "react";
import { ContentSet } from "@/types";
import {
  generateMarketingImage,
  generateImageFromReference,
  fileToBase64,
} from "@/services/geminiService";
import { Spinner } from "@/components/Spinner";
import { getRatioColor, getRatioClass } from "@/lib/ratio-utils";

interface ProductionCardProps {
  contentSet: ContentSet;
  apiKey?: string;
  productImage: string | null;
  secondaryProduct: string | null;
  brandLogo: string | null;
  onContentChange: (id: string, field: keyof ContentSet, value: string) => void;
  t: (key: string) => string;
}

type FontWeight = "regular" | "medium" | "bold" | "black";
type GenerationMode = "prompt" | "reference";
type SimilarityLevel = "low" | "medium" | "high";

export const ProductionCard: React.FC<ProductionCardProps> = ({
  contentSet,
  apiKey,
  productImage,
  secondaryProduct,
  brandLogo,
  onContentChange,
  t,
}) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showText, setShowText] = useState(false);
  const [titleWeight, setTitleWeight] = useState<FontWeight>("bold");
  const [copyWeight, setCopyWeight] = useState<FontWeight>("regular");
  const [generationMode, setGenerationMode] = useState<GenerationMode>("prompt");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [similarityLevel, setSimilarityLevel] = useState<SimilarityLevel>("medium");

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
          secondaryProduct
        );
      } else {
        let enhancedPrompt = contentSet.visual_prompt_en;

        if (brandLogo) {
          enhancedPrompt +=
            "\n\nIMPORTANT: Place the uploaded brand logo in one of the four corners (top-left, top-right, bottom-left, or bottom-right) in a subtle, non-intrusive way. The logo should be clearly visible but not dominate the composition.";
        }

        if (showText) {
          const weightMap = {
            regular: "Regular (400)",
            medium: "Medium (500)",
            bold: "Bold (700)",
            black: "Black (900)",
          };

          enhancedPrompt += `\n\nIMPORTANT: Overlay the following text on the image using Noto Sans TC (Noto Sans Traditional Chinese) font:\nTitle: "${contentSet.title}" (Font: Noto Sans TC ${weightMap[titleWeight]})\nCopy: "${contentSet.copy}" (Font: Noto Sans TC ${weightMap[copyWeight]})\nUse appropriate positioning, size, and styling that complements the visual design. Make sure the font is Noto Sans TC (思源黑體).`;
        }

        result = await generateMarketingImage(
          enhancedPrompt,
          apiKey,
          productImage,
          contentSet.ratio,
          secondaryProduct
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
    <div className="flex flex-col gap-3 group relative">
      {/* Image Display Area */}
      <div
        className={`relative rounded-xl overflow-hidden bg-[#15151a] border border-white/10 shadow-lg w-full ${getRatioClass(contentSet.ratio)}`}
      >
        {loading ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-linear-to-br from-blue-900/20 to-purple-900/20">
            <Spinner className="w-10 h-10 text-blue-500 mb-3" />
            <p className="text-sm text-blue-300 font-medium">{t("production.generating")}</p>
            <p className="text-xs text-gray-400 mt-1">{t("production.pleaseWait")}</p>
          </div>
        ) : image ? (
          <div className="relative w-full h-full">
            <img src={image} alt={contentSet.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
              <a
                href={image}
                download={`${contentSet.id}.png`}
                className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm pointer-events-auto"
                title={t("production.download")}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </a>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm pointer-events-auto disabled:opacity-50 disabled:cursor-not-allowed"
                title={t("production.redraw")}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
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
                  alt="product-bg"
                />
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={!productImage}
              className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all text-gray-500 border border-white/10 relative z-10 disabled:opacity-30 disabled:cursor-not-allowed"
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

      {/* Controls Area */}
      <div className="space-y-2">
        {/* Show Text Toggle */}
        <div className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            id={`showText-${contentSet.id}`}
            checked={showText}
            onChange={(e) => setShowText(e.target.checked)}
            className="w-3 h-3 rounded border-gray-500 bg-black/50 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
          />
          <label
            htmlFor={`showText-${contentSet.id}`}
            className="text-[10px] text-gray-400 cursor-pointer select-none"
          >
            {t("production.showContent")}
          </label>
        </div>

        {/* Editable Title */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-gray-500">{t("production.titleInput")}</label>
            <select
              value={titleWeight}
              onChange={(e) => setTitleWeight(e.target.value as FontWeight)}
              className="text-[9px] px-1 py-0.5 bg-white/5 border border-white/10 rounded text-gray-400 focus:border-blue-500 focus:outline-none"
            >
              <option value="regular">Regular</option>
              <option value="medium">Medium</option>
              <option value="bold">Bold</option>
              <option value="black">Black</option>
            </select>
          </div>
          <input
            type="text"
            value={contentSet.title}
            onChange={(e) => onContentChange(contentSet.id, "title", e.target.value)}
            className="w-full px-2 py-1 text-sm font-bold text-white bg-white/5 border border-white/10 rounded focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder={t("production.titlePlaceholder")}
          />
        </div>

        {/* Editable Copy */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-gray-500">{t("production.copyInput")}</label>
            <select
              value={copyWeight}
              onChange={(e) => setCopyWeight(e.target.value as FontWeight)}
              className="text-[9px] px-1 py-0.5 bg-white/5 border border-white/10 rounded text-gray-400 focus:border-blue-500 focus:outline-none"
            >
              <option value="regular">Regular</option>
              <option value="medium">Medium</option>
              <option value="bold">Bold</option>
              <option value="black">Black</option>
            </select>
          </div>
          <textarea
            value={contentSet.copy}
            onChange={(e) => onContentChange(contentSet.id, "copy", e.target.value)}
            className="w-full px-2 py-1 text-xs text-gray-300 bg-white/5 border border-white/10 rounded focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            rows={2}
            placeholder={t("production.copyPlaceholder")}
          />
        </div>

        {/* Generation Mode Toggle */}
        <div className="mt-3 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setGenerationMode("prompt")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                generationMode === "prompt"
                  ? "bg-blue-500 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {t("production.promptMode")}
            </button>
            <button
              onClick={() => setGenerationMode("reference")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                generationMode === "reference"
                  ? "bg-purple-500 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {t("production.referenceMode")}
            </button>
          </div>

          {/* Reference Mode Settings */}
          {generationMode === "reference" && (
            <div className="p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg space-y-3">
              <div className="text-xs font-bold text-purple-300">
                {t("production.referenceSettings")}
              </div>

              {/* Reference Image Upload */}
              <label className="block">
                <div className="text-[10px] text-gray-400 mb-1">
                  {t("production.uploadReference")}
                </div>
                <label className="flex items-center justify-center w-full h-20 border border-dashed border-purple-500/50 rounded cursor-pointer hover:border-purple-500 hover:bg-purple-500/5 transition-all relative overflow-hidden">
                  {referenceImage ? (
                    <div className="w-full h-full relative group">
                      <img
                        src={referenceImage}
                        alt="Reference"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white text-[10px]">
                          {t("production.changeReference")}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-2">
                      <svg
                        className="w-6 h-6 mb-1 text-purple-400"
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
                      <p className="text-[10px] text-purple-300">{t("contentSuite.clickToUpload")}</p>
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
              </label>

              {/* Similarity Level Selection */}
              <div>
                <label className="text-[10px] text-gray-400 mb-2 block">
                  {t("production.similarity")}
                </label>
                <div className="flex gap-2">
                  {(["low", "medium", "high"] as SimilarityLevel[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => setSimilarityLevel(level)}
                      className={`flex-1 px-2 py-1.5 text-[10px] rounded transition-colors ${
                        similarityLevel === level
                          ? "bg-purple-600 text-white"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      {t(`production.similarity${level.charAt(0).toUpperCase() + level.slice(1)}`)}
                      <div className="text-[8px] opacity-70">
                        {t(`production.similarity${level.charAt(0).toUpperCase() + level.slice(1)}Desc`)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-[10px] text-red-400">{error}</p>}
      </div>
    </div>
  );
};
