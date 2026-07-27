import express from 'express';
import { PrismaClient } from '../generated/prisma/client.ts';
import { authenticate } from '../middleware/auth.js';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

const router = express.Router();

// Get all dorms with occupancy stats
router.get('/', authenticate, async (req, res) => {
  try {
    const dorms = await prisma.dorm.findMany({
      include: {
        _count: {
          select: { campers: true }
        },
        supervisor: { select: { id: true, name: true } },
        assistantSupervisor: { select: { id: true, name: true } }
      }
    });
    // map _count to occupancy
    const mapped = dorms.map(d => ({
      ...d,
      occupancy: d._count.campers
    }));
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dorms' });
  }
});

// Create a new dorm
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, gender, capacity } = req.body;
    const dorm = await prisma.dorm.create({
      data: { name, gender, capacity: parseInt(capacity) || 50 }
    });
    res.status(201).json(dorm);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update a dorm
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, gender, capacity, status } = req.body;
    const dorm = await prisma.dorm.update({
      where: { id: req.params.id },
      data: { 
        ...(name && { name }), 
        ...(gender && { gender }), 
        ...(capacity !== undefined && { capacity: parseInt(capacity) }), 
        ...(status && { status }),
        ...(req.body.supervisorId !== undefined && { supervisorId: req.body.supervisorId || null }),
        ...(req.body.assistantSupervisorId !== undefined && { assistantSupervisorId: req.body.assistantSupervisorId || null })
      }
    });
    res.json(dorm);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a dorm
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await prisma.dorm.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get campers in a dorm
router.get('/:id/campers', authenticate, async (req, res) => {
  try {
    const campers = await prisma.camper.findMany({
      where: { dormId: req.params.id, status: 'active' },
      include: {
        platoon: true
      }
    });
    res.json(campers);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
