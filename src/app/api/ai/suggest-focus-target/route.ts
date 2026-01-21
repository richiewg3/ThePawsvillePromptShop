import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter, createJsonSystemPrompt } from "@/lib/openrouter";
import { FocusTargetSuggestionsSchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sceneHeart, framing, lens } = body;

    if (!sceneHeart) {
      return NextResponse.json(
        { ok: false, error: { message: "sceneHeart is required", code: "MISSING_FIELD" } },
        { status: 400 }
      );
    }

    const systemPrompt = createJsonSystemPrompt(
      `You are an expert at writing focus target descriptions for image generation prompts.
A focus target describes what MUST be sharp and in-focus in the image.
It should be a short sentence that clearly identifies the primary focus subject and indicates what can be secondary.
Consider the framing (tight vs wide) and lens (shallow vs deep DOF) when suggesting focus.
Examples:
- "Focus on the dragon's face and torso; background secondary."
- "Sharp focus on hands and the object being held; face softly defocused."
- "Eyes razor-sharp; shallow depth allows background blur."`,
      `{
  "focusTargets": ["string", "string", "string"] // exactly 3 suggestions
}`
    );

    const framingContext = framing ? `\nFraming: ${framing}` : "";
    const lensContext = lens ? `\nLens: ${lens}` : "";

    const userPrompt = `Scene Heart: "${sceneHeart}"${framingContext}${lensContext}

Generate 3 focus target descriptions for this scene.
Each should be a short sentence describing what MUST be sharp and what can be secondary.
Consider depth of field implications based on framing and lens.`;

    const result = await callOpenRouter([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }

    const parsed = FocusTargetSuggestionsSchema.safeParse(result.data);
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
