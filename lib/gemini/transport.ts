/**
 * 前端呼叫 Gemini 的唯一入口
 *
 * - server 模式：呼叫 server actions（伺服器金鑰 + 限流）
 * - static 模式（NEXT_PUBLIC_BUILD_MODE=static）：瀏覽器用使用者金鑰直接呼叫同一套 core
 *
 * NEXT_PUBLIC_BUILD_MODE 在建置時內聯，另一條分支的 import 會被 tree-shake 掉，
 * static export 因此不會包含 server action。
 */
import type { ContentPlan, DirectorOutput } from "@/types";
import { GeminiError } from "./errors";
import { unwrap, type Result } from "./result";
import { DEFAULT_IMAGE_MODEL, DEFAULT_TEXT_MODEL } from "./models";
import type { GeneratedImage, OperationOptions } from "./operations";
import type { StreamEvent } from "./stream";
import type {
  AnalyzeInput,
  EditImageInput,
  PlanInput,
  PromptImageInput,
  RegeneratePromptInput,
  SimilarImageInput,
} from "./schemas";

export const IS_STATIC_BUILD = process.env.NEXT_PUBLIC_BUILD_MODE === "static";

export interface Capabilities {
  mode: "server" | "static";
  hasServerKey: boolean;
  defaults: { textModel: string; imageModel: string };
  allowedTextModels: string[] | null;
  allowedImageModels: string[] | null;
  rateLimit: { maxRequests: number; windowMs: number } | null;
}

export interface CallOptions {
  apiKey?: string;
  signal?: AbortSignal;
}

const STATIC_DEFAULTS = {
  textModel: process.env.NEXT_PUBLIC_GEMINI_TEXT_MODEL || DEFAULT_TEXT_MODEL,
  imageModel: process.env.NEXT_PUBLIC_GEMINI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL,
};

/** server action 無法真正中止，只能在前端丟棄結果 */
function raceAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new GeminiError("ABORTED"));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new GeminiError("ABORTED"));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      }
    );
  });
}

type ServerActions = typeof import("@/app/actions/gemini");

/**
 * 直接在三元運算式中比較 env，讓 bundler 在 static 建置時把 server action 的 import 整段移除
 * （static export 只要模組圖中出現 server action 就會建置失敗）
 */
const loadActions: (() => Promise<ServerActions>) | null =
  process.env.NEXT_PUBLIC_BUILD_MODE === "static" ? null : () => import("@/app/actions/gemini");
type StaticRunner = <T>(
  run: (ops: typeof import("./operations"), ai: import("@google/genai").GoogleGenAI, opts: OperationOptions) => Promise<T>,
  call: CallOptions
) => Promise<T>;

async function serverCall<T>(
  pick: (actions: ServerActions) => Promise<Result<T>>,
  call: CallOptions
): Promise<T> {
  if (!loadActions) throw new GeminiError("UNKNOWN", "Server actions unavailable in static build");
  const actions = await loadActions();
  return unwrap(await raceAbort(pick(actions), call.signal));
}

const staticCall: StaticRunner = async (run, call) => {
  if (!call.apiKey) throw new GeminiError("API_KEY_MISSING");
  const [{ GoogleGenAI }, ops] = await Promise.all([import("@google/genai"), import("./operations")]);
  const ai = new GoogleGenAI({ apiKey: call.apiKey });
  return run(ops, ai, { signal: call.signal, ...STATIC_DEFAULTS });
};

/** 讀取 server action 回傳的事件串流；中止時取消讀取 */
async function* readEventStream<T>(stream: ReadableStream<string>, signal?: AbortSignal): AsyncGenerator<StreamEvent<T>> {
  const reader = stream.getReader();
  const onAbort = () => void reader.cancel().catch(() => {});
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    for (;;) {
      if (signal?.aborted) throw new GeminiError("ABORTED");
      const { value, done } = await reader.read();
      if (done) return;
      yield JSON.parse(value) as StreamEvent<T>;
    }
  } finally {
    signal?.removeEventListener("abort", onAbort);
    reader.releaseLock();
  }
}

/**
 * 消費事件串流：error 事件轉成例外，回傳最終結果
 */
export async function consumeStream<T>(
  events: AsyncIterable<StreamEvent<T>>,
  onEvent: (event: Exclude<StreamEvent<T>, { type: "result" | "error" }>) => void,
  signal?: AbortSignal
): Promise<T> {
  for await (const event of events) {
    if (signal?.aborted) throw new GeminiError("ABORTED");
    if (event.type === "result") return event.data;
    if (event.type === "error") throw new GeminiError(event.code, event.message, event.retryAfterMs);
    onEvent(event);
  }
  throw new GeminiError(signal?.aborted ? "ABORTED" : "INVALID_RESPONSE", "Stream ended without result");
}

export const gemini = {
  async capabilities(): Promise<Capabilities> {
    if (IS_STATIC_BUILD) {
      return {
        mode: "static",
        hasServerKey: false,
        defaults: STATIC_DEFAULTS,
        allowedTextModels: null,
        allowedImageModels: null,
        rateLimit: null,
      };
    }
    if (!loadActions) throw new GeminiError("UNKNOWN", "Server actions unavailable in static build");
    const actions = await loadActions();
    return { mode: "server", ...(await actions.getServerCapabilitiesAction()) };
  },

  analyze(input: AnalyzeInput, call: CallOptions = {}): Promise<DirectorOutput> {
    if (IS_STATIC_BUILD) {
      return staticCall(
        async (ops, ai, opts) => {
          const { AnalyzeInputSchema } = await import("./schemas");
          return ops.analyzeProduct(ai, ops.parseInput(AnalyzeInputSchema, input), opts);
        },
        call
      );
    }
    return serverCall((a) => a.analyzeAction(input, call.apiKey), call);
  },

  /** 分析產品（串流：思考摘要與進度） */
  async *analyzeStream(input: AnalyzeInput, call: CallOptions = {}): AsyncGenerator<StreamEvent<DirectorOutput>> {
    if (IS_STATIC_BUILD) {
      if (!call.apiKey) throw new GeminiError("API_KEY_MISSING");
      const [{ GoogleGenAI }, ops, { AnalyzeInputSchema }] = await Promise.all([
        import("@google/genai"),
        import("./operations"),
        import("./schemas"),
      ]);
      const ai = new GoogleGenAI({ apiKey: call.apiKey });
      yield* ops.streamAnalyze(ai, ops.parseInput(AnalyzeInputSchema, input), { signal: call.signal, ...STATIC_DEFAULTS });
      return;
    }
    if (!loadActions) throw new GeminiError("UNKNOWN");
    const actions = await loadActions();
    yield* readEventStream<DirectorOutput>(
      await raceAbort(actions.analyzeStreamAction(input, call.apiKey), call.signal),
      call.signal
    );
  },

  /** 規劃內容（串流：思考摘要與完成組數） */
  async *planStream(input: PlanInput, call: CallOptions = {}): AsyncGenerator<StreamEvent<ContentPlan>> {
    if (IS_STATIC_BUILD) {
      if (!call.apiKey) throw new GeminiError("API_KEY_MISSING");
      const [{ GoogleGenAI }, ops, { PlanInputSchema }] = await Promise.all([
        import("@google/genai"),
        import("./operations"),
        import("./schemas"),
      ]);
      const ai = new GoogleGenAI({ apiKey: call.apiKey });
      yield* ops.streamPlan(ai, ops.parseInput(PlanInputSchema, input), { signal: call.signal, ...STATIC_DEFAULTS });
      return;
    }
    if (!loadActions) throw new GeminiError("UNKNOWN");
    const actions = await loadActions();
    yield* readEventStream<ContentPlan>(
      await raceAbort(actions.planStreamAction(input, call.apiKey), call.signal),
      call.signal
    );
  },

  plan(input: PlanInput, call: CallOptions = {}): Promise<ContentPlan> {
    if (IS_STATIC_BUILD) {
      return staticCall(
        async (ops, ai, opts) => {
          const { PlanInputSchema } = await import("./schemas");
          return ops.planContent(ai, ops.parseInput(PlanInputSchema, input), opts);
        },
        call
      );
    }
    return serverCall((a) => a.planAction(input, call.apiKey), call);
  },

  regeneratePrompt(input: RegeneratePromptInput, call: CallOptions = {}): Promise<string> {
    if (IS_STATIC_BUILD) {
      return staticCall(
        async (ops, ai, opts) => {
          const { RegeneratePromptInputSchema } = await import("./schemas");
          return ops.regenerateVisualPrompt(ai, ops.parseInput(RegeneratePromptInputSchema, input), opts);
        },
        call
      );
    }
    return serverCall((a) => a.regeneratePromptAction(input, call.apiKey), call);
  },

  promptImage(input: PromptImageInput, call: CallOptions = {}): Promise<GeneratedImage> {
    if (IS_STATIC_BUILD) {
      return staticCall(
        async (ops, ai, opts) => {
          const { PromptImageInputSchema } = await import("./schemas");
          return ops.generatePromptImage(ai, ops.parseInput(PromptImageInputSchema, input), opts);
        },
        call
      );
    }
    return serverCall((a) => a.promptImageAction(input, call.apiKey), call);
  },

  similarImage(input: SimilarImageInput, call: CallOptions = {}): Promise<GeneratedImage> {
    if (IS_STATIC_BUILD) {
      return staticCall(
        async (ops, ai, opts) => {
          const { SimilarImageInputSchema } = await import("./schemas");
          return ops.generateSimilarImage(ai, ops.parseInput(SimilarImageInputSchema, input), opts);
        },
        call
      );
    }
    return serverCall((a) => a.similarImageAction(input, call.apiKey), call);
  },

  editImage(input: EditImageInput, call: CallOptions = {}): Promise<GeneratedImage> {
    if (IS_STATIC_BUILD) {
      return staticCall(
        async (ops, ai, opts) => {
          const { EditImageInputSchema } = await import("./schemas");
          return ops.editImage(ai, ops.parseInput(EditImageInputSchema, input), opts);
        },
        call
      );
    }
    return serverCall((a) => a.editImageAction(input, call.apiKey), call);
  },
};

export type { GeneratedImage };
