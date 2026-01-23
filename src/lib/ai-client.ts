// Client-side helpers for calling AI endpoints

import {
  AnchorSuggestions,
  MechanicLockSuggestions,
  FocusTargetSuggestions,
  MicroDetailSuggestions,
  QASuggestions,
  SceneHeartUpgrade,
  PromptRequest,
  Framing,
} from "./schemas";

interface AIResult<T> {
  ok: boolean;
  data?: T;
  error?: { message: string; code?: string };
}

async function callAI<T>(endpoint: string, body: object): Promise<AIResult<T>> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await response.json();
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : "Network error",
        code: "NETWORK_ERROR",
      },
    };
  }
}

export async function suggestAnchors(
  sceneHeart: string,
  locationType?: string
): Promise<AIResult<AnchorSuggestions>> {
  return callAI("/api/ai/suggest-anchors", { sceneHeart, locationType });
}

export async function suggestMechanicLock(
  sceneHeart: string,
  castSnippets?: string[],
  framing?: string
): Promise<AIResult<MechanicLockSuggestions>> {
  return callAI("/api/ai/suggest-mechanic-lock", { sceneHeart, castSnippets, framing });
}

export async function suggestFocusTarget(
  sceneHeart: string,
  framing?: string,
  lens?: string
): Promise<AIResult<FocusTargetSuggestions>> {
  return callAI("/api/ai/suggest-focus-target", { sceneHeart, framing, lens });
}

export async function suggestMicroDetails(
  sceneHeart: string,
  environmentAnchors?: string[]
): Promise<AIResult<MicroDetailSuggestions>> {
  return callAI("/api/ai/suggest-micro-details", { sceneHeart, environmentAnchors });
}

export async function runQACheck(
  promptRequest: Partial<PromptRequest>
): Promise<AIResult<QASuggestions>> {
  return callAI("/api/ai/qa", { promptRequest });
}

export interface UpgradeSceneHeartParams {
  sceneHeart: string;
  castSummaries?: string[];
  framing?: Framing;
  mechanicLock?: string | null;
  focusTarget?: string | null;
  existingAnchors?: string[];
  lookFamilyName?: string | null;
  lensMode?: "auto" | "manual" | null;
}

export async function upgradeSceneHeart(
  params: UpgradeSceneHeartParams
): Promise<AIResult<SceneHeartUpgrade>> {
  return callAI("/api/ai/upgrade-scene-heart", params);
}
