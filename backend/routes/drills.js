import express from 'express';
import { prisma } from '../db.js';
import path from 'path';
import { fileURLToPath } from 'url';


const router = express.Router();

// Get all drills (optionally filtered by staff or date)
router.get('/', async (req, res) => {
  try {
    const { staffId, date } = req.query;
    const where = {};
    if (staffId) {
      where.OR = [
        { assignedStaffId: staffId },
        { backupStaffId: staffId }
      ];
    }
    if (date) where.date = date;

    const drills = await prisma.campDrill.findMany({
      where,
      include: {
        checklist: true,
        assignedStaff: { select: { id: true, name: true, role: true } },
        backupStaff: { select: { id: true, name: true } },
        platoon: { select: { id: true, name: true, emoji: true } }
      },
      orderBy: { startTime: 'asc' }
    });
    res.json(drills);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch drills' });
  }
});

// Create Drill
router.post('/', async (req, res) => {
  try {
    const { checklist, ...drillData } = req.body;
    const newDrill = await prisma.campDrill.create({
      data: {
        ...drillData,
        checklist: checklist ? {
          create: checklist.map(text => ({ text }))
        } : undefined
      },
      include: { checklist: true }
    });
    res.status(201).json(newDrill);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create drill' });
  }
});

// Update Drill
router.put('/:id', async (req, res) => {
  try {
    const { checklist, ...drillData } = req.body;
    
    // For simplicity, we delete old checklist and create new ones if provided
    if (checklist) {
      await prisma.drillChecklistItem.deleteMany({ where: { drillId: req.params.id } });
    }

    const updated = await prisma.campDrill.update({
      where: { id: req.params.id },
      data: {
        ...drillData,
        checklist: checklist ? {
          create: checklist.map(c => ({ text: c.text, isCompleted: c.isCompleted || false }))
        } : undefined
      },
      include: { checklist: true, assignedStaff: true }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update drill' });
  }
});

// Update Drill Status
router.put('/:id/status', async (req, res) => {
  try {
    const { status, completionNotes } = req.body;
    const updated = await prisma.campDrill.update({
      where: { id: req.params.id },
      data: { status, completionNotes },
      include: { checklist: true }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update drill status' });
  }
});

// Toggle Checklist Item
router.put('/checklist/:itemId', async (req, res) => {
  try {
    const { isCompleted } = req.body;
    const item = await prisma.drillChecklistItem.update({
      where: { id: req.params.itemId },
      data: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null
      }
    });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update checklist item' });
  }
});

// Delete Drill
router.delete('/:id', async (req, res) => {
  try {
    await prisma.campDrill.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete drill' });
  }
});

export default router;
