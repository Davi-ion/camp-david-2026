import { Router } from 'express';
import { PrismaClient } from '../generated/prisma/client.ts';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL });
const router = Router();

// ─── Utility: Dispatch Notifications ──────────────────────────────
async function dispatchNotifications(announcement) {
  try {
    let users = [];
    if (announcement.targetType === 'all' || announcement.targetType === 'staff') {
      users = await prisma.staff.findMany({ select: { id: true } });
    } else if (announcement.targetType === 'platoon') {
      users = await prisma.staff.findMany({ where: { platoonId: announcement.targetId }, select: { id: true } });
    } else if (announcement.targetType === 'role') {
      users = await prisma.roleAssignment.findMany({ where: { roleId: announcement.targetId }, select: { staffId: true } });
      users = users.map(u => ({ id: u.staffId }));
    } else if (announcement.targetType === 'department') {
      users = await prisma.staff.findMany({ where: { department: announcement.targetId }, select: { id: true } });
    } else if (announcement.targetType === 'individual') {
      users = [{ id: announcement.targetId }];
    }

    if (users.length > 0) {
      await prisma.notification.createMany({
        data: users.map(u => ({
          userId: u.id,
          title: announcement.title,
          message: announcement.body.substring(0, 100) + (announcement.body.length > 100 ? '...' : ''),
          type: announcement.isEmergency ? 'emergency' : 'announcement',
          category: announcement.category,
          priority: announcement.priority,
          link: `/app/announcements/${announcement.id}`
        }))
      });
    }
  } catch (err) {
    console.error('Failed to dispatch notifications', err);
  }
}

// ─── GET /api/announcements ───────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, pinned, isEmergency } = req.query;
    const where = {};
    if (status) where.status = status;
    else where.status = { not: 'archived' }; // default ignore archived unless requested
    
    if (pinned === 'true') where.pinned = true;
    if (isEmergency === 'true') where.isEmergency = true;

    // Optional: filter by user target here, but for now we just return all published for dashboard
    // A robust system would filter where targetType='all' OR (targetType='platoon' and targetId=req.user.platoonId), etc.
    // Assuming staff can see most announcements, we simplify.

    const announcements = await prisma.announcement.findMany({
      where,
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: { readReceipts: true }
        }
      }
    });

    // If user is logged in, attach their read status
    const userId = req.user?.id;
    if (userId) {
      const readAnnouncements = await prisma.announcementRead.findMany({
        where: { userId, announcementId: { in: announcements.map(a => a.id) } },
        select: { announcementId: true }
      });
      const readSet = new Set(readAnnouncements.map(r => r.announcementId));
      announcements.forEach(a => {
        a.isReadByMe = readSet.has(a.id);
      });
    }

    res.json(announcements);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// ─── GET /api/announcements/:id/stats ──────────────────────────────
router.get('/:id/stats', authenticate, requirePermission('create:announcements'), async (req, res) => {
  try {
    const ann = await prisma.announcement.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { readReceipts: true } }
      }
    });
    
    if (!ann) return res.status(404).json({ error: 'Not found' });

    // Estimate total recipients based on target
    let totalRecipients = 0;
    if (ann.targetType === 'all' || ann.targetType === 'staff') {
      totalRecipients = await prisma.staff.count();
    } else if (ann.targetType === 'platoon') {
      totalRecipients = await prisma.staff.count({ where: { platoonId: ann.targetId } });
    } else if (ann.targetType === 'role') {
      totalRecipients = await prisma.roleAssignment.count({ where: { roleId: ann.targetId } });
    } else if (ann.targetType === 'department') {
      totalRecipients = await prisma.staff.count({ where: { department: ann.targetId } });
    } else if (ann.targetType === 'individual') {
      totalRecipients = 1;
    }

    res.json({
      totalRecipients,
      readCount: ann._count.readReceipts,
      unreadCount: Math.max(0, totalRecipients - ann._count.readReceipts)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─── POST /api/announcements ──────────────────────────────────────
router.post('/', authenticate, requirePermission('create:announcements'), async (req, res) => {
  try {
    const { title, body, category, priority, status, isEmergency, pinned, targetType, targetId, scheduledAt, expiryDate } = req.body;
    
    if (!title || !body) return res.status(400).json({ error: 'Title and body required' });
    
    const ann = await prisma.announcement.create({
      data: {
        title, body,
        category: category || 'General',
        priority: priority || 'normal',
        status: status || 'published',
        isEmergency: Boolean(isEmergency),
        pinned: Boolean(pinned),
        targetType: targetType || 'all',
        targetId: targetId || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        authorId: req.user.id,
        authorName: req.user.name,
      },
    });

    if (ann.status === 'published') {
      await dispatchNotifications(ann);
    }

    res.status(201).json(ann);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// ─── PUT /api/announcements/:id ───────────────────────────────────
router.put('/:id', authenticate, requirePermission('create:announcements'), async (req, res) => {
  try {
    const { title, body, category, priority, status, isEmergency, pinned, targetType, targetId, scheduledAt, expiryDate } = req.body;
    
    const oldAnn = await prisma.announcement.findUnique({ where: { id: req.params.id } });

    const ann = await prisma.announcement.update({
      where: { id: req.params.id },
      data: { 
        title, body, category, priority, status, isEmergency, pinned, targetType, 
        targetId: targetId || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null
      },
    });

    // If it just transitioned to published
    if (oldAnn.status !== 'published' && ann.status === 'published') {
      await dispatchNotifications(ann);
    }

    res.json(ann);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// ─── PUT /api/announcements/:id/read ──────────────────────────────
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const announcementId = req.params.id;

    await prisma.announcementRead.upsert({
      where: {
        announcementId_userId: { announcementId, userId }
      },
      update: {},
      create: { announcementId, userId }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read' });
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
