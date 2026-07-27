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
      { name: 'Assistant Camp Director', description: 'Assist Camp Director.', permissions: ['view:dashboard','view:campers','view:attendance','view:incidents','resolve:incidents','view:schedule','view:reports','create:announcements'], isSystem: true },
      { name: 'Operations Admin', description: 'Manages daily camp operations.', permissions: ['view:dashboard','view:campers','edit:campers','take:attendance','view:attendance','view:incidents','create:incidents','resolve:incidents','view:schedule','edit:schedule','create:announcements','view:reports'], isSystem: true },
      { name: 'Programme Coordinator', description: 'Manages sessions and schedule.', permissions: ['view:dashboard','view:schedule','edit:schedule'], isSystem: true },
      { name: 'Platoon Leader', description: 'Assigned to one or more platoons.', permissions: ['view:dashboard','view:campers','take:attendance','view:attendance','view:incidents','create:incidents','view:schedule','view:reports'], isSystem: true },
      { name: 'Counsellor', description: 'Can view assigned campers, record wellbeing and submit incidents.', permissions: ['view:dashboard','view:campers','view:attendance','create:incidents','view:incidents'], isSystem: true },
      { name: 'Session Facilitator', description: 'Responsible for teaching sessions.', permissions: ['view:dashboard','view:attendance','take:attendance','view:schedule'], isSystem: true },
      { name: 'Medical Team', description: 'Can view and record medical information.', permissions: ['view:dashboard','view:campers','view:medical','edit:medical','create:incidents','view:incidents','resolve:incidents'], isSystem: true },
      { name: 'Security Team', description: 'Can log incidents and view emergency contacts.', permissions: ['view:dashboard','create:incidents','view:incidents','view:campers'], isSystem: true },
      { name: 'Media Team', description: 'Can upload photos and videos.', permissions: ['view:dashboard','upload:media','manage:gallery'], isSystem: true },
      { name: 'Registration Team', description: 'Check-in campers.', permissions: ['view:dashboard','view:campers','edit:campers'], isSystem: true },
      { name: 'Welfare Team', description: 'Welfare operations.', permissions: ['view:dashboard','view:campers','create:incidents'], isSystem: true },
      { name: 'Kitchen Team', description: 'Can view meal schedules and dietary restrictions.', permissions: ['view:dashboard','manage:kitchen','view:campers'], isSystem: true },
      { name: 'Technical Team', description: 'AV and tech support.', permissions: ['view:dashboard'], isSystem: true },
      { name: 'Transport Team', description: 'Can manage transport manifests.', permissions: ['view:dashboard','manage:transport','view:campers'], isSystem: true },
      { name: 'Support Staff', description: 'General support.', permissions: ['view:dashboard'], isSystem: true },
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

    // ── Platoons (16 Teen Platoons) ────────────────────────────────────────────────
    const platoonNames = ['Alpha','Bravo','Charlie','Delta','Echo','Foxtrot','Golf','Kilo','Lima','Mike','Oscar','Quebec','Romeo','Sierra','Tango','Victor'];
    const emojis = ['⚔️','🦁','🔥','🦅','⚡','🛡️','🐅','⛰️','⚓','🎯','🐉','🏹','⭐','🌊','🌪️','🚀'];
    const colors = ['#DC2626','#D97706','#F59E0B','#10B981','#059669','#2563EB','#3B82F6','#6366F1','#8B5CF6','#EC4899','#F43F5E','#14B8A6','#84CC16','#06B6D4','#3B82F6','#F97316'];

    const platoonIds = {};
    for (let i = 0; i < platoonNames.length; i++) {
      const pName = platoonNames[i];
      const platoon = await prisma.platoon.upsert({
        where: { name: pName },
        update: { emoji: emojis[i], colorHex: colors[i] },
        create: { name: pName, emoji: emojis[i], colorHex: colors[i] },
      });
      platoonIds[pName] = platoon.id;
    }

    // ── Staff Generation ─────────────────────────────────────────────────────
    const staffToCreate = [];
    let staffCount = 1;

    const makeStaff = (name, roleName, dept, group = null) => {
      const username = name.split(' ').join('.').toLowerCase();
      staffToCreate.push({
        id: `s${staffCount++}`, name, email: `${username}@campdavid.com`, username, role: 'staff',
        department: dept, roleName, platoonKey: group,
      });
    };

    // HQ Staff
    makeStaff('Pastor Kemi', 'Camp Director', 'Leadership');
    makeStaff('Tunde Kayode', 'Super Admin', 'Management');
    makeStaff('Sola Ajayi', 'Assistant Camp Director', 'Leadership');
    makeStaff('Bro Emmanuel', 'Operations Admin', 'Operations');
    makeStaff('Sis Funke', 'Operations Admin', 'Operations');
    makeStaff('David Obi', 'Operations Admin', 'Operations');
    makeStaff('Grace Martins', 'Programme Coordinator', 'Programme');

    // Medical Team
    for(let i=1; i<=5; i++) makeStaff(`Medical Officer ${i}`, 'Medical Team', 'Medical');
    // Security Team
    for(let i=1; i<=5; i++) makeStaff(`Security Officer ${i}`, 'Security Team', 'Security');
    // Registration Team
    for(let i=1; i<=3; i++) makeStaff(`Registration Officer ${i}`, 'Registration Team', 'Registration');
    // Media Team
    for(let i=1; i<=3; i++) makeStaff(`Media Officer ${i}`, 'Media Team', 'Media');
    // Welfare Team
    for(let i=1; i<=3; i++) makeStaff(`Welfare Officer ${i}`, 'Welfare Team', 'Welfare');
    // Kitchen Team
    for(let i=1; i<=5; i++) makeStaff(`Kitchen Staff ${i}`, 'Kitchen Team', 'Kitchen');
    // Technical Team
    for(let i=1; i<=3; i++) makeStaff(`Tech Officer ${i}`, 'Technical Team', 'Technical');
    // Transport Team
    for(let i=1; i<=2; i++) makeStaff(`Transport Officer ${i}`, 'Transport Team', 'Transport');
    // Session Facilitator
    for(let i=1; i<=10; i++) makeStaff(`Facilitator ${i}`, 'Session Facilitator', 'Programme');
    // Support Staff
    for(let i=1; i<=5; i++) makeStaff(`Support Staff ${i}`, 'Support Staff', 'Support');

    // Platoon Leaders and Counsellors
    for (const pName of platoonNames) {
      makeStaff(`${pName} Leader`, 'Platoon Leader', 'Platoons', pName);
      makeStaff(`${pName} Counsellor 1`, 'Counsellor', 'Platoons', pName);
      makeStaff(`${pName} Counsellor 2`, 'Counsellor', 'Platoons', pName);
    }

    const createdCounsellorsByPlatoon = {};
    const createdLeadersByPlatoon = {};

    for (const s of staffToCreate) {
      const { roleName, platoonKey, ...staffFields } = s;
      const platoonId = platoonKey ? platoonIds[platoonKey] : null;
      
      const createdStaff = await prisma.staff.upsert({
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

      if (platoonKey) {
        if (roleName === 'Platoon Leader') {
          createdLeadersByPlatoon[platoonKey] = createdStaff.id;
          await prisma.platoon.update({ where: { id: platoonId }, data: { leaderId: createdStaff.id } });
        } else if (roleName === 'Counsellor') {
          if (!createdCounsellorsByPlatoon[platoonKey]) createdCounsellorsByPlatoon[platoonKey] = [];
          createdCounsellorsByPlatoon[platoonKey].push(createdStaff.id);
        }
      }
    }

    // ── Campers Generation (251) ───────────────────────────────────────────────────
    const firstNamesM = ['Adebayo','Chukwuemeka','Oluwaseun','Ibrahim','Tunde','Femi','David','Michael','Emmanuel','Daniel'];
    const firstNamesF = ['Chidinma','Ngozi','Aisha','Blessing','Ifeoma','Sarah','Grace','Joy','Mercy','Ruth'];
    const lastNames = ['Okafor','Bello','Adesanya','Adeyemi','Eze','Bakare','Udo','Ogundimu','Chukwu','Nwosu'];
    
    let camperCount = 0;
    const TOTAL_CAMPERS = 251;
    let platoonIndex = 0;

    for (let i = 1; i <= TOTAL_CAMPERS; i++) {
      const isMale = Math.random() > 0.5;
      const fn = isMale ? firstNamesM[Math.floor(Math.random() * firstNamesM.length)] : firstNamesF[Math.floor(Math.random() * firstNamesF.length)];
      const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
      const name = `${fn} ${ln}`;
      
      const platoonKey = platoonNames[platoonIndex];
      const platoonId = platoonIds[platoonKey];
      
      const counsellors = createdCounsellorsByPlatoon[platoonKey] || [];
      const counsellorId = counsellors[i % counsellors.length] || null;

      const hasMedical = Math.random() > 0.8;
      const medicalNotes = hasMedical ? 'Needs regular checkups.' : '';
      const hasDietary = Math.random() > 0.8;
      const dietaryRestrictions = hasDietary ? 'Vegetarian' : '';

      const regNum = `CD2026-${1000 + i}`;
      const qrCode = `CD26-QR-${1000 + i}`;

      await prisma.camper.upsert({
        where: { qrCode: qrCode }, // Use qrCode as unique for upsert or id
        update: { platoonId, counsellorId, medicalNotes, dietaryRestrictions },
        create: {
          id: `c${i}`,
          registrationNumber: regNum,
          name,
          age: 13 + Math.floor(Math.random() * 5),
          gender: isMale ? 'Male' : 'Female',
          platoonId,
          counsellorId,
          medicalNotes,
          dietaryRestrictions,
          qrCode,
          emergencyContact: JSON.stringify({ name: `Mr/Mrs ${ln}`, phone: '+234 800 000 0000', relationship: 'Parent' }),
          status: 'active'
        },
      });

      platoonIndex = (platoonIndex + 1) % platoonNames.length;
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

    console.log(`✅ Seed complete! Generated 16 Platoons, ${staffToCreate.length} Staff, and 251 Campers.`);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
