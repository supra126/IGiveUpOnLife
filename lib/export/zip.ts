/**
 * 把成果打包成 zip（原圖、合成圖、文案、專案資訊）
 */
import { zip, strToU8, type Zippable } from "fflate";

export interface ZipImage {
  /** 不含副檔名的檔名 */
  name: string;
  blob: Blob;
  extension: string;
  folder: "originals" | "composited";
}

export interface ZipInput {
  images: ZipImage[];
  copyMarkdown?: string;
  projectJson?: unknown;
}

export async function buildZip(input: ZipInput): Promise<Blob> {
  const files: Zippable = {};
  const used = new Set<string>();

  for (const image of input.images) {
    let path = `${image.folder}/${sanitize(image.name)}.${image.extension}`;
    for (let i = 2; used.has(path); i++) path = `${image.folder}/${sanitize(image.name)}-${i}.${image.extension}`;
    used.add(path);
    // 圖片本身已壓縮過，level 0 直接存放最快
    files[path] = [await blobToBytes(image.blob), { level: 0 }];
  }
  if (input.copyMarkdown) files["copy.md"] = strToU8(input.copyMarkdown);
  if (input.projectJson !== undefined) files["project.json"] = strToU8(JSON.stringify(input.projectJson, null, 2));

  const data = await new Promise<Uint8Array>((resolve, reject) =>
    zip(files, (error, result) => (error ? reject(error) : resolve(result)))
  );
  return new Blob([data as BlobPart], { type: "application/zip" });
}

async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === "function") return new Uint8Array(await blob.arrayBuffer());
  // 舊環境（含 jsdom）沒有 Blob.arrayBuffer
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

export function sanitize(name: string): string {
  return (
    name
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
      .replace(/\s+/g, "_")
      .slice(0, 80) || "image"
  );
}
