"use client";

/**
 * 儲存圖層：合成 PNG → 存成 composited 資產 → 更新生成紀錄
 */
import type { Generation } from "@/lib/project/types";
import { addAsset, getAssetRecord, patchGeneration, persistLayerDoc } from "@/lib/project/store";
import { composeImage } from "./compose";
import { retargetDoc, cloneDocWithNewIds, type LayerDoc } from "./model";
import { createId } from "@/lib/project/types";

async function withAssetUrls<T>(ids: string[], fn: (urls: Map<string, string>) => Promise<T>): Promise<T> {
  const urls = new Map<string, string>();
  try {
    for (const id of new Set(ids)) {
      const asset = await getAssetRecord(id);
      if (asset) urls.set(id, URL.createObjectURL(asset.blob));
    }
    return await fn(urls);
  } finally {
    for (const url of urls.values()) URL.revokeObjectURL(url);
  }
}

export async function saveLayers(generation: Generation, doc: LayerDoc): Promise<void> {
  if (!generation.assetId) return;
  await persistLayerDoc(generation.id, doc);
  if (doc.layers.length === 0) {
    patchGeneration(generation.id, { compositeAssetId: undefined });
    return;
  }
  const imageIds = doc.layers.flatMap((l) => (l.type === "image" ? [l.assetId] : []));
  const blob = await withAssetUrls([generation.assetId, ...imageIds], (urls) =>
    composeImage(urls.get(generation.assetId!)!, doc, urls)
  );
  const compositeAssetId = await addAsset(blob, "composited", generation.projectId);
  patchGeneration(generation.id, { compositeAssetId });
}

/** 把同一份圖層套用到其他圖（依各自比例換算位置） */
export async function applyLayersTo(targets: Generation[], doc: LayerDoc): Promise<number> {
  let done = 0;
  for (const target of targets) {
    if (!target.assetId) continue;
    const asset = await getAssetRecord(target.assetId);
    if (!asset?.width || !asset.height) continue;
    const retargeted = retargetDoc(cloneDocWithNewIds(doc, createId), { width: asset.width, height: asset.height });
    await saveLayers(target, retargeted);
    done++;
  }
  return done;
}
