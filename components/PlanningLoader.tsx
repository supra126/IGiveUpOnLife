"use client";

import React from "react";
import Image from "next/image";
import { useLocale } from "@/contexts/LocaleContext";

interface PlanningLoaderProps {
  routeName: string;
}

export function PlanningLoader({ routeName }: PlanningLoaderProps) {
  const { t } = useLocale();

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 space-y-8 text-center animate-scale-in">
      {/* Pulse Ring Animation */}
      <div className="relative w-28 h-28">
        {/* Outer orbit ring */}
        <div className="absolute inset-0 rounded-full border border-white/10 animate-pulse-ring" />
        <div className="absolute inset-2 rounded-full border border-white/15 animate-pulse-ring" style={{ animationDelay: "0.5s" }} />
        <div className="absolute inset-4 rounded-full border border-white/20 animate-pulse-ring" style={{ animationDelay: "1s" }} />

        {/* Orbiting dot */}
        <div className="absolute inset-0 animate-orbit" style={{ animationDuration: "4s" }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2.5 h-2.5 rounded-full bg-white/60 shadow-[0_0_10px_rgba(255,255,255,0.4)]" />
        </div>

        {/* Center logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src="/images/logo.svg"
            alt={t("alt.loading")}
            width={40}
            height={40}
            className="w-10 h-10 object-contain drop-shadow-[0_0_12px_rgba(139,92,246,0.4)]"
          />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {t("analyzing.title")}
        </h2>
        <p className="text-gray-400 text-sm">
          {t("phase2.planningDescription")}
          <strong className="text-white">&quot;{routeName}&quot;</strong>{" "}
          {t("phase2.planningDescription2")}
        </p>
      </div>
    </div>
  );
}
