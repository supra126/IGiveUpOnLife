"use client";

import React, { useEffect } from "react";
import { Minus, Plus, Sparkles } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { Dropzone } from "@/components/ui/Dropzone";
import { Segmented } from "@/components/ui/Segmented";
import { Button } from "@/components/ui/Button";
import { AspectRatioPicker } from "@/components/workbench/AspectRatioPicker";
import { OutputSettings } from "@/components/workbench/OutputSettings";
import { useAssetUpload } from "@/components/workbench/useAssetUpload";
import { PanelSection } from "@/components/workbench/PanelSection";
import { updateProject, useWorkspace } from "@/lib/project/store";
import { getImageModelSpec } from "@/lib/gemini/models";
import type { CopySpace, SimilarityLevel } from "@/lib/gemini/schemas";
import type { SimilarInputs } from "@/lib/project/types";
import { runSimilar, hasUsableKey } from "@/lib/workbench/runner";

const MAX_COUNT = 8;
const SHORTCUT_LABEL =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘↵" : "Ctrl↵";

export function SimilarPanel({ onNeedKey }: { onNeedKey: () => void }) {
  const { t } = useLocale();
  const similar = useWorkspace((s) => s.project?.similar);
  const imageModel = useWorkspace((s) => s.project?.settings.imageModel);
  const imageSize = useWorkspace((s) => s.project?.settings.imageSize);
  const upload = useAssetUpload();
  const canGenerate = Boolean(similar?.referenceAssetId && similar?.productAssetId);

  // ⌘/Ctrl + Enter 直接生成（在補充指示裡打完字也能用）
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey) || !canGenerate) return;
      if (document.querySelector("[role=dialog]")) return;
      event.preventDefault();
      if (!hasUsableKey()) onNeedKey();
      else void runSimilar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canGenerate, onNeedKey]);

  if (!similar) return null;

  const set = (patch: Partial<SimilarInputs>) =>
    updateProject((p) => ({ ...p, similar: { ...p.similar, ...patch } }));

  const setImage = async (file: File, key: "referenceAssetId" | "productAssetId" | "secondaryAssetId") => {
    const role = key === "referenceAssetId" ? "reference" : key === "productAssetId" ? "product" : "secondary";
    const id = await upload(file, role);
    if (id) set({ [key]: id });
  };

  const ready = Boolean(similar.referenceAssetId && similar.productAssetId);
  const spec = getImageModelSpec(imageModel);

  const generate = () => {
    if (!hasUsableKey()) {
      onNeedKey();
      return;
    }
    void runSimilar();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <PanelSection title={t("similar.images")}>
          <div className="grid grid-cols-2 gap-3">
            <Dropzone
              label={t("similar.reference")}
              hint={t("similar.referenceHint")}
              required
              assetId={similar.referenceAssetId}
              onFile={(file) => setImage(file, "referenceAssetId")}
              onClear={() => set({ referenceAssetId: undefined })}
            />
            <Dropzone
              label={t("similar.product")}
              hint={t("similar.productHint")}
              required
              assetId={similar.productAssetId}
              onFile={(file) => setImage(file, "productAssetId")}
              onClear={() => set({ productAssetId: undefined })}
            />
          </div>
          <Dropzone
            compact
            className="mt-3"
            label={t("similar.secondary")}
            hint={t("common.optional")}
            assetId={similar.secondaryAssetId}
            onFile={(file) => setImage(file, "secondaryAssetId")}
            onClear={() => set({ secondaryAssetId: undefined })}
          />
        </PanelSection>

        <PanelSection title={t("similar.similarity")}>
          <Segmented<SimilarityLevel>
            label={t("similar.similarity")}
            value={similar.similarity}
            onChange={(similarity) => set({ similarity })}
            options={(["low", "medium", "high"] as SimilarityLevel[]).map((level) => ({
              value: level,
              label: t(`similar.levels.${level}`),
            }))}
          />
          <p className="mt-2 text-xs text-fg-muted">{t(`similar.levelDesc.${similar.similarity}`)}</p>
        </PanelSection>

        <PanelSection title={t("similar.ratio")}>
          <AspectRatioPicker
            label={t("similar.ratio")}
            value={similar.aspectRatio}
            allowed={spec.aspectRatios}
            onChange={(aspectRatio) => set({ aspectRatio })}
          />
        </PanelSection>

        <PanelSection
          id="similar-direction"
          collapsible
          defaultOpen={false}
          title={t("similar.direction")}
          summary={
            [
              similar.instructions.trim() ? similar.instructions.trim() : null,
              similar.copySpace !== "none" ? t(`similar.copySpaceOptions.${similar.copySpace}`) : null,
            ]
              .filter(Boolean)
              .join(" · ") || t("similar.directionNone")
          }
        >
          <label className="label" htmlFor="similar-instructions">
            {t("similar.instructions")}
          </label>
          <textarea
            id="similar-instructions"
            className="control min-h-[72px] resize-y"
            maxLength={500}
            placeholder={t("similar.instructionsPlaceholder")}
            value={similar.instructions}
            onChange={(e) => set({ instructions: e.target.value })}
          />
          <label className="label mt-3" htmlFor="similar-copy-space">
            {t("similar.copySpace")}
          </label>
          <select
            id="similar-copy-space"
            className="control"
            value={similar.copySpace}
            onChange={(e) => set({ copySpace: e.target.value as CopySpace })}
          >
            {(["none", "top", "bottom", "left", "right"] as CopySpace[]).map((v) => (
              <option key={v} value={v}>
                {t(`similar.copySpaceOptions.${v}`)}
              </option>
            ))}
          </select>
        </PanelSection>

        <PanelSection
          id="similar-output"
          collapsible
          defaultOpen={false}
          title={t("output.title")}
          summary={`${spec.shortLabel} · ${imageSize ?? ""}`}
        >
          <OutputSettings />
        </PanelSection>
      </div>

      <div className="shrink-0 border-t border-line bg-panel p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-fg-muted">{t("similar.count")}</span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              iconOnly
              variant="ghost"
              aria-label={t("similar.decrease")}
              disabled={similar.count <= 1}
              onClick={() => set({ count: similar.count - 1 })}
            >
              <Minus size={14} />
            </Button>
            <span className="w-6 text-center font-mono text-sm" aria-live="polite">
              {similar.count}
            </span>
            <Button
              size="sm"
              iconOnly
              variant="ghost"
              aria-label={t("similar.increase")}
              disabled={similar.count >= MAX_COUNT}
              onClick={() => set({ count: similar.count + 1 })}
            >
              <Plus size={14} />
            </Button>
          </div>
        </div>
        <Button variant="primary" size="lg" className="w-full" disabled={!ready} onClick={generate}>
          <Sparkles size={15} />
          {t("similar.generate", { count: similar.count })}
          <kbd className="ml-1 hidden rounded border border-current/30 px-1 font-mono text-[11px] leading-4 opacity-70 sm:inline">
            {SHORTCUT_LABEL}
          </kbd>
        </Button>
        <p className="mt-2 text-center text-xs text-fg-subtle">
          {ready ? t("similar.readyHint") : t("similar.notReadyHint")}
        </p>
      </div>
    </div>
  );
}
