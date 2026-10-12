import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import zh from "@/locales/zh.json";
import en from "@/locales/en.json";
import { GEMINI_ERROR_CODES } from "@/lib/gemini/errors";
import { FORMAT_IDS } from "@/lib/gemini/formats";
import { IMAGE_MODELS, TEXT_MODELS, THINKING_LEVELS } from "@/lib/gemini/models";

function flatten(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  );
}

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : sourceFiles(full);
    return /\.(tsx?|ts)$/.test(entry.name) ? [full] : [];
  });
}

const zhKeys = new Set(flatten(zh));
const enKeys = new Set(flatten(en));

describe("語系檔", () => {
  it("中英文 key 完全一致", () => {
    expect([...zhKeys].filter((k) => !enKeys.has(k))).toEqual([]);
    expect([...enKeys].filter((k) => !zhKeys.has(k))).toEqual([]);
  });

  it("程式中所有靜態 t() 與 toast key 都存在", () => {
    const root = path.resolve(__dirname, "../..");
    const files = ["app", "components", "lib", "contexts"].flatMap((d) => sourceFiles(path.join(root, d)));
    const missing = new Set<string>();
    for (const file of files) {
      const source = fs.readFileSync(file, "utf8");
      for (const match of source.matchAll(/\bt\(\s*"([a-zA-Z0-9_.]+)"/g)) {
        if (!zhKeys.has(match[1])) missing.add(`${match[1]} (${path.relative(root, file)})`);
      }
      for (const match of source.matchAll(/showToast\(\s*"\w+",\s*"([a-zA-Z0-9_.]+)"/g)) {
        if (!zhKeys.has(match[1])) missing.add(`${match[1]} (${path.relative(root, file)})`);
      }
    }
    expect([...missing]).toEqual([]);
  });

  it("動態 key：錯誤碼、版型、模型、thinking level", () => {
    const expected = [
      ...GEMINI_ERROR_CODES.map((c) => `errors.${c}`),
      ...FORMAT_IDS.map((f) => `formats.${f}`),
      ...[...IMAGE_MODELS, ...TEXT_MODELS].map((m) => `models.${m.descKey}`),
      ...THINKING_LEVELS.map((l) => `output.thinkingLevels.${l}`),
    ];
    expect(expected.filter((k) => !zhKeys.has(k))).toEqual([]);
  });
});
