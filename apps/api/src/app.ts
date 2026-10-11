import "dotenv/config";
import Fastify from "fastify";
import type { PrismaClient } from "@prisma/client";
import { registerCatalogRoutes } from "./catalog-routes.js";
import { createDatabaseClient } from "./database.js";
import { registerOrderRoutes } from "./orders-routes.js";
import { registerReadRoutes } from "./routes.js";
import { registerSettingsRoutes } from "./settings-routes.js";

interface BuildAppOptions {
  logger?: boolean;
  prisma?: PrismaClient;
}

const prismaErrorNames = new Set([
  "PrismaClientInitializationError",
  "PrismaClientKnownRequestError",
  "PrismaClientRustPanicError",
  "PrismaClientUnknownRequestError",
  "PrismaClientValidationError"
]);

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({ logger: options.logger ?? true });
  const prisma = options.prisma ?? createDatabaseClient();

  app.get("/api/health", async () => ({ status: "ok" }));
  registerReadRoutes(app, prisma);
  registerCatalogRoutes(app, prisma);
  registerOrderRoutes(app, prisma);
  registerSettingsRoutes(app, prisma);

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  app.setNotFoundHandler(async (_request, reply) => {
    return reply.code(404).send({
      error: { code: "NOT_FOUND", message: "Route not found" }
    });
  });

  app.setErrorHandler(async (error, request, reply) => {
    request.log.error(error);

    if (typeof error === "object" && error !== null && "validation" in error) {
      return reply.code(400).send({
        error: { code: "VALIDATION_ERROR", message: "Invalid request" }
      });
    }

    if (error instanceof Error && prismaErrorNames.has(error.name)) {
      return reply.code(503).send({
        error: { code: "DATABASE_UNAVAILABLE", message: "Database unavailable" }
      });
    }

    return reply.code(500).send({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" }
    });
  });

  return app;
}
