import { Router } from 'express';
import { PrismaClient } from '../generated/prisma/client.ts';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL });

const router = Router();

async function logAudit(data) {
  try { await prisma.auditLog.create({ data }); } catch {}
}

// ─── GET /api/roles ───────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
    res.json(roles.map(r => ({ ...r, permissions: JSON.parse(r.permissions || '[]') })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roles.' });
  }
});

// ─── GET /api/roles/:id ───────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const role = await prisma.role.findUnique({ where: { id: req.params.id } });
    if (!role) return res.status(404).json({ error: 'Role not found.' });
    res.json({ ...role, permissions: JSON.parse(role.permissions || '[]') });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch role.' });
  }
});

// ─── POST /api/roles ──────────────────────────────────────────────
router.post('/', authenticate, requirePermission('manage:roles'), async (req, res) => {
  const { name, description, permissions } = req.body;
  if (!name) return res.status(400).json({ error: 'Role name is required.' });

  try {
    const role = await prisma.role.create({
      data: {
        name,
        description: description || null,
        permissions: JSON.stringify(permissions || []),
      },
    });

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'CREATE_ROLE',
      targetType: 'Role',
      targetId: role.id,
      targetName: role.name,
    });

    res.status(201).json({ ...role, permissions: JSON.parse(role.permissions) });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A role with this name already exists.' });
    }
    res.status(500).json({ error: 'Failed to create role.' });
  }
});

// ─── PUT /api/roles/:id ───────────────────────────────────────────
router.put('/:id', authenticate, requirePermission('manage:roles'), async (req, res) => {
  const { name, description, permissions } = req.body;

  try {
    const existing = await prisma.role.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Role not found.' });
    if (existing.isSystem && name && name !== existing.name) {
      return res.status(403).json({ error: 'Cannot rename a system role.' });
    }

    const updated = await prisma.role.update({
      where: { id: req.params.id },
      data: {
        name: name || existing.name,
        description: description !== undefined ? description : existing.description,
        permissions: permissions !== undefined ? JSON.stringify(permissions) : existing.permissions,
      },
    });

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'UPDATE_ROLE',
      targetType: 'Role',
      targetId: updated.id,
      targetName: updated.name,
    });

    res.json({ ...updated, permissions: JSON.parse(updated.permissions) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update role.' });
  }
});

// ─── POST /api/roles/:id/duplicate ───────────────────────────────
router.post('/:id/duplicate', authenticate, requirePermission('manage:roles'), async (req, res) => {
  try {
    const original = await prisma.role.findUnique({ where: { id: req.params.id } });
    if (!original) return res.status(404).json({ error: 'Role not found.' });

    const newRole = await prisma.role.create({
      data: {
        name: `${original.name} (Copy)`,
        description: original.description,
        permissions: original.permissions,
        isSystem: false,
      },
    });

    res.status(201).json({ ...newRole, permissions: JSON.parse(newRole.permissions) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to duplicate role.' });
  }
});

// ─── DELETE /api/roles/:id ────────────────────────────────────────
router.delete('/:id', authenticate, requirePermission('manage:roles'), async (req, res) => {
  try {
    const role = await prisma.role.findUnique({ where: { id: req.params.id } });
    if (!role) return res.status(404).json({ error: 'Role not found.' });
    if (role.isSystem) return res.status(403).json({ error: 'Cannot delete a system role.' });

    // Check if any users are assigned to this role
    const assignments = await prisma.roleAssignment.count({ where: { roleId: req.params.id } });
    if (assignments > 0) {
      return res.status(409).json({ error: `Cannot delete role — ${assignments} user(s) are currently assigned to it.` });
    }

    await prisma.role.delete({ where: { id: req.params.id } });

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      action: 'DELETE_ROLE',
      targetType: 'Role',
      targetId: req.params.id,
      targetName: role.name,
    });

    res.json({ message: 'Role deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete role.' });
  }
});

export default router;
