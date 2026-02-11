"use client";

import React, { useState, useCallback } from "react";

interface ImageUploaderProps {
  file: File | null;
  previewUrl: string | null;
  onFileChange: (file: File | null) => void;
  label: string;
  emptyText: string;
  changeText: string;
  hint?: string;
  borderColor: "indigo" | "pink" | "white";
  iconColor: "indigo" | "pink" | "white";
}

export const ImageUploader: React.FC<ImageUploaderProps> = React.memo(({
  file,
  previewUrl,
  onFileChange,
  label,
  emptyText,
  changeText,
  hint,
  borderColor,
  iconColor,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const borderClasses =
    borderColor === "white"
      ? "border-white/20 hover:border-white/40 hover:bg-white/5"
      : borderColor === "indigo"
        ? "border-indigo-500/30 hover:border-indigo-400 hover:bg-indigo-500/5"
        : "border-pink-500/30 hover:border-pink-400 hover:bg-pink-500/5";

  const iconClasses =
    iconColor === "white" ? "text-white/60" : iconColor === "indigo" ? "text-indigo-400" : "text-pink-400";
  const textClasses =
    iconColor === "white" ? "text-white/70" : iconColor === "indigo" ? "text-indigo-300" : "text-pink-300";

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const droppedFile = files[0];
      if (droppedFile.type.startsWith("image/")) {
        onFileChange(droppedFile);
      }
    }
  }, [onFileChange]);

  return (
    <div className="relative">
      <label className={`block text-sm font-semibold mb-2 ${iconColor === "white" ? "text-white/80" : "text-indigo-200"}`}>{label}</label>
      <label
        className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all relative overflow-hidden bg-black/20 ${
          isDragging ? "border-white/50 bg-white/10 scale-[1.02]" : borderClasses
        }`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {file && previewUrl ? (
          <div className="w-full h-full relative group">
            <img src={previewUrl} alt={label} className="w-full h-full object-contain p-2" />
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <span className="text-white text-sm">{changeText}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-4">
            {isDragging ? (
              <p className="text-white/80 font-bold text-xs animate-pulse">Drop here</p>
            ) : (
              <>
                <svg
                  className={`w-8 h-8 mb-2 ${iconClasses}`}
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
                <p className={`text-xs ${textClasses}`}>{emptyText}</p>
                {hint && <p className="text-[10px] text-gray-500 mt-1">{hint}</p>}
              </>
            )}
          </div>
        )}
        <input
          type="file"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              onFileChange(e.target.files[0]);
            }
          }}
          accept="image/*"
        />
      </label>
      {file && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onFileChange(null);
          }}
          className="absolute top-8 right-2 w-6 h-6 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center transition-colors z-10"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
});

ImageUploader.displayName = "ImageUploader";
