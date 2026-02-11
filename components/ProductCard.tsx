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

  // Split key_features into individual pills
  const featurePills = analysis.key_features
    .split(/[,，、\n]+/)
    .map((f) => f.trim())
    .filter((f) => f.length > 0);

  return (
    <div className="mb-10 sm:mb-14 animate-fade-in-up">
      {/* Full-width hero banner layout */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl">
        {/* Background: blurred product image */}
        <div className="absolute inset-0">
          <img
            src={imageSrc}
            alt=""
            className="w-full h-full object-cover scale-110 blur-2xl opacity-20"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
        </div>

        {/* Content */}
        <div className="relative flex flex-col md:flex-row items-center gap-8 lg:gap-12 p-6 sm:p-8 lg:p-12">
          {/* Product Image — prominent */}
          <div className="w-full md:w-2/5 shrink-0">
            <div className="aspect-square rounded-2xl overflow-hidden bg-black/30 shadow-2xl shadow-black/50 border border-white/10 max-w-[320px] mx-auto">
              <img src={imageSrc} alt={analysis.name} className="w-full h-full object-contain p-4" />
            </div>
          </div>

          {/* Info — big typography */}
          <div className="w-full text-center md:text-left">
            <div className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full mb-4 border border-blue-500/20">
              {t("productCard.analysisReport")}
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight tracking-tight">
              {analysis.name}
            </h2>

            <p className="text-gray-400 text-sm sm:text-base leading-relaxed mb-8 max-w-lg">
              {analysis.visual_description}
            </p>

            {/* Key Features as pills */}
            <div>
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-3">
                {t("productCard.keyFeatures")}
              </h3>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {featurePills.length > 1 ? (
                  featurePills.map((feature, idx) => (
                    <span key={idx} className="pill-tag">
                      {feature}
                    </span>
                  ))
                ) : (
                  <p className="text-gray-300 leading-relaxed text-sm">{analysis.key_features}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
