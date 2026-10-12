"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Send, Type } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { useAssetUrl } from "@/lib/project/asset-url";
import { useWorkspace } from "@/lib/project/store";
import { getImageModelSpec } from "@/lib/gemini/models";
import type { Generation } from "@/lib/project/types";
import { downloadGeneration, hasUsableKey, runEdit } from "@/lib/workbench/runner";
import { ExtendMenu } from "./ExtendMenu";

interface Props {
  generationId: string | null;
  onSelect: (id: string | null) => void;
  onEditText?: (generation: Generation) => void;
  onNeedKey: () => void;
}

function Thumb({ generation, active, onClick }: { generation: Generation; active: boolean; onClick: () => void }) {
  const { t } = useLocale();
  const url = useAssetUrl(generation.compositeAssetId ?? generation.assetId);
  const busy = generation.status === "queued" || generation.status === "running";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active}
      aria-label={generation.prompt ?? t("viewer.original")}
      className={`relative size-14 shrink-0 overflow-hidden rounded-[var(--radius-control)] border checker ${
        active ? "border-accent ring-2 ring-accent-soft" : "border-line hover:border-line-strong"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- object URL */}
      {url && <img src={url} alt="" className="size-full object-cover" />}
      {busy && <span className="animate-shimmer absolute inset-0" />}
      {generation.status === "error" && <span className="absolute inset-0 bg-danger-soft" />}
    </button>
  );
}

/**
 * 大圖檢視 + 對話式修圖：每次修改都是一個新版本，可回到任一版本繼續修
 */
export function Viewer({ generationId, onSelect, onEditText, onNeedKey }: Props) {
  const { t } = useLocale();
  const generations = useWorkspace((s) => s.generations);
  const [instruction, setInstruction] = useState("");

  const current = generations.find((g) => g.id === generationId) ?? null;
  const url = useAssetUrl(current ? current.compositeAssetId ?? current.assetId : undefined);

  // 版本鏈：往上找到原圖，再列出它底下所有修圖版本
  const versions = useMemo(() => {
    if (!current) return [];
    const byId = new Map(generations.map((g) => [g.id, g]));
    let root = current;
    while (root.source === "edit" && root.parentId && byId.get(root.parentId)) root = byId.get(root.parentId)!;
    const result: Generation[] = [root];
    const queue = [root.id];
    while (queue.length) {
      const id = queue.shift()!;
      for (const child of generations) {
        if (child.source === "edit" && child.parentId === id) {
          result.push(child);
          queue.push(child.id);
        }
      }
    }
    return result;
  }, [current, generations]);

  // 與畫廊相同的順序（新到舊），修圖版本在版本列切換，不放進左右切換
  const sequence = useMemo(
    () => generations.filter((g) => g.source !== "edit").sort((a, b) => b.createdAt - a.createdAt),
    [generations]
  );
  const rootId = versions[0]?.id;
  const index = sequence.findIndex((g) => g.id === rootId);
  const prev = index > 0 ? sequence[index - 1] : undefined;
  const next = index >= 0 && index < sequence.length - 1 ? sequence[index + 1] : undefined;

  useEffect(() => {
    if (!current) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      // 輸入框有內容時方向鍵用來移動游標；空的時候拿來切換圖片
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        if (target.value) return;
      } else if (target?.tagName === "SELECT") return;
      if (event.key === "ArrowLeft" && prev) onSelect(prev.id);
      if (event.key === "ArrowRight" && next) onSelect(next.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, prev, next, onSelect]);

  if (!current) return null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const text = instruction.trim();
    if (!text || current.status !== "done") return;
    if (!hasUsableKey()) return onNeedKey();
    setInstruction("");
    void runEdit(current, text);
  };

  const [w, h] = current.aspectRatio.split(":").map(Number);

  return (
    <Dialog open onClose={() => onSelect(null)} title={t("viewer.title")} size="full">
      <div className="flex h-full min-h-0 flex-col lg:flex-row">
        <div className="relative flex min-h-[40vh] flex-1 items-center justify-center bg-sunken p-4 sm:px-14">
          {prev && (
            <Button
              variant="secondary"
              iconOnly
              className="absolute left-3 top-1/2 -translate-y-1/2"
              aria-label={t("viewer.prev")}
              title={`${t("viewer.prev")} (←)`}
              onClick={() => onSelect(prev.id)}
            >
              <ChevronLeft size={16} />
            </Button>
          )}
          {next && (
            <Button
              variant="secondary"
              iconOnly
              className="absolute right-3 top-1/2 -translate-y-1/2"
              aria-label={t("viewer.next")}
              title={`${t("viewer.next")} (→)`}
              onClick={() => onSelect(next.id)}
            >
              <ChevronRight size={16} />
            </Button>
          )}
          {url && current.status === "done" ? (
            // eslint-disable-next-line @next/next/no-img-element -- object URL
            <img
              src={url}
              alt={t("gallery.imageAlt", { ratio: current.aspectRatio })}
              className="max-h-full max-w-full object-contain shadow-lg"
            />
          ) : (
            <div
              className="relative flex max-h-full w-full max-w-md bg-panel items-center justify-center"
              style={{ aspectRatio: `${w} / ${h}` }}
            >
              <span className="animate-shimmer absolute inset-0" />
              <span className="relative text-xs text-fg-muted">
                {current.status === "error" ? t(`errors.${current.errorCode ?? "UNKNOWN"}`) : t("gallery.running")}
              </span>
            </div>
          )}
        </div>

        <aside className="flex w-full shrink-0 flex-col border-t border-line lg:w-80 lg:border-l lg:border-t-0">
          <div className="space-y-1 border-b border-line p-4 font-mono text-[11px] text-fg-muted">
            <div>
              {current.aspectRatio} · {current.imageSize} · {getImageModelSpec(current.model).label}
              {index >= 0 && <span className="float-right text-fg-subtle">{index + 1} / {sequence.length}</span>}
            </div>
            {current.similarity && <div>{t(`similar.levels.${current.similarity}`)}</div>}
          </div>

          <div className="border-b border-line p-4">
            <h3 className="section-title mb-2">{t("viewer.versions")}</h3>
            <div className="flex flex-wrap gap-2">
              {versions.map((g) => (
                <Thumb key={g.id} generation={g} active={g.id === current.id} onClick={() => onSelect(g.id)} />
              ))}
            </div>
            {current.source === "edit" && current.prompt && (
              <p className="mt-3 rounded-[var(--radius-control)] bg-raised px-2.5 py-2 text-xs text-fg-muted">
                “{current.prompt}”
              </p>
            )}
          </div>

          <form onSubmit={submit} className="border-b border-line p-4">
            <label className="section-title mb-2 block" htmlFor="edit-instruction">
              {t("viewer.edit")}
            </label>
            <textarea
              id="edit-instruction"
              data-autofocus
              className="control min-h-[84px] resize-y"
              maxLength={1000}
              placeholder={t("viewer.editPlaceholder")}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e);
              }}
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-fg-subtle">{t("viewer.editHint")}</span>
              <Button type="submit" size="sm" variant="primary" disabled={!instruction.trim() || current.status !== "done"}>
                <Send size={13} />
                {t("viewer.apply")}
              </Button>
            </div>
          </form>

          <div className="mt-auto flex flex-wrap gap-2 p-4">
            <Button size="md" variant="secondary" disabled={current.status !== "done"} onClick={() => downloadGeneration(current)}>
              <Download size={14} />
              {t("gallery.download")}
            </Button>
            {onEditText && current.status === "done" && (
              <Button size="md" variant="secondary" onClick={() => onEditText(current)}>
                <Type size={14} />
                {t("gallery.addText")}
              </Button>
            )}
            {current.status === "done" && <ExtendMenu generation={current} onNeedKey={onNeedKey} size="md" />}
          </div>
        </aside>
      </div>
    </Dialog>
  );
}
