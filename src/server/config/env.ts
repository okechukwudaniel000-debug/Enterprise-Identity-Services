import { z } from "zod";
import { logger } from "../logging/logger";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  JWT_ACCESS_SECRET: z.string().min(8, "Access JWT secret must be at least 8 characters long"),
  JWT_REFRESH_SECRET: z.string().min(8, "Refresh JWT secret must be at least 8 characters long"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000,http://127.0.0.1:3000"),
});

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env;

try {
  // Gracefully read process.env and validate
  validatedEnv = envSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    // Provide safe defaults for development if not provided
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "enterprise_access_secret_fallback_key_2026",
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "enterprise_refresh_secret_fallback_key_2026",
    JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
  });
} catch (error) {
  logger.error("Environment validation failed on startup!", { error: (error as Error).message });
  // Fail-fast in production
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
  // Otherwise default to a mocked validated configuration
  validatedEnv = {
    NODE_ENV: "development",
    PORT: 3000,
    JWT_ACCESS_SECRET: "enterprise_access_secret_fallback_key_2026",
    JWT_REFRESH_SECRET: "enterprise_refresh_secret_fallback_key_2026",
    JWT_ACCESS_EXPIRES_IN: "15m",
    JWT_REFRESH_EXPIRES_IN: "7d",
    ALLOWED_ORIGINS: "http://localhost:3000,http://127.0.0.1:3000",
  };
}

export const env = validatedEnv;
export default env;
