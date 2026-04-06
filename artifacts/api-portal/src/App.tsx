import { useState, useEffect, useCallback } from "react";

const BG = "hsl(222,47%,11%)";
const CARD = "hsl(222,45%,14%)";
const CARD_BORDER = "hsl(222,40%,20%)";
const TEXT = "hsl(210,40%,98%)";
const MUTED = "hsl(215,20%,65%)";
const OPENAI_COLOR = "#3b82f6";
const ANTHROPIC_COLOR = "#f97316";
const GET_COLOR = "#22c55e";
const POST_COLOR = "#a855f7";
const CODE_BG = "hsl(222,47%,8%)";

const OPENAI_MODELS = ["gpt-5.2", "gpt-5-mini", "gpt-5-nano", "o4-mini", "o3"];
const ANTHROPIC_MODELS = ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5"];

const AGENT_SETUP_PROMPT = `请帮我配置这个 Replit 项目的 AI 集成：
1. 在 Tools → Integrations 中添加 OpenAI AI 集成
2. 在 Tools → Integrations 中添加 Anthropic AI 集成
3. 完成后重启 "API Server" workflow

这会自动注入 AI_INTEGRATIONS_OPENAI_API_KEY、AI_INTEGRATIONS_OPENAI_BASE_URL、AI_INTEGRATIONS_ANTHROPIC_API_KEY、AI_INTEGRATIONS_ANTHROPIC_BASE_URL 环境变量，让 AI 反代网关正常工作。`;

const ENDPOINTS = [
  {
    method: "GET",
    path: "/v1/models",
    label: "Both",
    description: "Returns the list of available OpenAI and Anthropic models.",
  },
  {
    method: "POST",
    path: "/v1/chat/completions",
    label: "OpenAI",
    description: "OpenAI-compatible chat completions. Supports all OpenAI and Claude models. Use with any OpenAI SDK client.",
  },
  {
    method: "POST",
    path: "/v1/messages",
    label: "Anthropic",
    description: "Anthropic Messages API native format. Supports all Claude and OpenAI models. Use with the Anthropic SDK.",
  },
];

const STEPS = [
  {
    title: "Add a Provider",
    description: "In CherryStudio, go to Settings → AI Provider → Add Provider.",
  },
  {
    title: "Select Provider Type",
    description: "Choose 'OpenAI' for /v1/chat/completions compatibility, or 'Anthropic' for /v1/messages native format.",
  },
  {
    title: "Set Base URL",
    description: "Enter your deployed URL (e.g. https://your-app.replit.app) as the Base URL.",
  },
  {
    title: "Set API Key",
    description: "Enter your PROXY_API_KEY value. That's it — you're ready to chat!",
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [text]);

  return (
    <button
      onClick={copy}
      style={{
        background: copied ? "hsl(142,70%,30%)" : "hsl(222,45%,20%)",
        border: `1px solid ${copied ? "hsl(142,70%,40%)" : CARD_BORDER}`,
        color: copied ? "#86efac" : MUTED,
        padding: "4px 10px",
        borderRadius: "6px",
        fontSize: "11px",
        cursor: "pointer",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function MethodBadge({ method }: { method: string }) {
  const color = method === "GET" ? GET_COLOR : POST_COLOR;
  return (
    <span style={{
      background: `${color}22`,
      color,
      border: `1px solid ${color}44`,
      padding: "2px 8px",
      borderRadius: "5px",
      fontSize: "11px",
      fontWeight: 700,
      letterSpacing: "0.05em",
      fontFamily: "monospace",
    }}>
      {method}
    </span>
  );
}

function ProviderBadge({ label }: { label: string }) {
  const color = label === "OpenAI" ? OPENAI_COLOR : label === "Anthropic" ? ANTHROPIC_COLOR : MUTED;
  return (
    <span style={{
      background: `${color}22`,
      color,
      border: `1px solid ${color}44`,
      padding: "2px 8px",
      borderRadius: "5px",
      fontSize: "11px",
      fontWeight: 600,
    }}>
      {label}
    </span>
  );
}

export default function App() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [integrations, setIntegrations] = useState<{
    openai: { status: string; method?: string };
    anthropic: { status: string; method?: string };
  } | null>(null);

  useEffect(() => {
    fetch("/api/healthz")
      .then(r => r.json())
      .then(data => {
        setOnline(true);
        if (data.integrations) setIntegrations(data.integrations);
      })
      .catch(() => setOnline(false));
  }, []);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const curlExample = `curl ${baseUrl}/v1/models \\
  -H "Authorization: Bearer YOUR_PROXY_API_KEY"`;

  const curlOpenAIExample = `curl ${baseUrl}/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_PROXY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-5.2",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`;

  const curlChatExample = `curl ${baseUrl}/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_PROXY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-sonnet-4-6",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`;

  const curlMessagesExample = `curl ${baseUrl}/v1/messages \\
  -H "Authorization: Bearer YOUR_PROXY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-haiku-4-5",
    "max_tokens": 256,
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`;

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${CARD_BORDER}`,
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "60px",
        backdropFilter: "blur(8px)",
        position: "sticky",
        top: 0,
        background: `${BG}ee`,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: 32, height: 32, borderRadius: "8px",
            background: "linear-gradient(135deg, #3b82f6, #a855f7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "16px",
          }}>⚡</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "15px" }}>AI Proxy</div>
            <div style={{ fontSize: "11px", color: MUTED }}>OpenAI + Anthropic</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: online === true ? "#22c55e" : online === false ? "#ef4444" : "#6b7280",
            boxShadow: online === true ? "0 0 8px #22c55e88" : online === false ? "0 0 8px #ef444488" : "none",
            transition: "all 0.3s",
          }} />
          <span style={{ fontSize: "12px", color: MUTED }}>
            {online === true ? "Online" : online === false ? "Offline" : "Checking…"}
          </span>
        </div>
      </div>

      <div style={{ maxWidth: "820px", margin: "0 auto", padding: "32px 24px 64px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
            Dual AI Reverse Proxy
          </h1>
          <p style={{ color: MUTED, fontSize: "15px", margin: 0 }}>
            One endpoint for OpenAI and Anthropic — compatible with any client SDK or tool
          </p>
        </div>

        {/* Integration Status + Setup Guide */}
        {integrations && (integrations.openai.status !== "ready" || integrations.anthropic.status !== "ready") && (
          <section style={{ marginBottom: "28px" }}>
            <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#f59e0b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>
              ⚠ Setup Required
            </h2>
            <div style={{ background: "hsl(38,92%,10%)", border: "1px solid hsl(38,92%,25%)", borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Status row */}
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {(["openai", "anthropic"] as const).map(p => {
                  const s = integrations[p];
                  const ready = s.status === "ready";
                  const color = p === "openai" ? OPENAI_COLOR : ANTHROPIC_COLOR;
                  const label = p === "openai" ? "OpenAI" : "Anthropic";
                  return (
                    <div key={p} style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      background: ready ? `${color}15` : "#ef444415",
                      border: `1px solid ${ready ? color + "44" : "#ef444444"}`,
                      borderRadius: "8px", padding: "8px 14px",
                    }}>
                      <span style={{ fontSize: "12px" }}>{ready ? "✅" : "❌"}</span>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: ready ? color : "#ef4444" }}>{label}</span>
                      <span style={{ fontSize: "11px", color: MUTED }}>{ready ? (s.method === "replit_integration" ? "via Replit Integration" : "via API Key") : "not configured"}</span>
                    </div>
                  );
                })}
              </div>

              {/* Instructions */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <p style={{ margin: 0, fontSize: "13px", color: TEXT, fontWeight: 600 }}>
                  Choose a setup method — fastest first:
                </p>

                {/* Method 0 — Agent prompt (fastest) */}
                <div style={{ background: CODE_BG, borderRadius: "8px", padding: "14px 16px", border: "1px solid #22c55e33" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#22c55e", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      🤖 Method 1 — Replit Agent (fully automatic, recommended)
                    </div>
                  </div>
                  <p style={{ margin: "0 0 10px", fontSize: "12px", color: MUTED, lineHeight: 1.6 }}>
                    Open the <b style={{ color: TEXT }}>AI / Agent</b> panel in your Replit project and paste this prompt. The Agent will configure everything automatically.
                  </p>
                  <div style={{ position: "relative" }}>
                    <pre style={{
                      margin: 0, padding: "12px 14px", background: "hsl(222,47%,6%)", borderRadius: "6px",
                      fontSize: "12px", color: "#a5f3fc", whiteSpace: "pre-wrap", wordBreak: "break-word",
                      border: "1px solid #22c55e22", lineHeight: 1.6,
                    }}>{AGENT_SETUP_PROMPT}</pre>
                    <div style={{ marginTop: "8px", display: "flex", justifyContent: "flex-end" }}>
                      <CopyButton text={AGENT_SETUP_PROMPT} />
                    </div>
                  </div>
                </div>

                {/* Method 2 — Manual Integrations */}
                <div style={{ background: CODE_BG, borderRadius: "8px", padding: "14px 16px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#3b82f6", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Method 2 — Replit AI Integrations (manual, free)</div>
                  <ol style={{ margin: 0, paddingLeft: "18px", color: MUTED, fontSize: "13px", lineHeight: 1.8 }}>
                    <li>In your Replit project click <b style={{ color: TEXT }}>Tools → Integrations</b></li>
                    <li>Search for <b style={{ color: OPENAI_COLOR }}>OpenAI</b> → Enable</li>
                    <li>Search for <b style={{ color: ANTHROPIC_COLOR }}>Anthropic</b> → Enable</li>
                    <li>Restart the <b style={{ color: TEXT }}>API Server</b> workflow</li>
                  </ol>
                </div>

                {/* Method 3 — Own API Keys */}
                <div style={{ background: CODE_BG, borderRadius: "8px", padding: "14px 16px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#a855f7", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Method 3 — Your own API Keys</div>
                  <ol style={{ margin: 0, paddingLeft: "18px", color: MUTED, fontSize: "13px", lineHeight: 1.8 }}>
                    <li>Open the <b style={{ color: TEXT }}>🔒 Secrets</b> tab in your Replit project</li>
                    <li>Add <code style={{ color: OPENAI_COLOR }}>OPENAI_API_KEY</code> = your OpenAI key</li>
                    <li>Add <code style={{ color: ANTHROPIC_COLOR }}>ANTHROPIC_API_KEY</code> = your Anthropic key</li>
                    <li>Restart the <b style={{ color: TEXT }}>API Server</b> workflow</li>
                  </ol>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Integration Status (all ready) */}
        {integrations && integrations.openai.status === "ready" && integrations.anthropic.status === "ready" && (
          <section style={{ marginBottom: "28px" }}>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {(["openai", "anthropic"] as const).map(p => {
                const s = integrations[p];
                const color = p === "openai" ? OPENAI_COLOR : ANTHROPIC_COLOR;
                const label = p === "openai" ? "OpenAI" : "Anthropic";
                return (
                  <div key={p} style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    background: `${color}15`, border: `1px solid ${color}44`,
                    borderRadius: "8px", padding: "8px 14px",
                  }}>
                    <span style={{ fontSize: "12px" }}>✅</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color }}>{label}</span>
                    <span style={{ fontSize: "11px", color: MUTED }}>{s.method === "replit_integration" ? "via Replit Integration" : "via API Key"}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Connection Details */}
        <section style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "13px", fontWeight: 600, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>
            Connection Details
          </h2>
          <div style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: "12px", overflow: "hidden" }}>
            {[
              { label: "Base URL", value: baseUrl },
              { label: "OpenAI clients", value: "Authorization: Bearer YOUR_PROXY_API_KEY" },
              { label: "Claude Code / Anthropic SDK", value: "x-api-key: YOUR_PROXY_API_KEY" },
            ].map((item, i, arr) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderBottom: i < arr.length - 1 ? `1px solid ${CARD_BORDER}` : "none",
                gap: "12px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                  <span style={{ color: MUTED, fontSize: "13px", minWidth: "100px", flexShrink: 0 }}>{item.label}</span>
                  <code style={{ fontSize: "13px", color: "#93c5fd", wordBreak: "break-all" }}>{item.value}</code>
                </div>
                <CopyButton text={item.value} />
              </div>
            ))}
          </div>
        </section>

        {/* Endpoints */}
        <section style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "13px", fontWeight: 600, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>
            API Endpoints
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {ENDPOINTS.map((ep, i) => (
              <div key={i} style={{
                background: CARD,
                border: `1px solid ${CARD_BORDER}`,
                borderRadius: "12px",
                padding: "14px 16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
                  <MethodBadge method={ep.method} />
                  <code style={{ fontSize: "13px", color: TEXT, flex: 1 }}>{baseUrl}{ep.path}</code>
                  <ProviderBadge label={ep.label} />
                  <CopyButton text={`${baseUrl}${ep.path}`} />
                </div>
                <p style={{ color: MUTED, fontSize: "13px", margin: 0, lineHeight: 1.5 }}>{ep.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Models */}
        <section style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "13px", fontWeight: 600, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>
            Available Models
          </h2>
          <div style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: "12px", padding: "16px" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "8px",
            }}>
              {OPENAI_MODELS.map(id => (
                <div key={id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px", background: `${OPENAI_COLOR}0f`,
                  border: `1px solid ${OPENAI_COLOR}22`, borderRadius: "8px", gap: "8px",
                }}>
                  <code style={{ fontSize: "12px", color: TEXT }}>{id}</code>
                  <span style={{ fontSize: "10px", color: OPENAI_COLOR, fontWeight: 600, flexShrink: 0 }}>OpenAI</span>
                </div>
              ))}
              {ANTHROPIC_MODELS.map(id => (
                <div key={id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px", background: `${ANTHROPIC_COLOR}0f`,
                  border: `1px solid ${ANTHROPIC_COLOR}22`, borderRadius: "8px", gap: "8px",
                }}>
                  <code style={{ fontSize: "12px", color: TEXT }}>{id}</code>
                  <span style={{ fontSize: "10px", color: ANTHROPIC_COLOR, fontWeight: 600, flexShrink: 0 }}>Anthropic</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CherryStudio Guide */}
        <section style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "13px", fontWeight: 600, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>
            CherryStudio Setup
          </h2>
          <div style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: "12px", overflow: "hidden" }}>
            {STEPS.map((step, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "14px",
                padding: "16px",
                borderBottom: i < STEPS.length - 1 ? `1px solid ${CARD_BORDER}` : "none",
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg, #3b82f6, #a855f7)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "12px", fontWeight: 700,
                }}>
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "4px" }}>{step.title}</div>
                  <div style={{ color: MUTED, fontSize: "13px", lineHeight: 1.6 }}>{step.description}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Test */}
        <section style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "13px", fontWeight: 600, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>
            Quick Test
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              { title: "List models (GET /v1/models)", code: curlExample },
              { title: "OpenAI model — gpt-5.2 (POST /v1/chat/completions)", code: curlOpenAIExample },
              { title: "Anthropic model via OpenAI format — claude-sonnet-4-6 (POST /v1/chat/completions)", code: curlChatExample },
              { title: "Anthropic native format — claude-haiku-4-5 (POST /v1/messages)", code: curlMessagesExample },
            ].map((ex, i) => (
              <div key={i} style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: "12px", overflow: "hidden" }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", borderBottom: `1px solid ${CARD_BORDER}`,
                }}>
                  <span style={{ fontSize: "12px", color: MUTED, fontWeight: 500 }}>{ex.title}</span>
                  <CopyButton text={ex.code} />
                </div>
                <pre style={{
                  margin: 0, padding: "14px 16px",
                  background: CODE_BG,
                  fontSize: "12px", lineHeight: 1.7,
                  overflowX: "auto",
                  color: "#86efac",
                  fontFamily: "Menlo, Monaco, 'Courier New', monospace",
                }}>
                  {ex.code}
                </pre>
              </div>
            ))}
          </div>
        </section>

        {/* Prompt Cache Note */}
        <section style={{ marginBottom: "28px" }}>
          <div style={{
            background: "hsl(222,45%,16%)",
            border: `1px solid hsl(222,40%,25%)`,
            borderRadius: "12px",
            padding: "16px",
          }}>
            <div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>💡</span> Prompt Cache Support
            </div>
            <div style={{ color: MUTED, fontSize: "13px", lineHeight: 1.7 }}>
              <strong style={{ color: TEXT }}>Anthropic:</strong> Add{" "}
              <code style={{ background: CODE_BG, padding: "1px 5px", borderRadius: "4px", fontSize: "12px" }}>
                "cache_control": {`{"type": "breakpoint"}`}
              </code>{" "}
              to your system or messages to cache prefix tokens and reduce costs.
              <br />
              <strong style={{ color: TEXT }}>OpenAI:</strong> gpt-5 series automatically caches prompt prefixes — no extra configuration needed.
            </div>
          </div>
        </section>

        {/* Footer */}
        <div style={{ textAlign: "center", color: MUTED, fontSize: "12px", paddingTop: "16px", borderTop: `1px solid ${CARD_BORDER}` }}>
          Powered by OpenAI SDK + Anthropic SDK via Replit AI Integrations · Express · React + Vite
        </div>
      </div>
    </div>
  );
}
