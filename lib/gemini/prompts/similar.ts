/**
 * 相似圖：參考圖 + 自家產品圖 → 依相似度產生新圖
 *
 * 相似度用「保留 / 改變」矩陣定義，每個維度都有具體描述，
 * 比單行指令更能讓模型理解低 / 中 / 高的差別。
 */
import type { CopySpace, SimilarityLevel } from "../schemas";
import { NEGATIVE_PROMPT, wrapUserInput } from "./image";

export const DIMENSIONS = ["composition", "cameraAngle", "lighting", "colorPalette", "background", "props"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

const DIMENSION_TEXT: Record<Dimension, string> = {
  composition: "Composition — subject placement, framing, crop and negative space",
  cameraAngle: "Camera — height, angle, distance and lens perspective",
  lighting: "Lighting — key light direction, softness, contrast and shadow character",
  colorPalette: "Color — palette, tonal range, color grading and overall mood",
  background: "Background — surface, setting and environment",
  props: "Props — supporting objects, styling details and their arrangement",
};

export interface SimilarityRule {
  label: string;
  summary: string;
  keep: readonly Dimension[];
  change: readonly Dimension[];
  note: string;
}

export const SIMILARITY_RULES: Record<SimilarityLevel, SimilarityRule> = {
  high: {
    label: "HIGH",
    summary: "A near-replica of the reference scene with our product swapped in.",
    keep: DIMENSIONS,
    change: [],
    note: "Replace only the reference's main subject with our product. Adapt scale, contact shadows and reflections so the product sits naturally in the scene.",
  },
  medium: {
    label: "MEDIUM",
    summary: "Same look and feel as the reference, but a new shot.",
    keep: ["lighting", "colorPalette", "background"],
    change: ["composition", "cameraAngle", "props"],
    note: "The background may keep its style and materials but be re-arranged for the new composition.",
  },
  low: {
    label: "LOW",
    summary: "Only the color mood of the reference; everything else is a fresh creative idea.",
    keep: ["colorPalette"],
    change: ["composition", "cameraAngle", "lighting", "background", "props"],
    note: "Treat the reference as a mood board, not a layout. The result should not look like a copy of IMAGE A.",
  },
};

const VARIATION_HINTS: Record<SimilarityLevel, readonly string[]> = {
  high: [
    "the closest possible match to the reference",
    "a subtle change in the product's angle",
    "a slightly different camera distance",
    "a small variation in prop positions",
    "a minor nuance in light falloff",
  ],
  medium: [
    "an eye-level front view",
    "an elevated three-quarter view",
    "a tight hero close-up",
    "a wider environmental shot",
    "a low angle looking slightly up",
    "a top-down flat lay",
  ],
  low: [
    "a bold graphic composition",
    "a lifestyle scene in use",
    "a minimal sculptural set",
    "a dramatic spotlight scene",
    "a natural outdoor setting",
    "a top-down flat lay with geometric props",
  ],
};

const COPY_SPACE_TEXT: Record<Exclude<CopySpace, "none">, string> = {
  top: "the top third",
  bottom: "the bottom third",
  left: "the left third",
  right: "the right third",
};

export const IMAGE_LABELS = {
  reference:
    "IMAGE A — STYLE REFERENCE. Use it only for the attributes listed under KEEP. Do NOT copy its product, brand marks, logos, watermarks or text.",
  product:
    "IMAGE B — OUR PRODUCT. It must appear exactly as shown: shape, proportions, colors, materials, labels, logos and printed text.",
  secondary: "IMAGE C — SECONDARY PRODUCT. A supporting product that appears together with IMAGE B, unaltered.",
} as const;

export interface SimilarPromptOptions {
  similarity: SimilarityLevel;
  aspectRatio: string;
  hasSecondary?: boolean;
  copySpace?: CopySpace;
  instructions?: string;
  variantIndex?: number;
  variantCount?: number;
}

export function buildSimilarInstruction(options: SimilarPromptOptions): string {
  const rule = SIMILARITY_RULES[options.similarity];
  const sections: string[] = [];

  sections.push(
    `TASK: Create a new professional product photograph of the product in IMAGE B, using IMAGE A as the style reference.\nSIMILARITY: ${rule.label} — ${rule.summary}`
  );

  sections.push(`KEEP from IMAGE A:\n${rule.keep.map((d) => `- ${DIMENSION_TEXT[d]}`).join("\n")}`);

  if (rule.change.length > 0) {
    sections.push(
      `CHANGE — design these fresh, do not copy IMAGE A:\n${rule.change.map((d) => `- ${DIMENSION_TEXT[d]}`).join("\n")}`
    );
  }

  sections.push(rule.note);

  if (options.hasSecondary) {
    sections.push(
      "Include the product from IMAGE C as a secondary element next to IMAGE B. IMAGE B stays the hero."
    );
  }

  sections.push(
    "PRODUCT FIDELITY (non-negotiable): Reproduce IMAGE B exactly. Never redraw, restyle, translate or invent packaging text. Keep realistic scale."
  );

  if (options.copySpace && options.copySpace !== "none") {
    sections.push(
      `COPY SPACE: Keep ${COPY_SPACE_TEXT[options.copySpace]} of the frame as clean, low-detail negative space for text added later. Keep the product out of that area.`
    );
  }

  const count = options.variantCount ?? 1;
  if (count > 1) {
    const index = options.variantIndex ?? 0;
    const hints = VARIATION_HINTS[options.similarity];
    sections.push(
      `VARIATION ${index + 1} of ${count}: aim for ${hints[index % hints.length]}, so this result differs from the other variations while following the rules above.`
    );
  }

  sections.push(
    `OUTPUT: aspect ratio ${options.aspectRatio}. A clean photograph only — no added headline, caption, watermark or border.`
  );

  if (options.instructions && options.instructions.trim()) {
    sections.push(
      `Additional direction from the user (follow it unless it conflicts with PRODUCT FIDELITY):\n${wrapUserInput("user_direction", options.instructions)}`
    );
  }

  sections.push(NEGATIVE_PROMPT);

  return sections.join("\n\n");
}
