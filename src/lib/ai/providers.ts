/**
 * Provider abstraction layer for AI streaming.
 * Supports Anthropic (Claude Haiku) and DeepSeek (economy tier).
 * Automatic fallback: DeepSeek failure → Anthropic.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Tier } from "./classifier";

export interface StreamParams {
  systemPrompt: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens: number;
}

export interface RouteDecision {
  tier: Tier;
  provider: "anthropic" | "deepseek";
  model: string;
  usedFallback: boolean;
  reason: string;
}

export interface StreamResult {
  stream: ReadableStream<Uint8Array>;
  decision: RouteDecision;
}

// ─── Anthropic (premium) ─────────────────────────────────────────────────────

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

async function streamAnthropic(params: StreamParams): Promise<ReadableStream<Uint8Array>> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const stream = await anthropic.messages.stream({
    model: ANTHROPIC_MODEL,
    max_tokens: params.maxTokens,
    system: params.systemPrompt,
    messages: params.messages,
  });

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(new TextEncoder().encode(event.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
  });
}

// ─── DeepSeek (economy) ──────────────────────────────────────────────────────

const DEEPSEEK_MODEL = "deepseek-chat";
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_TIMEOUT_MS = 8000; // 8s to connect, then stream continues

async function streamDeepSeek(params: StreamParams): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY non configurée");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEEPSEEK_TIMEOUT_MS);

  const response = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      stream: true,
      max_tokens: params.maxTokens,
      messages: [
        { role: "system", content: params.systemPrompt },
        ...params.messages,
      ],
    }),
    signal: controller.signal,
  });

  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error(`DeepSeek HTTP ${response.status}`);
  }

  if (!response.body) throw new Error("DeepSeek response body null");

  // Parse SSE stream and forward text deltas
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(streamController) {
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            if (!trimmed.startsWith("data: ")) continue;

            try {
              const json = JSON.parse(trimmed.slice(6));
              const delta = json?.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta.length > 0) {
                streamController.enqueue(new TextEncoder().encode(delta));
              }
            } catch {
              // Malformed SSE line — skip
            }
          }
        }
      } finally {
        streamController.close();
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}

// ─── Router ───────────────────────────────────────────────────────────────────

export async function routeAndStream(
  tier: Tier,
  reason: string,
  params: StreamParams,
): Promise<StreamResult> {
  // Economy tier: try DeepSeek first
  if (tier === "economy" && process.env.DEEPSEEK_API_KEY) {
    try {
      const stream = await streamDeepSeek(params);
      return {
        stream,
        decision: {
          tier: "economy",
          provider: "deepseek",
          model: DEEPSEEK_MODEL,
          usedFallback: false,
          reason,
        },
      };
    } catch (err) {
      console.warn("[ai/router] DeepSeek failed, falling back to Anthropic:", err instanceof Error ? err.message : err);
      // Fall through to Anthropic
    }
  }

  // Premium tier or fallback: Anthropic
  const stream = await streamAnthropic(params);
  const usedFallback = tier === "economy";

  return {
    stream,
    decision: {
      tier: usedFallback ? "economy" : "premium",
      provider: "anthropic",
      model: ANTHROPIC_MODEL,
      usedFallback,
      reason: usedFallback ? `${reason} [fallback DeepSeek→Haiku]` : reason,
    },
  };
}
