import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === "production" ? [] : ["warn"],
  });
};

export const prisma =
  global.prisma ||
  (() => {
    const client = createPrismaClient();
    if (process.env.NODE_ENV !== "production") {
      global.prisma = client;
    }
    return client;
  })();
