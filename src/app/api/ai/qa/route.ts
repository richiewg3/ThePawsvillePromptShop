import { NextRequest, NextResponse } from "next/server";
import { callPerplexity, createJsonSystemPrompt } from "@/lib/perplexity";
import { QASuggestionsSchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { promptRequest } = body;

    if (!promptRequest) {
      return NextResponse.json(
        { ok: false, error: { message: "promptRequest is required", code: "MISSING_FIELD" } },
        { status: 400 }
      );
    }

    const systemPrompt = createJsonSystemPrompt(
      `You are an expert QA reviewer for image generation prompts.
Your job is to identify potential issues, contradictions, or missing information in a structured prompt request.
Focus on:
1. Contradictions between scene description and other elements
2. Vague or unclear descriptions that could confuse the generator
3. Missing context that would help the generator
4. Potential composition issues (lens + framing mismatches)
5. Scale or proportion problems

Do NOT suggest changes to character identities or wardrobes - those are locked.
Only flag genuine issues that could affect image quality.`,
      `{
  "warnings": ["string", ...], // list of potential issues found
  "suggestedFixes": ["string", ...] // actionable suggestions for each warning
}`
    );

    const userPrompt = `Review this prompt request for potential issues:

Scene Heart: "${promptRequest.sceneHeart || "Not provided"}"
Framing: ${promptRequest.framing || "Not specified"}
Lens Mode: ${promptRequest.lensMode || "Not specified"}
Mechanic Lock: "${promptRequest.mechanicLock || "Not provided"}"
Focus Target: "${promptRequest.focusTarget || "Not provided"}"
Environment Anchors: ${promptRequest.environmentAnchors?.join(", ") || "None"}
Cast count: ${promptRequest.cast?.length || 0} characters

Identify any issues and provide actionable suggestions. Return empty arrays if no issues found.`;

    const result = await callPerplexity([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }

    const parsed = QASuggestionsSchema.safeParse(result.data);
    if (!parsed.success) {
      // If parsing fails, return empty arrays as fallback
      return NextResponse.json({ 
        ok: true, 
        data: { warnings: [], suggestedFixes: [] } 
      });
    }

    return NextResponse.json({ ok: true, data: parsed.data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: error instanceof Error ? error.message : "Unknown error", code: "SERVER_ERROR" } },
      { status: 500 }
    );
  }
}
