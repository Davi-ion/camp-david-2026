import { Router } from 'express';
import { prisma } from '../db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';


const router = Router();

async function logAudit(data) {
  try { await prisma.auditLog.create({ data }); } catch {}
}

// ─── GET /api/incidents ───────────────────────────────────────────
router.get('/', authenticate, requirePermission('view:incidents'), async (req, res) => {
  try {
    const { search, category, severity, status, page = 1, limit = 50 } = req.query;
    const where = {};
    if (category) where.category = category;
    if (severity) where.severity = severity;
    if (status)   where.status   = status;
    if (search)   where.OR = [{ title: { contains: search } }, { description: { contains: search } }];

    const [incidents, total] = await Promise.all([
      prisma.incident.findMany({
        where,
        include: {
          camper:       { select: { id: true, name: true, registrationNumber: true } },
          assignedStaff:{ select: { id: true, name: true } },
          reportedBy:   { select: { id: true, name: true } },
        },
        orderBy: { reportedAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.incident.count({ where }),
    ]);
    res.json({ incidents, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

// ─── GET /api/incidents/:id ───────────────────────────────────────
router.get('/:id', authenticate, requirePermission('view:incidents'), async (req, res) => {
  try {
    const incident = await prisma.incident.findUnique({
      where: { id: req.params.id },
      include: {
        camper:       { select: { id: true, name: true, registrationNumber: true, platoon: { select: { name: true } } } },
        assignedStaff:{ select: { id: true, name: true, email: true, phone: true } },
        reportedBy:   { select: { id: true, name: true } },
      },
    });
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json(incident);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch incident' });
  }
});

// ─── POST /api/incidents ──────────────────────────────────────────
router.post('/', authenticate, requirePermission('create:incidents'), async (req, res) => {
  try {
    const { title, description, category, severity, camperId, location, assignedStaffId } = req.body;
    if (!title || !description) return res.status(400).json({ error: 'Title and description required' });
    const incident = await prisma.incident.create({
      data: {
        title, description,
        category: category || 'other',
        severity: severity || 'low',
        camperId:        camperId        || null,
        assignedStaffId: assignedStaffId || null,
        reportedById:    req.user.id,
        location:        location        || null,
        status: 'open',
      },
      include: { camper: true, assignedStaff: { select: { name: true } }, reportedBy: { select: { name: true } } },
    });
    await logAudit({ userId: req.user.id, userName: req.user.name, action: 'CREATE_INCIDENT', targetType: 'Incident', targetId: incident.id, targetName: incident.title, ipAddress: req.ip });
    res.status(201).json(incident);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create incident' });
  }
});

// ─── PUT /api/incidents/:id ───────────────────────────────────────
router.put('/:id', authenticate, requirePermission('view:incidents'), async (req, res) => {
  try {
    const { title, description, category, severity, status, camperId, assignedStaffId, location, resolution, followUp } = req.body;
    const data = {};
    if (title)             data.title = title;
    if (description)       data.description = description;
    if (category)          data.category = category;
    if (severity)          data.severity = severity;
    if (status)            data.status = status;
    if (camperId !== undefined)         data.camperId = camperId || null;
    if (assignedStaffId !== undefined)  data.assignedStaffId = assignedStaffId || null;
    if (location !== undefined)         data.location = location;
    if (resolution !== undefined)       data.resolution = resolution;
    if (followUp !== undefined)         data.followUp = followUp;
    if (status === 'resolved' || status === 'closed') data.resolvedAt = new Date();

    const incident = await prisma.incident.update({ where: { id: req.params.id }, data, include: { camper: true, assignedStaff: { select: { name: true } } } });
    await logAudit({ userId: req.user.id, userName: req.user.name, action: `UPDATE_INCIDENT_${(status || 'EDIT').toUpperCase()}`, targetType: 'Incident', targetId: incident.id, targetName: incident.title, ipAddress: req.ip });
    res.json(incident);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update incident' });
  }
});

// ─── DELETE /api/incidents/:id ────────────────────────────────────
router.delete('/:id', authenticate, requirePermission('resolve:incidents'), async (req, res) => {
  try {
    const incident = await prisma.incident.update({ where: { id: req.params.id }, data: { status: 'closed' } });
    res.json({ message: 'Incident closed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to close incident' });
  }
});

export default router;
