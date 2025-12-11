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

  // 判斷是否已上傳圖片，決定外框顏色
  const hasImage = !!imagePreview;

  return (
    <div
      className={`
        w-full max-w-4xl mx-auto mt-6 sm:mt-8 animate-fade-in-up
        p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 transition-all duration-500
        ${hasImage
          ? "border-white/40 bg-white/5"
          : "border-gray-600/50 bg-black/20"
        }
      `}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Left: Image Upload */}
        <div className="order-2 md:order-1">
          <label
            className={`flex flex-col items-center justify-center w-full h-full min-h-[280px] sm:min-h-[320px] border-2 border-dashed rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-500 relative overflow-hidden group ${
              hasImage
                ? "border-white/30 bg-black/30"
                : "border-gray-600/50 hover:border-gray-500/70 bg-black/20"
            }`}
          >
            {imagePreview ? (
              <div className="w-full h-full relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px]">
                  <span className="text-white font-bold text-sm px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">{t("input.changeImage")}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gray-700/30 border border-gray-600/50 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:border-gray-500/70 transition-all duration-300">
                  <svg
                    className="w-8 h-8 sm:w-10 sm:h-10 text-gray-500 group-hover:text-gray-400 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <p className="mb-2 text-sm sm:text-base font-medium text-gray-400 group-hover:text-gray-300 transition-colors">{t("input.uploadProduct")}</p>
                <p className="text-xs text-gray-600">{t("input.supportedFormats")}</p>
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
        <div className="order-1 md:order-2 flex flex-col gap-3 sm:gap-4">
          <div>
            <label className={`block text-xs sm:text-sm font-bold uppercase tracking-wider mb-1.5 sm:mb-2 text-center md:text-left transition-colors ${hasImage ? "text-white" : "text-gray-500"}`}>
              {t("input.productName")}
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => onProductNameChange(e.target.value)}
              placeholder={t("input.productNamePlaceholder")}
              className={`w-full border rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white placeholder-gray-600 focus:outline-none transition-all duration-300 text-sm sm:text-base ${hasImage ? "bg-black/30 border-white/20 focus:border-white/40" : "bg-black/20 border-gray-600/30 focus:border-gray-500/50"}`}
            />
          </div>
          <div>
            <label className={`block text-xs sm:text-sm font-bold uppercase tracking-wider mb-1.5 sm:mb-2 text-center md:text-left transition-colors ${hasImage ? "text-gray-400" : "text-gray-600"}`}>
              {t("input.productInfo")}
            </label>
            <textarea
              value={productInfo}
              onChange={(e) => onProductInfoChange(e.target.value)}
              placeholder={t("input.productInfoPlaceholder")}
              className={`w-full border rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white placeholder-gray-600 focus:outline-none transition-all duration-300 h-20 sm:h-24 resize-none text-xs sm:text-sm leading-relaxed ${hasImage ? "bg-black/30 border-white/20 focus:border-white/40" : "bg-black/20 border-gray-600/30 focus:border-gray-500/50"}`}
            />
          </div>
          <div>
            <label className={`block text-xs sm:text-sm font-bold uppercase tracking-wider mb-1.5 sm:mb-2 text-center md:text-left transition-colors ${hasImage ? "text-gray-400" : "text-gray-600"}`}>
              {t("input.productUrl")}
            </label>
            <input
              type="url"
              value={productUrl}
              onChange={(e) => onProductUrlChange(e.target.value)}
              placeholder={t("input.productUrlPlaceholder")}
              className={`w-full border rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white placeholder-gray-600 focus:outline-none transition-all duration-300 text-sm sm:text-base ${hasImage ? "bg-black/30 border-white/20 focus:border-white/40" : "bg-black/20 border-gray-600/30 focus:border-gray-500/50"}`}
            />
          </div>
          <div>
            <label className={`block text-xs sm:text-sm font-bold uppercase tracking-wider mb-1.5 sm:mb-2 text-center md:text-left transition-colors ${hasImage ? "text-gray-400" : "text-gray-600"}`}>
              {t("input.refCopy")}
            </label>
            <textarea
              value={refCopy}
              onChange={(e) => onRefCopyChange(e.target.value)}
              placeholder={t("input.refCopyPlaceholder")}
              className={`w-full border rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white placeholder-gray-600 focus:outline-none transition-all duration-300 h-20 sm:h-24 resize-none text-xs sm:text-sm leading-relaxed ${hasImage ? "bg-black/30 border-white/20 focus:border-white/40" : "bg-black/20 border-gray-600/30 focus:border-gray-500/50"}`}
            />
          </div>

          {showAnalyzeButton && (
            <button
              onClick={onAnalyze}
              className={`btn-primary mt-2 sm:mt-auto w-full py-3 sm:py-4 font-bold text-xs sm:text-sm uppercase tracking-widest rounded-lg sm:rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                hasImage
                  ? "bg-white text-black hover:bg-gray-200 hover:scale-[1.02]"
                  : "bg-gray-700 text-gray-400 cursor-not-allowed"
              }`}
              disabled={!hasImage}
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
    </div>
  );
}
