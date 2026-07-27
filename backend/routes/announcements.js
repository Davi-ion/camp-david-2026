import { Router } from 'express';
import { PrismaClient } from '../generated/prisma/client.ts';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });
const router = Router();

// ─── GET /api/announcements ───────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const { archived, pinned } = req.query;
    const where = {};
    if (archived !== 'true') where.archived = false;
    if (pinned === 'true')   where.pinned   = true;

    const announcements = await prisma.announcement.findMany({
      where,
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// ─── POST /api/announcements ──────────────────────────────────────
router.post('/', authenticate, requirePermission('create:announcements'), async (req, res) => {
  try {
    const { title, body, urgent, pinned, targetType, targetId, scheduledAt } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'Title and body required' });
    const ann = await prisma.announcement.create({
      data: {
        title, body,
        urgent:     Boolean(urgent),
        pinned:     Boolean(pinned),
        targetType: targetType || 'all',
        targetId:   targetId   || null,
        scheduledAt:scheduledAt ? new Date(scheduledAt) : null,
        authorId:   req.user.id,
        authorName: req.user.name,
      },
    });
    res.status(201).json(ann);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// ─── PUT /api/announcements/:id ───────────────────────────────────
router.put('/:id', authenticate, requirePermission('create:announcements'), async (req, res) => {
  try {
    const { title, body, urgent, pinned, archived, targetType, targetId } = req.body;
    const ann = await prisma.announcement.update({
      where: { id: req.params.id },
      data: { title, body, urgent, pinned, archived, targetType, targetId: targetId || null },
    });
    res.json(ann);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// ─── DELETE /api/announcements/:id ───────────────────────────────
router.delete('/:id', authenticate, requirePermission('create:announcements'), async (req, res) => {
  try {
    await prisma.announcement.delete({ where: { id: req.params.id } });
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

export default router;
