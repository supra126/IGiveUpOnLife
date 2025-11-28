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

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
        <h3 className="text-xl font-bold text-white serif">
          {t("phase1.title")}
        </h3>
        <span className="text-xs text-gray-500">
          {t("phase1.selectHint")}
        </span>
      </div>
      <div className="flex flex-col gap-6">
        {routes.map((route, idx) => (
          <div
            key={idx}
            className={`p-6 rounded-xl border transition-all duration-300 flex flex-col gap-4 ${
              activeRouteIndex === idx
                ? "bg-linear-to-br from-blue-600/20 to-indigo-600/20 border-blue-500 shadow-lg shadow-blue-900/30"
                : "bg-[#15151a] border-white/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <div
                className={`text-xs font-bold uppercase tracking-wider ${
                  activeRouteIndex === idx
                    ? "text-blue-400"
                    : "text-gray-500"
                }`}
              >
                {t("phase1.routeLabel")} {String.fromCharCode(65 + idx)}
              </div>
              <button
                onClick={() => onSelectRoute(idx)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                  activeRouteIndex === idx
                    ? "bg-blue-500 text-white"
                    : "bg-white/10 text-gray-400 hover:bg-white/20"
                }`}
              >
                {activeRouteIndex === idx ? t("phase1.selected") : t("phase1.select")}
              </button>
            </div>

            {/* Editable Fields */}
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">
                  {t("phase1.routeName")}
                </label>
                <input
                  type="text"
                  value={route.route_name}
                  onChange={(e) =>
                    onUpdateRoute(idx, { ...route, route_name: e.target.value })
                  }
                  className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">
                  {t("phase1.headline")}
                </label>
                <textarea
                  value={route.headline}
                  onChange={(e) =>
                    onUpdateRoute(idx, { ...route, headline: e.target.value })
                  }
                  className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-sm text-blue-200 focus:border-blue-500 focus:outline-none font-medium resize-none h-12"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">
                  {t("phase1.subhead")}
                </label>
                <textarea
                  value={route.subhead}
                  onChange={(e) =>
                    onUpdateRoute(idx, { ...route, subhead: e.target.value })
                  }
                  className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-gray-300 focus:border-blue-500 focus:outline-none resize-none h-12"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">
                  {t("phase1.styleDescription")}
                </label>
                <textarea
                  value={route.style_brief}
                  onChange={(e) =>
                    onUpdateRoute(idx, { ...route, style_brief: e.target.value })
                  }
                  className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-gray-300 focus:border-blue-500 focus:outline-none resize-none h-20"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">
                  {t("phase1.targetAudience")}
                </label>
                <textarea
                  value={route.target_audience}
                  onChange={(e) =>
                    onUpdateRoute(idx, { ...route, target_audience: e.target.value })
                  }
                  className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-gray-300 focus:border-blue-500 focus:outline-none resize-none h-16"
                />
              </div>

              {/* Supplement Field */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-1 block">
                  💡 {t("phase1.supplement")}
                </label>
                <textarea
                  value={routeSupplements[idx]}
                  onChange={(e) => onUpdateSupplement(idx, e.target.value)}
                  placeholder={t("phase1.supplementPlaceholder")}
                  className="w-full bg-blue-900/10 border border-blue-500/30 rounded px-2 py-2 text-xs text-gray-300 placeholder-gray-600 focus:border-blue-500 focus:outline-none resize-none h-16"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
