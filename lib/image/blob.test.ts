import { describe, it, expect } from "vitest";
import { svgRasterSize } from "./blob";

describe("svgRasterSize", () => {
  it("小的 SVG 放大到最長邊 1024，保留比例", () => {
    expect(svgRasterSize(40, 20)).toEqual({ width: 1024, height: 512 });
    expect(svgRasterSize(20, 40)).toEqual({ width: 512, height: 1024 });
  });

  it("預設尺寸（只有 viewBox 時瀏覽器給 300x150）也保留比例", () => {
    expect(svgRasterSize(300, 150)).toEqual({ width: 1024, height: 512 });
  });

  it("大小合適的維持原尺寸", () => {
    expect(svgRasterSize(1500, 1000)).toEqual({ width: 1500, height: 1000 });
  });

  it("過大的縮到最長邊 2048", () => {
    expect(svgRasterSize(8000, 4000)).toEqual({ width: 2048, height: 1024 });
  });

  it("瀏覽器解不出尺寸（0x0）時退回 1024 方形，而不是產生空畫布", () => {
    expect(svgRasterSize(0, 0)).toEqual({ width: 1024, height: 1024 });
    expect(svgRasterSize(Number.NaN, 10)).toEqual({ width: 1024, height: 1024 });
  });

  it("極端長寬比不會產生 0 像素的邊", () => {
    const size = svgRasterSize(10000, 1);
    expect(size.width).toBe(2048);
    expect(size.height).toBeGreaterThanOrEqual(1);
  });
});
