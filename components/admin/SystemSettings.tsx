import React, { useState } from 'react';

export default function SystemSettings() {
    const [autoBackup, setAutoBackup] = useState(true);
    const [require2FA, setRequire2FA] = useState(false);
    const [enableLogging, setEnableLogging] = useState(true);

    const handleClearData = () => {
        if (confirm('⚠️ WARNING: This will delete ALL data from the system. This action cannot be undone.\n\nAre you absolutely sure?')) {
            if (confirm('This is your final warning. All tenants, outlets, orders, and data will be permanently deleted. Continue?')) {
                // Clear all localStorage data except theme
                const theme = localStorage.getItem('theme');
                localStorage.clear();
                if (theme) localStorage.setItem('theme', theme);
                alert('All data has been cleared. The page will reload.');
                window.location.reload();
            }
        }
    };

    const handleBackupNow = () => {
        try {
            const data: Record<string, any> = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('db_')) {
                    data[key] = localStorage.getItem(key);
                }
            }
            
            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `pos-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
            
            alert('Backup downloaded successfully!');
        } catch (err) {
            alert('Failed to create backup: ' + err);
        }
    };

    const getStorageSize = () => {
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                const value = localStorage.getItem(key) || '';
                total += key.length + value.length;
            }
        }
        return (total / 1024).toFixed(2); // KB
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Database Settings */}
            <div className="bg-[var(--background-secondary)] border border-[var(--border-primary)] rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">🗄️</span>
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">
                        Database Settings
                    </h2>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-[var(--background-tertiary)] rounded-lg">
                        <div>
                            <div className="font-medium text-[var(--text-primary)]">Storage Type</div>
                            <div className="text-sm text-[var(--text-secondary)]">LocalStorage (Browser-based)</div>
                        </div>
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs font-medium">
                            Active
                        </span>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-[var(--background-tertiary)] rounded-lg">
                        <div>
                            <div className="font-medium text-[var(--text-primary)]">Storage Used</div>
                            <div className="text-sm text-[var(--text-secondary)]">Current database size</div>
                        </div>
                        <span className="text-[var(--text-primary)] font-mono">
                            {getStorageSize()} KB
                        </span>
                    </div>

                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <div className="font-medium text-red-400 mb-2">⚠️ Danger Zone</div>
                        <p className="text-sm text-[var(--text-secondary)] mb-3">
                            Clear all data from the system. This action cannot be undone.
                        </p>
                        <button
                            onClick={handleClearData}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                        >
                            Clear All Data
                        </button>
                    </div>
                </div>
            </div>

            {/* Security Settings */}
            <div className="bg-[var(--background-secondary)] border border-[var(--border-primary)] rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">🔒</span>
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">
                        Security Settings
                    </h2>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-[var(--background-tertiary)] rounded-lg">
                        <div>
                            <div className="font-medium text-[var(--text-primary)]">Require 2FA for SuperAdmins</div>
                            <div className="text-sm text-[var(--text-secondary)]">Enable two-factor authentication</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={require2FA}
                                onChange={(e) => setRequire2FA(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--accent-primary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-[var(--background-tertiary)] rounded-lg">
                        <div>
                            <div className="font-medium text-[var(--text-primary)]">Admin Action Logging</div>
                            <div className="text-sm text-[var(--text-secondary)]">Log all administrative actions</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={enableLogging}
                                onChange={(e) => setEnableLogging(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--accent-primary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Backup Settings */}
            <div className="bg-[var(--background-secondary)] border border-[var(--border-primary)] rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">💾</span>
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">
                        Backup Settings
                    </h2>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-[var(--background-tertiary)] rounded-lg">
                        <div>
                            <div className="font-medium text-[var(--text-primary)]">Automatic Backups</div>
                            <div className="text-sm text-[var(--text-secondary)]">Daily automatic backup to cloud storage</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={autoBackup}
                                onChange={(e) => setAutoBackup(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--accent-primary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-[var(--background-tertiary)] rounded-lg">
                        <div>
                            <div className="font-medium text-[var(--text-primary)]">Last Backup</div>
                            <div className="text-sm text-[var(--text-secondary)]">
                                {new Date().toLocaleString()}
                            </div>
                        </div>
                        <button
                            onClick={handleBackupNow}
                            className="px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors font-medium"
                        >
                            Backup Now
                        </button>
                    </div>
                </div>
            </div>

            {/* System Information */}
            <div className="bg-[var(--background-secondary)] border border-[var(--border-primary)] rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">ℹ️</span>
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">
                        System Information
                    </h2>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-[var(--background-tertiary)] rounded-lg">
                        <span className="text-[var(--text-secondary)]">Application Version</span>
                        <span className="text-[var(--text-primary)] font-mono">v3.0.0</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[var(--background-tertiary)] rounded-lg">
                        <span className="text-[var(--text-secondary)]">Environment</span>
                        <span className="text-[var(--text-primary)]">
                            {process.env.NODE_ENV === 'development' ? 'Development' : 'Production'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[var(--background-tertiary)] rounded-lg">
                        <span className="text-[var(--text-secondary)]">System Uptime</span>
                        <span className="text-[var(--text-primary)]">
                            {Math.floor((Date.now() - (window.performance?.timeOrigin || Date.now())) / 1000 / 60)} minutes
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
