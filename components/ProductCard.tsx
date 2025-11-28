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
    <div className="bg-[#1e1e24] border border-white/10 rounded-xl p-6 mb-8 flex flex-col md:flex-row gap-6 shadow-2xl shadow-black/50">
      <div className="w-full md:w-1/3 shrink-0">
        <div className="aspect-square rounded-lg overflow-hidden bg-black/20 relative group">
            <img src={imageSrc} alt={analysis.name} className="w-full h-full object-contain" />
            <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                <span className="text-xs text-white/80">{t("productCard.originalImage")}</span>
            </div>
        </div>
      </div>
      <div className="flex flex-col justify-center w-full">
        <div className="uppercase tracking-widest text-xs text-blue-400 font-bold mb-2">{t("productCard.analysisReport")}</div>
        <h2 className="text-3xl font-bold text-white serif mb-1">{analysis.name}</h2>
        <p className="text-gray-400 text-sm mb-4 italic">{analysis.visual_description}</p>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider border-b border-blue-500/30 pb-1 inline-block">{t("productCard.keyFeatures")}</h3>
          <p className="text-gray-300 leading-relaxed">{analysis.key_features}</p>
        </div>
      </div>
    </div>
  );
};