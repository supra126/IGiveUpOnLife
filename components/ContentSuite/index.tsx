"use client";

import React, { useState, useEffect } from "react";
import { ContentPlan, ContentSet, ArrangementStyle } from "@/types";
import { fileToBase64, regenerateVisualPrompt } from "@/services/geminiService";
import { useLocale } from "@/contexts/LocaleContext";
import {
  getArrangementPrompt,
  getCommercialPlaceholder,
  getRatioBackgroundColor,
  getRatioGridClass,
} from "@/lib/arrangement-utils";
import { ScriptEditorRow } from "./ScriptEditorRow";
import { ProductionCard } from "./ProductionCard";
import { ImageUploader } from "./ImageUploader";

interface ContentSuiteProps {
  plan: ContentPlan;
  onContentUpdate: (updatedSets: ContentSet[]) => void;
  apiKey?: string;
  productImage: File | null;
  secondaryProduct: File | null;
  brandLogo: File | null;
  onProductImageChange: (file: File | null) => void;
  onSecondaryProductChange: (file: File | null) => void;
  onBrandLogoChange: (file: File | null) => void;
}

// Custom hook for file to base64 conversion with cleanup
function useFilePreview(file: File | null) {
  const [base64, setBase64] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    if (file) {
      objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      fileToBase64(file).then((result) => {
        if (isMounted) setBase64(result);
      });
    } else {
      setBase64(null);
      setPreviewUrl(null);
    }

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return { base64, previewUrl };
}

export const ContentSuite: React.FC<ContentSuiteProps> = ({
  plan,
  onContentUpdate,
  apiKey,
  productImage: productImageFile,
  secondaryProduct: secondaryProductFile,
  brandLogo: brandLogoFile,
  onProductImageChange,
  onSecondaryProductChange,
  onBrandLogoChange,
}) => {
  const { t, locale } = useLocale();
  const [mode, setMode] = useState<"review" | "production">("review");
  const [contentSets, setContentSets] = useState<ContentSet[]>(plan.content_sets);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  // Use custom hook for file previews
  const productImage = useFilePreview(productImageFile);
  const secondaryProduct = useFilePreview(secondaryProductFile);
  const brandLogo = useFilePreview(brandLogoFile);

  // Sync with props if plan changes completely
  useEffect(() => {
    setContentSets(plan.content_sets);
    setMode("review");
  }, [plan]);

  const handleContentChange = (
    id: string,
    field: keyof ContentSet,
    value: string | ArrangementStyle
  ) => {
    const newSets = contentSets.map((set) =>
      set.id === id ? { ...set, [field]: value } : set
    );
    setContentSets(newSets);
    onContentUpdate(newSets);
  };

  const handleRegeneratePrompt = async (id: string) => {
    setRegeneratingId(id);

    const targetSet = contentSets.find((s) => s.id === id);
    if (!targetSet) return;

    try {
      let visualSummary = targetSet.visual_summary;

      if (targetSet.ratio === "1:1-commercial") {
        const arrangement = targetSet.arrangement_style || "single";
        const arrangementPrompt = getArrangementPrompt(arrangement);

        if (!visualSummary?.trim()) {
          visualSummary = getCommercialPlaceholder(arrangement, locale);
        }

        if (arrangementPrompt) {
          const priorityLabel =
            locale === "en"
              ? "【Product Arrangement - Highest Priority】"
              : "【產品排列方式 - 最高優先級】";
          visualSummary = `${priorityLabel}${arrangementPrompt}。\n\n${visualSummary}`;
        }
      }

      const newPrompt = await regenerateVisualPrompt(
        targetSet.title,
        targetSet.copy,
        targetSet.ratio,
        targetSet.size_label,
        apiKey,
        visualSummary
      );

      handleContentChange(id, "visual_prompt_en", newPrompt);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("common.unknownError");
      alert(`${t("contentSuite.regeneratePromptFailed")}${message}`);
    } finally {
      setRegeneratingId(null);
    }
  };

  // Group content sets by ratio
  const groupedSets = plan.selected_sizes.map((ratio) => ({
    ratio,
    label: contentSets.find((s) => s.ratio === ratio)?.size_label || ratio,
    sets: contentSets.filter((s) => s.ratio === ratio),
  }));

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Upload Settings Section */}
      <div className="mb-8 p-6 bg-linear-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 rounded-xl">
        <h4 className="text-lg font-bold text-indigo-300 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {t("contentSuite.settingsTitle")}
        </h4>
        <p className="text-sm text-gray-400 mb-6">{t("contentSuite.settingsDescription")}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <ImageUploader
            file={productImageFile}
            previewUrl={productImage.previewUrl}
            onFileChange={onProductImageChange}
            label={t("contentSuite.mainProduct")}
            emptyText={t("contentSuite.clickToUploadMain")}
            changeText={t("contentSuite.changeImage")}
            borderColor="indigo"
            iconColor="indigo"
          />
          <ImageUploader
            file={secondaryProductFile}
            previewUrl={secondaryProduct.previewUrl}
            onFileChange={onSecondaryProductChange}
            label={t("contentSuite.secondaryProduct")}
            emptyText={t("contentSuite.clickToUploadSecondary")}
            changeText={t("contentSuite.changeImage")}
            hint={t("contentSuite.secondaryProductHint")}
            borderColor="pink"
            iconColor="pink"
          />
          <ImageUploader
            file={brandLogoFile}
            previewUrl={brandLogo.previewUrl}
            onFileChange={onBrandLogoChange}
            label={t("contentSuite.brandLogo")}
            emptyText={t("contentSuite.clickToUploadLogo")}
            changeText={t("contentSuite.changeLogo")}
            borderColor="indigo"
            iconColor="indigo"
          />
        </div>
      </div>

      {/* Header & Mode Switch */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white serif mb-1">{plan.plan_name}</h2>
          <p className="text-gray-400 text-sm">
            {plan.selected_sizes
              .map((r) => {
                const count = contentSets.filter((s) => s.ratio === r).length;
                const label = contentSets.find((s) => s.ratio === r)?.size_label || r;
                return `${label} ${count}${t("contentSuite.sets")}`;
              })
              .join(" | ")}
          </p>
        </div>

        <div className="bg-[#1a1a1f] p-1 rounded-lg flex items-center border border-white/10">
          <button
            onClick={() => setMode("review")}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
              mode === "review"
                ? "bg-gray-700 text-white shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t("contentSuite.reviewMode")}
          </button>
          <button
            onClick={() => setMode("production")}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
              mode === "production"
                ? "bg-blue-600 text-white shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t("contentSuite.productionMode")}
          </button>
        </div>
      </div>

      {/* MODE: SCRIPT REVIEW */}
      {mode === "review" && (
        <div className="space-y-8">
          <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg mb-6 flex items-start gap-3">
            <svg
              className="w-5 h-5 text-blue-400 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-blue-200 text-sm font-bold mb-1">
                {t("contentSuite.reviewInfoTitle")}
              </p>
              <p className="text-blue-300/70 text-xs">
                {t("contentSuite.reviewInfoDescription")}
              </p>
            </div>
          </div>

          {groupedSets.map((group) => (
            <div key={group.ratio}>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className={`w-2 h-6 rounded-full ${getRatioBackgroundColor(group.ratio)}`} />
                {group.label} ({group.ratio}) - {group.sets.length} {t("contentSuite.sets")}
              </h3>
              {group.sets.map((set) => (
                <ScriptEditorRow
                  key={set.id}
                  contentSet={set}
                  onChange={handleContentChange}
                  onRegeneratePrompt={handleRegeneratePrompt}
                  isRegenerating={regeneratingId === set.id}
                  t={t}
                  locale={locale}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* MODE: PRODUCTION */}
      {mode === "production" && (
        <div>
          {groupedSets.map((group, idx) => (
            <div key={group.ratio} className={idx > 0 ? "mt-12" : ""}>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className={`w-2 h-6 rounded-full ${getRatioBackgroundColor(group.ratio)}`} />
                {group.label} ({group.ratio})
              </h3>
              <div className={`grid gap-6 ${getRatioGridClass(group.ratio)}`}>
                {group.sets.map((set) => (
                  <ProductionCard
                    key={set.id}
                    contentSet={set}
                    apiKey={apiKey}
                    productImage={productImage.base64}
                    secondaryProduct={secondaryProduct.base64}
                    brandLogo={brandLogo.base64}
                    onContentChange={handleContentChange}
                    t={t}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Re-export for backwards compatibility
export { getArrangementPrompt } from "@/lib/arrangement-utils";
