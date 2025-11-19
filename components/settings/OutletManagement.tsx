import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { Outlet, Permission } from '../../types';
import { hasPermission } from '../../utils/helpers';
import OutletCard from './OutletCard';
import OutletFormModal from './OutletFormModal';

export default function OutletManagement() {
    const { currentUser, currentTenant, api, addToast } = useAppContext();
    const [outlets, setOutlets] = useState<Outlet[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
    const [deletingOutletId, setDeletingOutletId] = useState<string | null>(null);

    // Check permissions
    const canManageOutlets = hasPermission(currentUser, Permission.CAN_MANAGE_OUTLETS);
    const isBrandAdmin = currentUser?.role === 'BrandAdmin';

    useEffect(() => {
        if (currentTenant) {
            loadOutlets();
        }
    }, [currentTenant]);

    const loadOutlets = async () => {
        try {
            setIsLoading(true);
            const data = await api.getOutlets(currentTenant!.id);
            setOutlets(data);
        } catch (error: any) {
            addToast(`Failed to load outlets: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateOutlet = async (outletData: Partial<Outlet>) => {
        try {
            setIsLoading(true);
            const newOutlet = await api.createOutlet({
                ...outletData,
                tenantId: currentTenant!.id,
            } as Outlet);
            
            await loadOutlets(); // Reload to get fresh data
            addToast('Outlet created successfully', 'success');
            setIsCreating(false);
        } catch (error: any) {
            addToast(`Error creating outlet: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateOutlet = async (outletData: Outlet) => {
        try {
            setIsLoading(true);
            await api.updateOutlet(outletData.id, outletData);
            await loadOutlets(); // Reload to get fresh data
            addToast('Outlet updated successfully', 'success');
            setEditingOutlet(null);
        } catch (error: any) {
            addToast(`Error updating outlet: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteOutlet = async (outletId: string) => {
        if (!window.confirm('Are you sure you want to delete this outlet? This action cannot be undone.')) {
            return;
        }

        try {
            setIsLoading(true);
            await api.deleteOutlet(outletId);
            await loadOutlets();
            addToast('Outlet deleted successfully', 'success');
            setDeletingOutletId(null);
        } catch (error: any) {
            addToast(`Error deleting outlet: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDuplicateOutlet = async (outlet: Outlet) => {
        try {
            setIsLoading(true);
            const duplicatedOutlet = {
                ...outlet,
                id: undefined as any, // Will be generated
                name: `${outlet.name} (Copy)`,
            };
            await api.createOutlet(duplicatedOutlet);
            await loadOutlets();
            addToast('Outlet duplicated successfully', 'success');
        } catch (error: any) {
            addToast(`Error duplicating outlet: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (!canManageOutlets && !isBrandAdmin) {
        return (
            <div className="text-center p-8 text-[var(--text-secondary)]">
                <p className="text-lg font-semibold mb-2">Access Denied</p>
                <p>You don't have permission to manage outlets.</p>
            </div>
        );
    }

    if (isLoading && outlets.length === 0) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-primary)] mx-auto mb-4"></div>
                    <p className="text-[var(--text-secondary)]">Loading outlets...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                            🏪 Outlet Management
                        </h2>
                        <p className="text-[var(--text-secondary)] mt-1">
                            Manage your restaurant locations for {currentTenant?.name}
                        </p>
                    </div>
                    <button
                        onClick={() => setIsCreating(true)}
                        disabled={isLoading}
                        className="px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                    >
                        <span className="text-xl">+</span>
                        <span>New Outlet</span>
                    </button>
                </div>

                {/* Stats Bar */}
                <div className="flex gap-4 mt-4">
                    <div className="bg-[var(--background-secondary)] rounded-lg px-4 py-3 border border-[var(--border-color)]">
                        <div className="text-sm text-[var(--text-secondary)]">Total Outlets</div>
                        <div className="text-2xl font-bold text-[var(--text-primary)]">{outlets.length}</div>
                    </div>
                    <div className="bg-[var(--background-secondary)] rounded-lg px-4 py-3 border border-[var(--border-color)]">
                        <div className="text-sm text-[var(--text-secondary)]">Active</div>
                        <div className="text-2xl font-bold text-green-600">{outlets.length}</div>
                    </div>
                    <div className="bg-[var(--background-secondary)] rounded-lg px-4 py-3 border border-[var(--border-color)]">
                        <div className="text-sm text-[var(--text-secondary)]">Brand</div>
                        <div className="text-lg font-semibold text-[var(--text-primary)]">{currentTenant?.name}</div>
                    </div>
                </div>
            </div>

            {/* Outlets Grid */}
            {outlets.length === 0 ? (
                <div className="flex-grow flex items-center justify-center">
                    <div className="text-center max-w-md">
                        <div className="text-6xl mb-4">🏪</div>
                        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                            No Outlets Yet
                        </h3>
                        <p className="text-[var(--text-secondary)] mb-6">
                            Create your first outlet to start managing your restaurant operations.
                            Each outlet can have its own menu, pricing, taxes, and configuration.
                        </p>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="px-6 py-3 bg-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
                        >
                            Create First Outlet
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex-grow overflow-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {outlets.map(outlet => (
                            <OutletCard
                                key={outlet.id}
                                outlet={outlet}
                                onEdit={() => setEditingOutlet(outlet)}
                                onDelete={() => handleDeleteOutlet(outlet.id)}
                                onDuplicate={() => handleDuplicateOutlet(outlet)}
                                isDeleting={deletingOutletId === outlet.id}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {(isCreating || editingOutlet) && (
                <OutletFormModal
                    outlet={editingOutlet}
                    onSave={editingOutlet ? handleUpdateOutlet : handleCreateOutlet}
                    onClose={() => {
                        setIsCreating(false);
                        setEditingOutlet(null);
                    }}
                    isLoading={isLoading}
                />
            )}
        </div>
    );
}
