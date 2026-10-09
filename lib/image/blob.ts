/**
 * 圖片 Blob / data URL 轉換（瀏覽器端）
 */

export function dataUrlToBlob(dataUrl: string): Blob {
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) throw new Error("Invalid data URL");
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: match[1] });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

export async function getImageSize(blob: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(blob);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

const API_FRIENDLY = new Set(["image/png", "image/jpeg", "image/webp"]);

/**
 * 準備送給 API 的圖：長邊超過 maxEdge 或格式不支援時重新編碼，
 * 避免 4K 原圖讓 server action 超過 body 上限
 */
export async function prepareImageForApi(blob: Blob, maxEdge = 2048): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  const longest = Math.max(bitmap.width, bitmap.height);
  if (longest <= maxEdge && API_FRIENDLY.has(blob.type) && blob.size < 7_000_000) {
    bitmap.close();
    return blobToDataUrl(blob);
  }
  const scale = Math.min(1, maxEdge / longest);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  // 有透明度的 PNG 保持 PNG，其餘用 JPEG 節省體積
  const type = blob.type === "image/png" ? "image/png" : "image/jpeg";
  const out = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Encode failed"))), type, 0.92)
  );
  return blobToDataUrl(out);
}

export function extensionFor(mimeType: string): string {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
