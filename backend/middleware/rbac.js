/**
 * RBAC permission middleware factory.
 * Usage: requirePermission('manage:users')
 */
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const userPermissions = req.user.permissions || [];

    // Super Admin or anyone with 'all' permission bypasses checks
    if (userPermissions.includes('all') || userPermissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({
      error: `You do not have permission to perform this action. Required: ${permission}`,
    });
  };
}

/**
 * Require one of several permissions (OR logic).
 */
export function requireAnyPermission(...permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const userPermissions = req.user.permissions || [];

    if (userPermissions.includes('all')) return next();

    const hasAny = permissions.some((p) => userPermissions.includes(p));
    if (hasAny) return next();

    return res.status(403).json({
      error: `You do not have the required permissions.`,
    });
  };
}
