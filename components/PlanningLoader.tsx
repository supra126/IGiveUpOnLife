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
    <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-10 text-center animate-scale-in">
      {/* Pulse Ring Animation — slower orbit for planning */}
      <div className="relative w-32 h-32">
        {/* Outer orbit ring */}
        <div className="absolute inset-0 rounded-full border border-white/10 animate-pulse-ring" />
        <div className="absolute inset-2 rounded-full border border-white/15 animate-pulse-ring" style={{ animationDelay: "0.5s" }} />
        <div className="absolute inset-4 rounded-full border border-white/20 animate-pulse-ring" style={{ animationDelay: "1s" }} />

        {/* Orbiting dot — slower */}
        <div className="absolute inset-0 animate-orbit" style={{ animationDuration: "4s" }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2.5 h-2.5 rounded-full bg-blue-400/80 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
        </div>

        {/* Center logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src="/images/logo.svg"
            alt={t("alt.loading")}
            width={44}
            height={44}
            className="w-11 h-11 object-contain drop-shadow-[0_0_12px_rgba(59,130,246,0.4)]"
          />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl sm:text-3xl font-bold text-gradient-hero">
          {t("phase2.planningTitle")}
        </h2>
        <p className="text-gray-500 text-sm sm:text-base max-w-md mx-auto">
          {t("phase2.planningDescription")}
          <strong className="text-white font-semibold">&quot;{routeName}&quot;</strong>{" "}
          {t("phase2.planningDescription2")}
        </p>
      </div>
    </div>
  );
}
