// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createStaticServer, resolveRequestPath } = require("./server.js");

let root;
let server;
let base;

beforeAll(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "igiveup-dist-"));
  fs.mkdirSync(path.join(root, "_next", "static"), { recursive: true });
  fs.writeFileSync(path.join(root, "index.html"), "<p>home</p>");
  fs.writeFileSync(path.join(root, "404.html"), "<p>missing</p>");
  fs.writeFileSync(path.join(root, "_next", "static", "app.js"), "console.log(1)");
  // 與 dist 同名開頭的相鄰目錄，舊版 startsWith 檢查會誤放行
  fs.mkdirSync(`${root}2`, { recursive: true });
  fs.writeFileSync(path.join(`${root}2`, "secret.txt"), "secret");

  server = createStaticServer(root);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(`${root}2`, { recursive: true, force: true });
});

describe("靜態伺服器", () => {
  it("首頁與靜態資源", async () => {
    const home = await fetch(`${base}/`);
    expect(home.status).toBe(200);
    expect(await home.text()).toContain("home");
    expect(home.headers.get("x-content-type-options")).toBe("nosniff");

    const asset = await fetch(`${base}/_next/static/app.js`);
    expect(asset.headers.get("content-type")).toContain("javascript");
    expect(asset.headers.get("cache-control")).toContain("immutable");
  });

  it("遺失的資源回 404，不回 HTML", async () => {
    const res = await fetch(`${base}/_next/static/missing.js`);
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("text/plain");
  });

  it("沒有副檔名的路徑回首頁（SPA fallback）", async () => {
    const res = await fetch(`${base}/some/page`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("home");
  });

  it("阻擋目錄遍歷，包含相鄰同名目錄", () => {
    expect(resolveRequestPath(root, "/../secret.txt")).toBeNull();
    expect(resolveRequestPath(root, `/..%2F${path.basename(root)}2/secret.txt`)).toBeNull();
    expect(resolveRequestPath(root, "/%00")).toBeNull();
    expect(resolveRequestPath(root, "/%E0%A4%A")).toBeNull();
  });

  it("只接受 GET / HEAD", async () => {
    const res = await fetch(`${base}/`, { method: "POST" });
    expect(res.status).toBe(405);
  });
});
