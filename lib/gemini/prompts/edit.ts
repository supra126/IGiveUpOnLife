/**
 * 對話式修圖：每一輪的使用者指令
 */
import { wrapUserInput } from "./image";

export function buildEditInstruction(instruction: string, aspectRatio: string): string {
  return [
    "Edit the latest image according to the request below.",
    "Change only what the request asks for and keep everything else identical — especially the product's shape, colors, labels and printed text.",
    `Keep the aspect ratio ${aspectRatio}. Do not add captions, watermarks or borders unless explicitly requested.`,
    wrapUserInput("edit_request", instruction),
  ].join("\n\n");
}
