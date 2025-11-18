import { User, Permission, ROLE_PERMISSIONS } from '../types';

// In a real app, this would use a library like date-fns or moment.js
// And Intl.NumberFormat for currency
export const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
};

export const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
};

export const exportToCsv = (filename: string, rows: object[]) => {
    if (!rows || rows.length === 0) {
        console.error("No data to export.");
        return;
    }
    const separator = ',';
    const keys = Object.keys(rows[0]);
    
    const csvContent =
        keys.join(separator) +
        '\n' +
        rows.map(row => {
            return keys.map(k => {
                let cell = (row as any)[k] === null || (row as any)[k] === undefined ? '' : (row as any)[k];
                cell = cell instanceof Date
                    ? cell.toLocaleString()
                    : cell.toString().replace(/"/g, '""');
                if (cell.search(/("|,|\n)/g) >= 0) {
                    cell = `"${cell}"`;
                }
                return cell;
            }).join(separator);
        }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

// ========= PERMISSION HELPERS =========

/**
 * Check if a user has a specific permission
 * @param user - The user to check permissions for
 * @param permission - The permission to check
 * @returns true if user has the permission, false otherwise
 */
export const hasPermission = (user: User | null, permission: Permission): boolean => {
    if (!user) return false;
    
    // If user has custom permissions, use those
    if (user.permissions && user.permissions.length > 0) {
        return user.permissions.includes(permission);
    }
    
    // Otherwise, use role-based permissions
    const rolePermissions = ROLE_PERMISSIONS[user.role];
    return rolePermissions ? rolePermissions.includes(permission) : false;
};

/**
 * Check if a user has any of the specified permissions
 * @param user - The user to check permissions for
 * @param permissions - Array of permissions to check
 * @returns true if user has at least one permission, false otherwise
 */
export const hasAnyPermission = (user: User | null, permissions: Permission[]): boolean => {
    if (!user) return false;
    return permissions.some(permission => hasPermission(user, permission));
};

/**
 * Check if a user has all of the specified permissions
 * @param user - The user to check permissions for
 * @param permissions - Array of permissions to check
 * @returns true if user has all permissions, false otherwise
 */
export const hasAllPermissions = (user: User | null, permissions: Permission[]): boolean => {
    if (!user) return false;
    return permissions.every(permission => hasPermission(user, permission));
};

/**
 * Get all permissions for a user
 * @param user - The user to get permissions for
 * @returns Array of permissions
 */
export const getUserPermissions = (user: User | null): Permission[] => {
    if (!user) return [];
    
    // If user has custom permissions, return those
    if (user.permissions && user.permissions.length > 0) {
        return user.permissions;
    }
    
    // Otherwise, return role-based permissions
    return ROLE_PERMISSIONS[user.role] || [];
};