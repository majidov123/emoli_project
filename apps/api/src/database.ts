import { PrismaClient } from "@prisma/client";

export function createDatabaseClient() {
  return new PrismaClient();
}
