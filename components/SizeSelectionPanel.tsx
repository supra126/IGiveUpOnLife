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

  const selectedCount = Object.values(sizeSelection).filter(Boolean).length;

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="mb-8 sm:mb-10">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-mono px-2 py-1 rounded-md border text-white bg-white/10 border-white/20">
            {t("stepIndicator.step02")}
          </span>
          {selectedCount > 0 && (
            <span className="text-xs font-bold text-blue-400 bg-blue-500/15 px-2.5 py-1 rounded-full border border-blue-500/20">
              {selectedCount}
            </span>
          )}
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold text-gradient-hero mb-2">
          {t("phase2.title")}
        </h3>
        <p className="text-sm text-gray-500 max-w-lg">{t("phase2.description")}</p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm animate-slide-down">
          {errorMsg}
        </div>
      )}

      {/* Size cards — single grid, consistent sizing */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
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

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-4 mt-10 sm:mt-12">
        {onBack && (
          <button
            onClick={onBack}
            className="px-6 sm:px-8 py-3 sm:py-3.5 rounded-full font-semibold text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition-all duration-300"
          >
            {t("common.back")}
          </button>
        )}
        <button
          onClick={onConfirm}
          className={`px-10 sm:px-14 py-3.5 sm:py-4 rounded-full font-bold text-sm sm:text-base transition-all duration-300 ${
            selectedCount > 0
              ? "bg-blue-500 text-white hover:bg-blue-400 hover:scale-[1.02] shadow-lg shadow-blue-500/20"
              : "bg-white/10 text-gray-500 cursor-not-allowed"
          }`}
          disabled={selectedCount === 0}
        >
          {t("phase2.confirmButton")}
        </button>
      </div>
    </div>
  );
}
