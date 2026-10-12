"use client";

/**
 * 以原圖解析度合成圖層，輸出 PNG
 */
import Konva from "konva";
import type { Layer, LayerDoc } from "./model";
import { toPixels } from "./model";
import { loadFontsFor } from "./fonts";

export function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = url;
  });
}

/** 建立 Konva 節點（編輯器預覽與匯出共用同一套計算） */
export function createNode(layer: Layer, size: { width: number; height: number }, images: Map<string, HTMLImageElement>): Konva.Shape | null {
  const px = toPixels(layer, size);
  if (layer.type === "text") {
    const node = new Konva.Text({
      x: px.cx,
      y: px.cy,
      width: px.width,
      text: layer.text,
      fontFamily: `"${layer.fontFamily}"`,
      fontStyle: String(layer.fontWeight),
      fontSize: px.fontSize,
      fill: layer.fill,
      align: layer.align,
      lineHeight: layer.lineHeight,
      letterSpacing: layer.letterSpacing * px.fontSize,
      rotation: layer.rotation,
      opacity: layer.opacity,
      wrap: "word",
      stroke: layer.stroke?.color,
      strokeWidth: layer.stroke ? layer.stroke.width * px.unit : 0,
      fillAfterStrokeEnabled: true,
      shadowColor: layer.shadow?.color,
      shadowBlur: layer.shadow ? layer.shadow.blur * px.unit : 0,
      shadowOffsetX: layer.shadow ? layer.shadow.offsetX * px.unit : 0,
      shadowOffsetY: layer.shadow ? layer.shadow.offsetY * px.unit : 0,
      shadowEnabled: Boolean(layer.shadow),
    });
    node.offsetX(px.width / 2);
    node.offsetY(node.height() / 2);
    return node;
  }
  const image = images.get(layer.assetId);
  if (!image) return null;
  const height = px.width * layer.aspect;
  return new Konva.Image({
    image,
    x: px.cx,
    y: px.cy,
    width: px.width,
    height,
    offsetX: px.width / 2,
    offsetY: height / 2,
    rotation: layer.rotation,
    opacity: layer.opacity,
  });
}

export async function composeImage(
  baseUrl: string,
  doc: LayerDoc,
  assetUrls: Map<string, string>
): Promise<Blob> {
  const base = await loadImageElement(baseUrl);
  const size = { width: base.naturalWidth, height: base.naturalHeight };

  await loadFontsFor(
    doc.layers.flatMap((l) => (l.type === "text" ? [{ family: l.fontFamily, weight: l.fontWeight, text: l.text }] : []))
  );

  const images = new Map<string, HTMLImageElement>();
  for (const layer of doc.layers) {
    if (layer.type === "image" && !images.has(layer.assetId)) {
      const url = assetUrls.get(layer.assetId);
      if (url) images.set(layer.assetId, await loadImageElement(url));
    }
  }

  const container = document.createElement("div");
  const stage = new Konva.Stage({ container, width: size.width, height: size.height });
  try {
    const konvaLayer = new Konva.Layer();
    stage.add(konvaLayer);
    konvaLayer.add(new Konva.Image({ image: base, width: size.width, height: size.height }));
    for (const layer of doc.layers) {
      const node = createNode(layer, size, images);
      if (node) konvaLayer.add(node);
    }
    konvaLayer.draw();
    const blob = (await stage.toBlob({ pixelRatio: 1, mimeType: "image/png" })) as Blob | null;
    if (!blob) throw new Error("Export failed");
    return blob;
  } finally {
    stage.destroy();
  }
}
