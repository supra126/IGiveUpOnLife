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

  const gradients = [
    "from-white/10 to-white/5",
    "from-white/10 to-white/5",
    "from-white/10 to-white/5",
  ];
  const borderColors = ["border-white/30", "border-white/30", "border-white/30"];
  const accentColors = ["text-white", "text-white", "text-white"];

  return (
    <div className="mb-8 sm:mb-10 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-mono text-white bg-white/10 px-2 py-1 rounded-md border border-white/20">
              STEP 01
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white">{t("phase1.title")}</h3>
        </div>
        <span className="text-xs text-gray-500 mt-2 sm:mt-0">{t("phase1.selectHint")}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {routes.map((route, idx) => {
          const isSelected = activeRouteIndex === idx;

          return (
            <div
              key={idx}
              onClick={() => onSelectRoute(idx)}
              className="card-hover glass-panel p-4 sm:p-6 rounded-xl sm:rounded-2xl transition-all duration-500 cursor-pointer flex flex-col group relative"
              style={{
                border: isSelected
                  ? "1px solid rgba(255, 255, 255, 0.3)"
                  : "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              {/* Selection indicator */}
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                {isSelected ? (
                  <span
                    className="text-xs font-mono text-white px-2 py-1 rounded-md"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.4)",
                    }}
                  >
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

              {/* Editable Fields */}
              <div className="space-y-3 sm:space-y-4 flex-grow">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">
                    {t("phase1.routeName")}
                  </label>
                  <input
                    type="text"
                    value={route.route_name}
                    onChange={(e) => {
                      e.stopPropagation();
                      onUpdateRoute(idx, { ...route, route_name: e.target.value });
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className={`w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 sm:py-2.5 text-base sm:text-lg font-bold text-white focus:border-[var(--brand-accent)]/50 focus:outline-none transition-colors ${isSelected ? accentColors[idx % 3] : ""}`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">
                    {t("phase1.headline")}
                  </label>
                  <textarea
                    value={route.headline}
                    onChange={(e) => {
                      e.stopPropagation();
                      onUpdateRoute(idx, { ...route, headline: e.target.value });
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className={`w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 sm:py-2.5 text-sm sm:text-base focus:border-[var(--brand-accent)]/50 focus:outline-none font-medium resize-none h-14 sm:h-16 ${isSelected ? "text-white" : "text-gray-300"}`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">
                    {t("phase1.subhead")}
                  </label>
                  <textarea
                    value={route.subhead}
                    onChange={(e) => {
                      e.stopPropagation();
                      onUpdateRoute(idx, { ...route, subhead: e.target.value });
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 sm:py-2.5 text-sm text-gray-300 focus:border-[var(--brand-accent)]/50 focus:outline-none resize-none h-14 sm:h-16"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">
                    {t("phase1.styleDescription")}
                  </label>
                  <textarea
                    value={route.style_brief}
                    onChange={(e) => {
                      e.stopPropagation();
                      onUpdateRoute(idx, { ...route, style_brief: e.target.value });
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 sm:py-2.5 text-sm text-gray-300 focus:border-[var(--brand-accent)]/50 focus:outline-none resize-none h-20 sm:h-24"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">
                    {t("phase1.targetAudience")}
                  </label>
                  <textarea
                    value={route.target_audience}
                    onChange={(e) => {
                      e.stopPropagation();
                      onUpdateRoute(idx, { ...route, target_audience: e.target.value });
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 sm:py-2.5 text-sm text-gray-300 focus:border-[var(--brand-accent)]/50 focus:outline-none resize-none h-16 sm:h-20"
                  />
                </div>

                {/* Supplement Field */}
                <div>
                  <label
                    className={`text-[10px] font-bold uppercase tracking-wider mb-1 block ${accentColors[idx % 3]}`}
                  >
                    {t("phase1.supplement")}
                  </label>
                  <textarea
                    value={routeSupplements[idx]}
                    onChange={(e) => {
                      e.stopPropagation();
                      onUpdateSupplement(idx, e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    placeholder={t("phase1.supplementPlaceholder")}
                    className={`w-full bg-gradient-to-br ${gradients[idx % 3]} border ${borderColors[idx % 3]} rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none resize-none h-14 sm:h-16`}
                  />
                </div>
              </div>

              {/* Hover glow effect */}
              <div
                className={`absolute inset-0 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br ${gradients[idx % 3]} blur-xl -z-10`}
              ></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
