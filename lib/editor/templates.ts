/**
 * 版型範本：依畫布比例（直 / 方 / 橫）給不同的位置與字級
 */
import type { Layer, TextLayer } from "./model";
import { DEFAULT_FONT } from "./fonts";

export type TemplateId = "headline-top" | "bottom-band" | "center-statement" | "corner-caption";

export const TEMPLATE_IDS: TemplateId[] = ["headline-top", "bottom-band", "center-statement", "corner-caption"];

type Orientation = "portrait" | "square" | "landscape";

function orientation(aspect: number): Orientation {
  if (aspect < 0.9) return "portrait";
  if (aspect > 1.1) return "landscape";
  return "square";
}

function text(id: string, patch: Partial<TextLayer> & Pick<TextLayer, "text" | "x" | "y" | "width" | "fontSize">): TextLayer {
  return {
    id,
    type: "text",
    rotation: 0,
    opacity: 1,
    fontFamily: DEFAULT_FONT,
    fontWeight: 700,
    fill: "#ffffff",
    align: "center",
    lineHeight: 1.25,
    letterSpacing: 0,
    shadow: { color: "rgba(0,0,0,0.45)", blur: 0.012, offsetX: 0, offsetY: 0.004 },
    ...patch,
  };
}

/**
 * @param aspect 畫布寬 / 高
 * @param newId  產生圖層 id
 */
export function buildTemplate(
  id: TemplateId,
  aspect: number,
  content: { title: string; copy: string },
  newId: () => string
): Layer[] {
  const o = orientation(aspect);
  // 寬度相對短邊；橫圖短邊是高度，因此橫圖的寬度數值可以大於 1
  const fullWidth = o === "landscape" ? aspect * 0.86 : 0.86;

  switch (id) {
    case "headline-top":
      return [
        text(newId(), {
          text: content.title,
          x: 0.5,
          y: o === "portrait" ? 0.12 : 0.14,
          width: fullWidth,
          fontSize: o === "landscape" ? 0.1 : 0.085,
          fontWeight: 900,
        }),
        text(newId(), {
          text: content.copy,
          x: 0.5,
          y: o === "portrait" ? 0.19 : 0.25,
          width: fullWidth * 0.85,
          fontSize: o === "landscape" ? 0.045 : 0.038,
          fontWeight: 500,
        }),
      ];
    case "bottom-band":
      return [
        text(newId(), {
          text: content.title,
          x: o === "landscape" ? 0.3 : 0.5,
          y: o === "portrait" ? 0.8 : 0.74,
          width: o === "landscape" ? aspect * 0.5 : fullWidth,
          fontSize: o === "landscape" ? 0.09 : 0.075,
          fontWeight: 900,
          align: o === "landscape" ? "left" : "center",
        }),
        text(newId(), {
          text: content.copy,
          x: o === "landscape" ? 0.3 : 0.5,
          y: o === "portrait" ? 0.87 : 0.86,
          width: o === "landscape" ? aspect * 0.5 : fullWidth,
          fontSize: o === "landscape" ? 0.042 : 0.036,
          fontWeight: 400,
          align: o === "landscape" ? "left" : "center",
        }),
      ];
    case "center-statement":
      return [
        text(newId(), {
          text: content.title,
          x: 0.5,
          y: 0.5,
          width: fullWidth,
          fontSize: o === "landscape" ? 0.13 : 0.11,
          fontWeight: 900,
          stroke: { color: "#111111", width: 0.006 },
          shadow: undefined,
        }),
      ];
    case "corner-caption":
      return [
        text(newId(), {
          text: content.copy || content.title,
          x: o === "landscape" ? 1 - 0.25 : 0.72,
          y: 0.93,
          width: o === "landscape" ? aspect * 0.4 : 0.5,
          fontSize: 0.03,
          fontWeight: 500,
          align: "right",
        }),
      ];
  }
}
