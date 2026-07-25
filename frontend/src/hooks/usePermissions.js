import { useApp } from '../context/AppContext';

export function usePermissions() {
  const { state } = useApp();
  const permissions = state.currentUser?.permissions || [];

  const hasPermission = (permission) => {
    if (permissions.includes('all')) return true;
    return permissions.includes(permission);
  };

  const hasAnyPermission = (...required) => {
    if (permissions.includes('all')) return true;
    return required.some((p) => permissions.includes(p));
  };

  const hasAllPermissions = (...required) => {
    if (permissions.includes('all')) return true;
    return required.every((p) => permissions.includes(p));
  };

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin: hasPermission('manage:users') || hasPermission('all'),
  };
}
