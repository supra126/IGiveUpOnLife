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
import { Spinner } from "@/components/Spinner";
import { ProductCard } from "@/components/ProductCard";
import { GuideModal } from "@/components/GuideModal";
import { ContentSuite } from "@/components/ContentSuite";
import { ApiKeyModal } from "@/components/ApiKeyModal";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ProductInputForm } from "@/components/ProductInputForm";
import { RouteEditor } from "@/components/RouteEditor";
import { SizeSelectionPanel } from "@/components/SizeSelectionPanel";
import { AnalyzingLoader } from "@/components/AnalyzingLoader";
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

  // --- Handlers ---
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        dispatch({
          type: "SET_SELECTED_FILE",
          payload: { file, preview: ev.target?.result as string },
        });
      };
      reader.readAsDataURL(file);
    }
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

    return (
      <div className="w-full max-w-6xl mx-auto px-4 pb-20">
        <ProductCard
          analysis={analysisResult.product_analysis}
          imageSrc={imagePreview}
        />

        {/* Route Selection */}
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

        {/* Continue Button */}
        <div className="mb-10 flex justify-center">
          <button
            onClick={() => {
              if (contentPlan) {
                dispatch({ type: "RESET_PHASE2" });
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

        {/* Phase 2: Size Selection */}
        <div className="border-t border-white/10 pt-12" id="phase2-section">
          {appState === AppState.SIZE_SELECTION && (
            <SizeSelectionPanel
              sizeSelection={sizeSelection}
              errorMsg={errorMsg}
              onSizeChange={(ratio, checked) =>
                dispatch({ type: "SET_SIZE_SELECTION", payload: { ratio, checked } })
              }
              onConfirm={handleSizeConfirm}
            />
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
              onContentUpdate={(newSets) => dispatch({ type: "SET_EDITED_CONTENT_SETS", payload: newSets })}
              apiKey={apiKey}
              productImage={productImage}
              secondaryProduct={secondaryProduct}
              brandLogo={brandLogo}
              onProductImageChange={(file) => dispatch({ type: "SET_PRODUCT_IMAGE", payload: file })}
              onSecondaryProductChange={(file) => dispatch({ type: "SET_SECONDARY_PRODUCT", payload: file })}
              onBrandLogoChange={(file) => dispatch({ type: "SET_BRAND_LOGO", payload: file })}
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

      {/* Header */}
      <header className="w-full py-6 border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => dispatch({ type: "SET_APP_STATE", payload: AppState.IDLE })}
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
              onClick={() => dispatch({ type: "SET_GUIDE_OPEN", payload: true })}
              className="text-gray-400 hover:text-white text-sm font-bold transition-colors"
            >
              {t("header.guide")}
            </button>
            <button
              onClick={() => dispatch({ type: "SET_API_KEY_MODAL_OPEN", payload: true })}
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
