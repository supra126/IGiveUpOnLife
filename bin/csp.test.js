// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildCsp } = require("./csp.js");

const directives = (csp) => Object.fromEntries(csp.split("; ").map((d) => [d.split(" ")[0], d.split(" ").slice(1)]));

describe("buildCsp", () => {
  it("connect-src 只允許自己與 Gemini API，金鑰才送不到其他網域", () => {
    expect(directives(buildCsp())["connect-src"]).toEqual(["'self'", "https://generativelanguage.googleapis.com"]);
  });

  it("允許編輯器從 Google Fonts 載入字型", () => {
    const d = directives(buildCsp());
    expect(d["style-src"]).toContain("https://fonts.googleapis.com");
    expect(d["font-src"]).toContain("https://fonts.gstatic.com");
  });

  it("鎖住嵌入、外掛與表單目標", () => {
    const d = directives(buildCsp());
    expect(d["frame-ancestors"]).toEqual(["'none'"]);
    expect(d["object-src"]).toEqual(["'none'"]);
    expect(d["base-uri"]).toEqual(["'self'"]);
    expect(d["form-action"]).toEqual(["'self'"]);
  });

  it("正式環境不給 unsafe-eval，開發環境才給（React Refresh 需要）", () => {
    expect(directives(buildCsp())["script-src"]).not.toContain("'unsafe-eval'");
    expect(directives(buildCsp({ dev: true }))["script-src"]).toContain("'unsafe-eval'");
  });
});
