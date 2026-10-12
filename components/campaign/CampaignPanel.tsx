"use client";

import React, { useState } from "react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { Dropzone } from "@/components/ui/Dropzone";
import { Button } from "@/components/ui/Button";
import { OutputSettings } from "@/components/workbench/OutputSettings";
import { getImageModelSpec } from "@/lib/gemini/models";
import { PanelSection } from "@/components/workbench/PanelSection";
import { useAssetUpload } from "@/components/workbench/useAssetUpload";
import { updateProject, useWorkspace } from "@/lib/project/store";
import { useCampaignProgress } from "@/lib/workbench/progress";
import { FORMAT_IDS, type FormatId } from "@/lib/gemini/formats";
import { isPlanStale, type CampaignState, type CampaignStep } from "@/lib/project/types";
import type { MarketingRoute } from "@/types";
import {
  cancelCampaignRequest,
  hasUsableKey,
  runAnalyze,
  runCampaignImages,
  runPlan,
} from "@/lib/workbench/runner";

const STEPS: CampaignStep[] = ["input", "strategy", "suite"];

export function CampaignPanel({ onNeedKey }: { onNeedKey: () => void }) {
  const { t, locale } = useLocale();
  const campaign = useWorkspace((s) => s.project?.campaign);
  const upload = useAssetUpload();
  const [busy, setBusy] = useState<"analyze" | "plan" | null>(null);
  const progress = useCampaignProgress();
  const settings = useWorkspace((s) => s.project?.settings);
  if (!campaign) return null;
  const outputSummary = settings ? `${getImageModelSpec(settings.imageModel).shortLabel} · ${settings.imageSize}` : undefined;

  const set = (patch: Partial<CampaignState>) =>
    updateProject((p) => ({ ...p, campaign: { ...p.campaign, ...patch } }));

  const planStale = isPlanStale(campaign);
  const reachable = (step: CampaignStep) =>
    step === "input" || (step === "strategy" && Boolean(campaign.analysis)) || (step === "suite" && Boolean(campaign.plan) && !planStale);

  const guarded = async (kind: "analyze" | "plan", fn: () => Promise<boolean>) => {
    if (!hasUsableKey()) return onNeedKey();
    setBusy(kind);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const route = campaign.routes[campaign.activeRouteIndex];
  const updateRoute = (patch: Partial<MarketingRoute>) =>
    set({ routes: campaign.routes.map((r, i) => (i === campaign.activeRouteIndex ? { ...r, ...patch } : r)) });

  const toggleFormat = (id: FormatId) =>
    set({ formats: campaign.formats.includes(id) ? campaign.formats.filter((f) => f !== id) : [...campaign.formats, id] });

  return (
    <div className="flex h-full flex-col">
      <nav aria-label={t("campaign.steps")} className="grid shrink-0 grid-cols-3 border-b border-line">
        {STEPS.map((step, index) => (
          <button
            key={step}
            type="button"
            disabled={!reachable(step) || busy !== null}
            aria-current={campaign.step === step ? "step" : undefined}
            onClick={() => set({ step })}
            className={[
              "h-10 border-b-2 text-xs font-medium transition-colors disabled:opacity-40",
              campaign.step === step ? "border-accent text-fg" : "border-transparent text-fg-muted hover:text-fg",
            ].join(" ")}
          >
            <span className="mr-1 font-mono text-fg-subtle">{index + 1}</span>
            {t(`campaign.step.${step}`)}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {campaign.step === "input" && (
          <>
            <PanelSection title={t("campaign.productImages")}>
              <div className="grid grid-cols-2 gap-3">
                <Dropzone
                  label={t("campaign.product")}
                  required
                  assetId={campaign.productAssetId}
                  onFile={async (file) => {
                    // 換產品圖時清掉舊的分析結果，避免混用
                    await upload(file, "product", (p, id) => ({
                      ...p,
                      campaign: {
                        ...p.campaign,
                        productAssetId: id,
                        analysis: undefined,
                        routes: [],
                        plan: undefined,
                        planId: undefined,
                        planRouteIndex: undefined,
                        contentSets: [],
                      },
                    }));
                  }}
                  onClear={() => set({ productAssetId: undefined })}
                />
                <Dropzone
                  label={t("campaign.secondary")}
                  hint={t("common.optional")}
                  assetId={campaign.secondaryAssetId}
                  onFile={async (file) => {
                    await upload(file, "secondary", (p, id) => ({
                      ...p,
                      campaign: { ...p.campaign, secondaryAssetId: id },
                    }));
                  }}
                  onClear={() => set({ secondaryAssetId: undefined })}
                />
              </div>
            </PanelSection>
            <PanelSection title={t("campaign.brief")}>
              <div className="space-y-3">
                <div>
                  <label className="label" htmlFor="c-name">
                    {t("campaign.productName")}
                  </label>
                  <input
                    id="c-name"
                    className="control"
                    maxLength={200}
                    value={campaign.productName}
                    placeholder={t("campaign.productNamePlaceholder")}
                    onChange={(e) => set({ productName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="c-info">
                    {t("campaign.productInfo")}
                  </label>
                  <textarea
                    id="c-info"
                    className="control min-h-[72px] resize-y"
                    maxLength={4000}
                    value={campaign.productInfo}
                    placeholder={t("campaign.productInfoPlaceholder")}
                    onChange={(e) => set({ productInfo: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="c-url">
                    {t("campaign.productUrl")}
                  </label>
                  <input
                    id="c-url"
                    className="control"
                    type="url"
                    maxLength={500}
                    value={campaign.productUrl}
                    placeholder="https://"
                    onChange={(e) => set({ productUrl: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="c-ref">
                    {t("campaign.referenceCopy")}
                  </label>
                  <textarea
                    id="c-ref"
                    className="control min-h-[72px] resize-y"
                    maxLength={4000}
                    value={campaign.referenceCopy}
                    placeholder={t("campaign.referenceCopyPlaceholder")}
                    onChange={(e) => set({ referenceCopy: e.target.value })}
                  />
                </div>
              </div>
            </PanelSection>
            <PanelSection id="campaign-output" collapsible defaultOpen={false} title={t("output.title")} summary={outputSummary}>
              <OutputSettings showTextModel />
            </PanelSection>
          </>
        )}

        {campaign.step === "strategy" && route && (
          <>
            {planStale && (
              <p role="status" className="mx-4 mt-4 rounded-[var(--radius-control)] border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
                {t("campaign.planStale", { route: String.fromCharCode(65 + (campaign.planRouteIndex ?? 0)) })}
              </p>
            )}
            <PanelSection title={t("campaign.routes")}>
              <div role="radiogroup" aria-label={t("campaign.routes")} className="space-y-1.5">
                {campaign.routes.map((r, index) => (
                  <button
                    key={index}
                    type="button"
                    role="radio"
                    aria-checked={index === campaign.activeRouteIndex}
                    onClick={() => set({ activeRouteIndex: index })}
                    className={[
                      "w-full rounded-[var(--radius-control)] border px-3 py-2 text-left transition-colors",
                      index === campaign.activeRouteIndex
                        ? "border-accent bg-accent-soft"
                        : "border-line hover:border-line-strong",
                    ].join(" ")}
                  >
                    <span className="block font-mono text-[11px] text-fg-subtle">
                      {String.fromCharCode(65 + index)} · {r.route_name}
                    </span>
                    <span className="block text-xs">{r.headline}</span>
                  </button>
                ))}
              </div>
            </PanelSection>
            <PanelSection title={t("campaign.routeDetail")}>
              <div className="space-y-3">
                {(["headline", "subhead", "style_brief", "target_audience"] as const).map((field) => (
                  <div key={field}>
                    <label className="label" htmlFor={`route-${field}`}>
                      {t(`campaign.routeFields.${field}`)}
                    </label>
                    <textarea
                      id={`route-${field}`}
                      className="control min-h-[38px] resize-y"
                      rows={field === "style_brief" ? 3 : 1}
                      value={route[field]}
                      onChange={(e) => updateRoute({ [field]: e.target.value })}
                    />
                  </div>
                ))}
                <div>
                  <label className="label" htmlFor="route-supplement">
                    {t("campaign.supplement")}
                  </label>
                  <textarea
                    id="route-supplement"
                    className="control min-h-[56px] resize-y"
                    maxLength={2000}
                    placeholder={t("campaign.supplementPlaceholder")}
                    value={campaign.routeSupplements[campaign.activeRouteIndex] ?? ""}
                    onChange={(e) =>
                      set({
                        routeSupplements: campaign.routes.map((_, i) =>
                          i === campaign.activeRouteIndex ? e.target.value : campaign.routeSupplements[i] ?? ""
                        ),
                      })
                    }
                  />
                </div>
              </div>
            </PanelSection>
            <PanelSection title={t("campaign.formats")}>
              <div className="space-y-1">
                {FORMAT_IDS.map((id) => (
                  <label
                    key={id}
                    className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs hover:bg-raised"
                  >
                    <input
                      type="checkbox"
                      className="accent-[var(--accent)]"
                      checked={campaign.formats.includes(id)}
                      onChange={() => toggleFormat(id)}
                    />
                    <span className="w-24 font-mono text-fg-muted">{id.replace("-commercial", "")}</span>
                    <span>{t(`formats.${id}`)}</span>
                  </label>
                ))}
              </div>
            </PanelSection>
          </>
        )}

        {campaign.step === "suite" && (
          <PanelSection id="campaign-output" collapsible defaultOpen={false} title={t("output.title")} summary={outputSummary}>
            <OutputSettings />
          </PanelSection>
        )}
      </div>

      <div className="shrink-0 border-t border-line bg-panel p-3">
        {busy ? (
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 text-xs text-fg-muted" aria-live="polite">
              <Loader2 size={14} className="animate-spin" />
              <span className="truncate">
                {progress?.total && progress.done !== undefined
                  ? t(busy === "analyze" ? "progress.routes" : "progress.sets", {
                      done: progress.done,
                      total: progress.total,
                    })
                  : t(busy === "analyze" ? "campaign.analyzing" : "campaign.planning")}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                cancelCampaignRequest();
                setBusy(null);
              }}
            >
              {t("common.cancel")}
            </Button>
          </div>
        ) : campaign.step === "input" ? (
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!campaign.productAssetId}
            onClick={() => guarded("analyze", () => runAnalyze(locale))}
          >
            <Wand2 size={15} />
            {campaign.analysis ? t("campaign.reanalyze") : t("campaign.analyze")}
          </Button>
        ) : campaign.step === "strategy" ? (
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={campaign.formats.length === 0}
            onClick={() => guarded("plan", () => runPlan(locale))}
          >
            <Wand2 size={15} />
            {t("campaign.plan", { count: campaign.formats.length * 3 })}
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={campaign.contentSets.length === 0}
            onClick={() => {
              if (!hasUsableKey()) return onNeedKey();
              void runCampaignImages(campaign.contentSets);
            }}
          >
            <Sparkles size={15} />
            {t("campaign.generateAll", { count: campaign.contentSets.length })}
          </Button>
        )}
      </div>
    </div>
  );
}
