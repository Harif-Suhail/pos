import React, { useState, useEffect } from 'react';
import { Tenant } from '../../types';
import { useAppContext } from '../../hooks/useAppContext';
import Modal from '../common/Modal';

interface TenantFormData {
    name: string;
    subdomain: string;
    logoUrl: string;
    currency: string;
    timezone: string;
}

interface TenantFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: TenantFormData) => Promise<void>;
    tenant?: Tenant | null;
}

function TenantFormModal({ isOpen, onClose, onSubmit, tenant }: TenantFormModalProps) {
    const [formData, setFormData] = useState<TenantFormData>({
        name: '',
        subdomain: '',
        logoUrl: '',
        currency: 'USD',
        timezone: 'UTC',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (tenant) {
            setFormData({
                name: tenant.name,
                subdomain: tenant.subdomain,
                logoUrl: tenant.logoUrl || '',
                currency: tenant.settings.currency,
                timezone: tenant.settings.timezone,
            });
        } else {
            setFormData({
                name: '',
                subdomain: '',
                logoUrl: '',
                currency: 'USD',
                timezone: 'UTC',
            });
        }
        setError('');
    }, [tenant, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.name.trim()) {
            setError('Brand name is required');
            return;
        }
        if (!formData.subdomain.trim()) {
            setError('Subdomain is required');
            return;
        }
        // Validate subdomain format (lowercase, alphanumeric, hyphens only)
        if (!/^[a-z0-9-]+$/.test(formData.subdomain)) {
            setError('Subdomain must be lowercase letters, numbers, and hyphens only');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(formData);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save tenant');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={tenant ? 'Edit Tenant' : 'Create New Tenant'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                        Brand Name *
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                        placeholder="e.g., Bella Pizza"
                        disabled={isSubmitting}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                        Subdomain *
                    </label>
                    <input
                        type="text"
                        value={formData.subdomain}
                        onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase() })}
                        className="w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                        placeholder="e.g., bella-pizza"
                        disabled={isSubmitting || !!tenant}
                    />
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                        Lowercase letters, numbers, and hyphens only
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                        Logo URL
                    </label>
                    <input
                        type="url"
                        value={formData.logoUrl}
                        onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                        className="w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                        placeholder="https://example.com/logo.png"
                        disabled={isSubmitting}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                        Currency
                    </label>
                    <select
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        className="w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                        disabled={isSubmitting}
                    >
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="INR">INR - Indian Rupee</option>
                        <option value="AUD">AUD - Australian Dollar</option>
                        <option value="CAD">CAD - Canadian Dollar</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                        Timezone
                    </label>
                    <select
                        value={formData.timezone}
                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                        className="w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                        disabled={isSubmitting}
                    >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">America/New_York (EST)</option>
                        <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                        <option value="Europe/London">Europe/London (GMT)</option>
                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                        <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                        <option value="Australia/Sydney">Australia/Sydney (AEDT)</option>
                    </select>
                </div>

                <div className="flex gap-2 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-[var(--background-tertiary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--background-hover)] transition-colors"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Saving...' : tenant ? 'Update' : 'Create'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

interface TenantCardProps {
    tenant: Tenant;
    outletCount: number;
    onEdit: (tenant: Tenant) => void;
    onDelete: (tenantId: string) => void;
    isDeleting: boolean;
}

function TenantCard({ tenant, outletCount, onEdit, onDelete, isDeleting }: TenantCardProps) {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div className="bg-[var(--background-secondary)] border border-[var(--border-primary)] rounded-lg p-4 hover:border-[var(--accent-primary)] transition-colors">
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                    {/* Logo */}
                    <div className="w-12 h-12 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center text-white font-bold text-lg">
                        {tenant.logoUrl ? (
                            <img src={tenant.logoUrl} alt={tenant.name} className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                            tenant.name.charAt(0).toUpperCase()
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[var(--text-primary)] truncate">
                            {tenant.name}
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] truncate">
                            {tenant.subdomain}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-secondary)]">
                            <span>💼 {outletCount} outlets</span>
                            <span>💰 {tenant.settings.currency}</span>
                            <span>🌍 {tenant.settings.timezone}</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2 hover:bg-[var(--background-hover)] rounded-lg transition-colors"
                        disabled={isDeleting}
                    >
                        <span className="text-[var(--text-secondary)]">⋮</span>
                    </button>
                    {showMenu && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowMenu(false)}
                            />
                            <div className="absolute right-0 mt-1 w-40 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg shadow-xl z-20">
                                <button
                                    onClick={() => {
                                        onEdit(tenant);
                                        setShowMenu(false);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--background-hover)] transition-colors"
                                >
                                    ✏️ Edit
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm(`Delete tenant "${tenant.name}"? This cannot be undone.`)) {
                                            onDelete(tenant.id);
                                        }
                                        setShowMenu(false);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-[var(--background-hover)] transition-colors"
                                >
                                    🗑️ Delete
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function TenantManagement() {
    const { api, addToast } = useAppContext();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [outletCounts, setOutletCounts] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [deletingTenantId, setDeletingTenantId] = useState<string | null>(null);

    const loadTenants = async () => {
        setIsLoading(true);
        try {
            const tenantsData = await api.getTenants();
            setTenants(tenantsData);

            // Load outlet counts for each tenant
            const counts: Record<string, number> = {};
            for (const tenant of tenantsData) {
                const outlets = await api.getOutlets(tenant.id);
                counts[tenant.id] = outlets.length;
            }
            setOutletCounts(counts);
        } catch (err) {
            addToast('Failed to load tenants', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadTenants();
    }, []);

    const handleCreateTenant = () => {
        setEditingTenant(null);
        setIsModalOpen(true);
    };

    const handleEditTenant = (tenant: Tenant) => {
        setEditingTenant(tenant);
        setIsModalOpen(true);
    };

    const handleSubmitTenant = async (data: TenantFormData) => {
        try {
            if (editingTenant) {
                await api.updateTenant(editingTenant.id, {
                    name: data.name,
                    logoUrl: data.logoUrl || undefined,
                    settings: {
                        currency: data.currency,
                        timezone: data.timezone,
                    },
                });
                addToast('Tenant updated successfully', 'success');
            } else {
                await api.createTenant({
                    name: data.name,
                    subdomain: data.subdomain,
                    logoUrl: data.logoUrl || undefined,
                    settings: {
                        currency: data.currency,
                        timezone: data.timezone,
                    },
                });
                addToast('Tenant created successfully', 'success');
            }
            loadTenants();
        } catch (err: any) {
            throw err;
        }
    };

    const handleDeleteTenant = async (tenantId: string) => {
        setDeletingTenantId(tenantId);
        try {
            await api.deleteTenant(tenantId);
            addToast('Tenant deleted successfully', 'success');
            loadTenants();
        } catch (err: any) {
            addToast(err.message || 'Failed to delete tenant', 'error');
        } finally {
            setDeletingTenantId(null);
        }
    };

    const filteredTenants = tenants.filter(tenant =>
        tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.subdomain.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalOutlets = Object.values(outletCounts).reduce((sum: number, count) => sum + (count as number), 0);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-[var(--text-primary)]">
                            Tenant Management
                        </h2>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                            Manage restaurant brands and their configurations
                        </p>
                    </div>
                    <button
                        onClick={handleCreateTenant}
                        className="px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors font-medium"
                    >
                        + Create Tenant
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-[var(--background-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
                        <div className="text-2xl font-bold text-[var(--text-primary)]">
                            {tenants.length}
                        </div>
                        <div className="text-sm text-[var(--text-secondary)]">Total Tenants</div>
                    </div>
                    <div className="bg-[var(--background-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
                        <div className="text-2xl font-bold text-[var(--text-primary)]">
                            {totalOutlets}
                        </div>
                        <div className="text-sm text-[var(--text-secondary)]">Total Outlets</div>
                    </div>
                    <div className="bg-[var(--background-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
                        <div className="text-2xl font-bold text-[var(--text-primary)]">
                            {filteredTenants.length}
                        </div>
                        <div className="text-sm text-[var(--text-secondary)]">Filtered Results</div>
                    </div>
                </div>

                {/* Search */}
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or subdomain..."
                    className="w-full px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                />
            </div>

            {/* Tenant List */}
            {isLoading ? (
                <div className="text-center py-12 text-[var(--text-secondary)]">
                    Loading tenants...
                </div>
            ) : filteredTenants.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">🏢</div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                        {searchQuery ? 'No tenants found' : 'No tenants yet'}
                    </h3>
                    <p className="text-[var(--text-secondary)] mb-4">
                        {searchQuery
                            ? 'Try adjusting your search query'
                            : 'Create your first tenant to get started'}
                    </p>
                    {!searchQuery && (
                        <button
                            onClick={handleCreateTenant}
                            className="px-6 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors font-medium"
                        >
                            + Create First Tenant
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTenants.map(tenant => (
                        <TenantCard
                            key={tenant.id}
                            tenant={tenant}
                            outletCount={outletCounts[tenant.id] || 0}
                            onEdit={handleEditTenant}
                            onDelete={handleDeleteTenant}
                            isDeleting={deletingTenantId === tenant.id}
                        />
                    ))}
                </div>
            )}

            {/* Modal */}
            <TenantFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmitTenant}
                tenant={editingTenant}
            />
        </div>
    );
}
