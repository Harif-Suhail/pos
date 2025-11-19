import React, { useState } from 'react';
import { Outlet } from '../../types';

interface OutletCardProps {
    outlet: Outlet;
    onEdit: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
    isDeleting?: boolean;
}

export default function OutletCard({ outlet, onEdit, onDelete, onDuplicate, isDeleting }: OutletCardProps) {
    const [showMenu, setShowMenu] = useState(false);

    const getOutletStats = () => {
        const taxCount = outlet.settings.taxes.length;
        const hasServiceCharge = outlet.settings.serviceCharge.isEnabled;
        const hasPrinter = !!outlet.settings.printerSettings.receiptPrinterUrl;
        const hasFloorPlan = outlet.floorPlan && outlet.floorPlan.length > 0;
        
        return { taxCount, hasServiceCharge, hasPrinter, hasFloorPlan };
    };

    const stats = getOutletStats();

    return (
        <div className="bg-[var(--background-secondary)] rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-primary)] transition-colors overflow-hidden">
            {/* Header */}
            <div className="p-6 pb-4">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
                            {outlet.name}
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1">
                            <span>📍</span>
                            <span>{outlet.address}</span>
                        </p>
                    </div>
                    
                    {/* Action Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-2 hover:bg-[var(--background-primary)] rounded-lg transition-colors"
                            aria-label="Options"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="5" r="2" />
                                <circle cx="12" cy="12" r="2" />
                                <circle cx="12" cy="19" r="2" />
                            </svg>
                        </button>

                        {showMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowMenu(false)}
                                />
                                <div className="absolute right-0 mt-2 w-48 bg-[var(--background-primary)] rounded-lg shadow-lg border border-[var(--border-color)] py-1 z-20">
                                    <button
                                        onClick={() => {
                                            onEdit();
                                            setShowMenu(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-[var(--text-primary)] hover:bg-[var(--background-secondary)] transition-colors flex items-center gap-2"
                                    >
                                        <span>✏️</span>
                                        <span>Edit</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            onDuplicate();
                                            setShowMenu(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-[var(--text-primary)] hover:bg-[var(--background-secondary)] transition-colors flex items-center gap-2"
                                    >
                                        <span>📋</span>
                                        <span>Duplicate</span>
                                    </button>
                                    <hr className="my-1 border-[var(--border-color)]" />
                                    <button
                                        onClick={() => {
                                            onDelete();
                                            setShowMenu(false);
                                        }}
                                        disabled={isDeleting}
                                        className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <span>🗑️</span>
                                        <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Status Badge */}
                <div className="flex gap-2 mb-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ Active
                    </span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="px-6 pb-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[var(--background-primary)] rounded-lg p-3 border border-[var(--border-color)]">
                        <div className="text-xs text-[var(--text-secondary)] mb-1">Floor Plan</div>
                        <div className="font-semibold text-[var(--text-primary)]">
                            {stats.hasFloorPlan ? `${outlet.floorPlan.length} tables` : 'Not set'}
                        </div>
                    </div>
                    <div className="bg-[var(--background-primary)] rounded-lg p-3 border border-[var(--border-color)]">
                        <div className="text-xs text-[var(--text-secondary)] mb-1">Taxes</div>
                        <div className="font-semibold text-[var(--text-primary)]">
                            {stats.taxCount} {stats.taxCount === 1 ? 'rule' : 'rules'}
                        </div>
                    </div>
                    <div className="bg-[var(--background-primary)] rounded-lg p-3 border border-[var(--border-color)]">
                        <div className="text-xs text-[var(--text-secondary)] mb-1">Service Charge</div>
                        <div className="font-semibold text-[var(--text-primary)]">
                            {stats.hasServiceCharge ? `${outlet.settings.serviceCharge.rate}%` : 'Disabled'}
                        </div>
                    </div>
                    <div className="bg-[var(--background-primary)] rounded-lg p-3 border border-[var(--border-color)]">
                        <div className="text-xs text-[var(--text-secondary)] mb-1">Printer</div>
                        <div className="font-semibold text-[var(--text-primary)]">
                            {stats.hasPrinter ? '✓ Set' : '⚠ Not set'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-[var(--background-primary)] border-t border-[var(--border-color)]">
                <div className="flex justify-between items-center text-xs text-[var(--text-secondary)]">
                    <span>Outlet ID: {outlet.id.slice(0, 8)}...</span>
                    <button
                        onClick={onEdit}
                        className="text-[var(--accent-primary)] hover:underline font-medium"
                    >
                        Configure →
                    </button>
                </div>
            </div>
        </div>
    );
}
