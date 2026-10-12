"use client";

import React, { useMemo, useState } from "react";
import { ChevronRight, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/ui/BrandMark";
import { GalleryCard } from "@/components/workbench/GalleryCard";
import { Gallery } from "@/components/workbench/Gallery";
import { useWorkspace } from "@/lib/project/store";
import { useCampaignProgress } from "@/lib/workbench/progress";
import { StreamProgress } from "./StreamProgress";
import { isFromCurrentPlan, type Generation } from "@/lib/project/types";
import type { ContentSet } from "@/types";
import {
  hasUsableKey,
  retryGeneration,
  runCampaignImages,
  runRegeneratePrompt,
  updateContentSet,
} from "@/lib/workbench/runner";

interface BoardProps {
  onOpen: (g: Generation) => void;
  onEditText?: (g: Generation) => void;
  onNeedKey: () => void;
}

function ContentSetRow({
  set,
  generations,
  onOpen,
  onEditText,
  onNeedKey,
}: BoardProps & { set: ContentSet; generations: Generation[] }) {
  const { t, locale } = useLocale();
  const [showPrompt, setShowPrompt] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  return (
    <article className="grid gap-4 rounded-[var(--radius-panel)] border border-line bg-panel p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="space-y-2.5">
        <div className="font-mono text-[11px] text-fg-subtle">
          {set.ratio} · #{set.set_number}
        </div>
        <div>
          <label className="label" htmlFor={`${set.id}-title`}>
            {t("campaign.title")}
          </label>
          <input
            id={`${set.id}-title`}
            className="control font-medium"
            value={set.title}
            onChange={(e) => updateContentSet(set.id, { title: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor={`${set.id}-copy`}>
            {t("campaign.copy")}
          </label>
          <textarea
            id={`${set.id}-copy`}
            className="control min-h-[56px] resize-y"
            value={set.copy}
            onChange={(e) => updateContentSet(set.id, { copy: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor={`${set.id}-summary`}>
            {t("campaign.visualSummary")}
          </label>
          <textarea
            id={`${set.id}-summary`}
            className="control min-h-[56px] resize-y"
            value={set.visual_summary}
            onChange={(e) => updateContentSet(set.id, { visual_summary: e.target.value })}
          />
        </div>
        <div>
          <button
            type="button"
            aria-expanded={showPrompt}
            onClick={() => setShowPrompt((v) => !v)}
            className="flex items-center gap-1 text-xs text-fg-muted hover:text-fg"
          >
            <ChevronRight size={13} className={`transition-transform ${showPrompt ? "rotate-90" : ""}`} />
            {t("campaign.prompt")}
          </button>
          {showPrompt && (
            <div className="mt-2 space-y-2">
              <textarea
                aria-label={t("campaign.prompt")}
                className="control min-h-[120px] resize-y font-mono text-[11px]"
                value={set.visual_prompt_en}
                onChange={(e) => updateContentSet(set.id, { visual_prompt_en: e.target.value })}
              />
              <Button
                size="sm"
                variant="secondary"
                disabled={regenerating}
                onClick={async () => {
                  if (!hasUsableKey()) return onNeedKey();
                  setRegenerating(true);
                  await runRegeneratePrompt(set, locale);
                  setRegenerating(false);
                }}
              >
                {regenerating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                {t("campaign.regeneratePrompt")}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {generations.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] items-start gap-2">
            {generations.map((g) => (
              <GalleryCard
                key={g.id}
                generation={g}
                onOpen={onOpen}
                onEditText={onEditText}
                onRetry={(failed) => {
                  if (!hasUsableKey()) return onNeedKey();
                  void retryGeneration(failed);
                }}
                onNeedKey={onNeedKey}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-32 flex-1 bg-sunken items-center justify-center rounded-[var(--radius-panel)] border border-dashed border-line-strong text-xs text-fg-subtle">
            {t("campaign.noImageYet")}
          </div>
        )}
        <Button
          size="md"
          variant="secondary"
          className="self-start"
          onClick={() => {
            if (!hasUsableKey()) return onNeedKey();
            void runCampaignImages([set]);
          }}
        >
          <Sparkles size={13} />
          {generations.length ? t("campaign.generateAnother") : t("campaign.generateOne")}
        </Button>
      </div>
    </article>
  );
}

export function CampaignBoard(props: BoardProps) {
  const { t } = useLocale();
  const campaign = useWorkspace((s) => s.project?.campaign);
  const generations = useWorkspace((s) => s.generations);
  const progress = useCampaignProgress();

  // 只把這次規劃生的圖放進對應的內容組；先前規劃或沒有內容組的圖放到「其他圖片」
  const { bySet, others } = useMemo(() => {
    const map = new Map<string, Generation[]>();
    const rest: Generation[] = [];
    for (const g of generations) {
      if (campaign && isFromCurrentPlan(g, campaign)) map.set(g.contentSetId!, [...(map.get(g.contentSetId!) ?? []), g]);
      else rest.push(g);
    }
    return { bySet: map, others: rest };
  }, [generations, campaign]);

  if (!campaign) return null;

  if (progress) return <StreamProgress />;

  if (campaign.step === "suite" && campaign.contentSets.length > 0) {
    const groups = new Map<string, ContentSet[]>();
    for (const set of campaign.contentSets) groups.set(set.ratio, [...(groups.get(set.ratio) ?? []), set]);
    return (
      <div className="h-full overflow-y-auto p-4">
        <header className="mb-4">
          <h2 className="text-base font-semibold">{campaign.plan?.plan_name}</h2>
          <p className="text-xs text-fg-muted">
            {campaign.routes[campaign.planRouteIndex ?? campaign.activeRouteIndex]?.headline}
          </p>
        </header>
        <div className="space-y-8">
          {[...groups.entries()].map(([ratio, sets]) => (
            <section key={ratio}>
              <h3 className="section-title mb-3">
                {t(`formats.${ratio}`)} <span className="font-mono">{ratio}</span>
              </h3>
              <div className="space-y-3">
                {sets.map((set) => (
                  <ContentSetRow key={set.id} set={set} generations={bySet.get(set.id) ?? []} {...props} />
                ))}
              </div>
            </section>
          ))}
          {others.length > 0 && (
            <section>
              <h3 className="section-title mb-1">{t("campaign.otherImages")}</h3>
              <p className="mb-3 text-xs text-fg-muted">{t("campaign.otherImagesHint")}</p>
              <div className="h-[480px] overflow-hidden rounded-[var(--radius-panel)] border border-line">
                <Gallery generations={others} {...props} emptyTitle="" emptyBody="" />
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  if (campaign.analysis) {
    const a = campaign.analysis.product_analysis;
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <section>
            <h2 className="section-title mb-2">{t("campaign.analysis")}</h2>
            <h3 className="text-lg font-semibold">{a.name}</h3>
            <p className="mt-2 text-sm text-fg-muted">{a.visual_description}</p>
            <p className="mt-2 text-sm">{a.key_features}</p>
          </section>
          <section>
            <h2 className="section-title mb-2">{t("campaign.routes")}</h2>
            <div className="space-y-2">
              {campaign.routes.map((r, i) => (
                <div
                  key={i}
                  className={`rounded-[var(--radius-panel)] border p-3 ${
                    i === campaign.activeRouteIndex ? "border-accent" : "border-line"
                  }`}
                >
                  <div className="font-mono text-[11px] text-fg-subtle">
                    {String.fromCharCode(65 + i)} · {r.route_name}
                  </div>
                  <div className="mt-1 font-medium">{r.headline}</div>
                  <div className="text-sm text-fg-muted">{r.subhead}</div>
                  <div className="mt-2 text-xs text-fg-muted">{r.style_brief}</div>
                  <div className="mt-1 text-xs text-fg-subtle">{r.target_audience}</div>
                </div>
              ))}
            </div>
          </section>
          {others.length > 0 && (
            <Gallery generations={others} {...props} emptyTitle="" emptyBody="" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <BrandMark size={40} motion="float" className="text-fg-subtle" />
      <h2 className="text-base font-semibold">{t("campaign.emptyTitle")}</h2>
      <p className="max-w-sm text-sm text-fg-muted">{t("campaign.emptyBody")}</p>
    </div>
  );
}
