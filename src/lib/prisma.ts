import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prismaInstance: PrismaClient | undefined;

try {
  prismaInstance = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaInstance;
  }
} catch (e) {
  console.warn("[Prisma] Warning: Unable to initialize PrismaClient, running in fallback mode:", e);
  prismaInstance = undefined;
}

export const prisma = prismaInstance;
