import express from 'express';
import { PrismaClient } from '../generated/prisma/client.ts';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });
const router = express.Router();

// Get unread notifications for a user
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      // Fallback if auth middleware isn't perfectly injecting req.user
      // Client should pass staffId in query if needed, or we decode token
      // For this demo, let's allow fetching by query staffId
    }
    const targetUserId = req.query.staffId || userId;
    
    if (!targetUserId) return res.status(401).json({ error: 'Unauthorized' });

    const notifications = await prisma.notification.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to 50 recent
    });

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark all as read
router.put('/read-all', async (req, res) => {
  try {
    const targetUserId = req.body.staffId || req.user?.id;
    if (!targetUserId) return res.status(401).json({ error: 'Unauthorized' });

    await prisma.notification.updateMany({
      where: { userId: targetUserId, isRead: false },
      data: { isRead: true }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Mark single as read
router.put('/:id/read', async (req, res) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    await prisma.notification.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// Internal endpoint to create notifications (can also be called via internal logic)
router.post('/', async (req, res) => {
  try {
    const { userIds, title, message, type, category, priority, link } = req.body;
    
    // Create for multiple users
    if (Array.isArray(userIds)) {
      await prisma.notification.createMany({
        data: userIds.map(uid => ({
          userId: uid, title, message, type, category, priority, link
        }))
      });
    }

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create notifications' });
  }
});

export default router;
