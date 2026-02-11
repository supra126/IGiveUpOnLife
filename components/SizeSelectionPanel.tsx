"use client";

import React from "react";
import { SizeCheckbox } from "@/components/SizeCheckbox";
import { useLocale } from "@/contexts/LocaleContext";

interface SizeSelectionState {
  "1:1": boolean;
  "9:16": boolean;
  "4:5": boolean;
  "16:9": boolean;
  "1:1-commercial": boolean;
}

interface SizeSelectionPanelProps {
  sizeSelection: SizeSelectionState;
  errorMsg: string | null;
  onSizeChange: (ratio: keyof SizeSelectionState, checked: boolean) => void;
  onConfirm: () => void;
  onBack?: () => void;
}

export function SizeSelectionPanel({
  sizeSelection,
  errorMsg,
  onSizeChange,
  onConfirm,
  onBack,
}: SizeSelectionPanelProps) {
  const { t } = useLocale();

  return (
    <div className="animate-fade-in-up">
      {/* Panel */}
      <div className="glass-panel p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl lg:rounded-3xl border border-white/5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-mono px-2 py-1 rounded-md border text-white bg-white/10 border-white/20">
                {t("stepIndicator.step02")}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2 text-white">
              {t("phase2.title")}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500">{t("phase2.description")}</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm animate-slide-down">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
          <SizeCheckbox
            ratio="1:1"
            checked={sizeSelection["1:1"]}
            onChange={(checked) => onSizeChange("1:1", checked)}
            name={t("sizes.1:1.name")}
            ratioLabel={t("sizes.1:1.ratio")}
            description={t("sizes.1:1.description")}
            color="blue"
          />

          <SizeCheckbox
            ratio="9:16"
            checked={sizeSelection["9:16"]}
            onChange={(checked) => onSizeChange("9:16", checked)}
            name={t("sizes.9:16.name")}
            ratioLabel={t("sizes.9:16.ratio")}
            description={t("sizes.9:16.description")}
            color="purple"
          />

          <SizeCheckbox
            ratio="4:5"
            checked={sizeSelection["4:5"]}
            onChange={(checked) => onSizeChange("4:5", checked)}
            name={t("sizes.4:5.name")}
            ratioLabel={t("sizes.4:5.ratio")}
            description={t("sizes.4:5.description")}
            color="pink"
          />

          <SizeCheckbox
            ratio="16:9"
            checked={sizeSelection["16:9"]}
            onChange={(checked) => onSizeChange("16:9", checked)}
            name={t("sizes.16:9.name")}
            ratioLabel={t("sizes.16:9.ratio")}
            description={t("sizes.16:9.description")}
            color="green"
          />

          <SizeCheckbox
            ratio="1:1-commercial"
            checked={sizeSelection["1:1-commercial"]}
            onChange={(checked) => onSizeChange("1:1-commercial", checked)}
            name={t("sizes.1:1-commercial.name")}
            ratioLabel={t("sizes.1:1-commercial.ratio")}
            description={t("sizes.1:1-commercial.description")}
            color="amber"
          />
        </div>
      </div>

      {/* Buttons - Outside the panel, centered below */}
      <div className="flex items-center justify-center gap-4 mt-6 sm:mt-8">
        {onBack && (
          <button
            onClick={onBack}
            className="px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl font-semibold text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition-all duration-300"
          >
            {t("common.back")}
          </button>
        )}
        <button
          onClick={onConfirm}
          className="btn-primary px-10 sm:px-12 py-3.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base transition-all duration-300 bg-white text-black hover:bg-gray-200 hover:scale-[1.02]"
        >
          {t("phase2.confirmButton")}
        </button>
      </div>
    </div>
  );
}
