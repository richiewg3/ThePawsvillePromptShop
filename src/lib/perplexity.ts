// Server-side only Perplexity API client
// API key must NEVER be exposed to client-side code

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

// Using Sonar Pro model
const MODEL = "sonar-pro";

export interface PerplexityMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface PerplexityResponse {
  ok: boolean;
  data?: unknown;
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Calls Perplexity API with JSON response requirement
 * This function should only be called from server-side code (API routes)
 */
export async function callPerplexity(
  messages: PerplexityMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<PerplexityResponse> {
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      error: {
        message: "Perplexity API key not configured",
        code: "MISSING_API_KEY",
      },
    };
  }

  const body = {
    model: MODEL,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 1024,
  };

  try {
    const response = await fetch(PERPLEXITY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        ok: false,
        error: {
          message: errorData.error?.message || `API error: ${response.status}`,
          code: `HTTP_${response.status}`,
        },
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        ok: false,
        error: {
          message: "No content in response",
          code: "EMPTY_RESPONSE",
        },
      };
    }

    if (typeof content === "object") {
      return {
        ok: true,
        data: content,
      };
    }

    if (typeof content !== "string") {
      return {
        ok: false,
        error: {
          message: "Unexpected response format from AI",
          code: "INVALID_JSON",
        },
      };
    }

    // Parse JSON response
    try {
      const parsed = JSON.parse(content);
      return {
        ok: true,
        data: parsed,
      };
    } catch {
      // Attempt to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1].trim());
          return {
            ok: true,
            data: parsed,
          };
        } catch {
          // Fall through to error
        }
      }

      // Try to find JSON object or array in the response
      const objectMatch = content.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        try {
          const parsed = JSON.parse(objectMatch[0]);
          return {
            ok: true,
            data: parsed,
          };
        } catch {
          // Fall through to error
        }
      }

      return {
        ok: false,
        error: {
          message: "Failed to parse JSON response from AI",
          code: "INVALID_JSON",
        },
      };
    }
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : "Unknown error",
        code: "NETWORK_ERROR",
      },
    };
  }
}

/**
 * Helper to create a system prompt that enforces JSON-only output
 */
export function createJsonSystemPrompt(basePrompt: string, schema: string): string {
  return `${basePrompt}

CRITICAL: You MUST respond with valid JSON only. No markdown, no explanations, no commentary.
Your response must match this schema:
${schema}

Do not wrap the JSON in code blocks. Output raw JSON only.`;
}
