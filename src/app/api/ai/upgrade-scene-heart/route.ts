import { NextRequest, NextResponse } from "next/server";
import { callPerplexity, createJsonSystemPrompt } from "@/lib/perplexity";
import { SceneHeartUpgradeSchema, Framing } from "@/lib/schemas";

interface UpgradeSceneHeartRequest {
  sceneHeart: string;
  castSummaries?: string[];
  framing?: Framing;
  mechanicLock?: string | null;
  focusTarget?: string | null;
  existingAnchors?: string[];
  lookFamilyName?: string | null;
  lensMode?: "auto" | "manual" | null;
}

export async function POST(request: NextRequest) {
  try {
    const body: UpgradeSceneHeartRequest = await request.json();
    const {
      sceneHeart,
      castSummaries = [],
      framing = "medium",
      mechanicLock,
      focusTarget,
      existingAnchors = [],
      lookFamilyName,
    } = body;

    // Validate required field
    if (!sceneHeart || sceneHeart.trim().length < 20) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: "sceneHeart must be at least 20 characters",
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
  "versions": { "clean": "...", "cinematic": "...", "precise": "..." },
  "anchorCandidates": ["..."],
  "recommendedAnchors": ["..."]
}`
    );

    // Build context sections
    const castSection =
      castSummaries.length > 0
        ? castSummaries.join("\n")
        : "(No cast specified)";

    const existingAnchorsSection =
      existingAnchors.filter((a) => a.trim()).length > 0
        ? existingAnchors.filter((a) => a.trim()).join(", ")
        : "(None provided - infer from scene)";

    const userPrompt = `TASK:
1) Rewrite the user's Scene Heart into three versions:
   - clean (default)
   - cinematic
   - precise
2) Suggest environment anchors:
   - anchorCandidates: 8–12 short phrases
   - recommendedAnchors: pick the best 3–5 from candidates

HARD CONSTRAINTS:
- Keep the same meaning, characters, setting, and single frozen moment.
- Do NOT add characters, props, or new events.
- Descriptor-only (no new proper names).
- Each rewrite must include:
  - WHO/WHAT/WHERE clearly
  - at least 2 body-language cues (eyes/mouth/posture/hands)
- If mechanicLock is provided, reflect its cause→effect logic implicitly (do not quote it).
- If existingAnchors are provided (non-empty), incorporate at least 2 of them in each rewrite.
- If existingAnchors are empty, infer anchors from the Scene Heart and setting.
- Do NOT mention GLOBAL LAWS.
- Output must be ONE paragraph per version.

STYLE DEFINITIONS:
- clean: straightforward, concrete, 3–6 sentences, no flourish
- cinematic: film-still voice, stronger verbs, still factual, 3–7 sentences
- precise: minimal style, maximum clarity, may be 4–8 sentences

CONTEXT:
CAST (do not add anyone else):
${castSection}

FRAMING:
${framing}

MECHANIC LOCK (optional):
${mechanicLock || "(None provided)"}

FOCUS TARGET (optional):
${focusTarget || "(None provided)"}

EXISTING ANCHORS (optional):
${existingAnchorsSection}

LOOK FAMILY (optional):
${lookFamilyName || "(None specified)"}

USER SCENE HEART:
${sceneHeart}

OUTPUT JSON SCHEMA (must match exactly):
{
  "versions": { "clean": "...", "cinematic": "...", "precise": "..." },
  "anchorCandidates": ["..."],
  "recommendedAnchors": ["..."]
}`;

    const result = await callPerplexity(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        temperature: 0.5, // Moderate temperature to balance creativity and consistency
        maxTokens: 2048, // Enough for 3 versions + anchors
      }
    );

    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }

    // Validate response shape
    const parsed = SceneHeartUpgradeSchema.safeParse(result.data);
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

    // Ensure recommendedAnchors are a subset of anchorCandidates (dedupe if needed)
    const { versions, anchorCandidates, recommendedAnchors } = parsed.data;
    
    // Remove duplicates from anchorCandidates
    const uniqueCandidates = [...new Set(anchorCandidates)];
    
    // Ensure recommended anchors are in candidates
    const validRecommended = recommendedAnchors.filter((a) =>
      uniqueCandidates.includes(a)
    );
    
    // If we lost some recommended, pick from candidates
    const finalRecommended =
      validRecommended.length >= 3
        ? validRecommended.slice(0, 5)
        : uniqueCandidates.slice(0, 5);

    return NextResponse.json({
      ok: true,
      data: {
        versions,
        anchorCandidates: uniqueCandidates,
        recommendedAnchors: finalRecommended,
      },
    });
  } catch (error) {
    console.error("Upgrade scene heart error:", error);
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
