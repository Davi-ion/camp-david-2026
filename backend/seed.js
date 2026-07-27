import { PrismaClient } from './generated/prisma/client.ts';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { hashPassword } from './utils/password.js';

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function seed() {
  try {
    const defaultPassword = 'CampDavid@2026!';
    const passwordHash = await hashPassword(defaultPassword);

    // ── Roles ──────────────────────────────────────────────────────
    const roleDefinitions = [
      { name: 'Super Admin', description: 'Full platform access.', permissions: ['all'], isSystem: true },
      { name: 'Camp Director', description: 'Manage camp operations, view reports, manage staff.', permissions: ['view:dashboard','view:campers','view:attendance','view:incidents','resolve:incidents','view:schedule','view:reports','manage:users','create:announcements','view:audit'], isSystem: true },
      { name: 'Operations Admin', description: 'Manages daily camp operations.', permissions: ['view:dashboard','view:campers','edit:campers','take:attendance','view:attendance','view:incidents','create:incidents','resolve:incidents','view:schedule','edit:schedule','create:announcements','view:reports'], isSystem: true },
      { name: 'Platoon Leader', description: 'Assigned to one or more platoons.', permissions: ['view:dashboard','view:campers','take:attendance','view:attendance','view:incidents','create:incidents','view:schedule','view:reports'], isSystem: true },
      { name: 'Session Facilitator', description: 'Responsible for teaching sessions.', permissions: ['view:dashboard','view:attendance','take:attendance','view:schedule'], isSystem: true },
      { name: 'Counsellor', description: 'Can view assigned campers, record wellbeing and submit incidents.', permissions: ['view:dashboard','view:campers','view:attendance','create:incidents','view:incidents'], isSystem: true },
      { name: 'Medical Team', description: 'Can view and record medical information.', permissions: ['view:dashboard','view:campers','view:medical','edit:medical','create:incidents','view:incidents','resolve:incidents'], isSystem: true },
      { name: 'Security Team', description: 'Can log incidents and view emergency contacts.', permissions: ['view:dashboard','create:incidents','view:incidents','view:campers'], isSystem: true },
      { name: 'Media Team', description: 'Can upload photos and videos.', permissions: ['view:dashboard','upload:media','manage:gallery'], isSystem: true },
      { name: 'Kitchen Team', description: 'Can view meal schedules and dietary restrictions.', permissions: ['view:dashboard','manage:kitchen','view:campers'], isSystem: true },
      { name: 'Transport Team', description: 'Can manage transport manifests.', permissions: ['view:dashboard','manage:transport','view:campers'], isSystem: true },
      { name: 'Volunteer', description: 'Limited access to assigned activities only.', permissions: ['view:dashboard','view:schedule'], isSystem: true },
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

    // ── Platoons ───────────────────────────────────────────────────
    const platoonDefs = [
      { id: 'p-eagles', name: 'Eagles', emoji: '🦅', colorHex: '#1B7865' },
      { id: 'p-lions',  name: 'Lions',  emoji: '🦁', colorHex: '#D97706' },
      { id: 'p-flames', name: 'Flames', emoji: '🔥', colorHex: '#DC2626' },
      { id: 'p-arrows', name: 'Arrows', emoji: '🏹', colorHex: '#2563EB' },
    ];

    const platoonIds = {};
    for (const p of platoonDefs) {
      console.log('Upserting platoon:', p.name);
      const platoon = await prisma.platoon.upsert({
        where: { name: p.name },
        update: { emoji: p.emoji, colorHex: p.colorHex },
        create: p,
      });
      platoonIds[p.name.toLowerCase()] = platoon.id;
    }

    // ── Staff ─────────────────────────────────────────────────────
    const staffData = [
      { id: 's1', name: 'Tunde Kayode',   email: 'tunde@campdavid.com',     username: 'tunde',     role: 'admin',     group: null,    department: 'Management',  roleName: 'Super Admin',     platoonKey: null },
      { id: 's2', name: 'Pastor Kemi',    email: 'kemi@campdavid.com',      username: 'pkemi',     role: 'admin',     group: null,    department: 'Leadership',  roleName: 'Camp Director',   platoonKey: null },
      { id: 's3', name: 'Bro Emmanuel',   email: 'emmanuel@campdavid.com',  username: 'bro.emm',   role: 'team_lead', group: 'eagles',department: 'Operations',  roleName: 'Platoon Leader',  platoonKey: 'eagles' },
      { id: 's4', name: 'Sis Funke',      email: 'funke@campdavid.com',     username: 'sis.funke', role: 'team_lead', group: 'lions', department: 'Operations',  roleName: 'Platoon Leader',  platoonKey: 'lions' },
      { id: 's5', name: 'David Obi',      email: 'david@campdavid.com',     username: 'david.obi', role: 'staff',     group: 'flames',department: 'Counselling', roleName: 'Counsellor',      platoonKey: 'flames' },
      { id: 's6', name: 'Grace Martins',  email: 'grace@campdavid.com',     username: 'grace.m',   role: 'staff',     group: 'arrows',department: 'Counselling', roleName: 'Counsellor',      platoonKey: 'arrows' },
    ];

    for (const s of staffData) {
      console.log('Upserting staff:', s.name);
      const { roleName, platoonKey, ...staffFields } = s;
      const platoonId = platoonKey ? platoonIds[platoonKey] : null;
      await prisma.staff.upsert({
        where: { id: staffFields.id },
        update: { passwordHash, email: staffFields.email, username: staffFields.username, department: staffFields.department, platoonId },
        create: { ...staffFields, passwordHash, forcePasswordChange: true, platoonId },
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

    // Update platoon leaders
    await prisma.platoon.update({ where: { name: 'Eagles' }, data: { leaderId: 's3' } });
    await prisma.platoon.update({ where: { name: 'Lions' },  data: { leaderId: 's4' } });
    await prisma.platoon.update({ where: { name: 'Flames' }, data: { leaderId: 's5' } });
    await prisma.platoon.update({ where: { name: 'Arrows' }, data: { leaderId: 's6' } });

    // ── Campers ───────────────────────────────────────────────────
    const campers = [
      { id: 'c1',  name: 'Adebayo Oluwaseun', platoonKey: 'eagles', age: 14, medicalNotes: 'Allergic to peanuts. Carries EpiPen.', emergencyContact: JSON.stringify({ name: 'Mrs Oluwaseun', phone: '+234 803 456 7890', relationship: 'Mother' }) },
      { id: 'c2',  name: 'Chidinma Okafor',   platoonKey: 'eagles', age: 15, medicalNotes: '', emergencyContact: JSON.stringify({ name: 'Mr Okafor', phone: '+234 812 345 6789', relationship: 'Father' }) },
      { id: 'c3',  name: 'Tolu Adesanya',      platoonKey: 'eagles', age: 13, medicalNotes: 'Asthmatic. Has inhaler.', emergencyContact: JSON.stringify({ name: 'Mrs Adesanya', phone: '+234 705 678 1234', relationship: 'Mother' }) },
      { id: 'c4',  name: 'Emeka Nwosu',        platoonKey: 'lions',  age: 16, medicalNotes: '', emergencyContact: JSON.stringify({ name: 'Dr Nwosu', phone: '+234 809 876 5432', relationship: 'Father' }) },
      { id: 'c5',  name: 'Aisha Bello',        platoonKey: 'lions',  age: 14, medicalNotes: 'Diabetic (Type 1). Insulin pump.', emergencyContact: JSON.stringify({ name: 'Mrs Bello', phone: '+234 816 234 5678', relationship: 'Mother' }) },
      { id: 'c6',  name: 'Femi Adeyemi',       platoonKey: 'lions',  age: 15, medicalNotes: '', emergencyContact: JSON.stringify({ name: 'Pastor Adeyemi', phone: '+234 703 456 7891', relationship: 'Father' }) },
      { id: 'c7',  name: 'Ngozi Eze',          platoonKey: 'flames', age: 13, medicalNotes: '', emergencyContact: JSON.stringify({ name: 'Mrs Eze', phone: '+234 811 567 8901', relationship: 'Mother' }) },
      { id: 'c8',  name: 'Damilola Bakare',    platoonKey: 'flames', age: 15, medicalNotes: 'Epileptic. On medication.', emergencyContact: JSON.stringify({ name: 'Mr Bakare', phone: '+234 802 345 6780', relationship: 'Father' }) },
      { id: 'c9',  name: 'Yusuf Ibrahim',      platoonKey: 'flames', age: 14, medicalNotes: '', emergencyContact: JSON.stringify({ name: 'Mrs Ibrahim', phone: '+234 708 901 2345', relationship: 'Mother' }) },
      { id: 'c10', name: 'Blessing Udo',       platoonKey: 'arrows', age: 16, medicalNotes: '', emergencyContact: JSON.stringify({ name: 'Deaconess Udo', phone: '+234 815 678 9012', relationship: 'Mother' }) },
      { id: 'c11', name: 'Kolade Ogundimu',    platoonKey: 'arrows', age: 14, medicalNotes: 'Severe seafood allergy.', emergencyContact: JSON.stringify({ name: 'Mr Ogundimu', phone: '+234 806 789 0123', relationship: 'Father' }) },
      { id: 'c12', name: 'Ifeoma Chukwu',      platoonKey: 'arrows', age: 15, medicalNotes: '', emergencyContact: JSON.stringify({ name: 'Mrs Chukwu', phone: '+234 701 234 5678', relationship: 'Mother' }) },
    ];

    let regNum = 1001;
    for (const c of campers) {
      console.log('Upserting camper:', c.name);
      const { platoonKey, ...camperFields } = c;
      const platoonId = platoonIds[platoonKey];
      await prisma.camper.upsert({
        where: { id: camperFields.id },
        update: { platoonId, medicalNotes: camperFields.medicalNotes, emergencyContact: camperFields.emergencyContact },
        create: { ...camperFields, platoonId, registrationNumber: `CD2026-${regNum++}`, status: 'active' },
      });
    }

    // ── Default Settings ──────────────────────────────────────────
    const defaultSettings = [
      { key: 'camp_name',        value: 'Camp David 2026' },
      { key: 'camp_location',    value: 'Camp David, Abuja, Nigeria' },
      { key: 'camp_start_date',  value: '2026-08-01' },
      { key: 'camp_end_date',    value: '2026-08-05' },
      { key: 'camp_theme',       value: 'Rising Generation' },
      { key: 'grace_period_min', value: '15' },
      { key: 'session_length',   value: '8h' },
    ];
    for (const s of defaultSettings) {
      await prisma.campSettings.upsert({
        where: { key: s.key },
        update: { value: s.value },
        create: s,
      });
    }

    // ── Sample Incidents ──────────────────────────────────────────
    const sampleIncidents = [
      { id: 'i1', title: 'Peanut allergy reaction', description: 'Adebayo Oluwaseun had a mild reaction at lunch. EpiPen administered.', category: 'medical', severity: 'high', status: 'resolved', camperId: 'c1', reportedById: 's5', resolution: 'EpiPen used, parents notified, camper monitored for 2 hours. Fully recovered.' },
      { id: 'i2', title: 'Minor altercation between campers', description: 'Two campers in the Flames platoon had a verbal argument during football.', category: 'behaviour', severity: 'low', status: 'open', camperId: 'c7', reportedById: 's5' },
    ];
    for (const inc of sampleIncidents) {
      await prisma.incident.upsert({
        where: { id: inc.id },
        update: { status: inc.status },
        create: { ...inc, resolvedAt: inc.status === 'resolved' ? new Date() : null },
      });
    }

    // ── Sample Announcement ───────────────────────────────────────
    await prisma.announcement.upsert({
      where: { id: 'ann1' },
      update: {},
      create: { id: 'ann1', title: 'Welcome to Camp David 2026!', body: 'We are thrilled to welcome all campers, staff and leaders. Please review your platoon assignments and session schedules.', urgent: false, pinned: true, targetType: 'all', authorName: 'Tunde Kayode', authorId: 's1' },
    });

    console.log('✅ Seed complete!');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
