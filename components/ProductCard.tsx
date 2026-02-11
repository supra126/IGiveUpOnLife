"use client";

import React from 'react';
import { ProductAnalysis } from '@/types';
import { useLocale } from '@/contexts/LocaleContext';

interface ProductCardProps {
  analysis: ProductAnalysis;
  imageSrc: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({ analysis, imageSrc }) => {
  const { t } = useLocale();

  return (
    <div className="glass-panel rounded-xl sm:rounded-2xl p-5 sm:p-6 mb-8 flex flex-col md:flex-row gap-6 animate-fade-in-up">
      <div className="w-full md:w-1/3 shrink-0">
        <div className="aspect-square rounded-xl overflow-hidden bg-black/20 relative group shadow-lg shadow-black/30">
            <img src={imageSrc} alt={analysis.name} className="w-full h-full object-contain" />
            <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                <span className="text-xs text-white/80">{t("productCard.originalImage")}</span>
            </div>
        </div>
      </div>
      <div className="flex flex-col justify-center w-full">
        <div className="text-xs text-[var(--accent-primary)] font-semibold tracking-wide mb-2">{t("productCard.analysisReport")}</div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white serif mb-2">{analysis.name}</h2>
        <p className="text-gray-400 text-sm mb-5 italic leading-relaxed">{analysis.visual_description}</p>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white/80 tracking-wide border-b border-[var(--accent-primary)]/20 pb-1 inline-block">{t("productCard.keyFeatures")}</h3>
          <p className="text-gray-300 leading-relaxed text-sm">{analysis.key_features}</p>
        </div>
      </div>
    </div>
  );
};
