import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter, createJsonSystemPrompt } from "@/lib/openrouter";
import { AnchorSuggestionsSchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sceneHeart, locationType } = body;

    if (!sceneHeart) {
      return NextResponse.json(
        { ok: false, error: { message: "sceneHeart is required", code: "MISSING_FIELD" } },
        { status: 400 }
      );
    }

    const systemPrompt = createJsonSystemPrompt(
      `You are an expert at generating environmental anchor suggestions for image generation prompts.
Given a scene description, suggest specific, concrete objects and elements that would ground the scene visually.
Focus on tangible items with clear visual presence - avoid vague terms like "stuff" or "items".
Consider the setting, mood, and what would naturally exist in this environment.`,
      `{
  "anchorCandidates": ["string", "string", ...], // exactly 10 suggestions
  "recommended": ["string", "string", ...] // exactly 5 best picks
}`
    );

    const userPrompt = `Scene Heart: "${sceneHeart}"${locationType ? `\nLocation hint: ${locationType}` : ""}

Generate 10 specific environmental anchors for this scene, then pick the 5 best ones.
Each anchor should be a short phrase describing a specific, visible object or element.
Examples: "worn leather armchair", "steaming coffee mug", "rain-streaked window", "flickering neon sign"`;

    const result = await callOpenRouter([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }

    // Validate response shape
    const parsed = AnchorSuggestionsSchema.safeParse(result.data);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { message: "Invalid AI response format", code: "INVALID_FORMAT" } },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: parsed.data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: error instanceof Error ? error.message : "Unknown error", code: "SERVER_ERROR" } },
      { status: 500 }
    );
  }
}
