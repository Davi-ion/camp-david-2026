import { Router } from 'express';
import crypto from 'crypto';
import { PrismaClient } from '../generated/prisma/client.ts';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifyPassword, hashPassword, validatePasswordStrength } from '../utils/password.js';
import { signToken } from '../utils/token.js';
import { authenticate } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

const router = Router();

// ─── Helper: fetch permissions for a staff member ─────────────────
async function getPermissionsForUser(staffId) {
  const assignment = await prisma.roleAssignment.findUnique({
    where: { staffId },
    include: { role: true },
  });
  if (!assignment) return [];
  try {
    return JSON.parse(assignment.role.permissions);
  } catch {
    return [];
  }
}

// ─── Helper: log audit action ────────────────────────────────────
async function logAudit(prisma, { userId, userName, action, targetType, targetId, targetName, detail, ipAddress }) {
  try {
    await prisma.auditLog.create({
      data: { userId, userName, action, targetType, targetId, targetName, detail, ipAddress },
    });
  } catch { /* non-critical */ }
}

// ─── POST /api/auth/login ─────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body; // identifier = email or username
  const ip = req.ip || req.connection?.remoteAddress;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Email/username and password are required.' });
  }

  try {
    // Find user by email or username
    const user = await prisma.staff.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { username: identifier.toLowerCase() },
        ],
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Check account status
    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact an administrator.' });
    }
    if (user.status === 'inactive') {
      return res.status(403).json({ error: 'Your account is inactive. Please contact an administrator.' });
    }

    // Check account lockout
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remaining = Math.ceil((new Date(user.lockedUntil) - new Date()) / 60000);
      return res.status(423).json({
        error: `Account locked due to too many failed attempts. Try again in ${remaining} minute(s).`,
      });
    }

    // Verify password
    const passwordValid = user.passwordHash
      ? await verifyPassword(password, user.passwordHash)
      : false;

    if (!passwordValid) {
      // Increment failed attempts
      const newAttempts = user.failedLoginAttempts + 1;
      const lockUntil = newAttempts >= 6
        ? new Date(Date.now() + 15 * 60 * 1000) // lock for 15 minutes
        : null;

      await prisma.staff.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newAttempts,
          lockedUntil: lockUntil,
        },
      });

      if (lockUntil) {
        return res.status(423).json({ error: 'Account locked for 15 minutes after 6 failed attempts.' });
      }

      return res.status(401).json({ error: `Invalid credentials. ${6 - newAttempts} attempts remaining.` });
    }

    // Successful login — reset failed attempts
    await prisma.staff.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // Get user's role permissions
    const permissions = await getPermissionsForUser(user.id);
    const roleAssignment = await prisma.roleAssignment.findUnique({
      where: { staffId: user.id },
      include: { role: true },
    });

    // Build safe user object
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      roleId: roleAssignment?.roleId,
      roleName: roleAssignment?.role?.name || user.role,
      group: user.group,
      department: user.department,
      avatar: user.avatar,
      phone: user.phone,
      status: user.status,
      forcePasswordChange: user.forcePasswordChange,
      lastLoginAt: user.lastLoginAt,
      permissions,
    };

    const token = signToken(safeUser);

    // Audit log
    await logAudit(prisma, {
      userId: user.id,
      userName: user.name,
      action: 'LOGIN',
      ipAddress: ip,
    });

    res.json({ user: safeUser, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress;
  await logAudit(prisma, {
    userId: req.user.id,
    userName: req.user.name,
    action: 'LOGOUT',
    ipAddress: ip,
  });
  res.json({ message: 'Logged out successfully.' });
});

// ─── POST /api/auth/change-password ──────────────────────────────
router.post('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const ip = req.ip || req.connection?.remoteAddress;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required.' });
  }

  const strength = validatePasswordStrength(newPassword);
  if (!strength.valid) {
    return res.status(400).json({ error: strength.message });
  }

  try {
    const user = await prisma.staff.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect.' });

    const newHash = await hashPassword(newPassword);
    await prisma.staff.update({
      where: { id: user.id },
      data: { passwordHash: newHash, forcePasswordChange: false },
    });

    await logAudit(prisma, {
      userId: user.id,
      userName: user.name,
      action: 'CHANGE_PASSWORD',
      ipAddress: ip,
    });

    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

// ─── POST /api/auth/force-change-password ────────────────────────
// Used on first login when forcePasswordChange is true
router.post('/force-change-password', authenticate, async (req, res) => {
  const { newPassword } = req.body;

  const strength = validatePasswordStrength(newPassword);
  if (!strength.valid) {
    return res.status(400).json({ error: strength.message });
  }

  try {
    const newHash = await hashPassword(newPassword);
    const updated = await prisma.staff.update({
      where: { id: req.user.id },
      data: { passwordHash: newHash, forcePasswordChange: false },
    });

    const permissions = await getPermissionsForUser(updated.id);
    const roleAssignment = await prisma.roleAssignment.findUnique({
      where: { staffId: updated.id },
      include: { role: true },
    });

    const safeUser = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      username: updated.username,
      role: updated.role,
      roleName: roleAssignment?.role?.name || updated.role,
      group: updated.group,
      department: updated.department,
      avatar: updated.avatar,
      phone: updated.phone,
      status: updated.status,
      forcePasswordChange: false,
      permissions,
    };

    const token = signToken(safeUser);
    res.json({ user: safeUser, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update password.' });
  }
});

// ─── POST /api/auth/forgot-password ──────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    const user = await prisma.staff.findFirst({
      where: { email: email.toLowerCase() },
    });

    // Always return 200 to prevent email enumeration
    if (!user) return res.json({ message: 'If an account exists, a reset code has been sent.' });

    const token = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8-char code
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    // In production, send email. For dev, return token in response.
    console.log(`[DEV] Password reset token for ${email}: ${token}`);

    res.json({
      message: 'If an account exists, a reset code has been sent.',
      devToken: process.env.NODE_ENV !== 'production' ? token : undefined,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process request.' });
  }
});

// ─── POST /api/auth/reset-password ───────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Reset token and new password are required.' });
  }

  const strength = validatePasswordStrength(newPassword);
  if (!strength.valid) return res.status(400).json({ error: strength.message });

  try {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) return res.status(400).json({ error: 'Invalid reset code.' });
    if (resetToken.usedAt) return res.status(400).json({ error: 'This reset code has already been used.' });
    if (new Date(resetToken.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
    }

    const newHash = await hashPassword(newPassword);
    await prisma.staff.update({
      where: { id: resetToken.userId },
      data: { passwordHash: newHash, forcePasswordChange: false, failedLoginAttempts: 0, lockedUntil: null },
    });
    await prisma.passwordResetToken.update({
      where: { token },
      data: { usedAt: new Date() },
    });

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.staff.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const permissions = await getPermissionsForUser(user.id);
    const roleAssignment = await prisma.roleAssignment.findUnique({
      where: { staffId: user.id },
      include: { role: true },
    });

    const { passwordHash, pin, ...safe } = user;
    res.json({ ...safe, permissions, roleName: roleAssignment?.role?.name });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

export default router;
