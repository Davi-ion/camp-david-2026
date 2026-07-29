import express from 'express';
import { prisma } from '../db.js';
import path from 'path';
import { fileURLToPath } from 'url';


const router = express.Router();

// ─── Venues ───────────────────────────────────────────────────────
router.get('/venues', async (req, res) => {
  try {
    const venues = await prisma.venue.findMany({ orderBy: { name: 'asc' } });
    res.json(venues);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch venues' });
  }
});

router.post('/venues', async (req, res) => {
  try {
    const venue = await prisma.venue.create({ data: req.body });
    res.json(venue);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create venue' });
  }
});

// ─── Camp Days ────────────────────────────────────────────────────
router.get('/days', async (req, res) => {
  try {
    const days = await prisma.campDay.findMany({ orderBy: { date: 'asc' } });
    res.json(days);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch camp days' });
  }
});

// ─── Sessions ─────────────────────────────────────────────────────
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      orderBy: { startTime: 'asc' },
      include: {
        venue: true,
        campDay: true,
        facilitator: { select: { id: true, name: true, roleName: true } },
        platoons: { select: { id: true, name: true, emoji: true } },
      }
    });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

router.post('/sessions', async (req, res) => {
  try {
    const { title, description, type, startTime, endTime, colorHex, requiresAttendance, capacity, status, venueId, campDayId, facilitatorId, platoonIds } = req.body;
    
    // Conflict Detection
    const start = new Date(startTime);
    const end = new Date(endTime);

    const conflicts = await prisma.session.findMany({
      where: {
        AND: [
          { startTime: { lt: end } },
          { endTime: { gt: start } },
        ],
        OR: [
          { venueId: venueId ? venueId : undefined },
          { facilitatorId: facilitatorId ? facilitatorId : undefined },
        ]
      }
    });

    if (conflicts.length > 0) {
      return res.status(409).json({ error: 'Scheduling conflict detected (venue or facilitator double-booked)', conflicts });
    }

    const session = await prisma.session.create({
      data: {
        title, description, type, startTime: start, endTime: end, colorHex, requiresAttendance, capacity, status, venueId, campDayId, facilitatorId,
        platoons: platoonIds ? { connect: platoonIds.map(id => ({ id })) } : undefined
      },
      include: {
        venue: true,
        campDay: true,
        facilitator: true,
        platoons: true,
      }
    });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create session', details: err.message });
  }
});

// ─── Tasks ────────────────────────────────────────────────────────
router.get('/tasks', async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { priority: 'desc' }, // Just simple order for now
      include: {
        owner: { select: { id: true, name: true } },
        session: { select: { id: true, title: true } }
      }
    });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

export default router;
