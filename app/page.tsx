"use client";

import React, { useState } from "react";
import {
  analyzeProductImage,
  generateContentPlan,
  generateFullReport,
  hasServerApiKey,
} from "@/services/geminiService";
import {
  DirectorOutput,
  AppState,
  ContentPlan,
  MarketingRoute,
  SizeSelection,
  ImageRatio,
  ContentSet,
} from "@/types";
import { Spinner } from "@/components/Spinner";
import { ProductCard } from "@/components/ProductCard";
import { GuideModal } from "@/components/GuideModal";
import { ContentSuite } from "@/components/ContentSuite";
import { ApiKeyModal } from "@/components/ApiKeyModal";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getApiKey } from "@/lib/api-key-storage";
import { useLocale } from "@/contexts/LocaleContext";
import Image from "next/image";

export default function Home() {
  const { t, locale } = useLocale();
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // --- PRO Inputs ---
  const [productName, setProductName] = useState("");
  const [productInfo, setProductInfo] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [refCopy, setRefCopy] = useState("");

  // --- Results ---
  const [analysisResult, setAnalysisResult] = useState<DirectorOutput | null>(
    null
  );
  const [activeRouteIndex, setActiveRouteIndex] = useState<number>(0);

  // Editable route data
  const [editedRoutes, setEditedRoutes] = useState<MarketingRoute[]>([]);
  const [routeSupplements, setRouteSupplements] = useState<string[]>([
    "",
    "",
    "",
  ]);

  // Phase 2 Size Selection
  const [sizeSelection, setSizeSelection] = useState<SizeSelection>({
    "1:1": false,
    "9:16": false,
    "4:5": false,
    "16:9": false,
    "1:1-commercial": false,
  });

  // Phase 2 Content Data
  const [contentPlan, setContentPlan] = useState<ContentPlan | null>(null);
  const [editedContentSets, setEditedContentSets] = useState<ContentSet[]>([]);

  // Phase 2 Image Generation Settings
  const [productImage, setProductImage] = useState<File | null>(null);
  const [secondaryProduct, setSecondaryProduct] = useState<File | null>(null);
  const [brandLogo, setBrandLogo] = useState<File | null>(null);

  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [serverHasKey, setServerHasKey] = useState(false);

  // Load API Key on mount and check server key
  React.useEffect(() => {
    const storedKey = getApiKey();
    if (storedKey) {
      setApiKey(storedKey);
    }

    // Check if server has API key
    hasServerApiKey().then(setServerHasKey);
  }, []);

  // --- API Key Handling ---
  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    setErrorMsg("");
  };

  // --- Handlers ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
      // Reset results but keep inputs
      setAnalysisResult(null);
      setContentPlan(null);
      setEditedContentSets([]);
      setSizeSelection({
        "1:1": false,
        "9:16": false,
        "4:5": false,
        "16:9": false,
        "1:1-commercial": false,
      });
      setAppState(AppState.IDLE);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    // Only require user API key if server doesn't have one
    if (!apiKey && !serverHasKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    setErrorMsg("");
    setAppState(AppState.ANALYZING);
    try {
      const result = await analyzeProductImage(
        selectedFile,
        productName,
        productInfo,
        productUrl,
        apiKey || undefined, // Pass undefined if empty, server will use its key
        locale
      );
      setAnalysisResult(result);
      setEditedRoutes(result.marketing_routes); // Initialize editable routes
      setAppState(AppState.RESULTS);
    } catch (e: unknown) {
      console.error(e);
      setErrorMsg(e instanceof Error ? e.message : t("errors.unexpectedError"));
      setAppState(AppState.ERROR);
    }
  };

  const handleGeneratePlan = async () => {
    console.log("🎯 handleGeneratePlan called");
    console.log("Current appState:", appState);
    console.log("Has analysisResult:", !!analysisResult);
    console.log("Has apiKey:", !!apiKey);
    console.log("Server has key:", serverHasKey);

    if (!analysisResult) {
      console.error("❌ No analysis result");
      return;
    }

    // Only require user API key if server doesn't have one
    if (!apiKey && !serverHasKey) {
      console.log("⚠️ No API key, opening modal");
      setIsApiKeyModalOpen(true);
      return;
    }

    setErrorMsg("");
    // Transition to size selection step
    console.log("✅ Setting appState to SIZE_SELECTION");
    setAppState(AppState.SIZE_SELECTION);

    // Scroll to Phase 2 section
    setTimeout(() => {
      const element = document.getElementById("phase2-section");
      console.log("📍 Phase2 section element:", element);
      element?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
  };

  const handleSizeConfirm = async () => {
    if (!analysisResult) return;

    // Check if at least one size is selected
    const selectedSizes = Object.entries(sizeSelection)
      .filter(([, isSelected]) => isSelected)
      .map(([ratio]) => ratio as ImageRatio);

    if (selectedSizes.length === 0) {
      setErrorMsg(t("phase2.selectAtLeastOne"));
      return;
    }

    // Use edited route data
    const route = editedRoutes[activeRouteIndex];
    const analysis = analysisResult.product_analysis;

    // Combine refCopy with route supplement
    const supplement = routeSupplements[activeRouteIndex];
    const combinedRefCopy = supplement
      ? `${refCopy}\n\n${t("prompt.strategySupplement")}\n${supplement}`
      : refCopy;

    setErrorMsg("");
    setAppState(AppState.PLANNING);

    try {
      console.log(
        "🚀 Starting content plan generation with sizes:",
        selectedSizes
      );
      const plan = await generateContentPlan(
        route,
        analysis,
        combinedRefCopy,
        selectedSizes,
        apiKey || undefined, // Pass undefined if empty, server will use its key
        locale
      );
      console.log("✅ Content plan received:", plan);
      setContentPlan(plan);
      setEditedContentSets(plan.content_sets);
      setAppState(AppState.SUITE_READY);

      // Scroll to content section
      setTimeout(() => {
        document
          .getElementById("content-section")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    } catch (e: unknown) {
      console.error("❌ Content plan generation failed:", e);
      setErrorMsg(e instanceof Error ? e.message : t("errors.contentPlanFailed"));
      setAppState(AppState.SIZE_SELECTION);
    }
  };

  const _handleDownloadReport = () => {
    if (!analysisResult || !contentPlan) return;

    const textReport = generateFullReport(
      analysisResult.product_analysis,
      analysisResult.marketing_routes,
      activeRouteIndex,
      contentPlan,
      editedContentSets
    );

    const blob = new Blob([textReport], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PRO_Strategy_Report_${analysisResult.product_analysis.name.replace(
      /\s+/g,
      "_"
    )}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Render Helpers ---

  const renderInputs = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto md:mx-0 md:ml-0 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Left: Image Upload */}
      <div className="order-2 md:order-1">
        <label
          className={`flex flex-col items-center justify-center w-full h-full border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden ${
            selectedFile
              ? "border-blue-500 bg-[#15151a]"
              : "border-gray-600 hover:border-gray-400 hover:bg-[#1a1a1f]"
          }`}
        >
          {imagePreview ? (
            <div className="w-full h-full relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-full object-contain p-4"
              />
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white font-medium">{t("input.changeImage")}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg
                className="w-10 h-10 mb-3 text-gray-400"
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
              <p className="mb-2 text-sm text-gray-400">{t("input.uploadProduct")}</p>
              <p className="text-xs text-gray-500">{t("input.supportedFormats")}</p>
            </div>
          )}
          <input
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept="image/*"
          />
        </label>
      </div>

      {/* Right: Text Inputs */}
      <div className="order-1 md:order-2 flex flex-col gap-4">
        <div>
          <label className="block text-base font-bold text-gray-400 uppercase tracking-wider mb-2 text-center md:text-left">
            {t("input.productName")}
          </label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder={t("input.productNamePlaceholder")}
            className="w-full bg-[#15151a] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-base font-bold text-gray-400 uppercase tracking-wider mb-2 text-center md:text-left">
            {t("input.productInfo")}
          </label>
          <textarea
            value={productInfo}
            onChange={(e) => setProductInfo(e.target.value)}
            placeholder={t("input.productInfoPlaceholder")}
            className="w-full bg-[#15151a] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none transition-colors h-24 resize-none text-sm leading-relaxed"
          />
        </div>
        <div>
          <label className="block text-base font-bold text-gray-400 uppercase tracking-wider mb-2 text-center md:text-left">
            {t("input.productUrl")}
          </label>
          <input
            type="url"
            value={productUrl}
            onChange={(e) => setProductUrl(e.target.value)}
            placeholder={t("input.productUrlPlaceholder")}
            className="w-full bg-[#15151a] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-base font-bold text-gray-400 uppercase tracking-wider mb-2 text-center md:text-left">
            {t("input.refCopy")}
          </label>
          <textarea
            value={refCopy}
            onChange={(e) => setRefCopy(e.target.value)}
            placeholder={t("input.refCopyPlaceholder")}
            className="w-full bg-[#15151a] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none transition-colors h-24 resize-none text-sm leading-relaxed"
          />
        </div>

        {selectedFile && appState === AppState.IDLE && (
          <button
            onClick={handleAnalyze}
            className="mt-auto w-full py-4 bg-linear-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm uppercase tracking-widest rounded-lg hover:opacity-90 transition-opacity shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2"
          >
            <span>{t("input.startButton")}</span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );

  const renderPhase1Results = () => {
    if (!analysisResult || !imagePreview) return null;
    const activeRoute = analysisResult.marketing_routes[activeRouteIndex];

    return (
      <div className="w-full max-w-6xl mx-auto px-4 pb-20">
        <ProductCard
          analysis={analysisResult.product_analysis}
          imageSrc={imagePreview}
        />

        {/* Route Selection */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
            <h3 className="text-xl font-bold text-white serif">
              {t("phase1.title")}
            </h3>
            <span className="text-xs text-gray-500">
              {t("phase1.selectHint")}
            </span>
          </div>
          <div className="flex flex-col gap-6">
            {editedRoutes.map((route, idx) => (
              <div
                key={idx}
                className={`p-6 rounded-xl border transition-all duration-300 flex flex-col gap-4 ${
                  activeRouteIndex === idx
                    ? "bg-linear-to-br from-blue-600/20 to-indigo-600/20 border-blue-500 shadow-lg shadow-blue-900/30"
                    : "bg-[#15151a] border-white/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`text-xs font-bold uppercase tracking-wider ${
                      activeRouteIndex === idx
                        ? "text-blue-400"
                        : "text-gray-500"
                    }`}
                  >
                    {t("phase1.routeLabel")} {String.fromCharCode(65 + idx)}
                  </div>
                  <button
                    onClick={() => {
                      setActiveRouteIndex(idx);
                      setContentPlan(null);
                      setEditedContentSets([]);
                      setSizeSelection({
                        "1:1": false,
                        "9:16": false,
                        "4:5": false,
                        "16:9": false,
                        "1:1-commercial": false,
                      });
                      if (
                        appState === AppState.SUITE_READY ||
                        appState === AppState.SIZE_SELECTION ||
                        appState === AppState.PLANNING
                      )
                        setAppState(AppState.RESULTS);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                      activeRouteIndex === idx
                        ? "bg-blue-500 text-white"
                        : "bg-white/10 text-gray-400 hover:bg-white/20"
                    }`}
                  >
                    {activeRouteIndex === idx ? t("phase1.selected") : t("phase1.select")}
                  </button>
                </div>

                {/* Editable Fields */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">
                      {t("phase1.routeName")}
                    </label>
                    <input
                      type="text"
                      value={route.route_name}
                      onChange={(e) => {
                        const newRoutes = [...editedRoutes];
                        newRoutes[idx] = {
                          ...route,
                          route_name: e.target.value,
                        };
                        setEditedRoutes(newRoutes);
                      }}
                      className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">
                      {t("phase1.headline")}
                    </label>
                    <textarea
                      value={route.headline}
                      onChange={(e) => {
                        const newRoutes = [...editedRoutes];
                        newRoutes[idx] = {
                          ...route,
                          headline: e.target.value,
                        };
                        setEditedRoutes(newRoutes);
                      }}
                      className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-sm text-blue-200 focus:border-blue-500 focus:outline-none font-medium resize-none h-12"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">
                      {t("phase1.subhead")}
                    </label>
                    <textarea
                      value={route.subhead}
                      onChange={(e) => {
                        const newRoutes = [...editedRoutes];
                        newRoutes[idx] = {
                          ...route,
                          subhead: e.target.value,
                        };
                        setEditedRoutes(newRoutes);
                      }}
                      className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-gray-300 focus:border-blue-500 focus:outline-none resize-none h-12"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">
                      {t("phase1.styleDescription")}
                    </label>
                    <textarea
                      value={route.style_brief}
                      onChange={(e) => {
                        const newRoutes = [...editedRoutes];
                        newRoutes[idx] = {
                          ...route,
                          style_brief: e.target.value,
                        };
                        setEditedRoutes(newRoutes);
                      }}
                      className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-gray-300 focus:border-blue-500 focus:outline-none resize-none h-20"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">
                      {t("phase1.targetAudience")}
                    </label>
                    <textarea
                      value={route.target_audience}
                      onChange={(e) => {
                        const newRoutes = [...editedRoutes];
                        newRoutes[idx] = {
                          ...route,
                          target_audience: e.target.value,
                        };
                        setEditedRoutes(newRoutes);
                      }}
                      className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-gray-300 focus:border-blue-500 focus:outline-none resize-none h-16"
                    />
                  </div>

                  {/* Supplement Field */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-1 block">
                      💡 {t("phase1.supplement")}
                    </label>
                    <textarea
                      value={routeSupplements[idx]}
                      onChange={(e) => {
                        const newSupplements = [...routeSupplements];
                        newSupplements[idx] = e.target.value;
                        setRouteSupplements(newSupplements);
                      }}
                      placeholder={t("phase1.supplementPlaceholder")}
                      className="w-full bg-blue-900/10 border border-blue-500/30 rounded px-2 py-2 text-xs text-gray-300 placeholder-gray-600 focus:border-blue-500 focus:outline-none resize-none h-16"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Continue Button */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => {
                if (contentPlan) {
                  setContentPlan(null);
                  setEditedContentSets([]);
                  setSizeSelection({
                    "1:1": false,
                    "9:16": false,
                    "4:5": false,
                    "16:9": false,
                    "1:1-commercial": false,
                  });
                  setAppState(AppState.SIZE_SELECTION);
                  setTimeout(() => {
                    document
                      .getElementById("phase2-section")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 300);
                } else {
                  handleGeneratePlan();
                }
              }}
              disabled={appState === AppState.PLANNING}
              className="px-12 py-4 bg-linear-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-blue-900/30 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {appState === AppState.PLANNING ? (
                <>
                  <Spinner className="w-5 h-5" />
                  <span>{t("phase1.processing")}</span>
                </>
              ) : (
                <span>{contentPlan ? t("phase1.retryButton") : t("phase1.continueButton")}</span>
              )}
            </button>
          </div>
        </div>

        {/* Phase 2: Size Selection */}
        <div className="border-t border-white/10 pt-12" id="phase2-section">
          {appState === AppState.SIZE_SELECTION && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-xl font-bold text-white serif mb-2">
                {t("phase2.title")}
              </h3>
              <p className="text-sm text-gray-400 mb-6">
                {t("phase2.description")}
              </p>

              {errorMsg && appState === AppState.SIZE_SELECTION && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {/* 產品圖 1:1 */}
                <label
                  className={`cursor-pointer p-6 rounded-xl border-2 transition-all ${
                    sizeSelection["1:1"]
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={sizeSelection["1:1"]}
                    onChange={(e) =>
                      setSizeSelection({
                        ...sizeSelection,
                        "1:1": e.target.checked,
                      })
                    }
                    className="sr-only"
                  />
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        sizeSelection["1:1"]
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-500"
                      }`}
                    >
                      {sizeSelection["1:1"] && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-white mb-1">{t("sizes.1:1.name")}</div>
                      <div className="text-xs text-gray-400">{t("sizes.1:1.ratio")}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {t("sizes.1:1.description")}
                      </div>
                    </div>
                  </div>
                </label>

                {/* 限時動態 9:16 */}
                <label
                  className={`cursor-pointer p-6 rounded-xl border-2 transition-all ${
                    sizeSelection["9:16"]
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={sizeSelection["9:16"]}
                    onChange={(e) =>
                      setSizeSelection({
                        ...sizeSelection,
                        "9:16": e.target.checked,
                      })
                    }
                    className="sr-only"
                  />
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        sizeSelection["9:16"]
                          ? "border-purple-500 bg-purple-500"
                          : "border-gray-500"
                      }`}
                    >
                      {sizeSelection["9:16"] && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-white mb-1">
                        {t("sizes.9:16.name")}
                      </div>
                      <div className="text-xs text-gray-400">{t("sizes.9:16.ratio")}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {t("sizes.9:16.description")}
                      </div>
                    </div>
                  </div>
                </label>

                {/* IG 貼文 4:5 */}
                <label
                  className={`cursor-pointer p-6 rounded-xl border-2 transition-all ${
                    sizeSelection["4:5"]
                      ? "border-pink-500 bg-pink-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={sizeSelection["4:5"]}
                    onChange={(e) =>
                      setSizeSelection({
                        ...sizeSelection,
                        "4:5": e.target.checked,
                      })
                    }
                    className="sr-only"
                  />
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        sizeSelection["4:5"]
                          ? "border-pink-500 bg-pink-500"
                          : "border-gray-500"
                      }`}
                    >
                      {sizeSelection["4:5"] && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-white mb-1">{t("sizes.4:5.name")}</div>
                      <div className="text-xs text-gray-400">{t("sizes.4:5.ratio")}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {t("sizes.4:5.description")}
                      </div>
                    </div>
                  </div>
                </label>

                {/* 橫式貼文 16:9 */}
                <label
                  className={`cursor-pointer p-6 rounded-xl border-2 transition-all ${
                    sizeSelection["16:9"]
                      ? "border-green-500 bg-green-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={sizeSelection["16:9"]}
                    onChange={(e) =>
                      setSizeSelection({
                        ...sizeSelection,
                        "16:9": e.target.checked,
                      })
                    }
                    className="sr-only"
                  />
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        sizeSelection["16:9"]
                          ? "border-green-500 bg-green-500"
                          : "border-gray-500"
                      }`}
                    >
                      {sizeSelection["16:9"] && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-white mb-1">{t("sizes.16:9.name")}</div>
                      <div className="text-xs text-gray-400">{t("sizes.16:9.ratio")}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {t("sizes.16:9.description")}
                      </div>
                    </div>
                  </div>
                </label>

                {/* 商業攝影 1:1-commercial */}
                <label
                  className={`cursor-pointer p-6 rounded-xl border-2 transition-all ${
                    sizeSelection["1:1-commercial"]
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={sizeSelection["1:1-commercial"]}
                    onChange={(e) =>
                      setSizeSelection({
                        ...sizeSelection,
                        "1:1-commercial": e.target.checked,
                      })
                    }
                    className="sr-only"
                  />
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        sizeSelection["1:1-commercial"]
                          ? "border-amber-500 bg-amber-500"
                          : "border-gray-500"
                      }`}
                    >
                      {sizeSelection["1:1-commercial"] && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-white mb-1">{t("sizes.1:1-commercial.name")}</div>
                      <div className="text-xs text-gray-400">{t("sizes.1:1-commercial.ratio")}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {t("sizes.1:1-commercial.description")}
                      </div>
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleSizeConfirm}
                  className="px-12 py-4 bg-linear-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-blue-900/30 flex items-center gap-3"
                >
                  <span>{t("phase2.confirmButton")}</span>
                </button>
              </div>
            </div>
          )}

          {/* Phase 2: Planning Status */}
          {appState === AppState.PLANNING && (
            <div className="bg-[#1e1e24] rounded-2xl p-8 border border-blue-500/20 flex items-center justify-center gap-4 animate-in fade-in duration-300">
              <Spinner className="w-6 h-6 text-blue-500" />
              <div>
                <div className="text-lg font-bold text-white mb-1">
                  {t("phase2.planningTitle")}
                </div>
                <p className="text-sm text-gray-400">
                  {t("phase2.planningDescription")}
                  <strong>&quot;{activeRoute.route_name}&quot;</strong>{" "}
                  {t("phase2.planningDescription2")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Phase 2 Results */}
        {(appState === AppState.SUITE_READY || contentPlan) && contentPlan && (
          <div className="mt-12 relative" id="content-section">
            <ContentSuite
              plan={contentPlan}
              onContentUpdate={(newSets) => setEditedContentSets(newSets)}
              apiKey={apiKey}
              productImage={productImage}
              secondaryProduct={secondaryProduct}
              brandLogo={brandLogo}
              onProductImageChange={setProductImage}
              onSecondaryProductChange={setSecondaryProduct}
              onBrandLogoChange={setBrandLogo}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen text-slate-200 selection:bg-blue-500 selection:text-white font-sans flex flex-col">
      <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onSave={handleSaveApiKey}
        serverHasKey={serverHasKey}
      />

      {/* Header */}
      <header className="w-full py-6 border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setAppState(AppState.IDLE)}
          >
            <div className="w-8 h-8 flex items-center justify-center">
              <Image
                src="/images/logo.svg"
                alt="Logo"
                width={32}
                height={32}
                className="w-full h-full object-contain animate-float"
              />
            </div>
            <h1 className="text-lg font-bold text-white hidden md:block">
              {t("common.appName")}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <button
              onClick={() => setIsGuideOpen(true)}
              className="text-gray-400 hover:text-white text-sm font-bold transition-colors"
            >
              {t("header.guide")}
            </button>
            <button
              onClick={() => setIsApiKeyModalOpen(true)}
              className="text-blue-400 hover:text-blue-300 text-sm font-bold"
            >
              {serverHasKey
                ? apiKey
                  ? t("header.apiSettingsCustom")
                  : t("header.apiSettingsFree")
                : apiKey
                  ? t("header.apiSettingsConnected")
                  : t("header.apiSettings")}
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1 flex flex-col">
        {/* Global Error */}
        {errorMsg && (
          <div className="w-full max-w-2xl mx-auto mb-8 p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-200 text-center flex items-center justify-between">
            <span>{errorMsg}</span>
            <button
              onClick={() => setAppState(AppState.IDLE)}
              className="text-sm underline hover:text-white"
            >
              重置
            </button>
          </div>
        )}

        {/* Loading States - Pac-Man Style E (Progress Track) */}
        {appState === AppState.ANALYZING && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 text-center animate-in fade-in zoom-in duration-500">
            {/* Pac-Man Track */}
            <div className="relative w-64 h-16 overflow-hidden">
              {/* Dots Track */}
              <div className="absolute inset-0 flex items-center justify-between px-2">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 bg-blue-400/60 rounded-full animate-pulse"
                    style={{
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
              {/* Moving Logo (Pac-Man) */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-12 h-12"
                style={{
                  animation: "pacman-move 3s ease-in-out infinite",
                }}
              >
                <Image
                  src="/images/logo.svg"
                  alt="Loading"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                  style={{
                    animation: "pacman-chomp 0.3s ease-in-out infinite",
                  }}
                />
              </div>
              {/* Eaten dots effect - fading trail */}
              <div
                className="absolute top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-blue-500/50 to-transparent rounded-full"
                style={{
                  animation: "pacman-trail 3s ease-in-out infinite",
                }}
              />
            </div>

            {/* Custom Keyframes */}
            <style jsx>{`
              @keyframes pacman-move {
                0% { left: -48px; }
                100% { left: calc(100% + 48px); }
              }
              @keyframes pacman-chomp {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(0.9) scaleX(1.1); }
              }
              @keyframes pacman-trail {
                0% { left: 0; width: 0; opacity: 0; }
                10% { opacity: 0.5; }
                100% { left: 0; width: 100%; opacity: 0; }
              }
            `}</style>

            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {t("analyzing.title")}
              </h2>
              <p className="text-gray-400">{t("analyzing.description")}</p>
            </div>
          </div>
        )}

        {/* Main Views */}
        {appState === AppState.IDLE && (
          <div className="flex-1 flex flex-col items-center mt-8 text-center">
            <h2 className="text-4xl md:text-6xl font-bold text-white serif mb-4 leading-tight">
              {t("home.heroTitle")}
              <br />
              {t("home.heroTitle2")}
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto mb-8 text-lg mt-2">
              {t("home.heroDescription")}
            </p>
            {renderInputs()}
          </div>
        )}

        {(appState === AppState.RESULTS ||
          appState === AppState.SIZE_SELECTION ||
          appState === AppState.PLANNING ||
          appState === AppState.SUITE_READY) &&
          renderPhase1Results()}
      </main>
    </div>
  );
}
