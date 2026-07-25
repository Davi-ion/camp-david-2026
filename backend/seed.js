import { PrismaClient } from './generated/prisma/client.ts';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { hashPassword } from './utils/password.js';

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function seed() {
  try {
    const defaultPassword = 'CampDavid@2026!';
    const passwordHash = await hashPassword(defaultPassword);

    const roleDefinitions = [
      { name: 'Super Admin', description: 'Full platform access. Can manage everything.', permissions: ['all'], isSystem: true },
      { name: 'Camp Director', description: 'Manage camp operations, view reports, manage staff.', permissions: ['view:dashboard', 'view:campers', 'view:attendance', 'view:incidents', 'resolve:incidents', 'view:schedule', 'view:reports', 'manage:users', 'create:announcements', 'view:audit'], isSystem: true },
      { name: 'Operations Admin', description: 'Manages daily camp operations.', permissions: ['view:dashboard', 'view:campers', 'edit:campers', 'take:attendance', 'view:attendance', 'view:incidents', 'create:incidents', 'resolve:incidents', 'view:schedule', 'edit:schedule', 'create:announcements', 'view:reports'], isSystem: true },
      { name: 'Platoon Leader', description: 'Assigned to one or more platoons. Views only assigned campers.', permissions: ['view:dashboard', 'view:campers', 'take:attendance', 'view:attendance', 'view:incidents', 'create:incidents', 'view:schedule', 'view:reports'], isSystem: true },
      { name: 'Session Facilitator', description: 'Responsible for teaching sessions.', permissions: ['view:dashboard', 'view:attendance', 'take:attendance', 'view:schedule'], isSystem: true },
      { name: 'Counsellor', description: 'Can view assigned campers, record wellbeing and submit incidents.', permissions: ['view:dashboard', 'view:campers', 'view:attendance', 'create:incidents', 'view:incidents'], isSystem: true },
      { name: 'Medical Team', description: 'Can view and record medical information.', permissions: ['view:dashboard', 'view:campers', 'view:medical', 'edit:medical', 'create:incidents', 'view:incidents', 'resolve:incidents'], isSystem: true },
      { name: 'Security Team', description: 'Can log incidents, view emergency contacts and access logs.', permissions: ['view:dashboard', 'create:incidents', 'view:incidents', 'view:campers'], isSystem: true },
      { name: 'Media Team', description: 'Can upload photos and videos, manage gallery.', permissions: ['view:dashboard', 'upload:media', 'manage:gallery'], isSystem: true },
      { name: 'Kitchen Team', description: 'Can view meal schedules and dietary restrictions.', permissions: ['view:dashboard', 'manage:kitchen', 'view:campers'], isSystem: true },
      { name: 'Transport Team', description: 'Can manage transport manifests.', permissions: ['view:dashboard', 'manage:transport', 'view:campers'], isSystem: true },
      { name: 'Volunteer', description: 'Limited access to assigned activities only.', permissions: ['view:dashboard', 'view:schedule'], isSystem: true },
    ];

    const createdRoles = {};
    for (const roleDef of roleDefinitions) {
      console.log('Upserting role:', roleDef.name);
      const role = await prisma.role.upsert({
        where: { name: roleDef.name },
        update: { permissions: JSON.stringify(roleDef.permissions), description: roleDef.description },
        create: { ...roleDef, permissions: JSON.stringify(roleDef.permissions) },
      });
      createdRoles[roleDef.name] = role.id;
    }

    const staffData = [
      { id: 's1', name: 'Tunde Kayode', email: 'tunde@campdavid.com', username: 'tunde', role: 'admin', group: null, department: 'Management', roleName: 'Super Admin' },
      { id: 's2', name: 'Pastor Kemi', email: 'kemi@campdavid.com', username: 'pkemi', role: 'admin', group: null, department: 'Leadership', roleName: 'Camp Director' },
      { id: 's3', name: 'Bro Emmanuel', email: 'emmanuel@campdavid.com', username: 'bro.emm', role: 'team_lead', group: 'eagles', department: 'Operations', roleName: 'Platoon Leader' },
      { id: 's4', name: 'Sis Funke', email: 'funke@campdavid.com', username: 'sis.funke', role: 'team_lead', group: 'lions', department: 'Operations', roleName: 'Platoon Leader' },
      { id: 's5', name: 'David Obi', email: 'david@campdavid.com', username: 'david.obi', role: 'staff', group: 'flames', department: 'Counselling', roleName: 'Counsellor' },
      { id: 's6', name: 'Grace Martins', email: 'grace@campdavid.com', username: 'grace.m', role: 'staff', group: 'arrows', department: 'Counselling', roleName: 'Counsellor' },
    ];

    for (const s of staffData) {
      console.log('Upserting staff:', s.name);
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

    console.log('Seed complete!');
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
