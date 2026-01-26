import { NextRequest, NextResponse } from "next/server";

const MODEL = "gpt-5.2";

const INSTRUCTIONS = `You are an Environment Autofill Extractor. Analyze ONE environment/scene image and fill the application's environment fields with high fidelity and strict grounding.

Return ONLY valid JSON matching the provided json_schema. No extra keys. No markdown. No commentary.

GROUNDING RULES
- Do NOT invent objects, structures, signage text, logos, off-camera rooms, or unseen surfaces.
- If a detail cannot be confirmed visually, OMIT it. Do not guess.
- Environment-focused: do not describe character identity or wardrobe. If figures are present, mention only “a figure/character is present” briefly.

DETAIL TARGET (HIGH DETAIL, LOW REPETITION)
- Maintain high detail, but do not repeat the same facts across fields.
- scene_description = cohesive prompt-ready environment description with concrete materials and micro-details.
- Notes fields = technical reconstruction cues (layout/lighting/palette/camera) as newline-separated bullets (6–10 bullets each).
- Constraints = short “do not change” identity locks, one per line (6–14 lines).

FIELD REQUIREMENTS
- scene_description: 8–14 dense objective sentences; include setting, dominant structures/objects, materials/surfaces, and at least 10 micro-details.
- stage_anchors: 3–5 stable physical elements; each has name, position (left/center/right + foreground/midground/background + near/far), material_texture, unique_detail.
- spatial_layout_notes / lighting_notes / color_palette_grade_notes / camera_view_notes: 6–10 newline bullets each.
- environment_do_not_change_constraints: 6–14 short lines, one per line.`;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    scene_description: { type: "string" },
    stage_anchors: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          position: { type: "string" },
          material_texture: { type: "string" },
          unique_detail: { type: "string" },
        },
        required: ["name", "position", "material_texture", "unique_detail"],
      },
    },
    spatial_layout_notes: { type: "string" },
    lighting_notes: { type: "string" },
    color_palette_grade_notes: { type: "string" },
    camera_view_notes: { type: "string" },
    environment_do_not_change_constraints: { type: "string" },
  },
  required: [
    "scene_description",
    "stage_anchors",
    "spatial_layout_notes",
    "lighting_notes",
    "color_palette_grade_notes",
    "camera_view_notes",
    "environment_do_not_change_constraints",
  ],
};

function getOutputText(payload: any): string | null {
  if (typeof payload?.output_text === "string") {
    return payload.output_text;
  }
  const output = payload?.output?.[0]?.content;
  if (Array.isArray(output)) {
    const textItem = output.find((item: any) => item.type === "output_text" && typeof item.text === "string");
    if (textItem?.text) return textItem.text;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error: { message: "OPENAI_API_KEY is not configured", code: "MISSING_OPENAI_KEY" },
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("image");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: { message: "Image file is required", code: "MISSING_IMAGE" } },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "image/png";
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        instructions: INSTRUCTIONS,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: "Analyze this environment image and fill the schema with grounded details.",
              },
              {
                type: "input_image",
                image_url: dataUrl,
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "environment_autofill",
            strict: true,
            schema: RESPONSE_SCHEMA,
          },
        },
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      console.error("OpenAI environment analysis failed:", payload);
      return NextResponse.json(
        {
          ok: false,
          error: { message: "Failed to analyze environment image", code: "OPENAI_ERROR" },
        },
        { status: 500 }
      );
    }

    const outputText = getOutputText(payload);
    if (!outputText) {
      console.error("OpenAI response missing output text:", payload);
      return NextResponse.json(
        {
          ok: false,
          error: { message: "Invalid OpenAI response", code: "INVALID_OPENAI_RESPONSE" },
        },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(outputText);
    return NextResponse.json({ ok: true, data: parsed });
  } catch (error) {
    console.error("Error analyzing environment image:", error);
    return NextResponse.json(
      { ok: false, error: { message: "Server error analyzing image", code: "SERVER_ERROR" } },
      { status: 500 }
    );
  }
}
