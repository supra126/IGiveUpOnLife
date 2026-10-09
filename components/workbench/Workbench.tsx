"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Images, LayoutList } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { BrandMark } from "@/components/ui/BrandMark";
import { SimilarPanel } from "@/components/similar/SimilarPanel";
import { CampaignPanel } from "@/components/campaign/CampaignPanel";
import { CampaignBoard } from "@/components/campaign/CampaignBoard";
import { initWorkspace, newProject, removeGeneration, useWorkspace } from "@/lib/project/store";
import type { Generation, ProjectKind } from "@/lib/project/types";
import { applyTheme, getPreferences, usePreferences } from "@/lib/preferences";
import { loadCapabilities, runSimilar } from "@/lib/workbench/runner";
import { showToast } from "@/lib/workbench/toast";
import { TopBar } from "./TopBar";
import { Gallery } from "./Gallery";
import { Viewer } from "./Viewer";
import { SettingsDialog } from "./SettingsDialog";
import { Toasts } from "./Toasts";

function Welcome({ onNew }: { onNew: (kind: ProjectKind) => void }) {
  const { t } = useLocale();
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <BrandMark size={36} className="mb-4" />
        <h1 className="text-xl font-semibold">{t("welcome.title")}</h1>
        <p className="mt-1 text-sm text-fg-muted">{t("welcome.subtitle")}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onNew("similar")}
            className="rounded-[var(--radius-panel)] border border-accent bg-accent-soft p-4 text-left transition-colors hover:brightness-105"
          >
            <span className="block text-sm font-semibold">{t("project.kind.similar")}</span>
            <span className="mt-1 block text-xs text-fg-muted">{t("welcome.similarDesc")}</span>
          </button>
          <button
            type="button"
            onClick={() => onNew("campaign")}
            className="rounded-[var(--radius-panel)] border border-line bg-panel p-4 text-left transition-colors hover:border-line-strong"
          >
            <span className="block text-sm font-semibold">{t("project.kind.campaign")}</span>
            <span className="mt-1 block text-xs text-fg-muted">{t("welcome.campaignDesc")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function Workbench() {
  const { t, locale } = useLocale();
  const ready = useWorkspace((s) => s.ready);
  const persistent = useWorkspace((s) => s.persistent);
  const project = useWorkspace((s) => s.project);
  const generations = useWorkspace((s) => s.generations);
  const prefs = usePreferences();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"setup" | "results">("setup");

  useEffect(() => {
    void initWorkspace();
    void loadCapabilities();
  }, []);

  // 跟隨系統主題
  useEffect(() => {
    applyTheme(prefs.theme);
    if (prefs.theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [prefs.theme]);

  useEffect(() => {
    if (!persistent) showToast("info", "toast.memoryMode", undefined, 10000);
  }, [persistent]);

  const onNeedKey = useCallback(() => {
    showToast("info", "toast.needKey");
    setSettingsOpen(true);
  }, []);

  const createNew = useCallback(
    (kind: ProjectKind) => {
      const p = getPreferences();
      const stamp = new Intl.DateTimeFormat(locale === "zh" ? "zh-TW" : "en", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date());
      void newProject(
        kind,
        { imageModel: p.imageModel, textModel: p.textModel, imageSize: p.imageSize, thinkingLevel: p.thinkingLevel },
        `${t(`project.kind.${kind}`)} ${stamp}`
      );
      setMobileTab("setup");
    },
    [locale, t]
  );

  const openGeneration = useCallback((g: Generation) => setViewerId(g.id), []);

  const retrySimilar = useCallback(
    (g: Generation) => {
      if (!project) return;
      void removeGeneration(g.id);
      void runSimilar(1);
    },
    [project]
  );

  if (!ready) {
    return (
      <div className="flex h-dvh items-center justify-center text-fg-subtle">
        <BrandMark size={32} className="animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      <TopBar onNew={createNew} onSettings={() => setSettingsOpen(true)} />

      {!project ? (
        <main className="min-h-0 flex-1">
          <Welcome onNew={createNew} />
        </main>
      ) : (
        <>
          <div className="flex shrink-0 border-b border-line lg:hidden" role="tablist">
            {(["setup", "results"] as const).map((tab) => (
              <button
                key={tab}
                role="tab"
                type="button"
                aria-selected={mobileTab === tab}
                onClick={() => setMobileTab(tab)}
                className={`flex h-10 flex-1 items-center justify-center gap-1.5 border-b-2 text-xs ${
                  mobileTab === tab ? "border-accent text-fg" : "border-transparent text-fg-muted"
                }`}
              >
                {tab === "setup" ? <LayoutList size={13} /> : <Images size={13} />}
                {t(`layout.${tab}`)}
              </button>
            ))}
          </div>
          <div className="flex min-h-0 flex-1">
            <aside
              className={`w-full shrink-0 border-r border-line bg-panel lg:block lg:w-[340px] ${
                mobileTab === "setup" ? "block" : "hidden"
              }`}
            >
              {project.kind === "similar" ? (
                <SimilarPanel onNeedKey={onNeedKey} />
              ) : (
                <CampaignPanel onNeedKey={onNeedKey} />
              )}
            </aside>
            <main className={`min-w-0 flex-1 lg:block ${mobileTab === "results" ? "block" : "hidden"}`}>
              {project.kind === "similar" ? (
                <Gallery
                  generations={generations}
                  onOpen={openGeneration}
                  onRetry={retrySimilar}
                  onNeedKey={onNeedKey}
                  emptyTitle={t("similar.emptyTitle")}
                  emptyBody={t("similar.emptyBody")}
                />
              ) : (
                <CampaignBoard onOpen={openGeneration} onNeedKey={onNeedKey} />
              )}
            </main>
          </div>
        </>
      )}

      <Viewer generationId={viewerId} onSelect={setViewerId} onNeedKey={onNeedKey} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <Toasts />
    </div>
  );
}
