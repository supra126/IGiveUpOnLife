/**
 * Image utility functions for handling base64 images
 */

// Gemini API supported image formats
const GEMINI_SUPPORTED_FORMATS = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];

// Formats that need conversion
const UNSUPPORTED_FORMATS = ["image/avif", "image/bmp", "image/tiff"];

/**
 * Check if the MIME type is supported by Gemini API
 */
export function isGeminiSupportedFormat(mimeType: string): boolean {
  return GEMINI_SUPPORTED_FORMATS.includes(mimeType.toLowerCase());
}

/**
 * Convert an image to a Gemini-compatible format using Canvas (client-side)
 * @param base64String - Base64 data URL string
 * @param targetFormat - Target format (default: image/webp for best compression)
 * @param quality - Output quality 0-1 (default: 0.92)
 * @returns Promise resolving to converted base64 data URL
 */
export async function convertToSupportedFormat(
  base64String: string,
  targetFormat: "image/png" | "image/jpeg" | "image/webp" = "image/webp",
  quality: number = 0.92
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        // Draw image to canvas
        ctx.drawImage(img, 0, 0);

        // Convert to target format
        const convertedDataUrl = canvas.toDataURL(targetFormat, quality);
        resolve(convertedDataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error("Failed to load image for conversion"));
    };

    img.src = base64String;
  });
}

/**
 * Ensure image is in a Gemini-compatible format, converting if necessary
 * This is the main function to use when processing user-uploaded images
 * @param base64String - Base64 data URL string
 * @returns Promise resolving to base64 data URL in a supported format
 */
export async function ensureGeminiCompatibleFormat(
  base64String: string
): Promise<string> {
  const parsed = parseBase64Image(base64String);

  if (!parsed) {
    throw new Error("Invalid image format");
  }

  // If already supported, return as-is
  if (isGeminiSupportedFormat(parsed.mimeType)) {
    return base64String;
  }

  // Convert unsupported formats to WebP (best compression/quality ratio)
  console.log(`Converting unsupported format ${parsed.mimeType} to WebP`);
  return convertToSupportedFormat(base64String, "image/webp", 0.92);
}

/**
 * Parse a base64 data URL and extract the data and MIME type
 * @param base64String - Base64 data URL string (e.g., "data:image/png;base64,...")
 * @returns Object with data and mimeType, or null if invalid
 */
export function parseBase64Image(
  base64String: string | null | undefined
): { data: string; mimeType: string } | null {
  if (!base64String) return null;

  const match = base64String.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (match) {
    return {
      mimeType: match[1],
      data: match[2],
    };
  }

  return null;
}

/**
 * Create an inline data part for Gemini API from a base64 image
 * @param base64String - Base64 data URL string
 * @returns InlineData part for Gemini API, or null if invalid
 */
export function createInlineDataPart(
  base64String: string | null | undefined
): { inlineData: { data: string; mimeType: string } } | null {
  const parsed = parseBase64Image(base64String);
  if (!parsed) return null;

  return {
    inlineData: {
      data: parsed.data,
      mimeType: parsed.mimeType,
    },
  };
}

/**
 * Normalize aspect ratio for API (1:1-commercial maps to 1:1)
 * @param aspectRatio - Image aspect ratio
 * @returns Normalized aspect ratio for API
 */
export function normalizeAspectRatio(
  aspectRatio: string | undefined
): "1:1" | "9:16" | "4:5" | "16:9" {
  switch (aspectRatio) {
    case "9:16":
      return "9:16";
    case "4:5":
      return "4:5";
    case "16:9":
      return "16:9";
    case "1:1":
    case "1:1-commercial":
    default:
      return "1:1";
  }
}

/**
 * 在新窗口中安全地打開圖片（支援 data URL）
 * 避免 "Not allowed to navigate top frame to data URL" 錯誤
 * @param imageUrl - 圖片 URL（支援 data URL 或普通 URL）
 * @param title - 圖片標題（選填）
 */
export function openImageInNewWindow(imageUrl: string, title?: string): void {
  const win = window.open("", "_blank");
  if (!win) {
    console.error("無法打開新窗口，可能被瀏覽器阻擋");
    return;
  }

  // 創建一個完整的 HTML 文件來顯示圖片（符合螢幕高度，可用瀏覽器放大鏡查看細節）
  win.document.open();
  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title || "圖片預覽"}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            background: #0a0a0f;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          img {
            display: block;
            max-height: 100vh;
            width: auto;
            object-fit: contain;
          }
        </style>
      </head>
      <body>
        <img src="${imageUrl}" alt="${title || "預覽圖片"}" />
      </body>
    </html>
  `);
  win.document.close();
}

/**
 * 下載圖片到本地
 * @param imageUrl - 圖片 URL（支援 data URL 或普通 URL）
 * @param filename - 檔案名稱
 */
export function downloadImage(imageUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = imageUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
