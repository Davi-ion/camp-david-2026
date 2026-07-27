import { Router } from 'express';
import { PrismaClient } from '../generated/prisma/client.ts';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import multer from 'multer';
import * as xlsx from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });
const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

// ─── Utility: Parse Uploaded File ──────────────────────────────
function parseFile(buffer, mimetype) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(sheet);
}

// ─── POST /api/bulk/import/campers (Preview or Commit) ───────
router.post('/import/campers', authenticate, requirePermission('manage:users'), upload.single('file'), async (req, res) => {
  try {
    const { mode } = req.body; // 'preview' or 'commit'
    let data = [];
    
    if (req.file) {
      data = parseFile(req.file.buffer, req.file.mimetype);
    } else if (req.body.data) {
      data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data;
    } else {
      return res.status(400).json({ error: 'No data provided' });
    }

    const platoons = await prisma.platoon.findMany();
    const platoonMap = new Map(platoons.map(p => [p.name.toLowerCase(), p.id]));
    const existingCampers = await prisma.camper.findMany({ select: { registrationNumber: true } });
    const existingRegNos = new Set(existingCampers.map(c => c.registrationNumber));

    const results = data.map((row, index) => {
      const errors = [];
      
      const name = row['Full Name'] || row.name;
      const regNo = row['Registration Number'] || row.registrationNumber;
      const platoonName = row['Platoon'] || row.platoon;

      if (!name) errors.push('Name is required');
      if (!regNo) errors.push('Registration Number is required');
      if (regNo && existingRegNos.has(regNo) && mode === 'preview') errors.push('Duplicate Registration Number');
      
      let platoonId = null;
      if (platoonName) {
        platoonId = platoonMap.get(platoonName.toLowerCase());
        if (!platoonId) errors.push(`Unknown platoon: ${platoonName}`);
      }

      return {
        _index: index,
        _valid: errors.length === 0,
        _errors: errors,
        name,
        registrationNumber: regNo,
        platoonId,
        platoonName, // for preview
        gender: row['Gender'] || row.gender,
        group: row['Group'] || row.group,
        tshirtSize: row['T-shirt Size'] || row.tshirtSize,
        medicalNotes: row['Medical Notes'] || row.medicalNotes,
      };
    });

    if (mode === 'preview') {
      return res.json({ preview: results });
    }

    // Commit valid rows
    const validRows = results.filter(r => r._valid);
    let createdCount = 0;
    
    // We can't use createMany if we want to handle unique constraint gracefully, but we pre-validated.
    // However SQLite createMany is fine if pre-validated.
    if (validRows.length > 0) {
      const insertData = validRows.map(r => ({
        name: String(r.name),
        registrationNumber: String(r.registrationNumber),
        platoonId: r.platoonId,
        gender: r.gender ? String(r.gender) : null,
        group: r.group ? String(r.group) : null,
        tshirtSize: r.tshirtSize ? String(r.tshirtSize) : null,
        medicalNotes: r.medicalNotes ? String(r.medicalNotes) : null,
        status: 'active'
      }));

      const created = await prisma.camper.createMany({
        data: insertData,
        skipDuplicates: true
      });
      createdCount = created.count;
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        userName: req.user.name,
        action: 'Bulk Import Campers',
        detail: `Imported ${createdCount} campers`
      }
    });

    res.json({ success: true, imported: createdCount, total: validRows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Bulk import failed' });
  }
});

// ─── POST /api/bulk/import/staff (Preview or Commit) ─────────
router.post('/import/staff', authenticate, requirePermission('manage:users'), upload.single('file'), async (req, res) => {
  try {
    const { mode } = req.body; 
    let data = [];
    
    if (req.file) {
      data = parseFile(req.file.buffer, req.file.mimetype);
    } else if (req.body.data) {
      data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data;
    } else {
      return res.status(400).json({ error: 'No data provided' });
    }

    const platoons = await prisma.platoon.findMany();
    const platoonMap = new Map(platoons.map(p => [p.name.toLowerCase(), p.id]));
    
    const existingStaff = await prisma.staff.findMany({ select: { email: true, username: true } });
    const existingEmails = new Set(existingStaff.filter(s => s.email).map(s => s.email));
    const existingUsernames = new Set(existingStaff.map(s => s.username));

    const results = data.map((row, index) => {
      const errors = [];
      const name = row['Full Name'] || row.name;
      const email = row['Email'] || row.email;
      const username = row['Username'] || row.username;
      const platoonName = row['Assigned Platoon'] || row.platoon;
      const department = row['Department'] || row.department;
      const role = row['Role'] || row.role;

      if (!name) errors.push('Name is required');
      if (!username) errors.push('Username is required');
      
      if (email && existingEmails.has(email) && mode === 'preview') errors.push('Duplicate Email');
      if (username && existingUsernames.has(username) && mode === 'preview') errors.push('Duplicate Username');

      let platoonId = null;
      if (platoonName) {
        platoonId = platoonMap.get(platoonName.toLowerCase());
        if (!platoonId) errors.push(`Unknown platoon: ${platoonName}`);
      }

      return {
        _index: index,
        _valid: errors.length === 0,
        _errors: errors,
        name, email, username, department, role, platoonId, platoonName
      };
    });

    if (mode === 'preview') return res.json({ preview: results });

    const validRows = results.filter(r => r._valid);
    let createdCount = 0;

    if (validRows.length > 0) {
      const insertData = validRows.map(r => ({
        name: String(r.name),
        email: r.email ? String(r.email) : null,
        username: String(r.username),
        department: r.department ? String(r.department) : null,
        role: r.role ? String(r.role) : 'Staff',
        platoonId: r.platoonId,
        password: 'ChangeMe123!', // temporary password
        forcePasswordChange: true
      }));

      const created = await prisma.staff.createMany({
        data: insertData,
        skipDuplicates: true
      });
      createdCount = created.count;
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        userName: req.user.name,
        action: 'Bulk Import Staff',
        detail: `Imported ${createdCount} staff`
      }
    });

    res.json({ success: true, imported: createdCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Bulk import failed' });
  }
});

// ─── GET /api/bulk/export/:entity ──────────────────────────────
router.get('/export/:entity', authenticate, requirePermission('manage:users'), async (req, res) => {
  try {
    const { entity } = req.params;
    let data = [];
    
    if (entity === 'campers') {
      const campers = await prisma.camper.findMany({ include: { platoon: true } });
      data = campers.map(c => ({
        'Full Name': c.name,
        'Registration Number': c.registrationNumber,
        'Gender': c.gender,
        'Platoon': c.platoon?.name || '',
        'T-shirt Size': c.tshirtSize || '',
        'Status': c.status,
        'Medical Notes': c.medicalNotes || ''
      }));
    } else if (entity === 'staff') {
      const staff = await prisma.staff.findMany({ include: { platoon: true } });
      data = staff.map(s => ({
        'Full Name': s.name,
        'Username': s.username,
        'Email': s.email || '',
        'Role': s.role,
        'Department': s.department || '',
        'Assigned Platoon': s.platoon?.name || '',
        'Status': s.status
      }));
    } else {
      return res.status(400).json({ error: 'Unsupported entity' });
    }

    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, entity.toUpperCase());
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        userName: req.user.name,
        action: 'Bulk Export',
        targetType: entity,
        detail: `Exported ${data.length} records`
      }
    });

    res.setHeader('Content-Disposition', `attachment; filename="${entity}_export.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Export failed' });
  }
});

export default router;
