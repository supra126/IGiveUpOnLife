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
 * 每張圖送出前的位元組上限。base64 會膨脹約 4/3，一次請求最多約 4 張圖
 * （相似圖：參考＋產品＋副產品；修圖：最近幾輪歷史），
 * 3MB × 4/3 × 4 ≈ 16MB，留在 server action 20MB 上限之內
 */
export const MAX_API_IMAGE_BYTES = 3_000_000;

async function encode(bitmap: ImageBitmap, scale: number, type: string, quality: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Encode failed"))), type, quality)
  );
}

/**
 * 準備送給 API 的圖：長邊超過 maxEdge、格式不支援或超過大小上限時重新編碼，
 * 編碼後仍超過上限就逐步降低品質與尺寸，避免整個請求超過 body 上限
 */
export async function prepareImageForApi(
  blob: Blob,
  maxEdge = 2048,
  maxBytes = MAX_API_IMAGE_BYTES
): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest <= maxEdge && API_FRIENDLY.has(blob.type) && blob.size <= maxBytes) {
      return await blobToDataUrl(blob);
    }
    const baseScale = Math.min(1, maxEdge / longest);
    // PNG 先保持 PNG（可能有透明度），太大再改 WebP（保留透明度且小很多）；其餘用 JPEG
    const attempts: Array<[scale: number, type: string, quality: number]> =
      blob.type === "image/png"
        ? [
            [1, "image/png", 1],
            [1, "image/webp", 0.9],
            [1, "image/webp", 0.8],
            [0.75, "image/webp", 0.8],
            [0.5, "image/webp", 0.8],
          ]
        : [
            [1, "image/jpeg", 0.92],
            [1, "image/jpeg", 0.82],
            [0.75, "image/jpeg", 0.82],
            [0.5, "image/jpeg", 0.8],
          ];
    let out: Blob | undefined;
    for (const [scale, type, quality] of attempts) {
      out = await encode(bitmap, baseScale * scale, type, quality);
      if (out.size <= maxBytes) break;
    }
    return await blobToDataUrl(out!);
  } finally {
    bitmap.close();
  }
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

const SVG_MIN_EDGE = 1024;
const SVG_MAX_EDGE = 2048;

/** SVG 轉成點陣圖時的尺寸：最長邊落在 1024–2048，保留比例；解不出尺寸時退回方形 */
export function svgRasterSize(width: number, height: number): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) return { width: SVG_MIN_EDGE, height: SVG_MIN_EDGE };
  const longest = Math.max(width, height);
  const scale = longest < SVG_MIN_EDGE ? SVG_MIN_EDGE / longest : longest > SVG_MAX_EDGE ? SVG_MAX_EDGE / longest : 1;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * Chrome 的 createImageBitmap 不支援 SVG Blob，改用 <img> 解碼再畫到 canvas。
 * <img> 載入的 SVG 不會執行腳本，也不會載入外部資源
 */
async function rasterizeSvg(file: Blob): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("SVG decode failed"));
      el.src = url;
    });
    const { width, height } = svgRasterSize(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(img, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Encode failed"))), "image/png")
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * 上傳的圖統一轉成瀏覽器與 Gemini 都能處理的格式（AVIF、HEIC、SVG 等轉 PNG），
 * 無法解碼時丟出錯誤
 */
export async function normalizeUpload(file: Blob): Promise<Blob> {
  if (API_FRIENDLY.has(file.type)) return file;
  if (file.type === "image/svg+xml") return rasterizeSvg(file);
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Encode failed"))), "image/png")
  );
}
