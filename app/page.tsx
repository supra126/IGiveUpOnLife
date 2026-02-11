"use client";

import React, { useReducer, useCallback } from "react";
import {
  analyzeProductImage,
  generateContentPlan,
  hasServerApiKey,
} from "@/services/geminiService";
import {
  AppState,
  ImageRatio,
} from "@/types";
import { ProductCard } from "@/components/ProductCard";
import { GuideModal } from "@/components/GuideModal";
import { ContentSuite } from "@/components/ContentSuite";
import { ApiKeyModal } from "@/components/ApiKeyModal";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ProductInputForm } from "@/components/ProductInputForm";
import { RouteEditor } from "@/components/RouteEditor";
import { SizeSelectionPanel } from "@/components/SizeSelectionPanel";
import { AnalyzingLoader } from "@/components/AnalyzingLoader";
import { PlanningLoader } from "@/components/PlanningLoader";
import { getApiKey } from "@/lib/api-key-storage";
import { useLocale } from "@/contexts/LocaleContext";
import { appReducer, initialAppState } from "@/lib/app-reducer";
import Image from "next/image";

export default function Home() {
  const { t, locale } = useLocale();
  const [state, dispatch] = useReducer(appReducer, initialAppState);

  // Destructure state for convenience
  const {
    appState,
    errorMsg,
    selectedFile,
    imagePreview,
    productName,
    productInfo,
    productUrl,
    refCopy,
    analysisResult,
    activeRouteIndex,
    editedRoutes,
    routeSupplements,
    sizeSelection,
    contentPlan,
    productImage,
    secondaryProduct,
    brandLogo,
    apiKey,
    serverHasKey,
    isGuideOpen,
    isApiKeyModalOpen,
  } = state;

  // Load API Key on mount and check server key
  React.useEffect(() => {
    const storedKey = getApiKey();
    if (storedKey) {
      dispatch({ type: "SET_API_KEY", payload: storedKey });
    }

    // Check if server has API key
    hasServerApiKey().then((hasKey) => {
      dispatch({ type: "SET_SERVER_HAS_KEY", payload: hasKey });
    });
  }, []);

  // --- API Key Handling ---
  const handleSaveApiKey = useCallback((key: string) => {
    dispatch({ type: "SET_API_KEY", payload: key });
  }, []);

  // --- File handling (unified for input change and drop) ---
  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      dispatch({
        type: "SET_SELECTED_FILE",
        payload: { file, preview: ev.target?.result as string },
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  const handleFileDrop = useCallback((file: File) => {
    handleFile(file);
  }, [handleFile]);

  const handleClearImage = useCallback(() => {
    dispatch({
      type: "SET_SELECTED_FILE",
      payload: { file: null, preview: null },
    });
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return;

    // Only require user API key if server doesn't have one
    if (!apiKey && !serverHasKey) {
      dispatch({ type: "SET_API_KEY_MODAL_OPEN", payload: true });
      return;
    }

    dispatch({ type: "CLEAR_ERROR" });
    dispatch({ type: "SET_APP_STATE", payload: AppState.ANALYZING });
    try {
      const result = await analyzeProductImage(
        selectedFile,
        productName,
        productInfo,
        productUrl,
        apiKey || undefined,
        locale
      );
      dispatch({ type: "SET_ANALYSIS_RESULT", payload: result });
    } catch (e: unknown) {
      console.error(e);
      dispatch({
        type: "SET_ERROR",
        payload: e instanceof Error ? e.message : t("errors.unexpectedError"),
      });
      dispatch({ type: "SET_APP_STATE", payload: AppState.ERROR });
    }
  }, [selectedFile, apiKey, serverHasKey, productName, productInfo, productUrl, locale, t]);

  const handleGeneratePlan = useCallback(() => {
    if (!analysisResult) return;

    // Only require user API key if server doesn't have one
    if (!apiKey && !serverHasKey) {
      dispatch({ type: "SET_API_KEY_MODAL_OPEN", payload: true });
      return;
    }

    dispatch({ type: "CLEAR_ERROR" });
    dispatch({ type: "SET_APP_STATE", payload: AppState.SIZE_SELECTION });

    // Scroll to Phase 2 section
    setTimeout(() => {
      document
        .getElementById("phase2-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
  }, [analysisResult, apiKey, serverHasKey]);

  const handleSizeConfirm = useCallback(async () => {
    if (!analysisResult) return;

    // Check if at least one size is selected
    const selectedSizes = Object.entries(sizeSelection)
      .filter(([, isSelected]) => isSelected)
      .map(([ratio]) => ratio as ImageRatio);

    if (selectedSizes.length === 0) {
      dispatch({ type: "SET_ERROR", payload: t("phase2.selectAtLeastOne") });
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

    dispatch({ type: "CLEAR_ERROR" });
    dispatch({ type: "SET_APP_STATE", payload: AppState.PLANNING });

    try {
      const plan = await generateContentPlan(
        route,
        analysis,
        combinedRefCopy,
        selectedSizes,
        apiKey || undefined,
        locale
      );
      dispatch({ type: "SET_CONTENT_PLAN", payload: plan });

      // Scroll to content section
      setTimeout(() => {
        document
          .getElementById("content-section")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    } catch (e: unknown) {
      dispatch({
        type: "SET_ERROR",
        payload: e instanceof Error ? e.message : t("errors.contentPlanFailed"),
      });
      dispatch({ type: "SET_APP_STATE", payload: AppState.SIZE_SELECTION });
    }
  }, [analysisResult, sizeSelection, editedRoutes, activeRouteIndex, routeSupplements, refCopy, apiKey, locale, t]);

  // --- Step Navigation ---
  const getCurrentStep = (): number => {
    switch (appState) {
      case AppState.IDLE:
      case AppState.ANALYZING:
        return 0;
      case AppState.RESULTS:
      case AppState.SIZE_SELECTION:
        return 1;
      case AppState.PLANNING:
      case AppState.SUITE_READY:
        return 2;
      default:
        return 0;
    }
  };

  const handleGoToStep = useCallback((step: number) => {
    dispatch({ type: "GO_TO_STEP", payload: step });
  }, []);

  const steps = [
    { label: t("steps.analyze"), shortLabel: "01" },
    { label: t("steps.strategyFormat"), shortLabel: "02" },
    { label: t("steps.adjustGenerate"), shortLabel: "03" },
  ];

  const currentStep = getCurrentStep();

  // --- Render Step Indicator ---
  const renderStepIndicator = () => {
    if (appState === AppState.IDLE) return null;

    return (
      <div className="w-full backdrop-blur-xl bg-black/60 border-b border-white/5 py-3 sticky top-[53px] z-40">
        <div className="container mx-auto px-6">
          {/* Desktop Step Indicator */}
          <div className="hidden md:flex items-center justify-center gap-2">
            {steps.map((step, idx) => {
              const isCompleted = idx < currentStep;
              const isCurrent = idx === currentStep;
              const isClickable = isCompleted;

              return (
                <React.Fragment key={idx}>
                  {/* Step Item */}
                  <div
                    className={`flex items-center gap-2 ${isClickable ? "cursor-pointer group/step" : ""}`}
                    onClick={() => isClickable && handleGoToStep(idx)}
                  >
                    <div
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500
                        ${isCompleted
                          ? "bg-blue-500 text-white group-hover/step:bg-blue-400 group-hover/step:scale-110"
                          : isCurrent
                            ? "bg-blue-500 text-white"
                            : "bg-white/5 text-gray-500 border border-white/10"
                        }
                      `}
                    >
                      {isCompleted ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        step.shortLabel
                      )}
                    </div>
                    <span
                      className={`
                        text-sm font-medium transition-colors duration-300
                        ${isCurrent ? "text-white" : isCompleted ? "text-white group-hover/step:text-gray-300" : "text-gray-500"}
                      `}
                    >
                      {step.label}
                    </span>
                  </div>

                  {/* Connector Line */}
                  {idx < steps.length - 1 && (
                    <div className="w-12 h-0.5 mx-2 relative overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`
                          absolute inset-y-0 left-0 bg-blue-500 transition-all duration-700 ease-out rounded-full
                          ${idx < currentStep ? "w-full" : "w-0"}
                        `}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Mobile Step Indicator */}
          <div className="flex md:hidden items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                {currentStep + 1}
              </div>
              <div>
                <div className="text-white font-bold text-sm">{steps[currentStep]?.label}</div>
                <div className="text-gray-500 text-xs">{t("steps.stepOf").replace("{current}", String(currentStep + 1)).replace("{total}", String(steps.length))}</div>
              </div>
            </div>
            {/* Progress Dots */}
            <div className="flex gap-1.5">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => idx < currentStep && handleGoToStep(idx)}
                  className={`
                    w-2.5 h-2.5 rounded-full transition-all duration-300
                    ${idx === currentStep
                      ? "bg-blue-500 scale-110"
                      : idx < currentStep
                        ? "bg-blue-500/50 cursor-pointer hover:bg-blue-400/70"
                        : "bg-white/20"
                    }
                  `}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- Back Button Component ---
  const BackButton = ({ onClick, label }: { onClick: () => void; label?: string }) => (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors group/back"
    >
      <svg className="w-4 h-4 transition-transform group-hover/back:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      <span>{label || t("common.back")}</span>
    </button>
  );

  // --- Render Helpers ---

  const renderInputs = () => (
    <ProductInputForm
      imagePreview={imagePreview}
      productName={productName}
      productInfo={productInfo}
      productUrl={productUrl}
      refCopy={refCopy}
      showAnalyzeButton={!!selectedFile && appState === AppState.IDLE}
      onFileChange={handleFileChange}
      onFileDrop={handleFileDrop}
      onClearImage={handleClearImage}
      onProductNameChange={(value) => dispatch({ type: "SET_INPUT", payload: { field: "productName", value } })}
      onProductInfoChange={(value) => dispatch({ type: "SET_INPUT", payload: { field: "productInfo", value } })}
      onProductUrlChange={(value) => dispatch({ type: "SET_INPUT", payload: { field: "productUrl", value } })}
      onRefCopyChange={(value) => dispatch({ type: "SET_INPUT", payload: { field: "refCopy", value } })}
      onAnalyze={handleAnalyze}
    />
  );

  const renderPhase1Results = () => {
    if (!analysisResult || !imagePreview) return null;
    const activeRoute = analysisResult.marketing_routes[activeRouteIndex];

    // Hide Phase 1/2 content during PLANNING and SUITE_READY
    const showPhase1And2 = appState === AppState.RESULTS || appState === AppState.SIZE_SELECTION;

    return (
      <div className="w-full max-w-6xl mx-auto px-4 pb-24 section-transition">
        {/* Phase 1: Product Card & Route Selection - Hidden during PLANNING and SUITE_READY */}
        {showPhase1And2 && (
          <>
            {/* Back to upload */}
            <div className="mb-8">
              <BackButton onClick={() => handleGoToStep(0)} />
            </div>

            <ProductCard
              analysis={analysisResult.product_analysis}
              imageSrc={imagePreview}
            />

            {/* Route Selection — separated by generous spacing */}
            <div className="mt-12 sm:mt-16">
              <RouteEditor
                routes={editedRoutes}
                activeRouteIndex={activeRouteIndex}
                routeSupplements={routeSupplements}
                onSelectRoute={(idx) => dispatch({ type: "SET_ACTIVE_ROUTE", payload: idx })}
                onUpdateRoute={(idx, route) =>
                  dispatch({ type: "UPDATE_EDITED_ROUTE", payload: { index: idx, route } })
                }
                onUpdateSupplement={(idx, value) =>
                  dispatch({ type: "UPDATE_ROUTE_SUPPLEMENT", payload: { index: idx, value } })
                }
              />
            </div>

            {/* Phase 2: Size Selection — clear section break */}
            <div className="mt-16 sm:mt-20 pt-12 sm:pt-16 border-t border-white/5" id="phase2-section">
              <SizeSelectionPanel
                sizeSelection={sizeSelection}
                errorMsg={errorMsg}
                onSizeChange={(ratio, checked) =>
                  dispatch({ type: "SET_SIZE_SELECTION", payload: { ratio, checked } })
                }
                onConfirm={handleSizeConfirm}
                onBack={() => handleGoToStep(0)}
              />
            </div>
          </>
        )}

        {/* Planning Loader - Full screen during PLANNING */}
        {appState === AppState.PLANNING && (
          <PlanningLoader routeName={activeRoute.route_name} />
        )}

        {/* Phase 4: Content Suite - Only shown in SUITE_READY */}
        {appState === AppState.SUITE_READY && contentPlan && (
          <div className="relative section-transition" id="content-section">
            {/* Back to strategy/size selection */}
            <div className="mb-6">
              <BackButton onClick={() => handleGoToStep(1)} />
            </div>

            <ContentSuite
              plan={contentPlan}
              onContentUpdate={(newSets) => dispatch({ type: "SET_EDITED_CONTENT_SETS", payload: newSets })}
              apiKey={apiKey}
              productImage={productImage}
              secondaryProduct={secondaryProduct}
              brandLogo={brandLogo}
              onProductImageChange={(file) => dispatch({ type: "SET_PRODUCT_IMAGE", payload: file })}
              onSecondaryProductChange={(file) => dispatch({ type: "SET_SECONDARY_PRODUCT", payload: file })}
              onBrandLogoChange={(file) => dispatch({ type: "SET_BRAND_LOGO", payload: file })}
              marketingRoute={editedRoutes[activeRouteIndex]}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen text-slate-200 selection:bg-blue-500 selection:text-white font-sans flex flex-col">
      <GuideModal isOpen={isGuideOpen} onClose={() => dispatch({ type: "SET_GUIDE_OPEN", payload: false })} />
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => dispatch({ type: "SET_API_KEY_MODAL_OPEN", payload: false })}
        onSave={handleSaveApiKey}
        serverHasKey={serverHasKey}
      />

      {/* Header — minimal floating bar */}
      <header className="w-full py-3 sm:py-4 sticky top-0 z-50 backdrop-blur-xl bg-black/60 border-b border-white/5">
        <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => dispatch({ type: "SET_APP_STATE", payload: AppState.IDLE })}
          >
            <div className="w-7 h-7 flex items-center justify-center">
              <Image
                src="/images/logo.svg"
                alt="Logo"
                width={28}
                height={28}
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-sm sm:text-base font-bold text-white/80 hidden sm:block group-hover:text-white transition-colors tracking-tight">
              {t("common.appName")}
            </h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => dispatch({ type: "SET_API_KEY_MODAL_OPEN", payload: true })}
              className="text-gray-400 hover:text-white text-xs sm:text-sm font-medium transition-colors"
            >
              {serverHasKey
                ? apiKey
                  ? t("header.apiSettingsCustom")
                  : t("header.apiSettingsFree")
                : apiKey
                  ? t("header.apiSettingsConnected")
                  : t("header.apiSettings")}
            </button>
            <a
              href="https://github.com/supra126/IGiveUpOnLife"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
              aria-label="View on GitHub"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-4.5 h-4.5 text-gray-500 hover:text-white transition-colors"
                fill="currentColor"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* Step Indicator */}
      {renderStepIndicator()}

      <main className="container mx-auto px-4 py-8 pb-16 flex-1 flex flex-col">
        {/* Global Error */}
        {errorMsg && (
          <div className="w-full max-w-2xl mx-auto mb-8 p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-200 text-center flex items-center justify-between animate-slide-down">
            <span>{errorMsg}</span>
            <button
              onClick={() => dispatch({ type: "RESET_RESULTS" })}
              className="text-sm underline hover:text-white"
            >
              {t("common.reset")}
            </button>
          </div>
        )}

        {/* Loading States */}
        {appState === AppState.ANALYZING && <AnalyzingLoader />}

        {/* Main Views */}
        {appState === AppState.IDLE && (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in-up">
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gradient-hero serif mb-4 leading-[1.1] tracking-tight">
              {t("home.heroTitle")}
            </h2>
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white serif mb-8 leading-[1.1] tracking-tight">
              {t("home.heroTitle2")}
            </h2>
            <p className="text-gray-400 max-w-lg mx-auto mb-12 sm:mb-16 text-base sm:text-lg leading-relaxed">
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

      {/* Footer — minimal */}
      <footer className="border-t border-white/5 py-3 mt-auto">
        <div className="container mx-auto px-4 flex items-center justify-end gap-4">
          <button
            onClick={() => dispatch({ type: "SET_GUIDE_OPEN", payload: true })}
            className="text-gray-500 hover:text-white text-xs font-medium transition-colors"
          >
            {t("header.guide")}
          </button>
          <span className="text-gray-700">·</span>
          <LanguageToggle />
        </div>
      </footer>
    </div>
  );
}
