import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  
  // Test database connection on startup
  prisma.$connect()
    .then(() => {
      console.log('✅ Database connection successful');
    })
    .catch((error) => {
      console.error('❌ Database connection failed:', error);
    });
} 