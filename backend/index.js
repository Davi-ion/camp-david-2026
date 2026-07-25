import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from './generated/prisma/client.ts';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { hashPassword } from './utils/password.js';

// Routes
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import rolesRoutes from './routes/roles.js';
import auditRoutes from './routes/audit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

const app = express();

// ─── Middleware ───────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '5mb' })); // Allow avatar uploads (base64)

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: { error: 'Too many requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

// ─── Routes ───────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/audit', auditRoutes);

// ─── Legacy: Keep staff endpoint for backward compat ─────────────
app.get('/api/staff', async (req, res) => {
  try {
    const staff = await prisma.staff.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, name: true, role: true, group: true,
        email: true, username: true, avatar: true, department: true,
        phone: true, status: true,
      },
    });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// ─── Seed ─────────────────────────────────────────────────────────
app.post('/api/seed', async (req, res) => {
  try {
    const defaultPassword = 'CampDavid@2026!';
    const passwordHash = await hashPassword(defaultPassword);

    // 1. Create default roles
    const roleDefinitions = [
      {
        name: 'Super Admin',
        description: 'Full platform access. Can manage everything.',
        permissions: ['all'],
        isSystem: true,
      },
      {
        name: 'Camp Director',
        description: 'Manage camp operations, view reports, manage staff.',
        permissions: [
          'view:dashboard', 'view:campers', 'view:attendance', 'view:incidents',
          'resolve:incidents', 'view:schedule', 'view:reports', 'manage:users',
          'create:announcements', 'view:audit',
        ],
        isSystem: true,
      },
      {
        name: 'Operations Admin',
        description: 'Manages daily camp operations.',
        permissions: [
          'view:dashboard', 'view:campers', 'edit:campers', 'take:attendance',
          'view:attendance', 'view:incidents', 'create:incidents', 'resolve:incidents',
          'view:schedule', 'edit:schedule', 'create:announcements', 'view:reports',
        ],
        isSystem: true,
      },
      {
        name: 'Platoon Leader',
        description: 'Assigned to one or more platoons. Views only assigned campers.',
        permissions: [
          'view:dashboard', 'view:campers', 'take:attendance', 'view:attendance',
          'view:incidents', 'create:incidents', 'view:schedule', 'view:reports',
        ],
        isSystem: true,
      },
      {
        name: 'Session Facilitator',
        description: 'Responsible for teaching sessions.',
        permissions: [
          'view:dashboard', 'view:attendance', 'take:attendance', 'view:schedule',
        ],
        isSystem: true,
      },
      {
        name: 'Counsellor',
        description: 'Can view assigned campers, record wellbeing and submit incidents.',
        permissions: [
          'view:dashboard', 'view:campers', 'view:attendance', 'create:incidents',
          'view:incidents',
        ],
        isSystem: true,
      },
      {
        name: 'Medical Team',
        description: 'Can view and record medical information.',
        permissions: [
          'view:dashboard', 'view:campers', 'view:medical', 'edit:medical',
          'create:incidents', 'view:incidents', 'resolve:incidents',
        ],
        isSystem: true,
      },
      {
        name: 'Security Team',
        description: 'Can log incidents, view emergency contacts and access logs.',
        permissions: [
          'view:dashboard', 'create:incidents', 'view:incidents', 'view:campers',
        ],
        isSystem: true,
      },
      {
        name: 'Media Team',
        description: 'Can upload photos and videos, manage gallery.',
        permissions: ['view:dashboard', 'upload:media', 'manage:gallery'],
        isSystem: true,
      },
      {
        name: 'Kitchen Team',
        description: 'Can view meal schedules and dietary restrictions.',
        permissions: ['view:dashboard', 'manage:kitchen', 'view:campers'],
        isSystem: true,
      },
      {
        name: 'Transport Team',
        description: 'Can manage transport manifests.',
        permissions: ['view:dashboard', 'manage:transport', 'view:campers'],
        isSystem: true,
      },
      {
        name: 'Volunteer',
        description: 'Limited access to assigned activities only.',
        permissions: ['view:dashboard', 'view:schedule'],
        isSystem: true,
      },
    ];

    const createdRoles = {};
    for (const roleDef of roleDefinitions) {
      const role = await prisma.role.upsert({
        where: { name: roleDef.name },
        update: { permissions: JSON.stringify(roleDef.permissions), description: roleDef.description },
        create: { ...roleDef, permissions: JSON.stringify(roleDef.permissions) },
      });
      createdRoles[roleDef.name] = role.id;
    }

    // 2. Create default staff members
    const staffData = [
      { id: 's1', name: 'Tunde Kayode',   email: 'tunde@campdavid.com',    username: 'tunde',     role: 'admin',     group: null,      department: 'Management',  roleName: 'Super Admin'     },
      { id: 's2', name: 'Pastor Kemi',    email: 'kemi@campdavid.com',     username: 'pkemi',     role: 'admin',     group: null,      department: 'Leadership',  roleName: 'Camp Director'   },
      { id: 's3', name: 'Bro Emmanuel',   email: 'emmanuel@campdavid.com', username: 'bro.emm',   role: 'team_lead', group: 'eagles',  department: 'Operations',  roleName: 'Platoon Leader'  },
      { id: 's4', name: 'Sis Funke',      email: 'funke@campdavid.com',    username: 'sis.funke', role: 'team_lead', group: 'lions',   department: 'Operations',  roleName: 'Platoon Leader'  },
      { id: 's5', name: 'David Obi',      email: 'david@campdavid.com',    username: 'david.obi', role: 'staff',     group: 'flames',  department: 'Counselling', roleName: 'Counsellor'      },
      { id: 's6', name: 'Grace Martins',  email: 'grace@campdavid.com',    username: 'grace.m',   role: 'staff',     group: 'arrows',  department: 'Counselling', roleName: 'Counsellor'      },
    ];

    for (const s of staffData) {
      const { roleName, ...staffFields } = s;
      await prisma.staff.upsert({
        where: { id: staffFields.id },
        update: { passwordHash, email: staffFields.email, username: staffFields.username, department: staffFields.department },
        create: { ...staffFields, passwordHash, forcePasswordChange: true },
      });

      const roleId = createdRoles[roleName];
      if (roleId) {
        await prisma.roleAssignment.upsert({
          where: { staffId: staffFields.id },
          update: { roleId },
          create: { staffId: staffFields.id, roleId },
        });
      }
    }

    res.json({
      message: `Seeded ${staffData.length} staff members and ${roleDefinitions.length} roles.`,
      defaultPassword,
      note: 'All users will be prompted to change their password on first login.',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Seed failed', details: error.message });
  }
});

// ─── 404 handler ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ─── Error handler ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ─── Start ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅  Backend running on http://localhost:${PORT}`));
