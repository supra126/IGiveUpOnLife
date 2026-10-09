"use client";

/**
 * assetId → object URL，依引用計數共用並在沒人使用時 revoke
 */
import { useEffect, useState } from "react";
import { getAsset } from "./db";

interface Entry {
  url: string | null;
  refs: number;
  promise: Promise<string | null>;
}

const cache = new Map<string, Entry>();

function acquire(assetId: string): Entry {
  let entry = cache.get(assetId);
  if (!entry) {
    const created: Entry = { url: null, refs: 0, promise: Promise.resolve(null) };
    created.promise = getAsset(assetId).then((asset) => {
      if (!asset) return null;
      created.url = URL.createObjectURL(asset.blob);
      return created.url;
    });
    cache.set(assetId, created);
    entry = created;
  }
  entry.refs++;
  return entry;
}

function release(assetId: string): void {
  const entry = cache.get(assetId);
  if (!entry) return;
  entry.refs--;
  if (entry.refs > 0) return;
  // 稍微延後，避免 StrictMode 或快速重繪時反覆建立
  setTimeout(() => {
    const current = cache.get(assetId);
    if (current && current.refs <= 0) {
      if (current.url) URL.revokeObjectURL(current.url);
      cache.delete(assetId);
    }
  }, 2000);
}

export function useAssetUrl(assetId: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => (assetId ? cache.get(assetId)?.url ?? null : null));

  useEffect(() => {
    if (!assetId) {
      setUrl(null);
      return;
    }
    let active = true;
    const entry = acquire(assetId);
    if (entry.url) setUrl(entry.url);
    else entry.promise.then((value) => active && setUrl(value));
    return () => {
      active = false;
      release(assetId);
    };
  }, [assetId]);

  return url;
}
