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

const RETRYABLE_HTTP_STATUSES = new Set([404, 408, 409, 429, 500, 502, 503, 504]);
const RETRYABLE_ERROR_CODES = new Set(["NETWORK_ERROR", "EMPTY_RESPONSE", "INVALID_JSON"]);
const RESPONSE_FORMAT_ERROR_REGEX = /response[_\s-]?format|json[_\s-]?schema|json object/i;

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

function getDefaultAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}

function normalizeModels(model?: string): string[] {
  const models = [model || DEFAULT_MODEL, ...FALLBACK_MODELS];
  return models.filter((value, index) => models.indexOf(value) === index);
}

function isResponseFormatError(error?: OpenRouterResponse["error"]): boolean {
  if (!error?.message) return false;
  return RESPONSE_FORMAT_ERROR_REGEX.test(error.message);
}

function shouldTryNextModel(error?: OpenRouterResponse["error"]): boolean {
  if (!error?.code) return false;
  if (error.code === "MISSING_API_KEY") return false;
  if (RETRYABLE_ERROR_CODES.has(error.code)) return true;
  if (error.code.startsWith("HTTP_")) {
    const status = Number(error.code.replace("HTTP_", ""));
    if (!Number.isFinite(status)) {
      return false;
    }
    if (status === 400) {
      return /model|provider|not supported|unavailable/i.test(error.message || "");
    }
    return RETRYABLE_HTTP_STATUSES.has(status);
  }
  return false;
}

async function callOpenRouterOnce(
  apiKey: string,
  appUrl: string,
  messages: OpenRouterMessage[],
  options: {
    model: string;
    temperature?: number;
    maxTokens?: number;
    includeResponseFormat: boolean;
  }
): Promise<OpenRouterResponse> {
  const body: Record<string, unknown> = {
    model: options.model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 1024,
  };

  if (options.includeResponseFormat) {
    body.response_format = { type: "json_object" };
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": appUrl,
        "X-Title": "The Pawsville Prompt Shop",
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
 * Calls OpenRouter API with JSON-only response requirement
 * This function should only be called from server-side code (API routes)
 */
export async function callOpenRouter(
  messages: OpenRouterMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    appUrl?: string;
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

  const appUrl = options?.appUrl || getDefaultAppUrl();
  const models = normalizeModels(options?.model);
  let lastError: OpenRouterResponse | null = null;

  for (const model of models) {
    const result = await callOpenRouterOnce(apiKey, appUrl, messages, {
      model,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      includeResponseFormat: true,
    });

    if (result.ok) {
      return result;
    }

    if (isResponseFormatError(result.error)) {
      const retryWithoutFormat = await callOpenRouterOnce(apiKey, appUrl, messages, {
        model,
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
        includeResponseFormat: false,
      });

      if (retryWithoutFormat.ok) {
        return retryWithoutFormat;
      }

      lastError = retryWithoutFormat;
    } else {
      lastError = result;
    }

    if (!shouldTryNextModel(lastError.error)) {
      return lastError;
    }
  }

  return (
    lastError || {
      ok: false,
      error: {
        message: "OpenRouter request failed",
        code: "UNKNOWN_ERROR",
      },
    }
  );
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
