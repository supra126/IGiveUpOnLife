"use client";

import { useCallback } from "react";
import { addAsset } from "@/lib/project/store";
import { normalizeUpload } from "@/lib/image/blob";
import type { AssetRole } from "@/lib/project/types";
import { showToast } from "@/lib/workbench/toast";

/** 上傳檔案 → 轉成可用格式 → 存進目前專案，回傳 assetId */
export function useAssetUpload() {
  return useCallback(async (file: File, role: AssetRole): Promise<string | null> => {
    try {
      const blob = await normalizeUpload(file);
      return await addAsset(blob, role);
    } catch {
      showToast("error", "upload.unsupported");
      return null;
    }
  }, []);
}
