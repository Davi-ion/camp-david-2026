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

async function logAudit(data) {
  try { await prisma.auditLog.create({ data }); } catch {}
}

// ─── GET /api/campers ──────────────────────────────────────────────
router.get('/', authenticate, requirePermission('view:campers'), async (req, res) => {
  try {
    const { search, platoonId, status = 'active', page = 1, limit = 100 } = req.query;
    const where = {};
    if (status !== 'all') where.status = status;
    if (platoonId) where.platoonId = platoonId;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { registrationNumber: { contains: search } },
        { guardianName: { contains: search } },
      ];
    }
    const [campers, total] = await Promise.all([
      prisma.camper.findMany({
        where,
        include: { platoon: { select: { id: true, name: true, emoji: true, colorHex: true } } },
        orderBy: { name: 'asc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.camper.count({ where }),
    ]);
    res.json({ campers, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch campers' });
  }
});

// ─── GET /api/campers/:id ─────────────────────────────────────────
router.get('/:id', authenticate, requirePermission('view:campers'), async (req, res) => {
  try {
    const camper = await prisma.camper.findUnique({
      where: { id: req.params.id },
      include: {
        platoon: true,
        incidents: {
          orderBy: { reportedAt: 'desc' },
          take: 10,
          include: { reportedBy: { select: { name: true } } },
        },
      },
    });
    if (!camper) return res.status(404).json({ error: 'Camper not found' });
    res.json(camper);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch camper' });
  }
});

// ─── POST /api/campers ────────────────────────────────────────────
router.post('/', authenticate, requirePermission('edit:campers'), async (req, res) => {
  try {
    const {
      name, dateOfBirth, age, gender, platoonId, medicalNotes, allergies, medications,
      bloodGroup, emergencyContact, guardianName, guardianPhone, guardianEmail,
      guardianRelation, address, notes, photo,
    } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    // Generate registration number
    const count = await prisma.camper.count();
    const registrationNumber = `CD2026-${1001 + count}`;

    const camper = await prisma.camper.create({
      data: {
        name, dateOfBirth, age: age ? Number(age) : null, gender, platoonId: platoonId || null,
        medicalNotes, allergies, medications, bloodGroup,
        emergencyContact: typeof emergencyContact === 'object' ? JSON.stringify(emergencyContact) : emergencyContact,
        guardianName, guardianPhone, guardianEmail, guardianRelation,
        address, notes, photo, registrationNumber, status: 'active',
      },
      include: { platoon: true },
    });

    await logAudit({
      userId: req.user.id, userName: req.user.name,
      action: 'CREATE_CAMPER', targetType: 'Camper',
      targetId: camper.id, targetName: camper.name,
      ipAddress: req.ip,
    });

    res.status(201).json(camper);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create camper' });
  }
});

// ─── PUT /api/campers/:id ─────────────────────────────────────────
router.put('/:id', authenticate, requirePermission('edit:campers'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.age) data.age = Number(data.age);
    if (data.platoonId === '') data.platoonId = null;
    if (typeof data.emergencyContact === 'object') {
      data.emergencyContact = JSON.stringify(data.emergencyContact);
    }
    delete data.id;
    delete data.registrationNumber;
    delete data.createdAt;
    delete data.updatedAt;
    delete data.platoon;
    delete data.incidents;

    const camper = await prisma.camper.update({
      where: { id: req.params.id },
      data,
      include: { platoon: true },
    });

    await logAudit({
      userId: req.user.id, userName: req.user.name,
      action: 'UPDATE_CAMPER', targetType: 'Camper',
      targetId: camper.id, targetName: camper.name, ipAddress: req.ip,
    });

    res.json(camper);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update camper' });
  }
});

// ─── DELETE /api/campers/:id (soft-delete / deactivate) ───────────
router.delete('/:id', authenticate, requirePermission('edit:campers'), async (req, res) => {
  try {
    const camper = await prisma.camper.update({
      where: { id: req.params.id },
      data: { status: 'inactive' },
    });
    await logAudit({
      userId: req.user.id, userName: req.user.name,
      action: 'DEACTIVATE_CAMPER', targetType: 'Camper',
      targetId: camper.id, targetName: camper.name, ipAddress: req.ip,
    });
    res.json({ message: 'Camper deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate camper' });
  }
});

// ─── POST /api/campers/:id/transfer ──────────────────────────────
router.post('/:id/transfer', authenticate, requirePermission('edit:campers'), async (req, res) => {
  try {
    const { platoonId } = req.body;
    const camper = await prisma.camper.update({
      where: { id: req.params.id },
      data: { platoonId },
      include: { platoon: true },
    });
    await logAudit({
      userId: req.user.id, userName: req.user.name,
      action: 'TRANSFER_CAMPER', targetType: 'Camper',
      targetId: camper.id, targetName: camper.name,
      detail: `Transferred to ${camper.platoon?.name}`, ipAddress: req.ip,
    });
    res.json(camper);
  } catch (err) {
    res.status(500).json({ error: 'Failed to transfer camper' });
  }
});

export default router;
