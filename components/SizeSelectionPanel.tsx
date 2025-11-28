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
}

export function SizeSelectionPanel({
  sizeSelection,
  errorMsg,
  onSizeChange,
  onConfirm,
}: SizeSelectionPanelProps) {
  const { t } = useLocale();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-xl font-bold text-white serif mb-2">
        {t("phase2.title")}
      </h3>
      <p className="text-sm text-gray-400 mb-6">
        {t("phase2.description")}
      </p>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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

      <div className="flex justify-center">
        <button
          onClick={onConfirm}
          className="px-12 py-4 bg-linear-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-blue-900/30 flex items-center gap-3"
        >
          <span>{t("phase2.confirmButton")}</span>
        </button>
      </div>
    </div>
  );
}
