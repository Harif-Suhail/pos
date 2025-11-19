import React, { useState, useEffect } from 'react';
import { Outlet, Tax, OpeningHour, DayOfWeek, FloorPlanObject, KitchenStation } from '../../types';

interface OutletFormModalProps {
    outlet: Outlet | null;
    onSave: (outlet: Outlet) => void;
    onClose: () => void;
    isLoading?: boolean;
}

type TabId = 'basic' | 'hours' | 'taxes' | 'floor-plan' | 'printers';

const DAYS_OF_WEEK: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const KITCHEN_STATIONS: KitchenStation[] = ['Main Kitchen', 'Bar', 'Desserts'];

export default function OutletFormModal({ outlet, onSave, onClose, isLoading }: OutletFormModalProps) {
    const [activeTab, setActiveTab] = useState<TabId>('basic');
    const [formData, setFormData] = useState<Outlet>({
        id: outlet?.id || `o${Date.now()}`,
        tenantId: outlet?.tenantId || '',
        name: outlet?.name || '',
        address: outlet?.address || '',
        settings: {
            taxes: outlet?.settings.taxes || [],
            serviceCharge: outlet?.settings.serviceCharge || { rate: 0, isEnabled: false },
            openingHours: outlet?.settings.openingHours || DAYS_OF_WEEK.map(day => ({
                day,
                open: '09:00',
                close: '22:00',
                isClosed: false
            })),
            printerSettings: outlet?.settings.printerSettings || {
                receiptPrinterUrl: '',
                kitchenPrinters: {}
            },
            kitchenConfig: outlet?.settings.kitchenConfig || {}
        },
        floorPlan: outlet?.floorPlan || []
    });

    // Tax management
    const handleAddTax = () => {
        const newTax: Tax = {
            id: `tax${Date.now()}`,
            name: '',
            rate: 0,
            isInclusive: false
        };
        setFormData({
            ...formData,
            settings: {
                ...formData.settings,
                taxes: [...formData.settings.taxes, newTax]
            }
        });
    };

    const handleUpdateTax = (index: number, field: keyof Tax, value: any) => {
        const updatedTaxes = [...formData.settings.taxes];
        updatedTaxes[index] = { ...updatedTaxes[index], [field]: value };
        setFormData({
            ...formData,
            settings: {
                ...formData.settings,
                taxes: updatedTaxes
            }
        });
    };

    const handleDeleteTax = (index: number) => {
        const updatedTaxes = formData.settings.taxes.filter((_, i) => i !== index);
        setFormData({
            ...formData,
            settings: {
                ...formData.settings,
                taxes: updatedTaxes
            }
        });
    };

    // Opening hours management
    const handleUpdateOpeningHours = (day: DayOfWeek, field: keyof OpeningHour, value: any) => {
        const updatedHours = formData.settings.openingHours.map(hours =>
            hours.day === day ? { ...hours, [field]: value } : hours
        );
        setFormData({
            ...formData,
            settings: {
                ...formData.settings,
                openingHours: updatedHours
            }
        });
    };

    // Kitchen config management
    const handleUpdateKitchenConfig = (station: KitchenStation, type: 'KDS' | 'Printer') => {
        setFormData({
            ...formData,
            settings: {
                ...formData.settings,
                kitchenConfig: {
                    ...formData.settings.kitchenConfig,
                    [station]: type
                }
            }
        });
    };

    // Kitchen printer URL management
    const handleUpdateKitchenPrinterUrl = (station: KitchenStation, url: string) => {
        setFormData({
            ...formData,
            settings: {
                ...formData.settings,
                printerSettings: {
                    ...formData.settings.printerSettings,
                    kitchenPrinters: {
                        ...formData.settings.printerSettings.kitchenPrinters,
                        [station]: url
                    }
                }
            }
        });
    };

    const handleSubmit = () => {
        // Validation
        if (!formData.name.trim()) {
            alert('Please enter outlet name');
            setActiveTab('basic');
            return;
        }
        if (!formData.address.trim()) {
            alert('Please enter outlet address');
            setActiveTab('basic');
            return;
        }

        onSave(formData);
    };

    const tabs = [
        { id: 'basic' as TabId, label: '📋 Basic Info', icon: '📋' },
        { id: 'hours' as TabId, label: '⏰ Operating Hours', icon: '⏰' },
        { id: 'taxes' as TabId, label: '💰 Taxes & Charges', icon: '💰' },
        { id: 'floor-plan' as TabId, label: '🏢 Floor Plan', icon: '🏢' },
        { id: 'printers' as TabId, label: '🖨️ Printers', icon: '🖨️' },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--background-primary)] rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-[var(--border-color)] flex-shrink-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                                {outlet ? 'Edit Outlet' : 'Create New Outlet'}
                            </h2>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">
                                Configure your restaurant location settings
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            disabled={isLoading}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-2
                                    ${activeTab === tab.id
                                        ? 'bg-[var(--accent-primary)] text-white'
                                        : 'bg-[var(--background-secondary)] text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)]'
                                    }
                                `}
                            >
                                <span>{tab.icon}</span>
                                <span className="text-sm font-medium">{tab.label.split(' ')[1]}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    {/* Basic Info Tab */}
                    {activeTab === 'basic' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                    Outlet Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Downtown Branch"
                                    className="w-full px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                    Address *
                                </label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="e.g., 123 Main Street, City, State, ZIP"
                                    rows={3}
                                    className="w-full px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                                />
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-800">
                                    💡 <strong>Tip:</strong> After creating the outlet, you can configure menu availability, 
                                    pricing, and other settings in the Multi-Outlet Settings section.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Operating Hours Tab */}
                    {activeTab === 'hours' && (
                        <div className="space-y-3">
                            {formData.settings.openingHours.map((hours) => (
                                <div key={hours.day} className="bg-[var(--background-secondary)] rounded-lg p-4 border border-[var(--border-color)]">
                                    <div className="flex items-center gap-4">
                                        <div className="w-32">
                                            <span className="font-medium text-[var(--text-primary)]">{hours.day}</span>
                                        </div>
                                        
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={hours.isClosed}
                                                onChange={(e) => handleUpdateOpeningHours(hours.day, 'isClosed', e.target.checked)}
                                                className="w-4 h-4 rounded"
                                            />
                                            <span className="text-sm text-[var(--text-secondary)]">Closed</span>
                                        </label>

                                        {!hours.isClosed && (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="time"
                                                        value={hours.open}
                                                        onChange={(e) => handleUpdateOpeningHours(hours.day, 'open', e.target.value)}
                                                        className="px-3 py-1 bg-[var(--background-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)]"
                                                    />
                                                    <span className="text-[var(--text-secondary)]">to</span>
                                                    <input
                                                        type="time"
                                                        value={hours.close}
                                                        onChange={(e) => handleUpdateOpeningHours(hours.day, 'close', e.target.value)}
                                                        className="px-3 py-1 bg-[var(--background-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)]"
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Taxes & Charges Tab */}
                    {activeTab === 'taxes' && (
                        <div className="space-y-6">
                            {/* Service Charge */}
                            <div className="bg-[var(--background-secondary)] rounded-lg p-4 border border-[var(--border-color)]">
                                <h3 className="font-semibold text-[var(--text-primary)] mb-3">Service Charge</h3>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={formData.settings.serviceCharge.isEnabled}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                settings: {
                                                    ...formData.settings,
                                                    serviceCharge: {
                                                        ...formData.settings.serviceCharge,
                                                        isEnabled: e.target.checked
                                                    }
                                                }
                                            })}
                                            className="w-4 h-4 rounded"
                                        />
                                        <span className="text-sm text-[var(--text-secondary)]">Enable Service Charge</span>
                                    </label>

                                    {formData.settings.serviceCharge.isEnabled && (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={formData.settings.serviceCharge.rate}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    settings: {
                                                        ...formData.settings,
                                                        serviceCharge: {
                                                            ...formData.settings.serviceCharge,
                                                            rate: parseFloat(e.target.value) || 0
                                                        }
                                                    }
                                                })}
                                                min="0"
                                                max="100"
                                                step="0.5"
                                                className="w-20 px-3 py-1 bg-[var(--background-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)]"
                                            />
                                            <span className="text-[var(--text-secondary)]">%</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Taxes */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-semibold text-[var(--text-primary)]">Taxes</h3>
                                    <button
                                        onClick={handleAddTax}
                                        className="px-3 py-1 bg-[var(--accent-primary)] text-white rounded text-sm hover:opacity-90"
                                    >
                                        + Add Tax
                                    </button>
                                </div>

                                {formData.settings.taxes.length === 0 ? (
                                    <div className="text-center py-8 text-[var(--text-secondary)]">
                                        <p>No taxes configured. Click "Add Tax" to create one.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {formData.settings.taxes.map((tax, index) => (
                                            <div key={tax.id} className="bg-[var(--background-secondary)] rounded-lg p-4 border border-[var(--border-color)]">
                                                <div className="grid grid-cols-12 gap-3 items-start">
                                                    <div className="col-span-5">
                                                        <label className="block text-xs text-[var(--text-secondary)] mb-1">Tax Name</label>
                                                        <input
                                                            type="text"
                                                            value={tax.name}
                                                            onChange={(e) => handleUpdateTax(index, 'name', e.target.value)}
                                                            placeholder="e.g., Sales Tax"
                                                            className="w-full px-3 py-1 bg-[var(--background-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)]"
                                                        />
                                                    </div>
                                                    <div className="col-span-3">
                                                        <label className="block text-xs text-[var(--text-secondary)] mb-1">Rate (%)</label>
                                                        <input
                                                            type="number"
                                                            value={tax.rate}
                                                            onChange={(e) => handleUpdateTax(index, 'rate', parseFloat(e.target.value) || 0)}
                                                            min="0"
                                                            max="100"
                                                            step="0.1"
                                                            className="w-full px-3 py-1 bg-[var(--background-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)]"
                                                        />
                                                    </div>
                                                    <div className="col-span-3">
                                                        <label className="block text-xs text-[var(--text-secondary)] mb-1">Type</label>
                                                        <select
                                                            value={tax.isInclusive ? 'inclusive' : 'exclusive'}
                                                            onChange={(e) => handleUpdateTax(index, 'isInclusive', e.target.value === 'inclusive')}
                                                            className="w-full px-3 py-1 bg-[var(--background-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)]"
                                                        >
                                                            <option value="exclusive">Exclusive</option>
                                                            <option value="inclusive">Inclusive</option>
                                                        </select>
                                                    </div>
                                                    <div className="col-span-1 flex items-end justify-center">
                                                        <button
                                                            onClick={() => handleDeleteTax(index)}
                                                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                            title="Delete tax"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Floor Plan Tab */}
                    {activeTab === 'floor-plan' && (
                        <div className="space-y-4">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-sm text-yellow-800">
                                    ⚠️ <strong>Note:</strong> Floor plan configuration is available in the 
                                    <strong> Settings → Floor Plan </strong> section after the outlet is created.
                                </p>
                            </div>

                            {formData.floorPlan.length > 0 && (
                                <div>
                                    <h4 className="font-medium text-[var(--text-primary)] mb-2">
                                        Current Floor Plan ({formData.floorPlan.length} items)
                                    </h4>
                                    <div className="bg-[var(--background-secondary)] rounded-lg p-4 border border-[var(--border-color)]">
                                        <p className="text-sm text-[var(--text-secondary)]">
                                            Tables configured: {formData.floorPlan.filter(item => item.type === 'table').length}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Printers Tab */}
                    {activeTab === 'printers' && (
                        <div className="space-y-6">
                            {/* Receipt Printer */}
                            <div className="bg-[var(--background-secondary)] rounded-lg p-4 border border-[var(--border-color)]">
                                <h3 className="font-semibold text-[var(--text-primary)] mb-3">Receipt Printer</h3>
                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-2">
                                        Printer URL (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.settings.printerSettings.receiptPrinterUrl || ''}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            settings: {
                                                ...formData.settings,
                                                printerSettings: {
                                                    ...formData.settings.printerSettings,
                                                    receiptPrinterUrl: e.target.value
                                                }
                                            }
                                        })}
                                        placeholder="e.g., http://192.168.1.100:9100"
                                        className="w-full px-4 py-2 bg-[var(--background-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)]"
                                    />
                                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                                        Configure printer network address for automatic receipt printing
                                    </p>
                                </div>
                            </div>

                            {/* Kitchen Configuration */}
                            <div className="bg-[var(--background-secondary)] rounded-lg p-4 border border-[var(--border-color)]">
                                <h3 className="font-semibold text-[var(--text-primary)] mb-3">Kitchen Configuration</h3>
                                <div className="space-y-3">
                                    {KITCHEN_STATIONS.map(station => (
                                        <div key={station} className="border border-[var(--border-color)] rounded-lg p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium text-[var(--text-primary)]">{station}</span>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleUpdateKitchenConfig(station, 'KDS')}
                                                        className={`px-3 py-1 rounded text-sm ${
                                                            formData.settings.kitchenConfig[station] === 'KDS'
                                                                ? 'bg-blue-600 text-white'
                                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                        }`}
                                                    >
                                                        KDS
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateKitchenConfig(station, 'Printer')}
                                                        className={`px-3 py-1 rounded text-sm ${
                                                            formData.settings.kitchenConfig[station] === 'Printer'
                                                                ? 'bg-blue-600 text-white'
                                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                        }`}
                                                    >
                                                        Printer
                                                    </button>
                                                </div>
                                            </div>

                                            {formData.settings.kitchenConfig[station] === 'Printer' && (
                                                <input
                                                    type="text"
                                                    value={formData.settings.printerSettings.kitchenPrinters[station] || ''}
                                                    onChange={(e) => handleUpdateKitchenPrinterUrl(station, e.target.value)}
                                                    placeholder="Printer URL (e.g., http://192.168.1.101:9100)"
                                                    className="w-full px-3 py-1 bg-[var(--background-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] text-sm"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[var(--border-color)] flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-6 py-2 bg-[var(--background-secondary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--background-tertiary)] transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="px-6 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                        >
                            {isLoading && (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            )}
                            <span>{outlet ? 'Update Outlet' : 'Create Outlet'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
