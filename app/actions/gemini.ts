"use server";

import { analyzeProductImageAction as analyzeAction } from "./gemini/analyze";
import { generateContentPlanAction as contentPlanAction } from "./gemini/content-plan";
import {
  generateMarketingImageAction as marketingImageAction,
  regenerateVisualPromptAction as visualPromptAction,
  generateImageFromReferenceAction as referenceImageAction,
} from "./gemini/image-generate";
import type { AnalyzeProductInput } from "./gemini/analyze";
import type { GenerateContentPlanInput } from "./gemini/content-plan";
import type {
  GenerateImageInput,
  RegeneratePromptInput,
  GenerateFromReferenceInput,
} from "./gemini/image-generate";
import { DirectorOutput, ContentPlan } from "@/types";

// Re-export types for consumers
export type {
  AnalyzeProductInput,
  GenerateContentPlanInput,
  GenerateImageInput,
  RegeneratePromptInput,
  GenerateFromReferenceInput,
};

// Wrapper functions to satisfy "use server" requirements
// Each exported function must be async

export async function analyzeProductImageAction(
  input: AnalyzeProductInput
): Promise<DirectorOutput> {
  return analyzeAction(input);
}

export async function generateContentPlanAction(
  input: GenerateContentPlanInput
): Promise<ContentPlan> {
  return contentPlanAction(input);
}

export async function generateMarketingImageAction(
  input: GenerateImageInput
): Promise<string> {
  return marketingImageAction(input);
}

export async function regenerateVisualPromptAction(
  input: RegeneratePromptInput
): Promise<string> {
  return visualPromptAction(input);
}

export async function generateImageFromReferenceAction(
  input: GenerateFromReferenceInput
): Promise<string> {
  return referenceImageAction(input);
}

export async function hasServerApiKey(): Promise<boolean> {
  return !!process.env.GEMINI_API_KEY;
}
