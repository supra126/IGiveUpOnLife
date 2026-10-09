"use client";

import React from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { Segmented } from "@/components/ui/Segmented";
import {
  IMAGE_MODELS,
  TEXT_MODELS,
  getImageModelSpec,
  clampImageOptions,
  type ImageSize,
  type ThinkingLevelName,
} from "@/lib/gemini/models";
import { updateProject, useWorkspace } from "@/lib/project/store";
import { setPreference } from "@/lib/preferences";
import { useCapabilities } from "@/lib/workbench/runner";
import { usePreferences } from "@/lib/preferences";
import type { ProjectSettings } from "@/lib/project/types";

/**
 * 模型與輸出設定：選項依模型註冊表動態過濾；
 * 變更同時存進專案與偏好（新專案沿用）
 */
export function OutputSettings({ showTextModel = false }: { showTextModel?: boolean }) {
  const { t } = useLocale();
  const settings = useWorkspace((s) => s.project?.settings);
  const capabilities = useCapabilities();
  const prefs = usePreferences();
  if (!settings) return null;

  // 用伺服器金鑰時套用伺服器白名單
  const usingServerKey = !prefs.apiKey && capabilities?.mode === "server";
  const allowedImage = usingServerKey ? capabilities?.allowedImageModels : null;
  const allowedText = usingServerKey ? capabilities?.allowedTextModels : null;

  const spec = getImageModelSpec(settings.imageModel);

  const update = (patch: Partial<ProjectSettings>) => {
    const next = { ...settings, ...patch };
    const clamped = clampImageOptions(getImageModelSpec(next.imageModel), {
      size: next.imageSize,
      thinkingLevel: next.thinkingLevel,
    });
    const final = { ...next, imageSize: clamped.size, thinkingLevel: clamped.thinkingLevel };
    updateProject((p) => ({ ...p, settings: final }));
    setPreference("imageModel", final.imageModel);
    setPreference("textModel", final.textModel);
    setPreference("imageSize", final.imageSize);
    setPreference("thinkingLevel", final.thinkingLevel);
  };

  const imageModels = IMAGE_MODELS.filter((m) => !allowedImage || allowedImage.includes(m.id));
  const textModels = TEXT_MODELS.filter((m) => !allowedText || allowedText.includes(m.id));

  return (
    <div className="space-y-3">
      <div>
        <label className="label" htmlFor="image-model">
          {t("output.imageModel")}
        </label>
        <select
          id="image-model"
          className="control"
          value={settings.imageModel}
          onChange={(e) => update({ imageModel: e.target.value })}
        >
          {imageModels.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} — {t(`models.${m.descKey}`)}
            </option>
          ))}
          {!imageModels.some((m) => m.id === settings.imageModel) && (
            <option value={settings.imageModel}>{settings.imageModel}</option>
          )}
        </select>
      </div>

      <div>
        <span className="label">{t("output.size")}</span>
        <Segmented<ImageSize>
          label={t("output.size")}
          value={settings.imageSize}
          onChange={(imageSize) => update({ imageSize })}
          options={(["1K", "2K", "4K"] as ImageSize[]).map((size) => ({
            value: size,
            label: <span className="font-mono">{size}</span>,
            disabled: !spec.sizes.includes(size),
            title: !spec.sizes.includes(size) ? t("output.sizeUnsupported") : undefined,
          }))}
        />
      </div>

      {spec.thinkingLevels && (
        <div>
          <span className="label">{t("output.thinking")}</span>
          <Segmented<ThinkingLevelName | "auto">
            label={t("output.thinking")}
            size="sm"
            value={settings.thinkingLevel ?? "auto"}
            onChange={(value) => update({ thinkingLevel: value === "auto" ? undefined : value })}
            options={[
              { value: "auto", label: t("output.thinkingAuto") },
              ...spec.thinkingLevels.map((level) => ({ value: level, label: t(`output.thinkingLevels.${level}`) })),
            ]}
          />
        </div>
      )}

      {showTextModel && (
        <div>
          <label className="label" htmlFor="text-model">
            {t("output.textModel")}
          </label>
          <select
            id="text-model"
            className="control"
            value={settings.textModel}
            onChange={(e) => update({ textModel: e.target.value })}
          >
            {textModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
                {m.stability === "preview" ? ` (${t("models.preview")})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
