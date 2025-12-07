// Located at: lib/db.js

import { PrismaClient } from '@prisma/client';

let db;

// This prevents creating multiple Prisma Client instances in development
if (process.env.NODE_ENV === 'production') {
  db = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  db = global.prisma;
}

export { db }; // ⬅️ Make sure this line exists and is correct