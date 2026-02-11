"use client";

import React, { useState, useEffect } from "react";
import { ContentPlan, ContentSet, ArrangementStyle, MarketingRoute } from "@/types";
import { fileToBase64, regenerateVisualPrompt } from "@/services/geminiService";
import { useLocale } from "@/contexts/LocaleContext";
import {
  getArrangementPrompt,
  getCommercialPlaceholder,
  getRatioBackgroundColor,
  getRatioGridClass,
} from "@/lib/arrangement-utils";
import { ScriptEditorRow } from "./ScriptEditorRow";
import {
  ProductionCard,
  GlobalProductionSettings,
  FontWeight,
  SimilarityLevel,
  ResolutionLevel,
} from "./ProductionCard";
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
  marketingRoute: MarketingRoute;
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
  marketingRoute,
}) => {
  const { t, locale } = useLocale();
  const [mode, setMode] = useState<"review" | "production">("review");
  const [contentSets, setContentSets] = useState<ContentSet[]>(plan.content_sets);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [activeSetIndexByRatio, setActiveSetIndexByRatio] = useState<Record<string, number>>({});

  // Global production settings
  const [globalSettings, setGlobalSettings] = useState<GlobalProductionSettings>({
    showText: false,
    titleWeight: "bold",
    copyWeight: "regular",
    similarityLevel: "medium",
    resolution: "4k",
  });

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

  const updateGlobalSetting = <K extends keyof GlobalProductionSettings>(
    key: K,
    value: GlobalProductionSettings[K]
  ) => {
    setGlobalSettings((prev) => ({ ...prev, [key]: value }));
  };

  // Group content sets by ratio
  const groupedSets = plan.selected_sizes.map((ratio) => ({
    ratio,
    label: contentSets.find((s) => s.ratio === ratio)?.size_label || ratio,
    sets: contentSets.filter((s) => s.ratio === ratio),
  }));

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Upload Settings Section - STEP 04 */}
      <div className="mb-12 sm:mb-16">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-mono text-white bg-white/10 px-2 py-1 rounded-md border border-white/20">
            {t("stepIndicator.step04")}
          </span>
        </div>
        <h4 className="text-xl sm:text-2xl font-bold text-white mb-2">
          {t("contentSuite.settingsTitle")}
        </h4>
        <p className="text-sm text-gray-500 mb-8">{t("contentSuite.settingsDescription")}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          <ImageUploader
            file={productImageFile}
            previewUrl={productImage.previewUrl}
            onFileChange={onProductImageChange}
            label={t("contentSuite.mainProduct")}
            emptyText={t("contentSuite.clickToUploadMain")}
            changeText={t("contentSuite.changeImage")}
            borderColor="white"
            iconColor="white"
          />
          <ImageUploader
            file={secondaryProductFile}
            previewUrl={secondaryProduct.previewUrl}
            onFileChange={onSecondaryProductChange}
            label={t("contentSuite.secondaryProduct")}
            emptyText={t("contentSuite.clickToUploadSecondary")}
            changeText={t("contentSuite.changeImage")}
            hint={t("contentSuite.secondaryProductHint")}
            borderColor="white"
            iconColor="white"
          />
          <ImageUploader
            file={brandLogoFile}
            previewUrl={brandLogo.previewUrl}
            onFileChange={onBrandLogoChange}
            label={t("contentSuite.brandLogo")}
            emptyText={t("contentSuite.clickToUploadLogo")}
            changeText={t("contentSuite.changeLogo")}
            borderColor="white"
            iconColor="white"
          />
        </div>
      </div>

      {/* Plan Header + Mode Switch */}
      <div className="mb-10">
        <h2 className="text-3xl sm:text-4xl font-bold text-gradient-hero serif mb-2">{plan.plan_name}</h2>
        <p className="text-gray-500 text-sm mb-8">
          {plan.selected_sizes
            .map((r) => {
              const count = contentSets.filter((s) => s.ratio === r).length;
              const label = contentSets.find((s) => s.ratio === r)?.size_label || r;
              return `${label} ${count}${t("contentSuite.sets")}`;
            })
            .join(" · ")}
        </p>

        {/* Full-width tab bar mode switch */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setMode("review")}
            className={`flex-1 sm:flex-none px-6 sm:px-8 py-3.5 text-sm font-bold transition-all duration-200 border-b-2 -mb-px ${
              mode === "review"
                ? "text-white border-blue-400"
                : "text-gray-500 border-transparent hover:text-gray-300 hover:border-white/20"
            }`}
          >
            {t("contentSuite.reviewMode")}
          </button>
          <button
            onClick={() => setMode("production")}
            className={`flex-1 sm:flex-none px-6 sm:px-8 py-3.5 text-sm font-bold transition-all duration-200 border-b-2 -mb-px ${
              mode === "production"
                ? "text-white border-blue-400"
                : "text-gray-500 border-transparent hover:text-gray-300 hover:border-white/20"
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

          {groupedSets.map((group) => {
            const activeIdx = activeSetIndexByRatio[group.ratio] ?? 0;
            const activeSet = group.sets[activeIdx];

            return (
              <div key={group.ratio} className="pb-10 last:pb-0">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className={`w-1.5 h-8 rounded-full ${getRatioBackgroundColor(group.ratio)}`} />
                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold text-white">
                        {group.label}
                      </h3>
                      <p className="text-xs text-gray-500">{group.ratio} · {group.sets.length} {t("contentSuite.sets")}</p>
                    </div>
                  </div>

                  {/* Tab pills — inline with header */}
                  <div className="flex items-center gap-2">
                    {group.sets.map((set, setIdx) => (
                      <button
                        key={set.id}
                        onClick={() =>
                          setActiveSetIndexByRatio((prev) => ({ ...prev, [group.ratio]: setIdx }))
                        }
                        className={`w-9 h-9 rounded-full text-sm font-bold transition-all duration-200 ${
                          setIdx === activeIdx
                            ? "bg-blue-500 text-white"
                            : "bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white border border-white/10"
                        }`}
                      >
                        {set.set_number}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Single content card (full width) */}
                {activeSet && (
                  <div key={activeSet.id} className="animate-scale-in">
                    <ScriptEditorRow
                      contentSet={activeSet}
                      onChange={handleContentChange}
                      onRegeneratePrompt={handleRegeneratePrompt}
                      isRegenerating={regeneratingId === activeSet.id}
                      t={t}
                      locale={locale}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODE: PRODUCTION */}
      {mode === "production" && (
        <div>
          {/* Global Settings Panel - 只保留文字設定 */}
          <div className="mb-8 p-4 sm:p-6 bg-white/5 border border-white/10 rounded-xl">
            <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {t("production.globalSettings")}
            </h4>

            <div className="space-y-4">
              {/* Row 1: Show Text + Font Weights */}
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={globalSettings.showText}
                    onChange={(e) => updateGlobalSetting("showText", e.target.checked)}
                    className="w-4 h-4 rounded border-gray-500 bg-black/50 text-white focus:ring-white focus:ring-offset-0"
                  />
                  <span className="text-xs text-gray-300">{t("production.showContent")}</span>
                </label>

                {globalSettings.showText && (
                  <>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-400">{t("production.titleWeight")}</label>
                      <select
                        value={globalSettings.titleWeight}
                        onChange={(e) => updateGlobalSetting("titleWeight", e.target.value as FontWeight)}
                        className="px-2 py-1 text-xs bg-white/5 border border-white/10 rounded text-white focus:border-white focus:outline-none"
                      >
                        <option value="regular">{t("fontWeights.regular")}</option>
                        <option value="medium">{t("fontWeights.medium")}</option>
                        <option value="bold">{t("fontWeights.bold")}</option>
                        <option value="black">{t("fontWeights.black")}</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-400">{t("production.copyWeight")}</label>
                      <select
                        value={globalSettings.copyWeight}
                        onChange={(e) => updateGlobalSetting("copyWeight", e.target.value as FontWeight)}
                        className="px-2 py-1 text-xs bg-white/5 border border-white/10 rounded text-white focus:border-white focus:outline-none"
                      >
                        <option value="regular">{t("fontWeights.regular")}</option>
                        <option value="medium">{t("fontWeights.medium")}</option>
                        <option value="bold">{t("fontWeights.bold")}</option>
                        <option value="black">{t("fontWeights.black")}</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Row 2: Similarity Level */}
              <div>
                <label className="text-xs text-gray-400 mb-2 block">{t("production.referenceSimilarity")}</label>
                <div className="flex flex-wrap gap-2">
                  {(["low", "medium", "high"] as SimilarityLevel[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => updateGlobalSetting("similarityLevel", level)}
                      className={`flex-1 min-w-[100px] max-w-[140px] min-h-[44px] py-2 px-3 text-xs rounded-lg transition-colors ${
                        globalSettings.similarityLevel === level
                          ? "bg-white/10 text-white border border-white"
                          : "bg-white/5 text-gray-400 border border-transparent hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <div className="font-bold">
                        {t(`production.similarity${level.charAt(0).toUpperCase() + level.slice(1)}`)}
                      </div>
                      <div className="text-[10px] opacity-70 mt-0.5">
                        {t(`production.similarity${level.charAt(0).toUpperCase() + level.slice(1)}Desc`)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 3: Resolution */}
              <div>
                <label className="text-xs text-gray-400 mb-2 block">{t("production.resolution")}</label>
                <div className="flex flex-wrap gap-2">
                  {(["1k", "2k", "4k"] as ResolutionLevel[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => updateGlobalSetting("resolution", level)}
                      className={`flex-1 min-w-[100px] max-w-[140px] min-h-[44px] py-2 px-3 text-xs rounded-lg transition-colors ${
                        globalSettings.resolution === level
                          ? "bg-white/10 text-white border border-white"
                          : "bg-white/5 text-gray-400 border border-transparent hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <div className="font-bold">
                        {t(`production.resolution${level.toUpperCase()}`)}
                      </div>
                      <div className="text-[10px] opacity-70 mt-0.5">
                        {t(`production.resolution${level.toUpperCase()}Desc`)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-[10px] text-gray-500 mt-3">
              {t("production.perCardModeHint")}
            </p>
          </div>

          {/* Production Cards */}
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
                    globalSettings={globalSettings}
                    marketingRoute={marketingRoute}
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
