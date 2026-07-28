import { Router } from 'express';
import { PrismaClient } from '../generated/prisma/client.ts';
const prisma = new PrismaClient();

const router = Router();
const SAFE_FIELDS = { passwordHash: false, pin: false };

async function getPermissionsForUser(staffId) {
  const assignment = await prisma.roleAssignment.findUnique({
    where: { staffId },
    include: { role: true },
  });
  if (!assignment) return [];
  try { return JSON.parse(assignment.role.permissions); } catch { return []; }
}

async function logAudit(data) {
  try { await prisma.auditLog.create({ data }); } catch {}
}

function safeUser(user) {
  const { passwordHash, pin, ...rest } = user;
  return rest;
}

// ─── GET /api/users ───────────────────────────────────────────────
router.get('/', authenticate, requirePermission('manage:users'), async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 50 } = req.query;
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { username: { contains: search } },
      ];
    }
    if (role) where.role = role;
    if (status) where.status = status;

    const users = await prisma.staff.findMany({
      where,
      select: {
        id: true, name: true, email: true, username: true,
        role: true, group: true, department: true, phone: true,
        gender: true, avatar: true, status: true, lastLoginAt: true,
        createdAt: true, forcePasswordChange: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    const total = await prisma.staff.count({ where });

    // Attach role assignment info
    const usersWithRoles = await Promise.all(users.map(async (u) => {
      const assignment = await prisma.roleAssignment.findUnique({
        where: { staffId: u.id },
        include: { role: true },
      });
      return { ...u, roleName: assignment?.role?.name, roleId: assignment?.roleId };
    }));

    res.json({ users: usersWithRoles, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// ─── GET /api/users/:id ───────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  // Users can view their own profile; admins can view any
  if (req.user.id !== id && !req.user.permissions?.includes('manage:users') && !req.user.permissions?.includes('all')) {
    return res.status(403).json({ error: 'You can only view your own profile.' });
  }
  try {
    const user = await prisma.staff.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const permissions = await getPermissionsForUser(user.id);
    const assignment = await prisma.roleAssignment.findUnique({
      where: { staffId: user.id },
      include: { role: true },
    });

    res.json({ ...safeUser(user), permissions, roleName: assignment?.role?.name, roleId: assignment?.roleId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

// ─── POST /api/users ──────────────────────────────────────────────
router.post('/', authenticate, requirePermission('manage:users'), async (req, res) => {
  const { name, email, username, password, role, group, department, phone, gender, bio, roleId } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const strength = validatePasswordStrength(password);
  if (!strength.valid) return res.status(400).json({ error: strength.message });

  try {
    const passwordHash = await hashPassword(password);
    const user = await prisma.staff.create({
      data: {
        name,
        email: email.toLowerCase(),
        username: username?.toLowerCase() || email.toLowerCase().split('@')[0],
        passwordHash,
        role: role || 'staff',
        group: group || null,
        department: department || null,
        phone: phone || null,
        gender: gender || null,
        bio: bio || null,
        forcePasswordChange: true,
        createdBy: req.user.id,
      },
    });

    // Assign role if roleId provided
    if (roleId) {
      await prisma.roleAssignment.create({
        data: { staffId: user.id, roleId },
      });
    }

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'CREATE_USER',
      targetType: 'Staff',
      targetId: user.id,
      targetName: user.name,
    });

    // Create welcome notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Welcome to Camp David 2026',
        message: `Hi ${user.name}! Your account has been created. You will be prompted to set a new password on first login.`,
        type: 'info',
      },
    });

    res.status(201).json(safeUser(user));
  } catch (error) {
    console.error(error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A user with this email or username already exists.' });
    }
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// ─── PUT /api/users/:id ───────────────────────────────────────────
router.put('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const userPerms = req.user.permissions || [];
  const isAdmin = userPerms.includes('all') || userPerms.includes('manage:users');
  const isSelf = req.user.id === id;

  if (!isSelf && !isAdmin) {
    return res.status(403).json({ error: 'You can only edit your own profile.' });
  }

  const { name, phone, email, bio, address, emergencyContact, avatar, gender,
          // Admin-only fields:
          role, department, group, status, roleId } = req.body;

  const data = {};

  // Fields editable by everyone (self)
  if (name !== undefined) data.name = name;
  if (phone !== undefined) data.phone = phone;
  if (bio !== undefined) data.bio = bio;
  if (address !== undefined) data.address = address;
  if (emergencyContact !== undefined) data.emergencyContact = emergencyContact;
  if (avatar !== undefined) data.avatar = avatar;
  if (gender !== undefined) data.gender = gender;

  // Email change allowed for self too
  if (email !== undefined) data.email = email.toLowerCase();

  // Admin-only fields
  if (isAdmin) {
    if (role !== undefined) data.role = role;
    if (department !== undefined) data.department = department;
    if (group !== undefined) data.group = group;
    if (status !== undefined) data.status = status;
  }

  try {
    const updated = await prisma.staff.update({ where: { id }, data });

    // Update role assignment if admin changed it
    if (isAdmin && roleId !== undefined) {
      const existing = await prisma.roleAssignment.findUnique({ where: { staffId: id } });
      if (existing) {
        await prisma.roleAssignment.update({ where: { staffId: id }, data: { roleId } });
      } else {
        await prisma.roleAssignment.create({ data: { staffId: id, roleId } });
      }
    }

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: isSelf ? 'UPDATE_PROFILE' : 'UPDATE_USER',
      targetType: 'Staff',
      targetId: id,
      targetName: updated.name,
    });

    res.json(safeUser(updated));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

// ─── DELETE /api/users/:id ────────────────────────────────────────
router.delete('/:id', authenticate, requirePermission('manage:users'), async (req, res) => {
  const { id } = req.params;
  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }
  try {
    const user = await prisma.staff.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    await prisma.staff.delete({ where: { id } });

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'DELETE_USER',
      targetType: 'Staff',
      targetId: id,
      targetName: user.name,
    });

    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// ─── POST /api/users/:id/reset-password ──────────────────────────
router.post('/:id/reset-password', authenticate, requirePermission('manage:users'), async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) return res.status(400).json({ error: 'New password is required.' });

  const strength = validatePasswordStrength(newPassword);
  if (!strength.valid) return res.status(400).json({ error: strength.message });

  try {
    const passwordHash = await hashPassword(newPassword);
    const user = await prisma.staff.update({
      where: { id },
      data: { passwordHash, forcePasswordChange: true, failedLoginAttempts: 0, lockedUntil: null },
    });

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'ADMIN_RESET_PASSWORD',
      targetType: 'Staff',
      targetId: id,
      targetName: user.name,
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId: id,
        title: 'Password Reset',
        message: 'Your password has been reset by an administrator. You will be prompted to set a new password on next login.',
        type: 'warning',
      },
    });

    res.json({ message: `Password reset for ${user.name}. They will be prompted to change it on next login.` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// ─── GET /api/users/:id/notifications ────────────────────────────
router.get('/:id/notifications', authenticate, async (req, res) => {
  if (req.user.id !== req.params.id) return res.status(403).json({ error: 'Forbidden.' });
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// ─── PATCH /api/users/:id/notifications/:nid/read ────────────────
router.patch('/:id/notifications/:nid/read', authenticate, async (req, res) => {
  if (req.user.id !== req.params.id) return res.status(403).json({ error: 'Forbidden.' });
  try {
    await prisma.notification.update({ where: { id: req.params.nid }, data: { isRead: true } });
    res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification.' });
  }
});

// ─── PATCH /api/users/:id/notifications/read-all ─────────────────
router.patch('/:id/notifications/read-all', authenticate, async (req, res) => {
  if (req.user.id !== req.params.id) return res.status(403).json({ error: 'Forbidden.' });
  try {
    await prisma.notification.updateMany({ where: { userId: req.params.id, isRead: false }, data: { isRead: true } });
    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
});

export default router;
