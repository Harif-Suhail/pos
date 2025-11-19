import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { Outlet, MenuItem, Tax, OpeningHour, DayOfWeek } from '../../types';
import { formatCurrency } from '../../utils/helpers';

type SettingTab = 'menu' | 'taxes' | 'timing' | 'printers' | 'overview';

export default function MultiOutletSettings() {
    const { currentUser, currentTenant, api, addToast } = useAppContext();
    const [outlets, setOutlets] = useState<Outlet[]>([]);
    const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]);
    const [selectedTab, setSelectedTab] = useState<SettingTab>('overview');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedOutletId, setSelectedOutletId] = useState<string>('');

    // Load data on mount
    React.useEffect(() => {
        if (currentTenant) {
            loadData();
        }
    }, [currentTenant]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [outletsData, menuData] = await Promise.all([
                api.getOutlets(currentTenant!.id),
                api.getMenu()
            ]);
            setOutlets(outletsData);
            setAllMenuItems(menuData);
            if (outletsData.length > 0 && !selectedOutletId) {
                setSelectedOutletId(outletsData[0].id);
            }
        } catch (error) {
            addToast('Failed to load outlet data', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const selectedOutlet = useMemo(() => 
        outlets.find(o => o.id === selectedOutletId),
        [outlets, selectedOutletId]
    );

    // Menu availability management
    const handleToggleMenuItemAvailability = async (itemId: string, outletId: string, isAvailable: boolean) => {
        const item = allMenuItems.find(m => m.id === itemId);
        if (!item) return;

        const currentAvailableOutlets = item.availableOutletIds || [];
        let newAvailableOutlets: string[];

        if (isAvailable) {
            // Add outlet to available list
            if (!currentAvailableOutlets.includes(outletId)) {
                newAvailableOutlets = [...currentAvailableOutlets, outletId];
            } else {
                return; // Already available
            }
        } else {
            // Remove outlet from available list
            newAvailableOutlets = currentAvailableOutlets.filter(id => id !== outletId);
        }

        try {
            const updatedItem = { ...item, availableOutletIds: newAvailableOutlets };
            await api.saveMenuItem(updatedItem);
            await loadData(); // Reload to get fresh data
            addToast(`Menu item ${isAvailable ? 'enabled' : 'disabled'} for outlet`, 'success');
        } catch (error) {
            addToast('Failed to update menu item availability', 'error');
        }
    };

    const handleBulkMenuUpdate = async (outletId: string, itemIds: string[], enable: boolean) => {
        try {
            setIsLoading(true);
            for (const itemId of itemIds) {
                await handleToggleMenuItemAvailability(itemId, outletId, enable);
            }
            addToast(`${itemIds.length} items ${enable ? 'enabled' : 'disabled'} for outlet`, 'success');
        } catch (error) {
            addToast('Failed to bulk update menu items', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Outlet-specific pricing
    const handleUpdateOutletPrice = async (itemId: string, outletId: string, price: number) => {
        const item = allMenuItems.find(m => m.id === itemId);
        if (!item) return;

        try {
            const updatedItem = {
                ...item,
                outletSpecificPricing: {
                    ...item.outletSpecificPricing,
                    [outletId]: price
                }
            };
            await api.saveMenuItem(updatedItem);
            await loadData();
            addToast('Outlet-specific price updated', 'success');
        } catch (error) {
            addToast('Failed to update price', 'error');
        }
    };

    const getItemPriceForOutlet = (item: MenuItem, outletId: string): number => {
        return item.outletSpecificPricing?.[outletId] ?? item.basePrice;
    };

    const isItemAvailableAtOutlet = (item: MenuItem, outletId: string): boolean => {
        if (!item.availableOutletIds || item.availableOutletIds.length === 0) {
            return true; // Available everywhere by default
        }
        return item.availableOutletIds.includes(outletId);
    };

    // Overview statistics
    const getOutletStats = (outlet: Outlet) => {
        const availableItems = allMenuItems.filter(item => isItemAvailableAtOutlet(item, outlet.id));
        const customPricedItems = allMenuItems.filter(item => item.outletSpecificPricing?.[outlet.id]);
        
        return {
            totalMenuItems: allMenuItems.length,
            availableItems: availableItems.length,
            customPricedItems: customPricedItems.length,
            taxCount: outlet.settings.taxes.length,
            hasServiceCharge: outlet.settings.serviceCharge.isEnabled,
            hasPrinter: !!outlet.settings.printerSettings.receiptPrinterUrl
        };
    };

    if (!currentUser || currentUser.role !== 'BrandAdmin') {
        return (
            <div className="text-center p-8 text-[var(--text-secondary)]">
                Only Brand Admins can access multi-outlet settings.
            </div>
        );
    }

    if (isLoading && outlets.length === 0) {
        return <div className="text-center p-8">Loading outlets...</div>;
    }

    if (outlets.length <= 1) {
        return (
            <div className="text-center p-8">
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
                    Multi-Outlet Settings
                </h2>
                <p className="text-[var(--text-secondary)] mb-4">
                    You currently have {outlets.length} outlet. Multi-outlet settings are designed for managing multiple branches.
                </p>
                <p className="text-sm text-[var(--text-tertiary)]">
                    Create additional outlets to access advanced multi-outlet configuration.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                    🏢 Multi-Outlet Settings
                </h2>
                <p className="text-[var(--text-secondary)]">
                    Configure outlet-specific settings across {outlets.length} branches
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex-shrink-0 mb-6 border-b border-[var(--border-color)]">
                <nav className="-mb-px flex space-x-6">
                    {[
                        { id: 'overview' as const, label: '📊 Overview' },
                        { id: 'menu' as const, label: '🍽️ Menu Availability' },
                        { id: 'taxes' as const, label: '💰 Taxes Comparison' },
                        { id: 'timing' as const, label: '⏰ Operating Hours' },
                        { id: 'printers' as const, label: '🖨️ Printers Summary' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setSelectedTab(tab.id)}
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
                                ${selectedTab === tab.id
                                    ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)]'
                                }
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="flex-grow overflow-auto">
                {selectedTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {outlets.map(outlet => {
                            const stats = getOutletStats(outlet);
                            return (
                                <div key={outlet.id} className="bg-[var(--background-secondary)] rounded-lg p-6 border border-[var(--border-color)]">
                                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
                                        {outlet.name}
                                    </h3>
                                    <p className="text-sm text-[var(--text-secondary)] mb-4">
                                        {outlet.address}
                                    </p>
                                    
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-[var(--text-secondary)]">Menu Items:</span>
                                            <span className="font-medium text-[var(--text-primary)]">
                                                {stats.availableItems} / {stats.totalMenuItems}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[var(--text-secondary)]">Custom Pricing:</span>
                                            <span className="font-medium text-[var(--text-primary)]">
                                                {stats.customPricedItems} items
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[var(--text-secondary)]">Tax Rules:</span>
                                            <span className="font-medium text-[var(--text-primary)]">
                                                {stats.taxCount}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[var(--text-secondary)]">Service Charge:</span>
                                            <span className="font-medium text-[var(--text-primary)]">
                                                {stats.hasServiceCharge ? '✅ Enabled' : '❌ Disabled'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[var(--text-secondary)]">Receipt Printer:</span>
                                            <span className="font-medium text-[var(--text-primary)]">
                                                {stats.hasPrinter ? '✅ Configured' : '⚠️ Not Set'}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setSelectedOutletId(outlet.id);
                                            setSelectedTab('menu');
                                        }}
                                        className="mt-4 w-full px-4 py-2 bg-[var(--accent-primary)] text-white rounded hover:opacity-90 transition-opacity"
                                    >
                                        Configure
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {selectedTab === 'menu' && (
                    <div className="space-y-6">
                        {/* Outlet Selector */}
                        <div className="bg-[var(--background-secondary)] rounded-lg p-4 border border-[var(--border-color)]">
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                Select Outlet:
                            </label>
                            <select
                                value={selectedOutletId}
                                onChange={(e) => setSelectedOutletId(e.target.value)}
                                className="w-full px-3 py-2 bg-[var(--background-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)]"
                            >
                                {outlets.map(outlet => (
                                    <option key={outlet.id} value={outlet.id}>
                                        {outlet.name} - {outlet.address}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedOutlet && (
                            <>
                                {/* Bulk Actions */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleBulkMenuUpdate(selectedOutlet.id, allMenuItems.map(m => m.id), true)}
                                        disabled={isLoading}
                                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                                    >
                                        ✅ Enable All Items
                                    </button>
                                    <button
                                        onClick={() => handleBulkMenuUpdate(selectedOutlet.id, allMenuItems.map(m => m.id), false)}
                                        disabled={isLoading}
                                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                                    >
                                        ❌ Disable All Items
                                    </button>
                                </div>

                                {/* Menu Items Table */}
                                <div className="bg-[var(--background-secondary)] rounded-lg border border-[var(--border-color)] overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-[var(--background-primary)]">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">Item</th>
                                                    <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">Category</th>
                                                    <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">Base Price</th>
                                                    <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">Outlet Price</th>
                                                    <th className="px-4 py-3 text-center text-sm font-semibold text-[var(--text-primary)]">Available</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border-color)]">
                                                {allMenuItems.map(item => {
                                                    const isAvailable = isItemAvailableAtOutlet(item, selectedOutlet.id);
                                                    const outletPrice = getItemPriceForOutlet(item, selectedOutlet.id);
                                                    const hasDifferentPrice = outletPrice !== item.basePrice;

                                                    return (
                                                        <tr key={item.id} className={!isAvailable ? 'opacity-50' : ''}>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-3">
                                                                    <img src={item.image} alt={item.name} className="w-10 h-10 rounded object-cover" />
                                                                    <span className="font-medium text-[var(--text-primary)]">{item.name}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-[var(--text-secondary)]">{item.category}</td>
                                                            <td className="px-4 py-3 text-[var(--text-primary)]">
                                                                {formatCurrency(item.basePrice)}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={outletPrice}
                                                                    onChange={(e) => handleUpdateOutletPrice(item.id, selectedOutlet.id, parseFloat(e.target.value) || 0)}
                                                                    disabled={!isAvailable}
                                                                    className={`w-24 px-2 py-1 bg-[var(--background-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] text-sm
                                                                        ${hasDifferentPrice ? 'font-bold border-yellow-500' : ''}
                                                                    `}
                                                                />
                                                                {hasDifferentPrice && (
                                                                    <span className="ml-1 text-xs text-yellow-600">Custom</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <button
                                                                    onClick={() => handleToggleMenuItemAvailability(item.id, selectedOutlet.id, !isAvailable)}
                                                                    className={`px-3 py-1 rounded text-sm font-medium transition-colors
                                                                        ${isAvailable 
                                                                            ? 'bg-green-600 text-white hover:bg-green-700' 
                                                                            : 'bg-gray-600 text-white hover:bg-gray-700'
                                                                        }
                                                                    `}
                                                                >
                                                                    {isAvailable ? '✅ Enabled' : '❌ Disabled'}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {selectedTab === 'taxes' && (
                    <div className="space-y-4">
                        <div className="bg-[var(--background-secondary)] rounded-lg border border-[var(--border-color)] overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-[var(--background-primary)]">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">Outlet</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">Taxes</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">Service Charge</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">Total %</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-color)]">
                                    {outlets.map(outlet => {
                                        const totalTaxRate = outlet.settings.taxes.reduce((sum, tax) => sum + tax.rate, 0);
                                        const serviceChargeRate = outlet.settings.serviceCharge.isEnabled ? outlet.settings.serviceCharge.rate : 0;
                                        const combinedRate = totalTaxRate + serviceChargeRate;

                                        return (
                                            <tr key={outlet.id}>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-[var(--text-primary)]">{outlet.name}</div>
                                                    <div className="text-sm text-[var(--text-secondary)]">{outlet.address}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {outlet.settings.taxes.length === 0 ? (
                                                        <span className="text-[var(--text-secondary)]">No taxes</span>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            {outlet.settings.taxes.map(tax => (
                                                                <div key={tax.id} className="text-sm">
                                                                    <span className="text-[var(--text-primary)]">{tax.name}</span>
                                                                    <span className="text-[var(--text-secondary)] ml-2">
                                                                        {tax.rate}% {tax.isInclusive ? '(incl.)' : '(excl.)'}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-[var(--text-primary)]">
                                                    {outlet.settings.serviceCharge.isEnabled 
                                                        ? `${outlet.settings.serviceCharge.rate}%` 
                                                        : 'Disabled'
                                                    }
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="font-bold text-[var(--text-primary)]">{combinedRate.toFixed(2)}%</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)]">
                            💡 Tip: Configure individual outlet taxes in Settings → Outlet tab
                        </p>
                    </div>
                )}

                {selectedTab === 'timing' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {outlets.map(outlet => (
                            <div key={outlet.id} className="bg-[var(--background-secondary)] rounded-lg p-6 border border-[var(--border-color)]">
                                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">{outlet.name}</h3>
                                <p className="text-sm text-[var(--text-secondary)] mb-4">{outlet.address}</p>
                                
                                <div className="space-y-2">
                                    {outlet.settings.openingHours.map(hours => (
                                        <div key={hours.day} className="flex justify-between items-center text-sm">
                                            <span className="font-medium text-[var(--text-primary)] w-24">{hours.day}</span>
                                            {hours.isClosed ? (
                                                <span className="text-red-600 font-medium">Closed</span>
                                            ) : (
                                                <span className="text-[var(--text-secondary)]">
                                                    {hours.open} - {hours.close}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {selectedTab === 'printers' && (
                    <div className="space-y-4">
                        <div className="bg-[var(--background-secondary)] rounded-lg border border-[var(--border-color)] overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-[var(--background-primary)]">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">Outlet</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">Receipt Printer</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">Kitchen Setup</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-color)]">
                                    {outlets.map(outlet => (
                                        <tr key={outlet.id}>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-[var(--text-primary)]">{outlet.name}</div>
                                                <div className="text-sm text-[var(--text-secondary)]">{outlet.address}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {outlet.settings.printerSettings.receiptPrinterUrl ? (
                                                    <div>
                                                        <div className="text-green-600 font-medium">✅ Configured</div>
                                                        <div className="text-xs text-[var(--text-secondary)] mt-1">
                                                            {outlet.settings.printerSettings.receiptPrinterUrl}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-yellow-600">⚠️ Not configured</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="space-y-1 text-sm">
                                                    {Object.entries(outlet.settings.kitchenConfig).map(([station, type]) => (
                                                        <div key={station} className="flex justify-between">
                                                            <span className="text-[var(--text-secondary)]">{station}:</span>
                                                            <span className="font-medium text-[var(--text-primary)]">{type}</span>
                                                        </div>
                                                    ))}
                                                    {Object.keys(outlet.settings.kitchenConfig).length === 0 && (
                                                        <span className="text-[var(--text-secondary)]">No kitchen setup</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)]">
                            💡 Tip: Configure individual outlet printers in Settings → 🖨️ Printers tab
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
