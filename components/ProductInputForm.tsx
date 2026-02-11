"use client";

import React, { useState, useCallback } from "react";
import { useLocale } from "@/contexts/LocaleContext";

interface ProductInputFormProps {
  imagePreview: string | null;
  productName: string;
  productInfo: string;
  productUrl: string;
  refCopy: string;
  showAnalyzeButton: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileDrop: (file: File) => void;
  onClearImage: () => void;
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
  onFileDrop,
  onClearImage,
  onProductNameChange,
  onProductInfoChange,
  onProductUrlChange,
  onRefCopyChange,
  onAnalyze,
}: ProductInputFormProps) {
  const { t } = useLocale();
  const [isDragging, setIsDragging] = useState(false);

  const hasImage = !!imagePreview;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith("image/")) {
          onFileDrop(file);
        }
      }
    },
    [onFileDrop]
  );

  return (
    <div
      className={`
        w-full max-w-5xl mx-auto mt-6 sm:mt-8 animate-fade-in-up
        rounded-2xl sm:rounded-3xl border-2 transition-all duration-500 overflow-hidden
        ${
          isDragging
            ? "border-white/60 bg-white/10 scale-[1.01]"
            : hasImage
              ? "border-white/40 bg-white/5"
              : "border-gray-600/50 bg-black/20"
        }
      `}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col md:flex-row">
        {/* Left: Image Upload — takes 55% on desktop */}
        <div className="md:w-[55%] shrink-0 order-2 md:order-1">
          <label
            className={`flex flex-col items-center justify-center w-full h-full min-h-[300px] sm:min-h-[360px] md:min-h-[440px] cursor-pointer transition-all duration-500 relative overflow-hidden group ${
              isDragging
                ? "bg-white/10"
                : hasImage
                  ? "bg-black/30"
                  : "bg-black/20 hover:bg-black/10"
            }`}
          >
            {/* Drag overlay */}
            {isDragging && !hasImage && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/5 backdrop-blur-[2px]">
                <svg
                  className="w-12 h-12 text-white/70 mb-3 animate-pulse-ring"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-white/80 font-bold text-sm">{t("input.dropToUpload")}</p>
              </div>
            )}

            {imagePreview ? (
              <div className="w-full h-full relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt={t("alt.preview")}
                  className="w-full h-full object-contain p-6 sm:p-8 transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center pb-6 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300">
                  <span className="text-white font-bold text-sm px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
                    {t("input.changeImage")}
                  </span>
                </div>
                {/* Clear Image Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClearImage();
                  }}
                  className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-red-500/80 rounded-full text-white transition-colors z-10"
                  title={t("input.clearImage")}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gray-700/30 border border-gray-600/50 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:border-gray-500/70 transition-all duration-300">
                  <svg
                    className="w-10 h-10 sm:w-12 sm:h-12 text-gray-500 group-hover:text-gray-400 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <p className="mb-2 text-base sm:text-lg font-medium text-gray-400 group-hover:text-gray-300 transition-colors">
                  {t("input.uploadOrTakePhoto")}
                </p>
                <p className="text-xs text-gray-600">{t("input.supportedFormats")}</p>
              </div>
            )}
            <input type="file" className="hidden" onChange={onFileChange} accept="image/*" />
          </label>
        </div>

        {/* Right: Text Inputs — 45% on desktop, stacked on mobile */}
        <div className="md:w-[45%] order-1 md:order-2 p-5 sm:p-7 lg:p-8 flex flex-col gap-4 sm:gap-5 md:border-l border-white/10">
          <div>
            <label
              className={`block text-xs sm:text-sm font-semibold tracking-wide mb-1.5 sm:mb-2 text-center md:text-left transition-colors ${hasImage ? "text-white" : "text-gray-500"}`}
            >
              {t("input.productName")}
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => onProductNameChange(e.target.value)}
              placeholder={t("input.productNamePlaceholder")}
              className={`input-field text-sm sm:text-base ${hasImage ? "!border-white/20 hover:!border-white/30 focus:!border-white/40" : ""}`}
            />
          </div>
          <div>
            <label
              className={`block text-xs sm:text-sm font-semibold tracking-wide mb-1.5 sm:mb-2 text-center md:text-left transition-colors ${hasImage ? "text-gray-400" : "text-gray-600"}`}
            >
              {t("input.productInfo")}
            </label>
            <textarea
              value={productInfo}
              onChange={(e) => onProductInfoChange(e.target.value)}
              placeholder={t("input.productInfoPlaceholder")}
              className={`input-field h-24 sm:h-28 resize-none text-xs sm:text-sm leading-relaxed ${hasImage ? "!border-white/20 hover:!border-white/30 focus:!border-white/40" : ""}`}
            />
          </div>
          <div>
            <label
              className={`block text-xs sm:text-sm font-semibold tracking-wide mb-1.5 sm:mb-2 text-center md:text-left transition-colors ${hasImage ? "text-gray-400" : "text-gray-600"}`}
            >
              {t("input.productUrl")}
            </label>
            <input
              type="url"
              value={productUrl}
              onChange={(e) => onProductUrlChange(e.target.value)}
              placeholder={t("input.productUrlPlaceholder")}
              className={`input-field text-sm sm:text-base ${hasImage ? "!border-white/20 hover:!border-white/30 focus:!border-white/40" : ""}`}
            />
          </div>
          <div>
            <label
              className={`block text-xs sm:text-sm font-semibold tracking-wide mb-1.5 sm:mb-2 text-center md:text-left transition-colors ${hasImage ? "text-gray-400" : "text-gray-600"}`}
            >
              {t("input.refCopy")}
            </label>
            <textarea
              value={refCopy}
              onChange={(e) => onRefCopyChange(e.target.value)}
              placeholder={t("input.refCopyPlaceholder")}
              className={`input-field h-24 sm:h-28 resize-none text-xs sm:text-sm leading-relaxed ${hasImage ? "!border-white/20 hover:!border-white/30 focus:!border-white/40" : ""}`}
            />
          </div>

          {showAnalyzeButton && (
            <button
              onClick={onAnalyze}
              className={`btn-primary mt-auto w-full py-3.5 sm:py-4 font-bold text-xs sm:text-sm tracking-widest rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                hasImage
                  ? "bg-blue-500 text-white hover:bg-blue-400 hover:scale-[1.02] shadow-lg shadow-blue-500/20"
                  : "bg-gray-700 text-gray-400 cursor-not-allowed"
              }`}
              disabled={!hasImage}
            >
              <span>{t("input.startButton")}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
