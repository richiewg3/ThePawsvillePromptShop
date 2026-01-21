import { NextRequest, NextResponse } from "next/server";
import { callPerplexity, createJsonSystemPrompt } from "@/lib/perplexity";
import { MicroDetailSuggestionsSchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sceneHeart, environmentAnchors } = body;

    if (!sceneHeart) {
      return NextResponse.json(
        { ok: false, error: { message: "sceneHeart is required", code: "MISSING_FIELD" } },
        { status: 400 }
      );
    }

    const systemPrompt = createJsonSystemPrompt(
      `You are an expert at generating micro-detail suggestions for image generation prompts.
Micro-details are small environmental and atmospheric elements that add richness and believability.
They include things like: dust motes in light, condensation on glass, scuff marks, small debris, atmospheric effects, light interactions.
Each detail should be a specific, descriptive phrase that adds visual interest without overwhelming the scene.
Examples:
- "dust motes floating in the window light"
- "condensation droplets on the cold glass"
- "faint scuff marks on the wooden floor"
- "subtle steam rising from the hot beverage"`,
      `{
  "microDetails": ["string", "string", ...] // exactly 12 suggestions
}`
    );

    const anchorsContext = environmentAnchors?.length 
      ? `\nEnvironment anchors: ${environmentAnchors.join(", ")}`
      : "";

    const userPrompt = `Scene Heart: "${sceneHeart}"${anchorsContext}

Generate 12 specific micro-detail suggestions for this scene.
Each should be a descriptive phrase for a small visual element that adds richness.
Include a mix of: atmospheric effects, wear/age signs, light interactions, and small environmental elements.`;

    const result = await callPerplexity([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }

    const parsed = MicroDetailSuggestionsSchema.safeParse(result.data);
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
