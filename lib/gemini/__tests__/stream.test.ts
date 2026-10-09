import { describe, it, expect, vi } from "vitest";
import type { GoogleGenAI } from "@google/genai";
import { catchStreamErrors, streamStructured, summarizeThought, type StreamEvent } from "../stream";
import { streamPlan, parseInput } from "../operations";
import { consumeStream } from "../transport";
import { DirectorOutputSchema, PlanInputSchema } from "../schemas";
import { GeminiError } from "../errors";

type Part = { text: string; thought?: boolean };

function chunk(parts: Part[], finishReason?: string) {
  return { candidates: [{ content: { parts }, finishReason }] };
}

function fakeAi(chunks: ReturnType<typeof chunk>[], options: { rejectThoughts?: boolean } = {}) {
  const calls: unknown[] = [];
  const ai = {
    models: {
      generateContentStream: vi.fn(async (params: { config?: { thinkingConfig?: { includeThoughts?: boolean } } }) => {
        calls.push(params);
        if (options.rejectThoughts && params.config?.thinkingConfig?.includeThoughts) {
          throw Object.assign(new Error("includeThoughts not supported"), { status: 400 });
        }
        return (async function* () {
          for (const c of chunks) yield c;
        })();
      }),
    },
  } as unknown as GoogleGenAI;
  return { ai, calls };
}

async function collect<T>(gen: AsyncGenerator<StreamEvent<T>>): Promise<StreamEvent<T>[]> {
  const out: StreamEvent<T>[] = [];
  for await (const e of gen) out.push(e);
  return out;
}

const director = {
  product_analysis: { name: "杯", visual_description: "紅色", key_features: "耐熱" },
  marketing_routes: ["A", "B", "C"].map((n) => ({
    route_name: n,
    headline: "h",
    subhead: "s",
    style_brief: "b",
    target_audience: "t",
  })),
};

describe("summarizeThought", () => {
  it("取粗體標題，沒有就取第一行", () => {
    expect(summarizeThought("**分析包裝色彩**\n\n細節……")).toBe("分析包裝色彩");
    expect(summarizeThought("\nFirst line\nsecond")).toBe("First line");
    expect(summarizeThought("   ")).toBeNull();
  });
});

describe("streamStructured", () => {
  it("回報思考摘要與完成數，最後驗證完整 JSON", async () => {
    const json = JSON.stringify(director);
    const half = Math.floor(json.length / 2);
    const { ai, calls } = fakeAi([
      chunk([{ text: "**研究產品外觀**\n...", thought: true }]),
      chunk([{ text: json.slice(0, half) }]),
      chunk([{ text: json.slice(half) }], "STOP"),
    ]);
    const events = await collect(
      streamStructured(ai, { model: "m", contents: "x" }, DirectorOutputSchema, {
        total: 3,
        countPattern: /"route_name"/g,
      })
    );
    expect(events[0]).toEqual({ type: "thought", text: "研究產品外觀" });
    const progress = events.filter((e) => e.type === "progress");
    expect(progress.at(-1)).toMatchObject({ done: 3, total: 3, chars: json.length });
    expect(events.at(-1)).toMatchObject({ type: "result", data: { product_analysis: { name: "杯" } } });
    expect((calls[0] as { config: { thinkingConfig: { includeThoughts: boolean } } }).config.thinkingConfig.includeThoughts).toBe(true);
  });

  it("MAX_TOKENS 結尾丟出截斷錯誤", async () => {
    const { ai } = fakeAi([chunk([{ text: '{"product_analysis":' }], "MAX_TOKENS")]);
    await expect(collect(streamStructured(ai, { model: "m", contents: "x" }, DirectorOutputSchema))).rejects.toMatchObject({
      code: "RESPONSE_TRUNCATED",
    });
  });

  it("模型不支援思考摘要時退回一般串流", async () => {
    const { ai, calls } = fakeAi([chunk([{ text: JSON.stringify(director) }], "STOP")], { rejectThoughts: true });
    const events = await collect(streamStructured(ai, { model: "m", contents: "x" }, DirectorOutputSchema));
    expect(events.at(-1)?.type).toBe("result");
    expect(calls).toHaveLength(2);
  });

  it("catchStreamErrors 把例外轉成 error 事件", async () => {
    const events = await collect(
      catchStreamErrors(async function* () {
        yield { type: "thought", text: "x" } as StreamEvent<never>;
        throw new GeminiError("QUOTA_EXHAUSTED");
      })
    );
    expect(events.at(-1)).toMatchObject({ type: "error", code: "QUOTA_EXHAUSTED" });
  });
});

describe("streamPlan", () => {
  it("依完成的 visual_prompt_en 計算組數，並過濾未選的版型", async () => {
    const set = (id: string, ratio: string, n: number) => ({
      id,
      ratio,
      size_label: "x",
      set_number: n,
      title: "t",
      copy: "c",
      visual_summary: "v",
      visual_prompt_en: `prompt "quoted" ${n}`,
    });
    const plan = {
      plan_name: "P",
      selected_sizes: ["1:1"],
      content_sets: [set("a", "1:1", 1), set("b", "1:1", 2), set("c", "9:16", 1)],
    };
    const { ai } = fakeAi([chunk([{ text: JSON.stringify(plan) }], "STOP")]);
    const input = parseInput(PlanInputSchema, {
      route: director.marketing_routes[0],
      analysis: director.product_analysis,
      formats: ["1:1"],
    });
    const events = await collect(streamPlan(ai, input));
    expect(events.find((e) => e.type === "progress")).toMatchObject({ done: 3, total: 3 });
    const result = events.at(-1);
    expect(result?.type === "result" && result.data.content_sets.map((s) => s.id)).toEqual(["a", "b"]);
  });
});

describe("consumeStream", () => {
  async function* events(list: StreamEvent<string>[]) {
    yield* list;
  }

  it("轉發進度事件並回傳結果", async () => {
    const seen: string[] = [];
    const result = await consumeStream(
      events([
        { type: "thought", text: "a" },
        { type: "progress", chars: 3 },
        { type: "result", data: "ok" },
      ]),
      (e) => seen.push(e.type)
    );
    expect(result).toBe("ok");
    expect(seen).toEqual(["thought", "progress"]);
  });

  it("error 事件轉成 GeminiError", async () => {
    await expect(
      consumeStream(events([{ type: "error", code: "RATE_LIMITED", retryAfterMs: 5 }]), () => {})
    ).rejects.toMatchObject({ code: "RATE_LIMITED", retryAfterMs: 5 });
  });

  it("沒有結果就結束時丟出錯誤", async () => {
    await expect(consumeStream(events([{ type: "progress", chars: 1 }]), () => {})).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });
});
