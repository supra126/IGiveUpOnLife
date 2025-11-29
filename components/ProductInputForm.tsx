"use client";

import React from "react";
import { useLocale } from "@/contexts/LocaleContext";

interface ProductInputFormProps {
  imagePreview: string | null;
  productName: string;
  productInfo: string;
  productUrl: string;
  refCopy: string;
  showAnalyzeButton: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onProductNameChange: (value: string) => void;
  onProductInfoChange: (value: string) => void;
  onProductUrlChange: (value: string) => void;
  onRefCopyChange: (value: string) => void;
  onAnalyze: () => void;
}

export function ProductInputForm({
  imagePreview,
  productName,
  productInfo,
  productUrl,
  refCopy,
  showAnalyzeButton,
  onFileChange,
  onProductNameChange,
  onProductInfoChange,
  onProductUrlChange,
  onRefCopyChange,
  onAnalyze,
}: ProductInputFormProps) {
  const { t } = useLocale();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto md:mx-0 md:ml-0 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Left: Image Upload */}
      <div className="order-2 md:order-1">
        <label
          className={`flex flex-col items-center justify-center w-full h-full border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden ${
            imagePreview
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
                className="w-10 h-10 mb-3 text-gray-300"
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
              <p className="mb-2 text-sm text-gray-300">{t("input.uploadProduct")}</p>
              <p className="text-xs text-gray-500">{t("input.supportedFormats")}</p>
            </div>
          )}
          <input
            type="file"
            className="hidden"
            onChange={onFileChange}
            accept="image/*"
          />
        </label>
      </div>

      {/* Right: Text Inputs */}
      <div className="order-1 md:order-2 flex flex-col gap-4">
        <div>
          <label className="block text-base font-bold text-gray-300 uppercase tracking-wider mb-2 text-center md:text-left">
            {t("input.productName")}
          </label>
          <input
            type="text"
            value={productName}
            onChange={(e) => onProductNameChange(e.target.value)}
            placeholder={t("input.productNamePlaceholder")}
            className="w-full bg-[#15151a] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-base font-bold text-gray-300 uppercase tracking-wider mb-2 text-center md:text-left">
            {t("input.productInfo")}
          </label>
          <textarea
            value={productInfo}
            onChange={(e) => onProductInfoChange(e.target.value)}
            placeholder={t("input.productInfoPlaceholder")}
            className="w-full bg-[#15151a] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none transition-colors h-24 resize-none text-sm leading-relaxed"
          />
        </div>
        <div>
          <label className="block text-base font-bold text-gray-300 uppercase tracking-wider mb-2 text-center md:text-left">
            {t("input.productUrl")}
          </label>
          <input
            type="url"
            value={productUrl}
            onChange={(e) => onProductUrlChange(e.target.value)}
            placeholder={t("input.productUrlPlaceholder")}
            className="w-full bg-[#15151a] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-base font-bold text-gray-300 uppercase tracking-wider mb-2 text-center md:text-left">
            {t("input.refCopy")}
          </label>
          <textarea
            value={refCopy}
            onChange={(e) => onRefCopyChange(e.target.value)}
            placeholder={t("input.refCopyPlaceholder")}
            className="w-full bg-[#15151a] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none transition-colors h-24 resize-none text-sm leading-relaxed"
          />
        </div>

        {showAnalyzeButton && (
          <button
            onClick={onAnalyze}
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
}
