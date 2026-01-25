import { NextRequest, NextResponse } from "next/server";
import { callPerplexity, createJsonSystemPrompt } from "@/lib/perplexity";
import { OneAndDoneSuggestionSchema, Framing } from "@/lib/schemas";
import {
  OneAndDoneOptions,
  validateOneAndDoneSuggestion,
} from "@/lib/one-and-done";

interface OneAndDoneRequest {
  sceneHeart: string;
  castSummaries?: string[];
  framing?: Framing;
  mechanicLock?: string | null;
  focusTarget?: string | null;
  existingAnchors?: string[];
  lookOptions: OneAndDoneOptions["lookFamilies"];
  lensOptions: OneAndDoneOptions["lensProfiles"];
  microTextureOptions: OneAndDoneOptions["microTexturePacks"];
  microDetailOptions: OneAndDoneOptions["microDetailPacks"];
}

export async function POST(request: NextRequest) {
  try {
    const body: OneAndDoneRequest = await request.json();
    const {
      sceneHeart,
      castSummaries = [],
      framing = "medium",
      mechanicLock,
      focusTarget,
      existingAnchors = [],
      lookOptions,
      lensOptions,
      microTextureOptions,
      microDetailOptions,
    } = body;

    if (!sceneHeart || !sceneHeart.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: "sceneHeart is required",
            code: "INVALID_INPUT",
          },
        },
        { status: 400 }
      );
    }

    const systemPrompt = createJsonSystemPrompt(
      `You are a prompt editor for text-to-image Scene Hearts.
You must preserve the user's intent exactly.
Do not add characters or story beats.
Return JSON only in the exact schema requested.
No markdown. No commentary.`,
      `{
  "ultraPrecisePrompt": { "text": "...", "confidence": "high|medium|low" },
  "environmentAnchors": { "anchors": ["..."], "confidence": "high|medium|low" },
  "lookLens": {
    "lookFamilyId": "...",
    "lensMode": "auto|manual",
    "lensProfileId": "...",
    "confidence": "high|medium|low",
    "alternate": {
      "lookFamilyId": "...",
      "lensMode": "auto|manual",
      "lensProfileId": "..."
    }
  },
  "mechanicLock": { "text": "...", "confidence": "high|medium|low" },
  "focusTarget": { "text": "...", "confidence": "high|medium|low" },
  "microPacks": {
    "texturePackIds": ["..."],
    "detailPackIds": ["..."],
    "confidence": "high|medium|low"
  },
  "assumptions": ["..."]
}`
    );

    const castSection =
      castSummaries.length > 0
        ? castSummaries.join("\n")
        : "(No cast specified)";

    const existingAnchorsSection =
      existingAnchors.filter((a) => a.trim()).length > 0
        ? existingAnchors.filter((a) => a.trim()).join(", ")
        : "(None provided - infer from scene)";

    const userPrompt = `TASK:
1) Rewrite the user's Scene Heart into an Ultra-Precise version.
2) Recommend configuration suggestions (as structured JSON) using ONLY the provided option IDs.

HARD CONSTRAINTS:
- Preserve meaning, characters, setting, and single frozen moment.
- Do NOT add characters, props, or new events.
- Provide environment anchors (3–5) with explicit placement info:
  include left/right/foreground/background, approximate distance, and what must be visible.
- Look & Lens: choose from provided look/lens IDs only.
- If lensMode is "manual", you MUST supply a valid lensProfileId.
- If lensMode is "auto", omit lensProfileId.
- Mechanical lock and focus target are free-text, but must match the scene.
- Micro packs: choose from provided texture/detail pack IDs only.
- Provide confidence (high/medium/low) for each category.
- If look/lens confidence is medium or low, provide an alternate look/lens recommendation.
- Provide assumptions list about anything you had to infer.

CONTEXT:
CAST (do not add anyone else):
${castSection}

FRAMING:
${framing}

MECHANIC LOCK (current, optional):
${mechanicLock || "(None provided)"}

FOCUS TARGET (current, optional):
${focusTarget || "(None provided)"}

EXISTING ANCHORS (optional):
${existingAnchorsSection}

LOOK OPTIONS (choose by id):
${JSON.stringify(lookOptions, null, 2)}

LENS OPTIONS (choose by id):
${JSON.stringify(lensOptions, null, 2)}

MICRO TEXTURE PACKS (choose by id):
${JSON.stringify(microTextureOptions, null, 2)}

MICRO DETAIL PACKS (choose by id):
${JSON.stringify(microDetailOptions, null, 2)}

USER SCENE HEART:
${sceneHeart}

OUTPUT JSON SCHEMA (must match exactly):
{
  "ultraPrecisePrompt": { "text": "...", "confidence": "high|medium|low" },
  "environmentAnchors": { "anchors": ["..."], "confidence": "high|medium|low" },
  "lookLens": {
    "lookFamilyId": "...",
    "lensMode": "auto|manual",
    "lensProfileId": "...",
    "confidence": "high|medium|low",
    "alternate": {
      "lookFamilyId": "...",
      "lensMode": "auto|manual",
      "lensProfileId": "..."
    }
  },
  "mechanicLock": { "text": "...", "confidence": "high|medium|low" },
  "focusTarget": { "text": "...", "confidence": "high|medium|low" },
  "microPacks": {
    "texturePackIds": ["..."],
    "detailPackIds": ["..."],
    "confidence": "high|medium|low"
  },
  "assumptions": ["..."]
}`;

    const result = await callPerplexity(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        temperature: 0.4,
        maxTokens: 2048,
      }
    );

    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }

    const parsed = OneAndDoneSuggestionSchema.safeParse(result.data);
    if (!parsed.success) {
      console.error("Schema validation failed:", parsed.error.issues);
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: "Invalid AI response format",
            code: "INVALID_FORMAT",
          },
        },
        { status: 500 }
      );
    }

    const validated = validateOneAndDoneSuggestion(parsed.data, {
      lookFamilies: lookOptions,
      lensProfiles: lensOptions,
      microTexturePacks: microTextureOptions,
      microDetailPacks: microDetailOptions,
    });

    return NextResponse.json({
      ok: true,
      data: validated,
    });
  } catch (error) {
    console.error("One & Done error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: error instanceof Error ? error.message : "Unknown error",
          code: "SERVER_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
