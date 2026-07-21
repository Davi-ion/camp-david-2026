import express from 'express';
import cors from 'cors';
import { PrismaClient } from './generated/prisma/client.ts';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });
const app = express();

app.use(cors());
app.use(express.json());

// ──────────────────────────────────────────
//  STAFF / USERS
// ──────────────────────────────────────────

// GET all staff
app.get('/api/staff', async (req, res) => {
  try {
    const staff = await prisma.staff.findMany({
      orderBy: { createdAt: 'asc' },
    });
    // Never return pins to the client in a real app; strip them here
    const safe = staff.map(({ pin, ...rest }) => rest);
    res.json(safe);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// POST create staff member
app.post('/api/staff', async (req, res) => {
  try {
    const { name, pin, role, group } = req.body;
    if (!name || !pin) return res.status(400).json({ error: 'name and pin are required' });
    const member = await prisma.staff.create({
      data: { name, pin, role: role || 'staff', group: group || null },
    });
    const { pin: _pin, ...safe } = member;
    res.status(201).json(safe);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create staff member' });
  }
});

// PUT update staff member
app.put('/api/staff/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, pin, role, group } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (pin !== undefined && pin !== '') data.pin = pin;
    if (role !== undefined) data.role = role;
    if (group !== undefined) data.group = group || null;

    const member = await prisma.staff.update({ where: { id }, data });
    const { pin: _pin, ...safe } = member;
    res.json(safe);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update staff member' });
  }
});

// DELETE staff member
app.delete('/api/staff/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.staff.delete({ where: { id } });
    res.json({ message: 'Staff member deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete staff member' });
  }
});

// ──────────────────────────────────────────
//  LOGIN  (PIN-based)
// ──────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  try {
    const { id, pin } = req.body;
    if (!id || !pin) return res.status(400).json({ error: 'id and pin required' });

    const member = await prisma.staff.findUnique({ where: { id } });
    if (!member || member.pin !== pin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const { pin: _pin, ...safe } = member;
    res.json(safe);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ──────────────────────────────────────────
//  SEED  (one-time, populates from staff.js data)
// ──────────────────────────────────────────
app.post('/api/seed', async (req, res) => {
  const seedData = [
    { id: 's1', name: 'Tunde Kayode',   pin: '1111', role: 'admin',     group: null },
    { id: 's2', name: 'Pastor Kemi',    pin: '2222', role: 'admin',     group: null },
    { id: 's3', name: 'Bro Emmanuel',   pin: '3333', role: 'team_lead', group: 'eagles' },
    { id: 's4', name: 'Sis Funke',      pin: '4444', role: 'team_lead', group: 'lions' },
    { id: 's5', name: 'David Obi',      pin: '5555', role: 'staff',     group: 'flames' },
    { id: 's6', name: 'Grace Martins',  pin: '6666', role: 'staff',     group: 'arrows' },
  ];

  try {
    for (const s of seedData) {
      await prisma.staff.upsert({
        where: { id: s.id },
        update: {},
        create: s,
      });
    }
    res.json({ message: `Seeded ${seedData.length} staff members` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Seed failed' });
  }
});

// ──────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅  Backend running on http://localhost:${PORT}`));
