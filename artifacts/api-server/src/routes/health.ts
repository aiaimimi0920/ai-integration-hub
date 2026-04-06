import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const openai = !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY && process.env.AI_INTEGRATIONS_OPENAI_BASE_URL);
  const anthropic = !!(process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY && process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL);

  res.json({
    status: "ok",
    integrations: {
      openai: openai ? "ready" : "not_configured",
      anthropic: anthropic ? "ready" : "not_configured",
    },
    setup_required: (!openai || !anthropic)
      ? "Go to Tools → Integrations in your Replit project and add the missing integrations, then restart the server."
      : undefined,
  });
});

export default router;
