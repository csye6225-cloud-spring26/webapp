import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  // Suppress Prisma's verbose error output - we handle errors in our own logger
  log: [],
});

export default prisma;
