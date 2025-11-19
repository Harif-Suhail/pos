import React from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { UserRole, Permission } from '../types';
import { hasPermission } from '../utils/helpers';
import ShiftManagementModal from './billing/ShiftManagementModal';


const Header: React.FC = () => {
    const { 
        currentUser, 
        currentTenant, 
        currentOutlet,
        currentShift,
        isSuperAdminAuthenticated,
        logout, 
        currentView, 
        setCurrentView,
        isShiftModalOpen,
        setShiftModalOpen,
        isOnline,
        setIsOnline,
        theme,
        toggleTheme,
    } = useAppContext();

    // Show header for regular users OR SuperAdmin on admin portal
    if (isSuperAdminAuthenticated) {
        // Simplified header for SuperAdmin
        return (
            <header className="bg-[var(--background-secondary)] shadow-md p-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <span className="text-3xl">⚡</span>
                    <div>
                        <h1 className="text-xl font-bold text-[var(--text-primary)]">Super Admin Portal</h1>
                        <p className="text-xs text-[var(--text-secondary)]">System Administration</p>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    {/* Theme Toggle */}
                    <button onClick={toggleTheme} className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] transition-colors" aria-label="Toggle theme">
                        {theme === 'dark' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 14.464A1 1 0 106.465 13.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 11a1 1 0 100-2H4a1 1 0 100 2h1z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                            </svg>
                        )}
                    </button>

                    <div className="text-right">
                        <p className="font-semibold text-[var(--text-primary)]">System Administrator</p>
                        <p className="text-xs text-purple-400">Super Admin</p>
                    </div>
                    <button onClick={logout} className="px-3 py-2 text-sm font-medium rounded-md transition-colors bg-[var(--negative)] hover:bg-[var(--negative-hover)] text-[var(--accent-primary-text)]" aria-label="Logout">
                        Logout
                    </button>
                </div>
            </header>
        );
    }

    if (!currentUser || !currentTenant || !currentOutlet) return null;

    // Permission-based navigation with fallback to roles for compatibility
    const navLinks: { 
        view: 'pos' | 'kds' | 'reports' | 'inventory' | 'settings' | 'admin'; 
        label: string; 
        permission?: Permission;
        roles?: UserRole[];
    }[] = [
        { 
            view: 'pos', 
            label: 'POS', 
            permission: Permission.CAN_CREATE_ORDER,
            roles: ['Cashier', 'Waiter', 'OutletManager', 'BrandAdmin'] 
        },
        { 
            view: 'kds', 
            label: 'KDS', 
            permission: Permission.CAN_VIEW_KDS,
            roles: ['KitchenStaff', 'OutletManager', 'BrandAdmin'] 
        },
        { 
            view: 'inventory', 
            label: 'Inventory', 
            permission: Permission.CAN_VIEW_INVENTORY,
            roles: ['OutletManager', 'BrandAdmin'] 
        },
        { 
            view: 'reports', 
            label: 'Reports', 
            permission: Permission.CAN_VIEW_REPORTS,
            roles: ['Accountant', 'OutletManager', 'BrandAdmin'] 
        },
        { 
            view: 'settings', 
            label: 'Settings', 
            permission: Permission.CAN_MANAGE_SETTINGS,
            roles: ['OutletManager', 'BrandAdmin'] 
        },
        // Note: Admin Portal link removed - SuperAdmin should access via /admin route
    ];

    // Filter navigation links based on permissions
    const allowedLinks = navLinks.filter(link => {
        // Check permission first
        if (link.permission && hasPermission(currentUser, link.permission)) {
            return true;
        }
        // Fallback to role-based check
        return link.roles && link.roles.includes(currentUser.role);
    });

    const SunIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 14.464A1 1 0 106.465 13.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 11a1 1 0 100-2H4a1 1 0 100 2h1z" clipRule="evenodd" />
        </svg>
    );

    const MoonIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
    );

    return (
        <>
            <header className="bg-[var(--background-secondary)] shadow-md p-3 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center space-x-3">
                    <svg className="w-8 h-8 text-[var(--accent-primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <div>
                        <h1 className="text-xl font-bold text-[var(--text-primary)]">{currentTenant.name}</h1>
                        <p className="text-xs text-[var(--text-secondary)]">{currentOutlet.name}</p>
                    </div>
                </div>

                {/* View Navigation */}
                <div className="flex items-center space-x-2 bg-[var(--background-tertiary)] rounded-md p-1">
                    {allowedLinks.map(link => (
                         <button 
                            key={link.view}
                            onClick={() => setCurrentView(link.view)} 
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${currentView === link.view ? 'bg-[var(--accent-primary)] text-[var(--accent-primary-text)]' : 'text-[var(--text-tertiary)] hover:bg-[var(--background-interactive)]'}`} 
                            aria-pressed={currentView === link.view}
                        >
                            {link.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center space-x-4">
                    {/* Theme Toggle */}
                     <button onClick={toggleTheme} className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] transition-colors" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
                        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                    </button>

                    {/* Offline Mode Simulator */}
                    <div className="flex items-center space-x-2">
                        <span className={`text-xs font-semibold ${isOnline ? 'text-[var(--positive)]' : 'text-[var(--warning)]'}`}>
                            {isOnline ? 'Online' : 'Offline'}
                        </span>
                        <label htmlFor="online-toggle" className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="online-toggle" className="sr-only peer" checked={isOnline} onChange={() => setIsOnline(!isOnline)} />
                            <div className="w-11 h-6 bg-[var(--background-tertiary)] rounded-full peer peer-focus:ring-2 peer-focus:ring-[var(--accent-primary)] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                        </label>
                    </div>

                    {currentUser.role === 'Cashier' && (
                        <button 
                            onClick={() => setShiftModalOpen(true)} 
                            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                                currentShift 
                                    ? 'bg-[var(--positive)] hover:bg-[var(--positive-hover)]' 
                                    : 'bg-[var(--warning)] hover:bg-[var(--warning-hover)] animate-pulse'
                            } text-[var(--accent-primary-text)]`}
                            aria-label="Manage Shift"
                        >
                            {!currentShift && (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            )}
                            {currentShift ? 'Manage Shift' : 'Start Shift'}
                        </button>
                    )}

                    <div className="text-right">
                        <p className="font-semibold text-[var(--text-primary)]">{currentUser.name}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{currentUser.role}</p>
                    </div>
                    <button onClick={logout} className="px-3 py-2 text-sm font-medium rounded-md transition-colors bg-[var(--negative)] hover:bg-[var(--negative-hover)] text-[var(--accent-primary-text)]" aria-label="Logout">
                        Logout
                    </button>
                </div>
            </header>
            {isShiftModalOpen && <ShiftManagementModal />}
        </>
    );
};

export default Header;