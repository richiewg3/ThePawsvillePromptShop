// Server-side only OpenRouter client
// API key must NEVER be exposed to client-side code

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Default model (free tier)
const DEFAULT_MODEL = "qwen/qwen3-235b-a22b:free";

// Fallback models if default fails
const FALLBACK_MODELS = [
  "deepseek/deepseek-r1-0528:free",
  "meta-llama/llama-3.3-8b-instruct:free",
];

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterResponse {
  ok: boolean;
  data?: unknown;
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Calls OpenRouter API with JSON-only response requirement
 * This function should only be called from server-side code (API routes)
 */
export async function callOpenRouter(
  messages: OpenRouterMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<OpenRouterResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      error: {
        message: "OpenRouter API key not configured",
        code: "MISSING_API_KEY",
      },
    };
  }

  const model = options?.model || DEFAULT_MODEL;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "The Pawsville Prompt Shop",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1024,
        response_format: { type: "json_object" },
      }),
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
