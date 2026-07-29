import { PrismaClient } from './generated/prisma/client.ts';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

// Initialize the pg Pool with the Supabase connection string
const pool = new pg.Pool({ connectionString });

// Wrap the pg Pool with the Prisma adapter
const adapter = new PrismaPg(pool);

// Export a single, shared Prisma Client instance
export const prisma = new PrismaClient({ adapter });
