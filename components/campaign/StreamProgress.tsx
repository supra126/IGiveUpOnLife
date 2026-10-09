"use client";

import React, { useEffect, useState } from "react";
import { BrandMark } from "@/components/ui/BrandMark";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/contexts/LocaleContext";
import { useCampaignProgress } from "@/lib/workbench/progress";
import { cancelCampaignRequest, useCapabilities } from "@/lib/workbench/runner";

function useElapsed(startedAt: number | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);
  return startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
}

/** 分析 / 規劃時的即時進度：思考摘要、完成數、已收到字數 */
export function StreamProgress() {
  const { t, locale } = useLocale();
  const progress = useCampaignProgress();
  const capabilities = useCapabilities();
  const elapsed = useElapsed(progress?.startedAt);
  if (!progress) return null;

  const { kind, thoughts, chars, done, total } = progress;
  const percent = total && done !== undefined ? Math.round((done / total) * 100) : null;
  const latest = thoughts[thoughts.length - 1];
  const earlier = thoughts.slice(0, -1).reverse();
  const number = new Intl.NumberFormat(locale === "zh" ? "zh-TW" : "en");

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-lg" aria-live="polite">
        <div className="mb-4 flex items-center gap-3">
          <BrandMark size={28} className="animate-pulse text-accent" />
          <div>
            <h2 className="text-sm font-semibold">{t(kind === "analyze" ? "campaign.analyzing" : "campaign.planning")}</h2>
            <p className="font-mono text-[11px] text-fg-subtle">
              {t("progress.elapsed", { seconds: elapsed })}
              {chars > 0 && ` · ${t("progress.received", { chars: number.format(chars) })}`}
            </p>
          </div>
        </div>

        {percent !== null && (
          <div className="mb-5">
            <div className="mb-1.5 flex justify-between text-xs">
              <span className="text-fg-muted">
                {t(kind === "analyze" ? "progress.routes" : "progress.sets", { done: done ?? 0, total: total ?? 0 })}
              </span>
              <span className="font-mono text-fg-subtle">{percent}%</span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-sunken"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={done}
            >
              <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${percent}%` }} />
            </div>
          </div>
        )}

        <div className="rounded-[var(--radius-panel)] border border-line bg-panel p-4">
          <h3 className="section-title mb-2">{t("progress.thinking")}</h3>
          {latest ? (
            <>
              <p key={latest} className="animate-fade-in text-sm">
                {latest}
              </p>
              {earlier.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-line pt-3">
                  {earlier.map((thought, index) => (
                    <li key={`${index}-${thought}`} className="text-xs text-fg-subtle" style={{ opacity: 1 - index * 0.15 }}>
                      {thought}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-sm text-fg-subtle">{chars > 0 ? t("progress.writing") : t("progress.waiting")}</p>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-[11px] text-fg-subtle">
            {capabilities?.mode === "server" ? t("progress.cancelNoteServer") : t("progress.cancelNoteStatic")}
          </p>
          <Button size="sm" variant="secondary" onClick={cancelCampaignRequest}>
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}
