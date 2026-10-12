/**
 * 文字 / Logo 圖層的資料模型（純函式，與畫布實作無關）
 *
 * 座標全部是相對值，套用到不同比例的圖時直接換算：
 * - x / y：圖層中心點，相對畫布寬 / 高（0–1）
 * - width、fontSize、陰影與描邊：相對畫布「短邊」，換比例時字級不會忽大忽小
 */

export const LAYER_DOC_VERSION = 1;

interface LayerBase {
  id: string;
  x: number;
  y: number;
  /** 寬度，相對畫布短邊 */
  width: number;
  rotation: number;
  opacity: number;
}

export interface TextShadow {
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export interface TextLayer extends LayerBase {
  type: "text";
  text: string;
  fontFamily: string;
  fontWeight: number;
  /** 字級，相對畫布短邊 */
  fontSize: number;
  fill: string;
  align: "left" | "center" | "right";
  lineHeight: number;
  /** 字距（em） */
  letterSpacing: number;
  stroke?: { color: string; width: number };
  shadow?: TextShadow;
}

export interface ImageLayer extends LayerBase {
  type: "image";
  assetId: string;
  /** 高 / 寬 */
  aspect: number;
}

export type Layer = TextLayer | ImageLayer;

export interface LayerDoc {
  version: number;
  layers: Layer[];
  updatedAt: number;
}

export function emptyDoc(): LayerDoc {
  return { version: LAYER_DOC_VERSION, layers: [], updatedAt: Date.now() };
}

export interface CanvasSize {
  width: number;
  height: number;
}

export function minSide(size: CanvasSize): number {
  return Math.min(size.width, size.height);
}

/** 相對值 → 像素（用於畫布繪製與匯出） */
export function toPixels(layer: Layer, size: CanvasSize) {
  const unit = minSide(size);
  return {
    cx: layer.x * size.width,
    cy: layer.y * size.height,
    width: layer.width * unit,
    fontSize: layer.type === "text" ? layer.fontSize * unit : 0,
    unit,
  };
}

/** 像素 → 相對值（拖曳 / 縮放後寫回） */
export function fromPixels(
  layer: Layer,
  size: CanvasSize,
  px: { cx: number; cy: number; width: number; fontSize?: number; rotation: number }
): Layer {
  const unit = minSide(size);
  const next = {
    ...layer,
    x: px.cx / size.width,
    y: px.cy / size.height,
    width: px.width / unit,
    rotation: px.rotation,
  };
  if (next.type === "text" && px.fontSize !== undefined) next.fontSize = px.fontSize / unit;
  return next;
}

/**
 * 套用到另一個比例：中心點維持相對位置，並把圖層拉回畫布內
 */
export function retargetDoc(doc: LayerDoc, target: CanvasSize): LayerDoc {
  const unit = minSide(target);
  const layers = doc.layers.map((layer) => {
    const halfW = Math.min((layer.width * unit) / 2 / target.width, 0.5);
    return {
      ...layer,
      id: layer.id,
      x: clamp(layer.x, halfW, 1 - halfW),
      y: clamp(layer.y, 0.02, 0.98),
    };
  });
  return { version: LAYER_DOC_VERSION, layers, updatedAt: Date.now() };
}

export function cloneDocWithNewIds(doc: LayerDoc, newId: () => string): LayerDoc {
  return { ...doc, layers: doc.layers.map((l) => ({ ...l, id: newId() })), updatedAt: Date.now() };
}

function clamp(value: number, min: number, max: number): number {
  if (min > max) return 0.5;
  return Math.min(Math.max(value, min), max);
}
