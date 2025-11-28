import { describe, it, expect } from "vitest";
import {
  parseBase64Image,
  createInlineDataPart,
  normalizeAspectRatio,
  isGeminiSupportedFormat,
} from "../image-utils";

describe("parseBase64Image", () => {
  it("should parse valid base64 PNG data URL", () => {
    const input = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";
    const result = parseBase64Image(input);

    expect(result).toEqual({
      mimeType: "image/png",
      data: "iVBORw0KGgoAAAANSUhEUg==",
    });
  });

  it("should parse valid base64 JPEG data URL", () => {
    const input = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    const result = parseBase64Image(input);

    expect(result).toEqual({
      mimeType: "image/jpeg",
      data: "/9j/4AAQSkZJRg==",
    });
  });

  it("should parse base64 webp data URL", () => {
    const input = "data:image/webp;base64,UklGRlYAAABXRUJQ";
    const result = parseBase64Image(input);

    expect(result).toEqual({
      mimeType: "image/webp",
      data: "UklGRlYAAABXRUJQ",
    });
  });

  it("should parse base64 svg+xml data URL", () => {
    const input = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0=";
    const result = parseBase64Image(input);

    expect(result).toEqual({
      mimeType: "image/svg+xml",
      data: "PHN2ZyB4bWxucz0=",
    });
  });

  it("should return null for empty string", () => {
    expect(parseBase64Image("")).toBeNull();
  });

  it("should return null for null input", () => {
    expect(parseBase64Image(null)).toBeNull();
  });

  it("should return null for undefined input", () => {
    expect(parseBase64Image(undefined)).toBeNull();
  });

  it("should return null for invalid format without data: prefix", () => {
    expect(parseBase64Image("image/png;base64,abc123")).toBeNull();
  });

  it("should return null for non-image data URL", () => {
    expect(parseBase64Image("data:text/plain;base64,abc123")).toBeNull();
  });
});

describe("createInlineDataPart", () => {
  it("should create inline data part from valid base64 image", () => {
    const input = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";
    const result = createInlineDataPart(input);

    expect(result).toEqual({
      inlineData: {
        data: "iVBORw0KGgoAAAANSUhEUg==",
        mimeType: "image/png",
      },
    });
  });

  it("should return null for invalid input", () => {
    expect(createInlineDataPart("invalid")).toBeNull();
  });

  it("should return null for null input", () => {
    expect(createInlineDataPart(null)).toBeNull();
  });

  it("should return null for undefined input", () => {
    expect(createInlineDataPart(undefined)).toBeNull();
  });
});

describe("normalizeAspectRatio", () => {
  it("should return 1:1 for 1:1 input", () => {
    expect(normalizeAspectRatio("1:1")).toBe("1:1");
  });

  it("should return 1:1 for 1:1-commercial input", () => {
    expect(normalizeAspectRatio("1:1-commercial")).toBe("1:1");
  });

  it("should return 9:16 for 9:16 input", () => {
    expect(normalizeAspectRatio("9:16")).toBe("9:16");
  });

  it("should return 4:5 for 4:5 input", () => {
    expect(normalizeAspectRatio("4:5")).toBe("4:5");
  });

  it("should return 16:9 for 16:9 input", () => {
    expect(normalizeAspectRatio("16:9")).toBe("16:9");
  });

  it("should return 1:1 as default for undefined", () => {
    expect(normalizeAspectRatio(undefined)).toBe("1:1");
  });

  it("should return 1:1 as default for unknown ratio", () => {
    expect(normalizeAspectRatio("unknown")).toBe("1:1");
  });
});

describe("isGeminiSupportedFormat", () => {
  it("should return true for PNG", () => {
    expect(isGeminiSupportedFormat("image/png")).toBe(true);
  });

  it("should return true for JPEG", () => {
    expect(isGeminiSupportedFormat("image/jpeg")).toBe(true);
  });

  it("should return true for WebP", () => {
    expect(isGeminiSupportedFormat("image/webp")).toBe(true);
  });

  it("should return true for GIF", () => {
    expect(isGeminiSupportedFormat("image/gif")).toBe(true);
  });

  it("should return true for HEIC", () => {
    expect(isGeminiSupportedFormat("image/heic")).toBe(true);
  });

  it("should return true for HEIF", () => {
    expect(isGeminiSupportedFormat("image/heif")).toBe(true);
  });

  it("should return false for AVIF (unsupported)", () => {
    expect(isGeminiSupportedFormat("image/avif")).toBe(false);
  });

  it("should return false for BMP (unsupported)", () => {
    expect(isGeminiSupportedFormat("image/bmp")).toBe(false);
  });

  it("should return false for TIFF (unsupported)", () => {
    expect(isGeminiSupportedFormat("image/tiff")).toBe(false);
  });

  it("should be case-insensitive", () => {
    expect(isGeminiSupportedFormat("IMAGE/PNG")).toBe(true);
    expect(isGeminiSupportedFormat("Image/Jpeg")).toBe(true);
  });
});
