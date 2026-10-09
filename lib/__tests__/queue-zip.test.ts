import { describe, it, expect, vi } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { createQueue } from "../queue";
import { buildZip, sanitize } from "../export/zip";
import { GeminiError } from "../gemini/errors";

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("createQueue", () => {
  it("同時執行數量不超過 concurrency", async () => {
    const queue = createQueue({ concurrency: 2 });
    const gates = [deferred<void>(), deferred<void>(), deferred<void>()];
    let running = 0;
    let peak = 0;
    const results = gates.map((gate, i) =>
      queue.add(async () => {
        running++;
        peak = Math.max(peak, running);
        await gate.promise;
        running--;
        return i;
      })
    );
    expect(queue.running).toBe(2);
    expect(queue.size).toBe(1);
    gates.forEach((g) => g.resolve());
    expect(await Promise.all(results)).toEqual([0, 1, 2]);
    expect(peak).toBe(2);
  });

  it("cancel 會中止執行中並拒絕等待中的工作", async () => {
    const queue = createQueue({ concurrency: 1 });
    let seenSignal: AbortSignal | undefined;
    const first = queue.add(
      (signal) =>
        new Promise((_, reject) => {
          seenSignal = signal;
          signal.addEventListener("abort", () => reject(new Error("aborted")));
        })
    );
    const second = queue.add(async () => "never");
    queue.cancel();
    await expect(first).rejects.toMatchObject({ code: "ABORTED" });
    await expect(second).rejects.toMatchObject({ code: "ABORTED" });
    expect(seenSignal?.aborted).toBe(true);
  });

  it("遇到限流會暫停後重排，每日配額用完則全部失敗", async () => {
    const timers: Array<() => void> = [];
    const onPause = vi.fn();
    const queue = createQueue({ concurrency: 1, onPause, setTimer: (fn) => timers.push(fn) });
    let calls = 0;
    const job = queue.add(async () => {
      calls++;
      if (calls === 1) throw new GeminiError("RATE_LIMITED", "x", 50);
      return "ok";
    });
    await vi.waitFor(() => expect(onPause).toHaveBeenCalledWith(50));
    await new Promise((r) => setTimeout(r, 60));
    timers.forEach((fn) => fn());
    await expect(job).resolves.toBe("ok");

    const quotaQueue = createQueue({ concurrency: 1 });
    const a = quotaQueue.add(async () => {
      throw new GeminiError("QUOTA_EXHAUSTED");
    });
    const b = quotaQueue.add(async () => "never");
    await expect(a).rejects.toMatchObject({ code: "QUOTA_EXHAUSTED" });
    await expect(b).rejects.toMatchObject({ code: "QUOTA_EXHAUSTED" });
  });
});

describe("buildZip", () => {
  it("依資料夾放圖，重名自動編號，附上文案與專案資訊", async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
    const zipped = await buildZip({
      images: [
        { name: "低相似 1", blob, extension: "png", folder: "originals" },
        { name: "低相似 1", blob, extension: "png", folder: "originals" },
        { name: "a/b", blob, extension: "png", folder: "composited" },
      ],
      copyMarkdown: "# 文案",
      projectJson: { name: "P" },
    });
    const bytes = await new Promise<Uint8Array>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.readAsArrayBuffer(zipped);
    });
    const files = unzipSync(bytes);
    expect(Object.keys(files).sort()).toEqual(
      ["composited/a_b.png", "copy.md", "originals/低相似_1-2.png", "originals/低相似_1.png", "project.json"].sort()
    );
    expect(strFromU8(files["copy.md"])).toBe("# 文案");
  });

  it("sanitize 移除不合法字元", () => {
    expect(sanitize('a:b*c?"d')).toBe("a_b_c__d");
    expect(sanitize("")).toBe("image");
  });
});
