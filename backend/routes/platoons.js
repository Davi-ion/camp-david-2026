import { Router } from 'express';
import { PrismaClient } from '../generated/prisma/client.ts';
const prisma = new PrismaClient();
const router = Router();

async function logAudit(data) {
  try { await prisma.auditLog.create({ data }); } catch {}
}

// ─── GET /api/platoons ────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const platoons = await prisma.platoon.findMany({
      include: {
        leader: { select: { id: true, name: true, avatar: true } },
        campers: { where: { status: 'active' }, select: { id: true, name: true, age: true, medicalNotes: true } },
        staff: { select: { id: true, name: true, role: true, department: true, avatar: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(platoons);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch platoons' });
  }
});

// ─── GET /api/platoons/:id ────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const platoon = await prisma.platoon.findUnique({
      where: { id: req.params.id },
      include: {
        leader: { select: { id: true, name: true, avatar: true, email: true, phone: true } },
        campers: {
          where: { status: 'active' },
          include: {
            incidents: {
              where: { status: { not: 'resolved' } },
              select: { id: true, title: true, severity: true, category: true },
            },
          },
          orderBy: { name: 'asc' },
        },
        staff: {
          select: { id: true, name: true, role: true, department: true, avatar: true, email: true },
        },
      },
    });
    if (!platoon) return res.status(404).json({ error: 'Platoon not found' });
    res.json(platoon);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch platoon' });
  }
});

// ─── POST /api/platoons ───────────────────────────────────────────
router.post('/', authenticate, requirePermission('manage:users'), async (req, res) => {
  try {
    const { name, emoji, description, colorHex, leaderId } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const platoon = await prisma.platoon.create({
      data: { name, emoji: emoji || '🏴', description, colorHex, leaderId: leaderId || null },
    });
    await logAudit({ userId: req.user.id, userName: req.user.name, action: 'CREATE_PLATOON', targetType: 'Platoon', targetId: platoon.id, targetName: platoon.name, ipAddress: req.ip });
    res.status(201).json(platoon);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Platoon name already exists' });
    res.status(500).json({ error: 'Failed to create platoon' });
  }
});

// ─── PUT /api/platoons/:id ────────────────────────────────────────
router.put('/:id', authenticate, requirePermission('manage:users'), async (req, res) => {
  try {
    const { name, emoji, description, colorHex, leaderId, status } = req.body;
    const platoon = await prisma.platoon.update({
      where: { id: req.params.id },
      data: { name, emoji, description, colorHex, leaderId: leaderId || null, status },
    });
    await logAudit({ userId: req.user.id, userName: req.user.name, action: 'UPDATE_PLATOON', targetType: 'Platoon', targetId: platoon.id, targetName: platoon.name, ipAddress: req.ip });
    res.json(platoon);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update platoon' });
  }
});

// ─── DELETE /api/platoons/:id ─────────────────────────────────────
router.delete('/:id', authenticate, requirePermission('manage:users'), async (req, res) => {
  try {
    const platoon = await prisma.platoon.update({ where: { id: req.params.id }, data: { status: 'archived' } });
    await logAudit({ userId: req.user.id, userName: req.user.name, action: 'ARCHIVE_PLATOON', targetType: 'Platoon', targetId: platoon.id, targetName: platoon.name, ipAddress: req.ip });
    res.json({ message: 'Platoon archived' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to archive platoon' });
  }
});

export default router;
