import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter, createJsonSystemPrompt } from "@/lib/openrouter";
import { MechanicLockSuggestionsSchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sceneHeart, castSnippets, framing } = body;

    if (!sceneHeart) {
      return NextResponse.json(
        { ok: false, error: { message: "sceneHeart is required", code: "MISSING_FIELD" } },
        { status: 400 }
      );
    }

    const systemPrompt = createJsonSystemPrompt(
      `You are an expert at writing mechanic lock sentences for image generation prompts.
A mechanic lock describes a single cause-and-effect relationship happening in the frozen moment.
It should be ONE sentence that describes what physical action causes what visible effect.
Examples:
- "The character's sharp inhale causes their fur to puff up defensively."
- "Wind from the open window sends papers scattering across the desk."
- "The weight of the heavy book bends the character's wrist slightly downward."`,
      `{
  "mechanicLocks": ["string", "string", "string", "string", "string"] // exactly 5 suggestions
}`
    );

    const castContext = castSnippets?.length 
      ? `\nCast members: ${castSnippets.join("; ")}`
      : "";
    const framingContext = framing ? `\nFraming: ${framing}` : "";

    const userPrompt = `Scene Heart: "${sceneHeart}"${castContext}${framingContext}

Generate 5 mechanic lock sentences for this scene.
Each should be ONE sentence describing a cause→effect relationship visible in the frozen moment.
Focus on physical, visual cause-and-effect that the image generator can render.`;

    const appUrl = request.headers.get("origin") || request.nextUrl.origin;
    const result = await callOpenRouter(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { appUrl }
    );

    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }

    const parsed = MechanicLockSuggestionsSchema.safeParse(result.data);
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
