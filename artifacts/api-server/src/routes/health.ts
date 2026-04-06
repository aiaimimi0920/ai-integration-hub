import { Router, type IRouter } from "express";

const router: IRouter = Router();

function openaiStatus(): { status: string; method?: string } {
  if (process.env.AI_INTEGRATIONS_OPENAI_API_KEY && process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
    return { status: "ready", method: "replit_integration" };
  }
  if (process.env.OPENAI_API_KEY) {
    return { status: "ready", method: "api_key" };
  }
  return { status: "not_configured" };
}

function anthropicStatus(): { status: string; method?: string } {
  if (process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY && process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL) {
    return { status: "ready", method: "replit_integration" };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return { status: "ready", method: "api_key" };
  }
  return { status: "not_configured" };
}

router.get("/healthz", (_req, res) => {
  const openai = openaiStatus();
  const anthropic = anthropicStatus();
  const allReady = openai.status === "ready" && anthropic.status === "ready";

  res.json({
    status: "ok",
    integrations: { openai, anthropic },
    ...(allReady ? {} : {
      setup_required: "One or more AI providers are not configured. Add OPENAI_API_KEY and/or ANTHROPIC_API_KEY as Secrets in Replit (padlock icon), then restart the server. Alternatively, add them via Tools → Integrations.",
    }),
  });
});

export default router;
