import { Router, type Request, type Response } from "express";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../lib/logger";

const router = Router();

// ── Integration / API-key availability checks ──────────────────────
// Priority: Replit AI Integration env vars first, then standard API keys.

function resolveOpenAICredentials(): { apiKey: string; baseURL?: string } | null {
  if (process.env.AI_INTEGRATIONS_OPENAI_API_KEY && process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
    return { apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY, baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL };
  }
  if (process.env.OPENAI_API_KEY) {
    return { apiKey: process.env.OPENAI_API_KEY };
  }
  return null;
}

function resolveAnthropicCredentials(): { apiKey: string; baseURL?: string } | null {
  if (process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY && process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL) {
    return { apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY, baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return { apiKey: process.env.ANTHROPIC_API_KEY };
  }
  return null;
}

function openaiReady(): boolean { return resolveOpenAICredentials() !== null; }
function anthropicReady(): boolean { return resolveAnthropicCredentials() !== null; }

// Lazy clients — instantiated fresh so they pick up env vars added/changed at runtime
function getOpenAIClient() {
  const creds = resolveOpenAICredentials()!;
  return new OpenAI({ apiKey: creds.apiKey, ...(creds.baseURL ? { baseURL: creds.baseURL } : {}) });
}
function getAnthropicClient() {
  const creds = resolveAnthropicCredentials()!;
  return new Anthropic({ apiKey: creds.apiKey, ...(creds.baseURL ? { baseURL: creds.baseURL } : {}) });
}

const SETUP_HINT = "Add your API key as a Secret in Replit (padlock icon) — OPENAI_API_KEY or ANTHROPIC_API_KEY — then restart the server. Alternatively go to Tools → Integrations and add the Replit AI integration.";

function requireOpenAI(res: Response): boolean {
  if (!openaiReady()) {
    res.status(503).json({
      error: {
        message: `OpenAI credentials not found. ${SETUP_HINT}`,
        type: "integration_error",
      },
    });
    return false;
  }
  return true;
}

function requireAnthropic(res: Response): boolean {
  if (!anthropicReady()) {
    res.status(503).json({
      error: {
        message: `Anthropic credentials not found. ${SETUP_HINT}`,
        type: "integration_error",
      },
    });
    return false;
  }
  return true;
}

const OPENAI_MODELS = ["gpt-5.2", "gpt-5-mini", "gpt-5-nano", "o4-mini", "o3"];
const ANTHROPIC_MODELS = ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5"];
const SUPPORTED_MODELS = new Set([...OPENAI_MODELS, ...ANTHROPIC_MODELS]);

function extractToken(req: Request): string {
  // Accept either: Authorization: Bearer <token>  OR  x-api-key: <token>
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  const xApiKey = req.headers["x-api-key"];
  if (typeof xApiKey === "string") return xApiKey;
  return "";
}

function verifyToken(req: Request, res: Response): boolean {
  // Default to "123456" so the gateway works out-of-the-box without any secrets setup
  const proxyKey = process.env.PROXY_API_KEY || "123456";
  const token = extractToken(req);
  if (token !== proxyKey) {
    res.status(401).json({ error: { message: "Unauthorized: invalid or missing Bearer token", type: "authentication_error" } });
    return false;
  }
  return true;
}

function isOpenAIModel(model: string): boolean {
  return SUPPORTED_MODELS.has(model) && (model.startsWith("gpt-") || model.startsWith("o"));
}

function isAnthropicModel(model: string): boolean {
  return SUPPORTED_MODELS.has(model) && model.startsWith("claude-");
}

function isSupportedModel(model: string): boolean {
  return SUPPORTED_MODELS.has(model);
}

function tryFlush(res: Response) {
  try {
    if (typeof (res as unknown as { flush?: () => void }).flush === "function") {
      (res as unknown as { flush: () => void }).flush();
    }
  } catch { /* ignore */ }
}

function sendErrorSafe(res: Response, status: number, message: string, type = "api_error") {
  if (res.headersSent) {
    // Can't change status — write error as SSE event then end
    try {
      res.write(`data: ${JSON.stringify({ error: { message, type } })}\n\n`);
      res.end();
    } catch { /* ignore */ }
  } else {
    res.status(status).json({ error: { message, type } });
  }
}

// ── Tool conversion helpers ─────────────────────────────────────────

type OAITool = {
  type: "function";
  function: { name: string; description?: string; parameters?: unknown };
};

type AnthropicTool = {
  name: string;
  description?: string;
  input_schema: unknown;
};

function oaiToolsToAnthropic(tools: OAITool[]): AnthropicTool[] {
  return tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters || { type: "object", properties: {} },
  }));
}

function anthropicToolsToOAI(tools: AnthropicTool[]): OAITool[] {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));
}

function oaiToolChoiceToAnthropic(tc: unknown): Anthropic.Messages.ToolChoiceAny | Anthropic.Messages.ToolChoiceAuto | Anthropic.Messages.ToolChoiceTool | undefined {
  if (!tc) return undefined;
  if (typeof tc === "string") {
    if (tc === "none") return undefined;
    if (tc === "auto") return { type: "auto" };
    if (tc === "required") return { type: "any" };
  }
  if (typeof tc === "object" && tc !== null && "function" in tc) {
    const obj = tc as { type: string; function: { name: string } };
    return { type: "tool", name: obj.function.name };
  }
  return undefined;
}

function anthropicToolChoiceToOAI(tc: unknown): unknown {
  if (!tc || typeof tc !== "object") return undefined;
  const obj = tc as { type: string; name?: string };
  if (obj.type === "auto") return "auto";
  if (obj.type === "any") return "required";
  if (obj.type === "tool") return { type: "function", function: { name: obj.name } };
  return undefined;
}

// ── Message conversion helpers ──────────────────────────────────────

type OAIMessage = {
  role: string;
  content: unknown;
  tool_calls?: unknown[];
  tool_call_id?: string;
  name?: string;
};

type AnthropicMessage = {
  role: "user" | "assistant";
  content: unknown;
};

function oaiMessagesToAnthropic(messages: OAIMessage[]): { system?: string; messages: AnthropicMessage[] } {
  let system: string | undefined;
  const converted: AnthropicMessage[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      system = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
      continue;
    }

    if (msg.role === "tool") {
      const last = converted[converted.length - 1];
      const toolResult = {
        type: "tool_result" as const,
        tool_use_id: msg.tool_call_id || "",
        content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
      };
      if (last && last.role === "user" && Array.isArray(last.content)) {
        (last.content as unknown[]).push(toolResult);
      } else {
        converted.push({ role: "user", content: [toolResult] });
      }
      continue;
    }

    if (msg.role === "assistant" && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
      const blocks: unknown[] = [];
      if (msg.content) {
        blocks.push({ type: "text", text: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content) });
      }
      for (const tc of msg.tool_calls as Array<{ id: string; function: { name: string; arguments: string } }>) {
        let input: unknown = {};
        try { input = JSON.parse(tc.function.arguments); } catch { input = {}; }
        blocks.push({ type: "tool_use", id: tc.id, name: tc.function.name, input });
      }
      converted.push({ role: "assistant", content: blocks });
      continue;
    }

    converted.push({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content,
    });
  }

  return { system, messages: converted };
}

function anthropicMessagesToOAI(messages: AnthropicMessage[], system?: string): OAIMessage[] {
  const result: OAIMessage[] = [];
  if (system) result.push({ role: "system", content: system });

  for (const msg of messages) {
    if (Array.isArray(msg.content)) {
      const toolResults = (msg.content as Array<{ type: string; tool_use_id?: string; content?: unknown }>).filter(b => b.type === "tool_result");
      const toolUses = (msg.content as Array<{ type: string; id?: string; name?: string; input?: unknown }>).filter(b => b.type === "tool_use");

      if (toolResults.length > 0) {
        for (const tr of toolResults) {
          result.push({
            role: "tool",
            tool_call_id: tr.tool_use_id || "",
            content: typeof tr.content === "string" ? tr.content : JSON.stringify(tr.content),
          });
        }
        continue;
      }

      if (toolUses.length > 0 && msg.role === "assistant") {
        const textBlocks = (msg.content as Array<{ type: string; text?: string }>).filter(b => b.type === "text");
        const textContent = textBlocks.map(b => b.text).join("");
        result.push({
          role: "assistant",
          content: textContent || null,
          tool_calls: toolUses.map(tu => ({
            id: tu.id || "",
            type: "function",
            function: { name: tu.name || "", arguments: JSON.stringify(tu.input || {}) },
          })),
        });
        continue;
      }

      const text = (msg.content as Array<{ type: string; text?: string }>)
        .filter(b => b.type === "text")
        .map(b => b.text)
        .join("");
      result.push({ role: msg.role, content: text });
    } else {
      result.push({ role: msg.role, content: msg.content });
    }
  }

  return result;
}

// ── Anthropic response → OAI format ────────────────────────────────

function anthropicResponseToOAI(msg: Anthropic.Messages.Message, model: string): unknown {
  const toolUseBlocks = msg.content.filter(b => b.type === "tool_use") as Anthropic.Messages.ToolUseBlock[];
  const textBlocks = msg.content.filter(b => b.type === "text") as Anthropic.Messages.TextBlock[];
  const text = textBlocks.map(b => b.text).join("");

  let finishReason = "stop";
  if (msg.stop_reason === "tool_use") finishReason = "tool_calls";
  else if (msg.stop_reason === "max_tokens") finishReason = "length";

  const message: Record<string, unknown> = {
    role: "assistant",
    content: text || null,
  };

  if (toolUseBlocks.length > 0) {
    message.tool_calls = toolUseBlocks.map(b => ({
      id: b.id,
      type: "function",
      function: { name: b.name, arguments: JSON.stringify(b.input) },
    }));
  }

  return {
    id: msg.id,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, message, finish_reason: finishReason, logprobs: null }],
    usage: {
      prompt_tokens: msg.usage.input_tokens,
      completion_tokens: msg.usage.output_tokens,
      total_tokens: msg.usage.input_tokens + msg.usage.output_tokens,
    },
  };
}

// ── GET /v1/models ──────────────────────────────────────────────────

router.get("/models", (req: Request, res: Response) => {
  if (!verifyToken(req, res)) return;

  const now = Math.floor(Date.now() / 1000);
  const models = [
    ...OPENAI_MODELS.map(id => ({ id, object: "model", created: now, owned_by: "openai" })),
    ...ANTHROPIC_MODELS.map(id => ({ id, object: "model", created: now, owned_by: "anthropic" })),
  ];

  res.json({ object: "list", data: models });
});

// ── POST /v1/chat/completions ───────────────────────────────────────

router.post("/chat/completions", async (req: Request, res: Response) => {
  if (!verifyToken(req, res)) return;

  const body = req.body as {
    model: string;
    messages: OAIMessage[];
    stream?: boolean;
    tools?: OAITool[];
    tool_choice?: unknown;
    max_tokens?: number;
    max_completion_tokens?: number;
    temperature?: number;
    [key: string]: unknown;
  };

  const { model, messages, stream, tools, tool_choice, ...rest } = body;

  if (!model) {
    res.status(400).json({ error: { message: "model is required", type: "invalid_request_error" } });
    return;
  }

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: { message: "messages is required and must be an array", type: "invalid_request_error" } });
    return;
  }

  try {
    if (isOpenAIModel(model)) {
      // ── OpenAI path ──
      if (!requireOpenAI(res)) return;
      if (stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders();

        const keepalive = setInterval(() => {
          try { res.write(": keepalive\n\n"); } catch { /* ignore */ }
        }, 5000);
        req.on("close", () => clearInterval(keepalive));

        try {
          const oaiStream = await getOpenAIClient().chat.completions.create({
            model,
            messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
            stream: true,
            ...(tools ? { tools } : {}),
            ...(tool_choice ? { tool_choice: tool_choice as OpenAI.Chat.ChatCompletionToolChoiceOption } : {}),
            ...rest,
          });

          for await (const chunk of oaiStream) {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            tryFlush(res);
          }
          res.write("data: [DONE]\n\n");
        } catch (streamErr: unknown) {
          const e = streamErr as { status?: number; message?: string };
          logger.error({ err: streamErr }, "OpenAI stream error");
          try {
            res.write(`data: ${JSON.stringify({ error: { message: e.message || "Stream error", type: "api_error" } })}\n\n`);
          } catch { /* ignore */ }
        } finally {
          clearInterval(keepalive);
          try { res.end(); } catch { /* ignore */ }
        }
      } else {
        const response = await getOpenAIClient().chat.completions.create({
          model,
          messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
          stream: false,
          ...(tools ? { tools } : {}),
          ...(tool_choice ? { tool_choice: tool_choice as OpenAI.Chat.ChatCompletionToolChoiceOption } : {}),
          ...rest,
        });
        res.json(response);
      }
    } else if (isAnthropicModel(model)) {
      // ── Anthropic path ──
      if (!requireAnthropic(res)) return;
      const { system, messages: anthropicMessages } = oaiMessagesToAnthropic(messages);
      const anthropicTools = tools ? oaiToolsToAnthropic(tools) : undefined;
      const anthropicToolChoice = tool_choice ? oaiToolChoiceToAnthropic(tool_choice) : undefined;
      const maxTokens = (body.max_tokens || body.max_completion_tokens || 8192) as number;

      if (stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders();

        const keepalive = setInterval(() => {
          try { res.write(": keepalive\n\n"); } catch { /* ignore */ }
        }, 5000);
        req.on("close", () => clearInterval(keepalive));

        try {
          const msgId = `chatcmpl-${Date.now()}`;
          const created = Math.floor(Date.now() / 1000);

          res.write(`data: ${JSON.stringify({
            id: msgId, object: "chat.completion.chunk", created, model,
            choices: [{ index: 0, delta: { role: "assistant", content: "" }, finish_reason: null }],
          })}\n\n`);

          const anthropicStream = getAnthropicClient().messages.stream({
            model,
            max_tokens: maxTokens,
            messages: anthropicMessages as Anthropic.Messages.MessageParam[],
            ...(system ? { system } : {}),
            ...(anthropicTools ? { tools: anthropicTools as Anthropic.Messages.Tool[] } : {}),
            ...(anthropicToolChoice ? { tool_choice: anthropicToolChoice } : {}),
          });

          const toolCallAccumulators: Map<string, { id: string; name: string; args: string; index: number }> = new Map();
          let toolIndex = 0;
          let currentToolId: string | null = null;

          for await (const event of anthropicStream) {
            if (event.type === "content_block_start") {
              if (event.content_block.type === "tool_use") {
                currentToolId = event.content_block.id;
                toolCallAccumulators.set(currentToolId, {
                  id: event.content_block.id,
                  name: event.content_block.name,
                  args: "",
                  index: toolIndex++,
                });
                const acc = toolCallAccumulators.get(currentToolId)!;
                res.write(`data: ${JSON.stringify({
                  id: msgId, object: "chat.completion.chunk", created, model,
                  choices: [{
                    index: 0, delta: {
                      tool_calls: [{
                        index: acc.index, id: acc.id, type: "function",
                        function: { name: acc.name, arguments: "" },
                      }],
                    }, finish_reason: null,
                  }],
                })}\n\n`);
              }
            } else if (event.type === "content_block_delta") {
              if (event.delta.type === "text_delta") {
                res.write(`data: ${JSON.stringify({
                  id: msgId, object: "chat.completion.chunk", created, model,
                  choices: [{ index: 0, delta: { content: event.delta.text }, finish_reason: null }],
                })}\n\n`);
              } else if (event.delta.type === "input_json_delta" && currentToolId) {
                const acc = toolCallAccumulators.get(currentToolId);
                if (acc) {
                  acc.args += event.delta.partial_json;
                  res.write(`data: ${JSON.stringify({
                    id: msgId, object: "chat.completion.chunk", created, model,
                    choices: [{
                      index: 0, delta: {
                        tool_calls: [{ index: acc.index, function: { arguments: event.delta.partial_json } }],
                      }, finish_reason: null,
                    }],
                  })}\n\n`);
                }
              }
            } else if (event.type === "content_block_stop") {
              currentToolId = null;
            } else if (event.type === "message_delta") {
              let finishReason = "stop";
              if (event.delta.stop_reason === "tool_use") finishReason = "tool_calls";
              else if (event.delta.stop_reason === "max_tokens") finishReason = "length";
              res.write(`data: ${JSON.stringify({
                id: msgId, object: "chat.completion.chunk", created, model,
                choices: [{ index: 0, delta: {}, finish_reason: finishReason }],
              })}\n\n`);
            }
            tryFlush(res);
          }

          res.write("data: [DONE]\n\n");
        } catch (streamErr: unknown) {
          const e = streamErr as { status?: number; message?: string };
          logger.error({ err: streamErr }, "Anthropic stream error (chat/completions)");
          try {
            res.write(`data: ${JSON.stringify({ error: { message: e.message || "Stream error", type: "api_error" } })}\n\n`);
          } catch { /* ignore */ }
        } finally {
          clearInterval(keepalive);
          try { res.end(); } catch { /* ignore */ }
        }
      } else {
        // Non-streaming: always buffer via stream().finalMessage()
        const finalMsg = await getAnthropicClient().messages.stream({
          model,
          max_tokens: maxTokens,
          messages: anthropicMessages as Anthropic.Messages.MessageParam[],
          ...(system ? { system } : {}),
          ...(anthropicTools ? { tools: anthropicTools as Anthropic.Messages.Tool[] } : {}),
          ...(anthropicToolChoice ? { tool_choice: anthropicToolChoice } : {}),
        }).finalMessage();

        res.json(anthropicResponseToOAI(finalMsg, model));
      }
    } else {
      res.status(400).json({ error: { message: `Unsupported model: ${model}. See GET /v1/models for supported models.`, type: "invalid_request_error" } });
    }
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    const status = error.status || 500;
    logger.error({ err, model, stream }, "chat/completions error");
    sendErrorSafe(res, status, error.message || "Internal server error");
  }
});

// ── Anthropic payload whitelist ─────────────────────────────────────
// Only forward fields that the Anthropic API actually accepts.
// Strips unknown extras like `context_management` to avoid upstream errors.

const ANTHROPIC_ALLOWED_FIELDS = new Set([
  "model", "messages", "system", "max_tokens", "stream",
  "tools", "tool_choice", "temperature", "top_p", "top_k",
  "stop_sequences", "metadata", "thinking",
]);

type AnthropicPayload = {
  model: string;
  messages: unknown;
  max_tokens: number;
  system?: unknown;
  tools?: unknown;
  tool_choice?: unknown;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  metadata?: unknown;
  thinking?: unknown;
};

function buildAnthropicPayload(body: Record<string, unknown>): AnthropicPayload {
  const out: Record<string, unknown> = {};
  for (const key of ANTHROPIC_ALLOWED_FIELDS) {
    if (key in body && body[key] !== undefined) {
      out[key] = body[key];
    }
  }
  // Ensure required fields have defaults
  if (!out.max_tokens) out.max_tokens = 8192;
  return out as AnthropicPayload;
}

// ── POST /v1/messages (Anthropic native) ────────────────────────────

router.post("/messages", async (req: Request, res: Response) => {
  if (!verifyToken(req, res)) return;

  const body = req.body as {
    model: string;
    messages: AnthropicMessage[];
    system?: string;
    stream?: boolean;
    tools?: AnthropicTool[];
    tool_choice?: unknown;
    max_tokens?: number;
    [key: string]: unknown;
  };

  const { model, messages, system, stream, tools, tool_choice, max_tokens = 8192 } = body;

  if (!model) {
    res.status(400).json({ error: { message: "model is required", type: "invalid_request_error" } });
    return;
  }

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: { message: "messages is required and must be an array", type: "invalid_request_error" } });
    return;
  }

  try {
    if (isAnthropicModel(model)) {
      // ── Claude → Anthropic direct ──
      if (!requireAnthropic(res)) return;
      // Use whitelist builder to strip unknown fields (e.g. context_management)
      const anthropicPayload = buildAnthropicPayload(body as Record<string, unknown>);

      if (stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders();

        const keepalive = setInterval(() => {
          try { res.write(": keepalive\n\n"); } catch { /* ignore */ }
        }, 5000);
        req.on("close", () => clearInterval(keepalive));

        try {
          const anthropicStream = getAnthropicClient().messages.stream(
            anthropicPayload as Anthropic.Messages.MessageStreamParams
          );

          for await (const event of anthropicStream) {
            const eventType = (event as { type: string }).type;
            res.write(`event: ${eventType}\ndata: ${JSON.stringify(event)}\n\n`);
            tryFlush(res);
          }
        } catch (streamErr: unknown) {
          const e = streamErr as { status?: number; message?: string };
          logger.error({ err: streamErr }, "Anthropic stream error (messages)");
          try {
            res.write(`event: error\ndata: ${JSON.stringify({ type: "error", error: { type: "api_error", message: e.message || "Stream error" } })}\n\n`);
          } catch { /* ignore */ }
        } finally {
          clearInterval(keepalive);
          try { res.end(); } catch { /* ignore */ }
        }
      } else {
        const finalMsg = await getAnthropicClient().messages.stream(
          anthropicPayload as Anthropic.Messages.MessageStreamParams
        ).finalMessage();
        res.json(finalMsg);
      }
    } else if (isOpenAIModel(model)) {
      // ── OpenAI model via /v1/messages ──
      if (!requireOpenAI(res)) return;
      const oaiMessages = anthropicMessagesToOAI(messages, system);
      const oaiTools = tools ? anthropicToolsToOAI(tools) : undefined;
      const oaiToolChoice = tool_choice ? anthropicToolChoiceToOAI(tool_choice) : undefined;

      if (stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders();

        const keepalive = setInterval(() => {
          try { res.write(": keepalive\n\n"); } catch { /* ignore */ }
        }, 5000);
        req.on("close", () => clearInterval(keepalive));

        try {
          const msgId = `msg_${Date.now()}`;

          res.write(`event: message_start\ndata: ${JSON.stringify({
            type: "message_start",
            message: { id: msgId, type: "message", role: "assistant", content: [], model, stop_reason: null, stop_sequence: null, usage: { input_tokens: 0, output_tokens: 0 } },
          })}\n\n`);

          res.write(`event: content_block_start\ndata: ${JSON.stringify({ type: "content_block_start", index: 0, content_block: { type: "text", text: "" } })}\n\n`);

          const oaiStream = await getOpenAIClient().chat.completions.create({
            model,
            messages: oaiMessages as OpenAI.Chat.ChatCompletionMessageParam[],
            stream: true,
            ...(oaiTools ? { tools: oaiTools } : {}),
            ...(oaiToolChoice ? { tool_choice: oaiToolChoice as OpenAI.Chat.ChatCompletionToolChoiceOption } : {}),
          });

          let outputTokens = 0;
          let stopReason = "end_turn";
          const toolCallAccumulators: Map<number, { id: string; name: string; args: string; blockIndex: number }> = new Map();
          let nextBlockIndex = 1;

          for await (const chunk of oaiStream) {
            const choice = chunk.choices[0];
            if (!choice) continue;
            const delta = choice.delta;

            if (delta.content) {
              outputTokens += 1;
              res.write(`event: content_block_delta\ndata: ${JSON.stringify({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: delta.content } })}\n\n`);
            }

            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const tcIdx = tc.index ?? 0;
                if (!toolCallAccumulators.has(tcIdx)) {
                  const blockIndex = nextBlockIndex++;
                  toolCallAccumulators.set(tcIdx, { id: tc.id || "", name: tc.function?.name || "", args: "", blockIndex });
                  res.write(`event: content_block_stop\ndata: ${JSON.stringify({ type: "content_block_stop", index: 0 })}\n\n`);
                  res.write(`event: content_block_start\ndata: ${JSON.stringify({ type: "content_block_start", index: blockIndex, content_block: { type: "tool_use", id: tc.id || "", name: tc.function?.name || "", input: {} } })}\n\n`);
                }
                const acc = toolCallAccumulators.get(tcIdx)!;
                if (tc.id && !acc.id) acc.id = tc.id;
                if (tc.function?.name && !acc.name) acc.name = tc.function.name;
                if (tc.function?.arguments) {
                  acc.args += tc.function.arguments;
                  res.write(`event: content_block_delta\ndata: ${JSON.stringify({ type: "content_block_delta", index: acc.blockIndex, delta: { type: "input_json_delta", partial_json: tc.function.arguments } })}\n\n`);
                }
              }
            }

            if (choice.finish_reason) {
              if (choice.finish_reason === "tool_calls") stopReason = "tool_use";
              else if (choice.finish_reason === "length") stopReason = "max_tokens";
              else stopReason = "end_turn";
            }

            tryFlush(res);
          }

          for (const acc of toolCallAccumulators.values()) {
            res.write(`event: content_block_stop\ndata: ${JSON.stringify({ type: "content_block_stop", index: acc.blockIndex })}\n\n`);
          }
          if (toolCallAccumulators.size === 0) {
            res.write(`event: content_block_stop\ndata: ${JSON.stringify({ type: "content_block_stop", index: 0 })}\n\n`);
          }

          res.write(`event: message_delta\ndata: ${JSON.stringify({ type: "message_delta", delta: { stop_reason: stopReason, stop_sequence: null }, usage: { output_tokens: outputTokens } })}\n\n`);
          res.write(`event: message_stop\ndata: ${JSON.stringify({ type: "message_stop" })}\n\n`);
        } catch (streamErr: unknown) {
          const e = streamErr as { status?: number; message?: string };
          logger.error({ err: streamErr }, "OpenAI stream error (messages)");
          try {
            res.write(`event: error\ndata: ${JSON.stringify({ type: "error", error: { type: "api_error", message: e.message || "Stream error" } })}\n\n`);
          } catch { /* ignore */ }
        } finally {
          clearInterval(keepalive);
          try { res.end(); } catch { /* ignore */ }
        }
      } else {
        const response = await getOpenAIClient().chat.completions.create({
          model,
          messages: oaiMessages as OpenAI.Chat.ChatCompletionMessageParam[],
          stream: false,
          ...(oaiTools ? { tools: oaiTools } : {}),
          ...(oaiToolChoice ? { tool_choice: oaiToolChoice as OpenAI.Chat.ChatCompletionToolChoiceOption } : {}),
        });

        const choice = response.choices[0];
        const content: unknown[] = [];

        if (choice.message.content) {
          content.push({ type: "text", text: choice.message.content });
        }

        if (choice.message.tool_calls) {
          for (const tc of choice.message.tool_calls) {
            let input: unknown = {};
            try { input = JSON.parse(tc.function.arguments); } catch { input = {}; }
            content.push({ type: "tool_use", id: tc.id, name: tc.function.name, input });
          }
        }

        let stopReason = "end_turn";
        if (choice.finish_reason === "tool_calls") stopReason = "tool_use";
        else if (choice.finish_reason === "length") stopReason = "max_tokens";

        res.json({
          id: `msg_${response.id}`,
          type: "message",
          role: "assistant",
          content,
          model,
          stop_reason: stopReason,
          stop_sequence: null,
          usage: {
            input_tokens: response.usage?.prompt_tokens || 0,
            output_tokens: response.usage?.completion_tokens || 0,
          },
        });
      }
    } else {
      res.status(400).json({ error: { message: `Unsupported model: ${model}. See GET /v1/models for supported models.`, type: "invalid_request_error" } });
    }
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    const status = error.status || 500;
    logger.error({ err, model, stream }, "messages error");
    sendErrorSafe(res, status, error.message || "Internal server error");
  }
});

// ── JSON 404 for unknown /v1 paths ──────────────────────────────────

router.use((req: Request, res: Response) => {
  res.status(404).json({
    error: {
      message: `Not found: ${req.method} /v1${req.path}`,
      type: "not_found_error",
    },
  });
});

export default router;
