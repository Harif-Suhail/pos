import React, { useState, useEffect } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import TenantManagement from '../components/admin/TenantManagement';
import SystemSettings from '../components/admin/SystemSettings';
import SystemAnalytics from '../components/admin/SystemAnalytics';

type AdminTab = 'tenants' | 'settings' | 'analytics';

export default function AdminPortalView() {
    const { isSuperAdminAuthenticated, setCurrentView } = useAppContext();
    const [activeTab, setActiveTab] = useState<AdminTab>('tenants');

    // Security: Only SuperAdmin can access
    useEffect(() => {
        if (!isSuperAdminAuthenticated) {
            setCurrentView('pos');
        }
    }, [isSuperAdminAuthenticated, setCurrentView]);

    if (!isSuperAdminAuthenticated) {
        return null;
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-[var(--background-secondary)] border-b border-[var(--border-primary)] px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                            Super Admin Portal
                        </h1>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                            System-level management and configuration
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-medium">
                            Super Admin
                        </span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mt-4">
                    <button
                        onClick={() => setActiveTab('tenants')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            activeTab === 'tenants'
                                ? 'bg-[var(--accent-primary)] text-white'
                                : 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--background-hover)]'
                        }`}
                    >
                        🏢 Tenants
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            activeTab === 'settings'
                                ? 'bg-[var(--accent-primary)] text-white'
                                : 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--background-hover)]'
                        }`}
                    >
                        ⚙️ System Settings
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            activeTab === 'analytics'
                                ? 'bg-[var(--accent-primary)] text-white'
                                : 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--background-hover)]'
                        }`}
                    >
                        📊 Analytics
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {activeTab === 'tenants' && <TenantManagement />}
                {activeTab === 'settings' && <SystemSettings />}
                {activeTab === 'analytics' && <SystemAnalytics />}
            </div>
        </div>
    );
}
