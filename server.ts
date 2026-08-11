import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";
import { loggerMiddleware } from "./src/server/middleware/logger.middleware";
import { errorHandler } from "./src/server/middleware/error.middleware";
import { authService } from "./src/server/services/auth.service";
import { validateRequest } from "./src/server/middleware/validate.middleware";
import { registerSchema, loginSchema } from "./src/server/validators/auth.validator";
import { requireAuth } from "./src/server/middleware/auth.middleware";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security and standard middlewares
  app.use(helmet());
  app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(","), credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(compression());
  app.use(loggerMiddleware);

  // API Routes
  app.post("/api/v1/auth/register", validateRequest(registerSchema), async (req, res, next) => {
    try {
      const user = await authService.register(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/auth/login", validateRequest(loginSchema), async (req, res, next) => {
    try {
      const { user, tokens } = await authService.login(req.body);
      res.cookie("accessToken", tokens.accessToken, { httpOnly: true, secure: process.env.NODE_ENV === "production" });
      res.json({ success: true, data: { user, tokens } });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/profile", requireAuth, async (req, res) => {
    res.json({ success: true, data: req.user });
  });

  // Error handling (must be last)
  app.use(errorHandler);

  // Vite middleware for development or Static for production
  if (process.env.NODE_ENV !== "production") {
    const viteServer = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
    });
    app.use(viteServer.middlewares);
  } else {
    // Production: Serve dist
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
        res.sendFile(process.cwd() + "/dist/index.html");
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
