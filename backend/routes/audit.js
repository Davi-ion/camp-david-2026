import { Router } from 'express';
import { PrismaClient } from '../generated/prisma/client.ts';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL });

const router = Router();

// ─── GET /api/audit ───────────────────────────────────────────────
router.get('/', authenticate, requirePermission('view:audit'), async (req, res) => {
  try {
    const { userId, action, page = 1, limit = 50 } = req.query;
    const where = {};
    if (userId) where.userId = userId;
    if (action) where.action = { contains: action };

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    const total = await prisma.auditLog.count({ where });

    res.json({ logs, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit log.' });
  }
});

export default router;
