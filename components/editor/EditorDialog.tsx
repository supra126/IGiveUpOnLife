"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { Dialog } from "@/components/ui/Dialog";
import type { Generation } from "@/lib/project/types";

// Konva 只在開啟編輯器時才下載，且不在伺服器端執行
const TextEditor = dynamic(() => import("./TextEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Loader2 size={20} className="animate-spin text-fg-subtle" />
    </div>
  ),
});

export function EditorDialog({ generation, onClose }: { generation: Generation | null; onClose: () => void }) {
  const { t } = useLocale();
  if (!generation) return null;
  return (
    <Dialog open onClose={onClose} title={t("editor.title")} size="full">
      <TextEditor generation={generation} onClose={onClose} />
    </Dialog>
  );
}
