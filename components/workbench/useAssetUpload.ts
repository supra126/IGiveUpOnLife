"use client";

import { useCallback } from "react";
import { addAsset, getState, updateProjectById } from "@/lib/project/store";
import { normalizeUpload } from "@/lib/image/blob";
import type { AssetRole, Project } from "@/lib/project/types";
import { showToast } from "@/lib/workbench/toast";

/**
 * 上傳檔案 → 轉成可用格式 → 存進「開始上傳時」的專案，並用 apply 寫回該專案的欄位。
 * 轉檔（例如 HEIC）期間切換專案時，圖片仍歸原專案，不會跑進新開的專案。
 */
export function useAssetUpload() {
  return useCallback(
    async (file: File, role: AssetRole, apply: (project: Project, assetId: string) => Project): Promise<string | null> => {
      const projectId = getState().project?.id;
      if (!projectId) return null;
      try {
        const blob = await normalizeUpload(file);
        const assetId = await addAsset(blob, role, projectId);
        await updateProjectById(projectId, (project) => apply(project, assetId));
        return assetId;
      } catch {
        showToast("error", "upload.unsupported");
        return null;
      }
    },
    []
  );
}
