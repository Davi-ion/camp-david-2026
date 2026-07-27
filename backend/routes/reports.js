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

// ─── GET /api/reports/summary ─────────────────────────────────────
// Returns aggregated stats for the dashboard and reports module
router.get('/summary', authenticate, requirePermission('view:reports'), async (req, res) => {
  try {
    const [
      totalCampers, activeCampers,
      totalStaff, activeStaff,
      openIncidents, totalIncidents,
      totalAnnouncements,
      platoons,
      incidentsByCategory,
      recentActivity,
    ] = await Promise.all([
      prisma.camper.count(),
      prisma.camper.count({ where: { status: 'active' } }),
      prisma.staff.count(),
      prisma.staff.count({ where: { status: 'active' } }),
      prisma.incident.count({ where: { status: { in: ['open', 'in_progress'] } } }),
      prisma.incident.count(),
      prisma.announcement.count({ where: { archived: false } }),
      prisma.platoon.findMany({
        include: {
          _count: { select: { campers: true } },
          campers: {
            where: { medicalNotes: { not: '' } },
            select: { id: true },
          },
        },
        where: { status: 'active' },
      }),
      prisma.incident.groupBy({ by: ['category'], _count: { id: true } }),
      prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);

    const platoonSummary = platoons.map(p => ({
      id: p.id, name: p.name, emoji: p.emoji, colorHex: p.colorHex,
      camperCount: p._count.campers,
      medicalAlerts: p.campers.length,
    }));

    const totalMedicalAlerts = platoons.reduce((sum, p) => sum + p.campers.length, 0);

    res.json({
      totalCampers, activeCampers,
      totalStaff, activeStaff,
      openIncidents, totalIncidents,
      totalAnnouncements,
      totalMedicalAlerts,
      platoonSummary,
      incidentsByCategory,
      recentActivity,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// ─── GET /api/reports/campers ─────────────────────────────────────
router.get('/campers', authenticate, requirePermission('view:reports'), async (req, res) => {
  try {
    const campers = await prisma.camper.findMany({
      include: { platoon: { select: { name: true, emoji: true } } },
      orderBy: [{ platoon: { name: 'asc' } }, { name: 'asc' }],
    });
    res.json(campers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch camper report' });
  }
});

// ─── GET /api/reports/staff ───────────────────────────────────────
router.get('/staff', authenticate, requirePermission('view:reports'), async (req, res) => {
  try {
    const staff = await prisma.staff.findMany({
      select: {
        id: true, name: true, email: true, role: true, department: true,
        status: true, lastLoginAt: true, createdAt: true,
        platoon: { select: { name: true, emoji: true } },
        roleAssignment: { include: { role: { select: { name: true } } } },
      },
      orderBy: [{ department: 'asc' }, { name: 'asc' }],
    });
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch staff report' });
  }
});

// ─── GET /api/reports/incidents ───────────────────────────────────
router.get('/incidents', authenticate, requirePermission('view:reports'), async (req, res) => {
  try {
    const incidents = await prisma.incident.findMany({
      include: {
        camper:       { select: { name: true, registrationNumber: true } },
        assignedStaff:{ select: { name: true } },
        reportedBy:   { select: { name: true } },
      },
      orderBy: { reportedAt: 'desc' },
    });
    res.json(incidents);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch incident report' });
  }
});

export default router;
