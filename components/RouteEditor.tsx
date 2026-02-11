"use client";

import React from "react";
import { MarketingRoute } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";

interface RouteEditorProps {
  routes: MarketingRoute[];
  activeRouteIndex: number;
  routeSupplements: string[];
  onSelectRoute: (index: number) => void;
  onUpdateRoute: (index: number, route: MarketingRoute) => void;
  onUpdateSupplement: (index: number, value: string) => void;
}

export function RouteEditor({
  routes,
  activeRouteIndex,
  routeSupplements,
  onSelectRoute,
  onUpdateRoute,
  onUpdateSupplement,
}: RouteEditorProps) {
  const { t } = useLocale();
  const activeRoute = routes[activeRouteIndex];

  return (
    <div className="mb-8 sm:mb-10 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-mono text-white bg-white/10 px-2 py-1 rounded-md border border-white/20">
              {t("stepIndicator.step01")}
            </span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-gradient-hero">{t("phase1.title")}</h3>
        </div>
        <span className="text-xs text-gray-500 mt-2 sm:mt-0">{t("phase1.selectHint")}</span>
      </div>

      {/* Zone A — Horizontal Tab Selector */}
      <div className="flex border-b border-white/10 mb-8 overflow-x-auto">
        {routes.map((route, idx) => {
          const isSelected = activeRouteIndex === idx;

          return (
            <button
              key={idx}
              onClick={() => onSelectRoute(idx)}
              className={`flex-1 min-w-0 px-4 sm:px-6 py-4 sm:py-5 text-left transition-all duration-300 border-b-2 -mb-px relative ${
                isSelected
                  ? "text-white border-blue-400"
                  : "text-gray-500 border-transparent hover:text-gray-300 hover:border-white/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isSelected
                    ? "bg-blue-500 text-white"
                    : "bg-white/5 text-gray-500 border border-white/10"
                }`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <div className="min-w-0">
                  <h4 className={`text-sm sm:text-base font-bold truncate transition-colors ${isSelected ? "text-white" : "text-gray-400"}`}>
                    {route.route_name}
                  </h4>
                  <p className={`text-xs truncate transition-colors ${isSelected ? "text-gray-400" : "text-gray-600"}`}>
                    {route.headline}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Zone B — Detailed Edit Panel for selected route */}
      {activeRoute && (
        <div
          key={activeRouteIndex}
          className="animate-scale-in"
        >
          {/* Route name as a big editable title */}
          <div className="mb-8">
            <input
              type="text"
              value={activeRoute.route_name}
              onChange={(e) =>
                onUpdateRoute(activeRouteIndex, { ...activeRoute, route_name: e.target.value })
              }
              className="w-full bg-transparent text-2xl sm:text-3xl font-bold text-white border-none outline-none placeholder-gray-600 focus:ring-0"
              placeholder={t("phase1.routeName")}
            />
            <div className="h-px bg-gradient-to-r from-blue-500/30 via-blue-500/10 to-transparent mt-2" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Left Column — Content */}
            <div className="space-y-6">
              <div>
                <label className="field-label">
                  {t("phase1.headline")}
                </label>
                <textarea
                  value={activeRoute.headline}
                  onChange={(e) =>
                    onUpdateRoute(activeRouteIndex, { ...activeRoute, headline: e.target.value })
                  }
                  className="input-field text-sm sm:text-base font-medium text-white resize-none h-24 sm:h-28"
                />
              </div>

              <div>
                <label className="field-label">
                  {t("phase1.subhead")}
                </label>
                <textarea
                  value={activeRoute.subhead}
                  onChange={(e) =>
                    onUpdateRoute(activeRouteIndex, { ...activeRoute, subhead: e.target.value })
                  }
                  className="input-field text-sm text-gray-300 resize-none h-24 sm:h-28"
                />
              </div>

              <div>
                <label className="field-label text-white">
                  {t("phase1.supplement")}
                </label>
                <textarea
                  value={routeSupplements[activeRouteIndex]}
                  onChange={(e) => onUpdateSupplement(activeRouteIndex, e.target.value)}
                  placeholder={t("phase1.supplementPlaceholder")}
                  className="input-field text-sm text-gray-300 placeholder-gray-600 resize-none h-20 sm:h-24 !bg-white/5 !border-white/15"
                />
              </div>
            </div>

            {/* Right Column — Strategy & Style */}
            <div className="space-y-6">
              <div>
                <label className="field-label">
                  {t("phase1.styleDescription")}
                </label>
                <textarea
                  value={activeRoute.style_brief}
                  onChange={(e) =>
                    onUpdateRoute(activeRouteIndex, { ...activeRoute, style_brief: e.target.value })
                  }
                  className="input-field text-sm text-gray-300 resize-none h-28 sm:h-32"
                />
              </div>

              <div>
                <label className="field-label">
                  {t("phase1.targetAudience")}
                </label>
                <textarea
                  value={activeRoute.target_audience}
                  onChange={(e) =>
                    onUpdateRoute(activeRouteIndex, { ...activeRoute, target_audience: e.target.value })
                  }
                  className="input-field text-sm text-gray-300 resize-none h-24 sm:h-28"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
