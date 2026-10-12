import { describe, it, expect } from "vitest";
import { fromPixels, retargetDoc, toPixels, type TextLayer } from "./model";

const text: TextLayer = {
  id: "t",
  type: "text",
  x: 0.5,
  y: 0.1,
  width: 0.8,
  rotation: 0,
  opacity: 1,
  text: "標題",
  fontFamily: "Noto Sans TC",
  fontWeight: 700,
  fontSize: 0.08,
  fill: "#fff",
  align: "center",
  lineHeight: 1.2,
  letterSpacing: 0,
};

describe("圖層座標", () => {
  it("相對值與像素互轉", () => {
    const size = { width: 1000, height: 2000 };
    const px = toPixels(text, size);
    expect(px).toMatchObject({ cx: 500, cy: 200, width: 800, fontSize: 80 });
    const back = fromPixels(text, size, { ...px, rotation: 15 });
    expect(back).toMatchObject({ x: 0.5, y: 0.1, width: 0.8, rotation: 15 });
    expect((back as TextLayer).fontSize).toBeCloseTo(0.08);
  });

  it("從方圖套用到橫圖時，字級依短邊維持比例且不超出畫布", () => {
    const doc = { version: 1, layers: [{ ...text, x: 0.05 }], updatedAt: 0 };
    const out = retargetDoc(doc, { width: 1600, height: 900 });
    const px = toPixels(out.layers[0], { width: 1600, height: 900 });
    expect(px.fontSize).toBeCloseTo(72);
    expect(px.cx - px.width / 2).toBeGreaterThanOrEqual(0);
  });
});

describe("版型範本", async () => {
  const { buildTemplate, TEMPLATE_IDS } = await import("./templates");
  let n = 0;
  const id = () => `l${n++}`;

  it.each([
    ["直式", 4 / 5],
    ["方形", 1],
    ["橫式", 16 / 9],
  ])("%s：每個範本的文字都在畫布內", (_, aspect) => {
    const size = aspect >= 1 ? { width: 1000 * aspect, height: 1000 } : { width: 1000, height: 1000 / aspect };
    for (const template of TEMPLATE_IDS) {
      const layers = buildTemplate(template, aspect, { title: "標題", copy: "文案" }, id);
      expect(layers.length).toBeGreaterThan(0);
      for (const layer of layers) {
        const px = toPixels(layer, size);
        expect(px.cx - px.width / 2).toBeGreaterThanOrEqual(-1);
        expect(px.cx + px.width / 2).toBeLessThanOrEqual(size.width + 1);
        expect(layer.y).toBeGreaterThan(0);
        expect(layer.y).toBeLessThan(1);
      }
    }
  });
});
