import React from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { UserRole } from '../types';
import ShiftManagementModal from './billing/ShiftManagementModal';


const Header: React.FC = () => {
    const { 
        currentUser, 
        currentTenant, 
        currentOutlet, 
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

    if (!currentUser || !currentTenant || !currentOutlet) return null;

    const navLinks: { view: 'pos' | 'kds' | 'reports' | 'inventory' | 'settings'; label: string; roles: UserRole[] }[] = [
        { view: 'pos', label: 'POS', roles: ['Cashier', 'OutletManager', 'BrandAdmin'] },
        { view: 'kds', label: 'KDS', roles: ['KitchenStaff', 'OutletManager', 'BrandAdmin'] },
        { view: 'inventory', label: 'Inventory', roles: ['OutletManager', 'BrandAdmin'] },
        { view: 'reports', label: 'Reports', roles: ['Accountant', 'OutletManager', 'BrandAdmin'] },
        { view: 'settings', label: 'Settings', roles: ['OutletManager', 'BrandAdmin'] },
    ];

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
                    {navLinks.filter(link => link.roles.includes(currentUser.role)).map(link => (
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
                        <button onClick={() => setShiftModalOpen(true)} className="px-3 py-2 text-sm font-medium rounded-md transition-colors bg-[var(--positive)] hover:bg-[var(--positive-hover)] text-[var(--accent-primary-text)]" aria-label="Manage Shift">
                           Manage Shift
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