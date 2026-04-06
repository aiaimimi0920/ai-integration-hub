import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import router from "./routes";
import proxyRouter from "./routes/proxy";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api", router);
app.use("/v1", proxyRouter);

// In production: serve the portal's static build and SPA fallback
if (process.env.NODE_ENV === "production") {
  const portalDist = path.join(process.cwd(), "artifacts/api-portal/dist/public");
  app.use(express.static(portalDist));
  app.use((_req: Request, res: Response) => {
    res.sendFile(path.join(portalDist, "index.html"));
  });
}

// Global JSON error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error & { status?: number; statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  logger.error({ err }, "Unhandled error");
  if (!res.headersSent) {
    res.status(status).json({
      error: {
        message: err.message || "Internal server error",
        type: "server_error",
      },
    });
  }
});

export default app;
