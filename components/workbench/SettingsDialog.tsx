"use client";

import React, { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { setPreference, usePreferences, type ThemePreference } from "@/lib/preferences";
import { useCapabilities } from "@/lib/workbench/runner";
import { getStorageInfo } from "@/lib/project/db";
import type { Locale } from "@/types";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, locale, setLocale } = useLocale();
  const prefs = usePreferences();
  const capabilities = useCapabilities();
  const [draftKey, setDraftKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [storage, setStorage] = useState<Awaited<ReturnType<typeof getStorageInfo>>>(null);

  useEffect(() => {
    if (!open) return;
    setDraftKey(prefs.apiKey);
    setShowKey(false);
    void getStorageInfo().then(setStorage);
    // 只在開啟時同步一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isStatic = capabilities?.mode === "static";
  const keyStatus = prefs.apiKey
    ? t("settings.keyStatusOwn")
    : capabilities?.hasServerKey
      ? t("settings.keyStatusServer")
      : t("settings.keyStatusNone");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("settings.title")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.close")}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setPreference("apiKey", draftKey.trim());
              onClose();
            }}
          >
            {t("common.save")}
          </Button>
        </>
      }
    >
      <div className="space-y-6 p-4">
        <section>
          <label className="label" htmlFor="api-key">
            {t("settings.apiKey")}
          </label>
          <div className="flex gap-2">
            <input
              id="api-key"
              data-autofocus
              className="control font-mono"
              type={showKey ? "text" : "password"}
              autoComplete="off"
              spellCheck={false}
              placeholder="AIza…"
              value={draftKey}
              onChange={(e) => setDraftKey(e.target.value)}
            />
            <Button
              iconOnly
              variant="secondary"
              aria-label={showKey ? t("settings.hideKey") : t("settings.showKey")}
              onClick={() => setShowKey((v) => !v)}
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </Button>
          </div>
          <p className="mt-2 text-xs text-fg-muted">{keyStatus}</p>
          <p className="mt-1 text-xs text-fg-subtle">
            {isStatic ? t("settings.keyHelpStatic") : t("settings.keyHelpServer")}{" "}
            <a
              className="text-accent underline-offset-2 hover:underline"
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
            >
              {t("settings.getKey")}
            </a>
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="label">{t("settings.theme")}</span>
            <Segmented<ThemePreference>
              label={t("settings.theme")}
              value={prefs.theme}
              onChange={(theme) => setPreference("theme", theme)}
              options={[
                { value: "light", label: t("settings.themeLight") },
                { value: "dark", label: t("settings.themeDark") },
                { value: "system", label: t("settings.themeSystem") },
              ]}
            />
          </div>
          <div>
            <span className="label">{t("settings.language")}</span>
            <Segmented<Locale>
              label={t("settings.language")}
              value={locale}
              onChange={setLocale}
              options={[
                { value: "zh", label: "繁體中文" },
                { value: "en", label: "English" },
              ]}
            />
          </div>
        </section>

        <section>
          <span className="label">{t("settings.concurrency")}</span>
          <Segmented<string>
            label={t("settings.concurrency")}
            value={String(prefs.concurrency)}
            onChange={(v) => setPreference("concurrency", Number(v))}
            options={["1", "2", "3", "4"].map((v) => ({ value: v, label: v }))}
          />
          <p className="mt-2 text-xs text-fg-subtle">{t("settings.concurrencyHelp")}</p>
        </section>

        <section>
          <span className="label">{t("settings.storage")}</span>
          <p className="text-xs text-fg-muted">
            {storage
              ? t("settings.storageUsage", { used: formatBytes(storage.usage), quota: formatBytes(storage.quota) })
              : t("settings.storageUnknown")}
          </p>
          <p className="mt-1 text-xs text-fg-subtle">{t("settings.storageHelp")}</p>
        </section>
      </div>
    </Dialog>
  );
}
