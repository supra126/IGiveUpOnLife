"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, CodeXml, Moon, Plus, Settings, Square, Sun, Trash } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/ui/BrandMark";
import { useAssetUrl } from "@/lib/project/asset-url";
import { deleteProject, openProject, updateProject, useWorkspace } from "@/lib/project/store";
import type { ProjectKind, ProjectSummary } from "@/lib/project/types";
import { cancelAll, usePendingCount } from "@/lib/workbench/runner";
import { setPreference, usePreferences } from "@/lib/preferences";

function ProjectThumb({ summary }: { summary: ProjectSummary }) {
  const url = useAssetUrl(summary.coverAssetId);
  return (
    <span className="checker size-8 shrink-0 overflow-hidden rounded border border-line">
      {/* eslint-disable-next-line @next/next/no-img-element -- object URL */}
      {url && <img src={url} alt="" className="size-full object-cover" />}
    </span>
  );
}

function ProjectMenu({ onNew }: { onNew: (kind: ProjectKind) => void }) {
  const { t, locale } = useLocale();
  const projects = useWorkspace((s) => s.projects);
  const project = useWorkspace((s) => s.project);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const date = new Intl.DateTimeFormat(locale === "zh" ? "zh-TW" : "en", { month: "numeric", day: "numeric" });

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 max-w-[44vw] items-center gap-1.5 rounded-[var(--radius-control)] px-2 text-sm hover:bg-raised sm:max-w-xs"
      >
        <span className="truncate">{project?.name || t("project.untitled")}</span>
        <ChevronDown size={14} className="shrink-0 text-fg-subtle" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-30 mt-1 w-80 overflow-hidden rounded-[var(--radius-panel)] border border-line bg-panel shadow-xl"
        >
          <div className="grid grid-cols-2 gap-1 border-b border-line p-1">
            <button
              role="menuitem"
              type="button"
              className="flex items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs hover:bg-raised"
              onClick={() => {
                setOpen(false);
                onNew("similar");
              }}
            >
              <Plus size={13} /> {t("project.newSimilar")}
            </button>
            <button
              role="menuitem"
              type="button"
              className="flex items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs hover:bg-raised"
              onClick={() => {
                setOpen(false);
                onNew("campaign");
              }}
            >
              <Plus size={13} /> {t("project.newCampaign")}
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto p-1">
            {projects.length === 0 && <li className="px-2 py-3 text-xs text-fg-subtle">{t("project.none")}</li>}
            {projects.map((p) => (
              <li key={p.id} className="group flex items-center gap-1">
                <button
                  role="menuitem"
                  type="button"
                  aria-current={p.id === project?.id}
                  onClick={() => {
                    setOpen(false);
                    void openProject(p.id);
                  }}
                  className={`flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-raised ${
                    p.id === project?.id ? "bg-raised" : ""
                  }`}
                >
                  <ProjectThumb summary={p} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs">{p.name || t("project.untitled")}</span>
                    <span className="block font-mono text-[10px] text-fg-subtle">
                      {t(`project.kind.${p.kind}`)} · {date.format(p.updatedAt)}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={t("project.delete", { name: p.name || t("project.untitled") })}
                  className="grid size-7 place-items-center rounded text-fg-subtle opacity-0 hover:bg-danger-soft hover:text-danger focus:opacity-100 group-hover:opacity-100"
                  onClick={() => {
                    if (window.confirm(t("project.deleteConfirm"))) void deleteProject(p.id);
                  }}
                >
                  <Trash size={13} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function TopBar({ onNew, onSettings }: { onNew: (kind: ProjectKind) => void; onSettings: () => void }) {
  const { t } = useLocale();
  const project = useWorkspace((s) => s.project);
  const pending = usePendingCount();
  const prefs = usePreferences();
  const [editingName, setEditingName] = useState(false);

  const isDark = typeof document !== "undefined" && document.documentElement.dataset.theme === "dark";

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-panel px-3">
      <div className="flex items-center gap-2 pr-2">
        <BrandMark size={22} />
        <span className="hidden text-sm font-semibold sm:inline">{t("common.appName")}</span>
      </div>
      <span className="h-5 w-px bg-line" aria-hidden="true" />

      {project && editingName ? (
        <input
          autoFocus
          aria-label={t("project.rename")}
          className="control h-8 max-w-xs"
          defaultValue={project.name}
          onBlur={(e) => {
            const name = e.target.value.trim();
            updateProject((p) => ({ ...p, name }));
            setEditingName(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setEditingName(false);
          }}
        />
      ) : (
        <div className="flex min-w-0 items-center" onDoubleClick={() => project && setEditingName(true)}>
          <ProjectMenu onNew={onNew} />
        </div>
      )}
      {project && (
        <span className="hidden rounded border border-line px-1.5 py-0.5 text-[10px] text-fg-muted md:inline">
          {t(`project.kind.${project.kind}`)}
        </span>
      )}

      <div className="ml-auto flex items-center gap-1">
        {pending > 0 && (
          <div className="mr-1 flex items-center gap-2 rounded-[var(--radius-control)] bg-accent-soft px-2 py-1">
            <span className="text-xs" aria-live="polite">
              {t("queue.pending", { count: pending })}
            </span>
            <button
              type="button"
              onClick={cancelAll}
              className="flex items-center gap-1 text-xs text-fg-muted hover:text-danger"
              title={t("queue.cancelHint")}
            >
              <Square size={11} /> {t("queue.cancel")}
            </button>
          </div>
        )}
        <Button
          iconOnly
          variant="ghost"
          aria-label={t("settings.toggleTheme")}
          title={t("settings.toggleTheme")}
          onClick={() => setPreference("theme", isDark ? "light" : "dark")}
        >
          {prefs.theme === "light" || (!isDark && prefs.theme === "system") ? <Moon size={15} /> : <Sun size={15} />}
        </Button>
        <a
          href="https://github.com/supra126/IGiveUpOnLife"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub"
          className="hidden size-8 place-items-center rounded-[var(--radius-control)] text-fg-muted hover:bg-raised hover:text-fg sm:grid"
        >
          <CodeXml size={15} />
        </a>
        <Button variant="ghost" onClick={onSettings} aria-label={t("settings.title")}>
          <Settings size={15} />
          <span className="hidden sm:inline">{t("settings.title")}</span>
        </Button>
      </div>
    </header>
  );
}
