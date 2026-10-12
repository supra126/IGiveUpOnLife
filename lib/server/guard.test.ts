import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const ENV_KEYS = ["GEMINI_API_KEY", "GEMINI_IMAGE_MODEL", "GEMINI_ALLOWED_IMAGE_MODELS"] as const;
const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) saved[key] = process.env[key];
  process.env.GEMINI_API_KEY = "server-key";
  process.env.GEMINI_IMAGE_MODEL = "gemini-3-pro-image";
  process.env.GEMINI_ALLOWED_IMAGE_MODELS = "gemini-3.1-flash-lite-image";
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("guard 模型白名單", () => {
  it("帶了不在白名單的模型會被擋", async () => {
    const { guard } = await import("./guard");
    await expect(guard({ kind: "image", model: "gemini-3-pro-image" })).rejects.toMatchObject({
      code: "MODEL_NOT_ALLOWED",
    });
  });

  it("沒帶模型時，退回的預設模型也要通過白名單", async () => {
    const { guard } = await import("./guard");
    await expect(guard({ kind: "image" })).rejects.toMatchObject({ code: "MODEL_NOT_ALLOWED" });
  });

  it("使用者自己的金鑰不受白名單限制", async () => {
    const { guard } = await import("./guard");
    await expect(guard({ kind: "image", userApiKey: "user-key" })).resolves.toMatchObject({ source: "user" });
  });
});
