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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-mono text-white bg-white/10 px-2 py-1 rounded-md border border-white/20">
              {t("stepIndicator.step01")}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white">{t("phase1.title")}</h3>
        </div>
        <span className="text-xs text-gray-500 mt-2 sm:mt-0">{t("phase1.selectHint")}</span>
      </div>

      {/* Zone A — Summary Selection Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        {routes.map((route, idx) => {
          const isSelected = activeRouteIndex === idx;

          return (
            <div
              key={idx}
              onClick={() => onSelectRoute(idx)}
              className={`card-hover glass-panel p-4 sm:p-5 rounded-xl sm:rounded-2xl transition-all duration-500 cursor-pointer relative overflow-hidden ${
                isSelected ? "opacity-100" : "opacity-50 hover:opacity-75"
              }`}
              style={{
                border: isSelected
                  ? "1px solid rgba(255, 255, 255, 0.3)"
                  : "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              {/* Left accent bar when selected */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-all duration-500 ${
                  isSelected ? "bg-white/60" : "bg-transparent"
                }`}
              />

              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                {isSelected ? (
                  <span className="text-xs font-mono text-white px-2 py-1 rounded-md bg-white/10 border border-white/40">
                    {t("phase1.routeLabel")} {String.fromCharCode(65 + idx)}
                  </span>
                ) : (
                  <span className="text-xs font-mono text-gray-500 px-2 py-1">
                    {t("phase1.routeLabel")} {String.fromCharCode(65 + idx)}
                  </span>
                )}
                <div
                  className={`
                    w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all duration-300
                    ${
                      isSelected
                        ? "bg-white/10 text-white shadow-lg scale-100"
                        : "bg-white/5 border border-white/10 scale-90 opacity-0 group-hover:opacity-50"
                    }
                  `}
                >
                  <svg
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>

              {/* Route Name (read-only title) */}
              <h4 className={`text-base sm:text-lg font-bold mb-1 ${isSelected ? "text-white" : "text-gray-300"}`}>
                {route.route_name}
              </h4>

              {/* Headline (truncated 2 lines, read-only) */}
              <p className={`text-sm line-clamp-2 ${isSelected ? "text-gray-300" : "text-gray-500"}`}>
                {route.headline}
              </p>
            </div>
          );
        })}
      </div>

      {/* Zone B — Detailed Edit Panel for selected route */}
      {activeRoute && (
        <div
          key={activeRouteIndex}
          className="glass-panel rounded-xl sm:rounded-2xl p-5 sm:p-6 lg:p-8 animate-scale-in"
        >
          <div className="flex items-center gap-3 mb-5">
            <span className="text-xs font-mono text-white px-2 py-1 rounded-md bg-white/10 border border-white/40">
              {t("phase1.routeLabel")} {String.fromCharCode(65 + activeRouteIndex)}
            </span>
            <span className="text-xs text-gray-400">
              {t("phase1.editingRoute")}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            {/* Left Column */}
            <div className="space-y-5">
              <div>
                <label className="field-label">
                  {t("phase1.routeName")}
                </label>
                <input
                  type="text"
                  value={activeRoute.route_name}
                  onChange={(e) =>
                    onUpdateRoute(activeRouteIndex, { ...activeRoute, route_name: e.target.value })
                  }
                  className="input-field text-base sm:text-lg font-bold text-white"
                />
              </div>

              <div>
                <label className="field-label">
                  {t("phase1.headline")}
                </label>
                <textarea
                  value={activeRoute.headline}
                  onChange={(e) =>
                    onUpdateRoute(activeRouteIndex, { ...activeRoute, headline: e.target.value })
                  }
                  className="input-field text-sm sm:text-base font-medium text-white resize-none h-20 sm:h-24"
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
                  className="input-field text-sm text-gray-300 resize-none h-20 sm:h-24"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-5">
              <div>
                <label className="field-label">
                  {t("phase1.styleDescription")}
                </label>
                <textarea
                  value={activeRoute.style_brief}
                  onChange={(e) =>
                    onUpdateRoute(activeRouteIndex, { ...activeRoute, style_brief: e.target.value })
                  }
                  className="input-field text-sm text-gray-300 resize-none h-24 sm:h-28"
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
                  className="input-field text-sm text-gray-300 resize-none h-20 sm:h-24"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold tracking-wide mb-1 block text-white">
                  {t("phase1.supplement")}
                </label>
                <textarea
                  value={routeSupplements[activeRouteIndex]}
                  onChange={(e) => onUpdateSupplement(activeRouteIndex, e.target.value)}
                  placeholder={t("phase1.supplementPlaceholder")}
                  className="input-field text-xs text-gray-300 placeholder-gray-600 resize-none h-16 sm:h-20 !bg-white/5 !border-white/15"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
