"use client";

/**
 * 工作台的動作：把 store、佇列與 Gemini transport 串起來
 */
import { useSyncExternalStore } from "react";
import { consumeStream, gemini, type Capabilities } from "@/lib/gemini/transport";
import type { StreamEvent } from "@/lib/gemini/stream";
import { endProgress, pushThought, startProgress, updateProgress } from "./progress";
import { classifyError, GeminiError } from "@/lib/gemini/errors";
import { FORMATS, type FormatId } from "@/lib/gemini/formats";
import type { AspectRatio } from "@/lib/gemini/models";
import { createQueue, type Queue } from "@/lib/queue";
import { dataUrlToBlob, extensionFor, prepareImageForApi, downloadBlob } from "@/lib/image/blob";
import { buildZip, type ZipImage } from "@/lib/export/zip";
import { getPreferences } from "@/lib/preferences";
import type { ContentSet, Locale } from "@/types";
import {
  addAsset,
  getAssetRecord,
  getState,
  patchGeneration,
  updateProject,
  upsertGeneration,
} from "@/lib/project/store";
import { createId, type Generation, type Project } from "@/lib/project/types";
import { showToast } from "./toast";

// --- 伺服器能力（模式、是否有伺服器金鑰、模型白名單） ---

let capabilities: Capabilities | null = null;
const capabilityListeners = new Set<() => void>();

export async function loadCapabilities(): Promise<Capabilities> {
  try {
    capabilities = await gemini.capabilities();
  } catch {
    capabilities = {
      mode: "server",
      hasServerKey: false,
      defaults: { textModel: "", imageModel: "" },
      allowedImageModels: null,
      allowedTextModels: null,
      rateLimit: null,
    };
  }
  for (const listener of capabilityListeners) listener();
  return capabilities;
}

export function useCapabilities(): Capabilities | null {
  return useSyncExternalStore(
    (listener) => {
      capabilityListeners.add(listener);
      return () => capabilityListeners.delete(listener);
    },
    () => capabilities,
    () => null
  );
}

/** 沒有可用金鑰時回傳 false，由 UI 開啟設定 */
export function hasUsableKey(): boolean {
  return Boolean(getPreferences().apiKey) || Boolean(capabilities?.hasServerKey);
}

function apiKey(): string | undefined {
  return getPreferences().apiKey || undefined;
}

// --- 佇列 ---

let queue: Queue | null = null;
let pendingCount = 0;
const queueListeners = new Set<() => void>();

function notifyQueue() {
  for (const listener of queueListeners) listener();
}

function getQueue(): Queue {
  const prefs = getPreferences();
  // 用伺服器金鑰時，並行數不超過伺服器限流上限
  const serverLimit = !prefs.apiKey && capabilities?.rateLimit ? capabilities.rateLimit.maxRequests : Infinity;
  const concurrency = Math.max(1, Math.min(prefs.concurrency, serverLimit));
  if (!queue) {
    queue = createQueue({
      concurrency,
      onPause: (ms) => showToast("info", "toast.rateLimitPause", { seconds: Math.ceil(ms / 1000) }),
    });
  } else {
    queue.setConcurrency(concurrency);
  }
  return queue;
}

function enqueue<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  pendingCount++;
  notifyQueue();
  return getQueue()
    .add(run)
    .finally(() => {
      pendingCount--;
      notifyQueue();
    });
}

export function usePendingCount(): number {
  return useSyncExternalStore(
    (listener) => {
      queueListeners.add(listener);
      return () => queueListeners.delete(listener);
    },
    () => pendingCount,
    () => 0
  );
}

export function cancelAll(): void {
  queue?.cancel();
}

// --- 共用 ---

async function assetDataUrl(assetId: string | undefined): Promise<string | undefined> {
  if (!assetId) return undefined;
  const asset = await getAssetRecord(assetId);
  if (!asset) return undefined;
  return prepareImageForApi(asset.blob);
}

function requireProject(): Project {
  const project = getState().project;
  if (!project) throw new GeminiError("INVALID_INPUT", "No project");
  return project;
}

function reportError(error: unknown) {
  const code = classifyError(error).code;
  if (code === "ABORTED") return;
  showToast("error", `errors.${code}`);
}

interface ImageJob {
  generation: Generation;
  run: (signal: AbortSignal) => Promise<{
    dataUrl: string;
    thoughtSignature?: string;
    model: string;
    imageSize: string;
    aspectRatio: string;
  }>;
}

/** 建立 queued 紀錄 → 排入佇列 → 存圖並更新狀態 */
function runImageJob({ generation, run }: ImageJob): Promise<void> {
  upsertGeneration(generation);
  return enqueue(async (signal) => {
    patchGeneration(generation.id, { status: "running" });
    const result = await run(signal);
    const assetId = await addAsset(dataUrlToBlob(result.dataUrl), "generated", generation.projectId);
    patchGeneration(generation.id, {
      status: "done",
      assetId,
      thoughtSignature: result.thoughtSignature,
      model: result.model,
      imageSize: result.imageSize as Generation["imageSize"],
      aspectRatio: result.aspectRatio as AspectRatio,
    });
  }).catch((error) => {
    const code = classifyError(error).code;
    patchGeneration(generation.id, {
      status: code === "ABORTED" ? "cancelled" : "error",
      errorCode: code === "ABORTED" ? undefined : code,
    });
    reportError(error);
  });
}

function baseGeneration(project: Project, patch: Partial<Generation>): Generation {
  return {
    id: createId(),
    projectId: project.id,
    source: "similar",
    aspectRatio: "1:1",
    model: project.settings.imageModel,
    imageSize: project.settings.imageSize,
    status: "queued",
    createdAt: Date.now(),
    ...patch,
  };
}

// --- 相似圖 ---

export async function runSimilar(count?: number): Promise<void> {
  const project = requireProject();
  const inputs = project.similar;
  if (!inputs.referenceAssetId || !inputs.productAssetId) {
    showToast("error", "similar.missingImages");
    return;
  }

  const [referenceImage, productImage, secondaryImage] = await Promise.all([
    assetDataUrl(inputs.referenceAssetId),
    assetDataUrl(inputs.productAssetId),
    assetDataUrl(inputs.secondaryAssetId),
  ]);
  if (!referenceImage || !productImage) {
    showToast("error", "similar.missingImages");
    return;
  }

  const total = count ?? inputs.count;
  const batchId = createId();
  const jobs: Promise<void>[] = [];
  for (let index = 0; index < total; index++) {
    const generation = baseGeneration(project, {
      batchId,
      source: "similar",
      aspectRatio: inputs.aspectRatio,
      similarity: inputs.similarity,
      prompt: inputs.instructions || undefined,
    });
    jobs.push(
      runImageJob({
        generation,
        run: (signal) =>
          gemini.similarImage(
            {
              referenceImage,
              productImage,
              secondaryImage,
              similarity: inputs.similarity,
              aspectRatio: inputs.aspectRatio,
              copySpace: inputs.copySpace,
              instructions: inputs.instructions,
              variantIndex: index,
              variantCount: total,
              model: project.settings.imageModel,
              imageSize: project.settings.imageSize,
              thinkingLevel: project.settings.thinkingLevel,
            },
            { apiKey: apiKey(), signal }
          ),
      })
    );
  }
  await Promise.all(jobs);
}

// --- 延伸比例：以成品為參考圖、高相似度重生成另一個比例 ---

export async function runExtend(source: Generation, aspectRatio: AspectRatio): Promise<void> {
  const project = requireProject();
  const productAssetId =
    project.kind === "similar" ? project.similar.productAssetId : project.campaign.productAssetId;
  const [referenceImage, productImage] = await Promise.all([
    assetDataUrl(source.assetId),
    assetDataUrl(productAssetId),
  ]);
  if (!referenceImage || !productImage) {
    showToast("error", "similar.missingImages");
    return;
  }
  await runImageJob({
    generation: baseGeneration(project, {
      source: "extend",
      parentId: source.id,
      contentSetId: source.contentSetId,
      aspectRatio,
      similarity: "high",
    }),
    run: (signal) =>
      gemini.similarImage(
        {
          referenceImage,
          productImage,
          similarity: "high",
          aspectRatio,
          instructions:
            "Re-compose the same scene for the new aspect ratio. Extend or crop the background naturally; keep everything else identical.",
          model: project.settings.imageModel,
          imageSize: project.settings.imageSize,
          thinkingLevel: project.settings.thinkingLevel,
        },
        { apiKey: apiKey(), signal }
      ),
  });
}

// --- 對話式修圖 ---

interface EditTurn {
  role: "user" | "model";
  image?: string;
  text?: string;
  thoughtSignature?: string;
}

/** 由上一版往回追溯，組出修圖歷史 */
function editChain(target: Generation): Generation[] {
  const byId = new Map(getState().generations.map((g) => [g.id, g]));
  const chain: Generation[] = [];
  let current: Generation | undefined = target;
  while (current) {
    chain.unshift(current);
    current = current.source === "edit" && current.parentId ? byId.get(current.parentId) : undefined;
  }
  return chain;
}

export async function runEdit(target: Generation, instruction: string): Promise<void> {
  const project = requireProject();
  const chain = editChain(target);
  // 歷史只帶原圖 + 最近兩輪，太長就只送目前這張
  const steps: Promise<EditTurn>[] =
    chain.length <= 3
      ? chain.flatMap((g, index): Promise<EditTurn>[] =>
          index === 0
            ? [assetDataUrl(g.assetId).then((image) => ({ role: "user", image }))]
            : [
                Promise.resolve({ role: "user", text: g.prompt ?? "" }),
                assetDataUrl(g.assetId).then((image) => ({ role: "model", image, thoughtSignature: g.thoughtSignature })),
              ]
        )
      : [assetDataUrl(target.assetId).then((image) => ({ role: "user", image }))];
  const history = await Promise.all(steps);

  if (history.some((turn) => turn.text === undefined && !turn.image)) {
    showToast("error", "errors.NO_IMAGE");
    return;
  }

  await runImageJob({
    generation: baseGeneration(project, {
      source: "edit",
      parentId: target.id,
      contentSetId: target.contentSetId,
      aspectRatio: target.aspectRatio,
      similarity: target.similarity,
      prompt: instruction,
    }),
    run: (signal) =>
      gemini.editImage(
        {
          history,
          instruction,
          aspectRatio: target.aspectRatio,
          model: project.settings.imageModel,
          imageSize: project.settings.imageSize,
          thinkingLevel: project.settings.thinkingLevel,
        },
        { apiKey: apiKey(), signal }
      ),
  });
}

// --- 完整企劃流程 ---

let campaignController: AbortController | null = null;

function startCampaignRequest(): AbortController {
  campaignController?.abort();
  campaignController = new AbortController();
  return campaignController;
}

export function cancelCampaignRequest(): void {
  campaignController?.abort();
  campaignController = null;
  endProgress();
}

function onStreamEvent(event: Exclude<StreamEvent<unknown>, { type: "result" | "error" }>) {
  if (event.type === "thought") pushThought(event.text);
  else updateProgress(event);
}

/** 只套用仍是最新請求、且專案沒有被切換的結果 */
function isCurrent(controller: AbortController, projectId: string): boolean {
  return campaignController === controller && !controller.signal.aborted && getState().project?.id === projectId;
}

export async function runAnalyze(locale: Locale): Promise<boolean> {
  const project = requireProject();
  const input = project.campaign;
  const image = await assetDataUrl(input.productAssetId);
  if (!image) {
    showToast("error", "campaign.missingProduct");
    return false;
  }
  const controller = startCampaignRequest();
  startProgress("analyze", 3);
  try {
    const result = await consumeStream(
      gemini.analyzeStream(
        {
          image,
          productName: input.productName,
          productInfo: input.productInfo,
          productUrl: input.productUrl,
          model: project.settings.textModel,
          locale,
        },
        { apiKey: apiKey(), signal: controller.signal }
      ),
      onStreamEvent,
      controller.signal
    );
    if (!isCurrent(controller, project.id)) return false;
    updateProject((p) => ({
      ...p,
      name: p.name || result.product_analysis.name,
      campaign: {
        ...p.campaign,
        step: "strategy",
        analysis: result,
        routes: result.marketing_routes,
        activeRouteIndex: 0,
        routeSupplements: result.marketing_routes.map(() => ""),
        plan: undefined,
        contentSets: [],
      },
    }));
    return true;
  } catch (error) {
    if (isCurrent(controller, project.id)) reportError(error);
    return false;
  } finally {
    if (campaignController === controller) {
      campaignController = null;
      endProgress();
    }
  }
}

export async function runPlan(locale: Locale): Promise<boolean> {
  const project = requireProject();
  const { analysis, routes, activeRouteIndex, routeSupplements, formats, referenceCopy } = project.campaign;
  const route = routes[activeRouteIndex];
  if (!analysis || !route || formats.length === 0) return false;
  const controller = startCampaignRequest();
  startProgress("plan", formats.length * 3);
  try {
    const plan = await consumeStream(
      gemini.planStream(
        {
          route,
          analysis: analysis.product_analysis,
          supplement: routeSupplements[activeRouteIndex] ?? "",
          referenceCopy,
          formats,
          model: project.settings.textModel,
          locale,
        },
        { apiKey: apiKey(), signal: controller.signal }
      ),
      onStreamEvent,
      controller.signal
    );
    if (!isCurrent(controller, project.id)) return false;
    updateProject((p) => ({
      ...p,
      campaign: { ...p.campaign, step: "suite", plan, contentSets: plan.content_sets },
    }));
    return true;
  } catch (error) {
    if (isCurrent(controller, project.id)) reportError(error);
    return false;
  } finally {
    if (campaignController === controller) {
      campaignController = null;
      endProgress();
    }
  }
}

export async function runRegeneratePrompt(contentSet: ContentSet, locale: Locale): Promise<void> {
  const project = requireProject();
  try {
    const prompt = await gemini.regeneratePrompt(
      {
        title: contentSet.title,
        copy: contentSet.copy,
        formatId: contentSet.ratio,
        visualSummary: contentSet.visual_summary || undefined,
        model: project.settings.textModel,
        locale,
      },
      { apiKey: apiKey() }
    );
    if (getState().project?.id !== project.id) return;
    updateContentSet(contentSet.id, { visual_prompt_en: prompt });
  } catch (error) {
    reportError(error);
  }
}

export function updateContentSet(id: string, patch: Partial<ContentSet>): void {
  updateProject((p) => ({
    ...p,
    campaign: {
      ...p.campaign,
      contentSets: p.campaign.contentSets.map((set) => (set.id === id ? { ...set, ...patch } : set)),
    },
  }));
}

export async function runCampaignImages(contentSets: ContentSet[]): Promise<void> {
  const project = requireProject();
  const [productImage, secondaryImage] = await Promise.all([
    assetDataUrl(project.campaign.productAssetId),
    assetDataUrl(project.campaign.secondaryAssetId),
  ]);
  if (!productImage) {
    showToast("error", "campaign.missingProduct");
    return;
  }
  const batchId = createId();
  await Promise.all(
    contentSets.map((set) =>
      runImageJob({
        generation: baseGeneration(project, {
          batchId,
          source: "campaign",
          contentSetId: set.id,
          aspectRatio: FORMATS[set.ratio as FormatId]?.aspectRatio ?? "1:1",
          prompt: set.visual_prompt_en,
        }),
        run: (signal) =>
          gemini.promptImage(
            {
              prompt: set.visual_prompt_en,
              formatId: set.ratio,
              productImage,
              secondaryImage,
              model: project.settings.imageModel,
              imageSize: project.settings.imageSize,
              thinkingLevel: project.settings.thinkingLevel,
            },
            { apiKey: apiKey(), signal }
          ),
      })
    )
  );
}

// --- 下載 ---

function generationName(g: Generation, index: number, project: Project): string {
  const set = g.contentSetId ? project.campaign.contentSets.find((s) => s.id === g.contentSetId) : undefined;
  const parts = [
    String(index + 1).padStart(2, "0"),
    set ? `${set.ratio}_set${set.set_number}` : g.aspectRatio.replace(":", "x"),
    g.similarity ?? "",
    g.source === "edit" ? "edit" : g.source === "extend" ? "extend" : "",
  ].filter(Boolean);
  return parts.join("_");
}

export async function downloadGeneration(g: Generation, preferComposite = true): Promise<void> {
  const project = requireProject();
  const assetId = preferComposite && g.compositeAssetId ? g.compositeAssetId : g.assetId;
  const asset = await getAssetRecord(assetId ?? "");
  if (!asset) return;
  const index = getState().generations.indexOf(g);
  downloadBlob(asset.blob, `${generationName(g, Math.max(0, index), project)}.${extensionFor(asset.mimeType)}`);
}

function buildCopyMarkdown(project: Project): string | undefined {
  const { contentSets, plan, routes, activeRouteIndex } = project.campaign;
  if (contentSets.length === 0) return undefined;
  const route = routes[activeRouteIndex];
  const lines = [`# ${plan?.plan_name ?? project.name}`, ""];
  if (route) lines.push(`> ${route.route_name} — ${route.headline}`, "");
  for (const set of contentSets) {
    lines.push(
      `## ${set.size_label} · ${set.ratio} · #${set.set_number}`,
      "",
      `**${set.title}**`,
      "",
      set.copy,
      "",
      `<details><summary>Prompt</summary>\n\n${set.visual_prompt_en}\n\n</details>`,
      ""
    );
  }
  return lines.join("\n");
}

export async function downloadZip(generations: Generation[]): Promise<void> {
  const project = requireProject();
  const done = generations.filter((g) => g.status === "done" && g.assetId);
  if (done.length === 0) return;
  const images: ZipImage[] = [];
  for (const [index, g] of done.entries()) {
    const name = generationName(g, index, project);
    const original = await getAssetRecord(g.assetId!);
    if (original) images.push({ name, blob: original.blob, extension: extensionFor(original.mimeType), folder: "originals" });
    if (g.compositeAssetId) {
      const composite = await getAssetRecord(g.compositeAssetId);
      if (composite) images.push({ name, blob: composite.blob, extension: "png", folder: "composited" });
    }
  }
  const zip = await buildZip({
    images,
    copyMarkdown: buildCopyMarkdown(project),
    projectJson: {
      name: project.name,
      kind: project.kind,
      exportedAt: new Date().toISOString(),
      settings: project.settings,
      similar: project.kind === "similar" ? project.similar : undefined,
      generations: done.map((g, index) => ({
        file: generationName(g, index, project),
        source: g.source,
        model: g.model,
        aspectRatio: g.aspectRatio,
        imageSize: g.imageSize,
        similarity: g.similarity,
        prompt: g.prompt,
      })),
    },
  });
  const safeName = (project.name || "igiveup").replace(/[\\/:*?"<>|]/g, "_");
  downloadBlob(zip, `${safeName}.zip`);
}
