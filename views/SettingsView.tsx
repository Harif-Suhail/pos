import React, { useState } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import UserSettings from '../components/settings/UserSettings';
import MenuSettings from '../components/settings/MenuSettings';
import OutletSettings from '../components/settings/OutletSettings';
import FloorPlanSettings from '../components/settings/FloorPlanSettings';
import BrandSettings from '../components/settings/BrandSettings';

type SettingsTab = 'brand' | 'users' | 'menu' | 'outlet' | 'floorplan';

export default function SettingsView() {
    const { currentUser } = useAppContext();
    const [activeTab, setActiveTab] = useState<SettingsTab>(currentUser?.role === 'BrandAdmin' ? 'brand' : 'users');

    const allTabs: { id: SettingsTab; label: string; roles: string[] }[] = [
        { id: 'brand', label: 'Brand', roles: ['BrandAdmin'] },
        { id: 'users', label: 'Users', roles: ['BrandAdmin', 'OutletManager'] },
        { id: 'menu', label: 'Menu', roles: ['BrandAdmin', 'OutletManager'] },
        { id: 'outlet', label: 'Outlet', roles: ['BrandAdmin', 'OutletManager'] },
        { id: 'floorplan', label: 'Floor Plan', roles: ['BrandAdmin', 'OutletManager'] },
    ];
    
    if (!currentUser) return null;

    const availableTabs = allTabs.filter(tab => tab.roles.includes(currentUser.role));

    return (
        <main className="flex-grow p-6 flex flex-col">
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-6">Settings</h1>
            
            <div className="flex-shrink-0 mb-6 border-b border-[var(--border-color)]">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {availableTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
                                ${activeTab === tab.id
                                    ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)]'
                                }
                            `}
                            aria-current={activeTab === tab.id ? 'page' : undefined}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="flex-grow">
                {activeTab === 'brand' && <BrandSettings />}
                {activeTab === 'users' && <UserSettings />}
                {activeTab === 'menu' && <MenuSettings />}
                {activeTab === 'outlet' && <OutletSettings />}
                {activeTab === 'floorplan' && <FloorPlanSettings />}
            </div>
        </main>
    );
}