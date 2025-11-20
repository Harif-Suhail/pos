import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { KitchenStation } from '../../types';
import { printerService, PrinterConfig } from '../../services/printerService';
import Spinner from '../common/Spinner';
import Modal from '../common/Modal';

const PrinterSettings: React.FC = () => {
    const { currentOutlet, api, addToast } = useAppContext();
    const [isLoading, setIsLoading] = useState(false);
    const [testingPrinter, setTestingPrinter] = useState<string | null>(null);
    const [showStationModal, setShowStationModal] = useState(false);
    const [customStations, setCustomStations] = useState<string[]>([]);
    
    const [receiptPrinterUrl, setReceiptPrinterUrl] = useState(
        currentOutlet?.settings.printerSettings.receiptPrinterUrl || ''
    );
    
    const [kitchenPrinters, setKitchenPrinters] = useState<Partial<Record<KitchenStation, string>>>(
        currentOutlet?.settings.printerSettings.kitchenPrinters || {}
    );
    
    const [kitchenConfig, setKitchenConfig] = useState<Partial<Record<KitchenStation, 'KDS' | 'Printer'>>>(
        currentOutlet?.settings.kitchenConfig || {}
    );

    // Load custom stations
    useEffect(() => {
        if (currentOutlet) {
            const saved = localStorage.getItem(`custom_stations_${currentOutlet.id}`);
            if (saved) {
                try {
                    setCustomStations(JSON.parse(saved));
                } catch (e) {
                    setCustomStations([]);
                }
            }
        }
    }, [currentOutlet]);
    
    const defaultStations: KitchenStation[] = ['Main Kitchen', 'Bar', 'Desserts'];
    const allStations = [...defaultStations, ...customStations];
    
    const handleSave = async () => {
        if (!currentOutlet) return;
        
        setIsLoading(true);
        try {
            const updatedOutlet = {
                ...currentOutlet,
                settings: {
                    ...currentOutlet.settings,
                    printerSettings: {
                        receiptPrinterUrl,
                        kitchenPrinters
                    },
                    kitchenConfig
                }
            };
            
            await api.saveOutlet(updatedOutlet);
            addToast('Printer settings saved successfully', 'success');
        } catch (error) {
            addToast('Failed to save printer settings', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleTestPrinter = async (type: 'receipt' | 'kitchen', url: string, station?: KitchenStation) => {
        if (!url) {
            addToast('Please enter printer URL first', 'warning');
            return;
        }
        
        const testKey = station ? `${type}-${station}` : type;
        setTestingPrinter(testKey);
        
        try {
            const config: PrinterConfig = {
                printerUrl: url,
                printerType: type,
                paperWidth: 80,
                cashDrawerPin: 2
            };
            
            const success = await printerService.testPrinter(config);
            
            if (success) {
                addToast('Printer test successful! Check your printer.', 'success');
            } else {
                addToast('Printer test sent (check browser console for errors)', 'warning');
            }
        } catch (error) {
            addToast('Printer test failed', 'error');
            console.error('Printer test error:', error);
        } finally {
            setTestingPrinter(null);
        }
    };
    
    const handleTestCashDrawer = async () => {
        if (!receiptPrinterUrl) {
            addToast('Please configure receipt printer first', 'warning');
            return;
        }
        
        setTestingPrinter('cash-drawer');
        
        try {
            const config: PrinterConfig = {
                printerUrl: receiptPrinterUrl,
                printerType: 'receipt',
                paperWidth: 80,
                cashDrawerPin: 2
            };
            
            const success = await printerService.openCashDrawer(config);
            
            if (success) {
                addToast('Cash drawer command sent', 'success');
            } else {
                addToast('Cash drawer command sent (check connection)', 'warning');
            }
        } catch (error) {
            addToast('Failed to open cash drawer', 'error');
        } finally {
            setTestingPrinter(null);
        }
    };

    const handleAddCustomStation = (stationName: string) => {
        if (!currentOutlet || !stationName.trim()) return;
        const newStations = [...customStations, stationName.trim()];
        setCustomStations(newStations);
        localStorage.setItem(`custom_stations_${currentOutlet.id}`, JSON.stringify(newStations));
        addToast(`Station "${stationName}" added successfully`, 'success');
        setShowStationModal(false);
    };

    const handleRemoveCustomStation = (stationName: string) => {
        if (!currentOutlet) return;
        if (confirm(`Remove "${stationName}" station? Menu items assigned to this station will need to be reassigned.`)) {
            const newStations = customStations.filter(s => s !== stationName);
            setCustomStations(newStations);
            localStorage.setItem(`custom_stations_${currentOutlet.id}`, JSON.stringify(newStations));
            addToast(`Station "${stationName}" removed`, 'success');
        }
    };
    
    if (!currentOutlet) {
        return <div className="text-[var(--text-secondary)]">Please select an outlet first.</div>;
    }
    
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Printer & Device Settings</h2>
                <p className="text-[var(--text-secondary)] text-sm">
                    Configure thermal printers and cash drawer for {currentOutlet.name}
                </p>
            </div>
            
            {/* Receipt Printer */}
            <div className="bg-[var(--background-secondary)] p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">🧾 Receipt Printer</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                    Configure the thermal printer for customer receipts and cash drawer control
                </p>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Printer URL/IP Address
                        </label>
                        <input
                            type="text"
                            value={receiptPrinterUrl}
                            onChange={(e) => setReceiptPrinterUrl(e.target.value)}
                            placeholder="192.168.1.100 or /dev/usb/lp0"
                            className="w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg p-3"
                        />
                        <p className="text-xs text-[var(--text-tertiary)] mt-1">
                            Enter IP address for network printers (e.g., 192.168.1.100) or device path for USB printers
                        </p>
                    </div>
                    
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleTestPrinter('receipt', receiptPrinterUrl)}
                            disabled={!receiptPrinterUrl || testingPrinter === 'receipt'}
                            className="bg-[var(--accent-secondary)] hover:bg-[var(--accent-secondary-hover)] disabled:bg-[var(--disabled)] text-white font-bold py-2 px-4 rounded-lg transition-colors"
                        >
                            {testingPrinter === 'receipt' ? <Spinner /> : '🖨️ Test Printer'}
                        </button>
                        
                        <button
                            onClick={handleTestCashDrawer}
                            disabled={!receiptPrinterUrl || testingPrinter === 'cash-drawer'}
                            className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:bg-[var(--disabled)] text-[var(--accent-primary-text)] font-bold py-2 px-4 rounded-lg transition-colors"
                        >
                            {testingPrinter === 'cash-drawer' ? <Spinner /> : '💵 Test Cash Drawer'}
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Kitchen Printers */}
            <div className="bg-[var(--background-secondary)] p-6 rounded-lg shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-[var(--text-primary)]">👨‍🍳 Kitchen Stations & Printers</h3>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                            Configure how kitchen orders are displayed - either printed or shown on Kitchen Display System
                        </p>
                    </div>
                    <button
                        onClick={() => setShowStationModal(true)}
                        className="px-4 py-2 bg-[var(--accent-primary)] text-[var(--accent-primary-text)] rounded-lg hover:opacity-90 transition-opacity font-semibold flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Custom Station
                    </button>
                </div>
                
                <div className="space-y-4">
                    {allStations.map((station) => {
                        const isCustom = customStations.includes(station);
                        return (
                            <div key={station} className="border border-[var(--border-color)] rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-[var(--text-primary)]">{station}</h4>
                                        {isCustom && (
                                            <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Custom</span>
                                        )}
                                    </div>
                                    {isCustom && (
                                        <button
                                            onClick={() => handleRemoveCustomStation(station)}
                                            className="text-red-400 hover:text-red-300 p-1"
                                            title="Remove custom station"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                        Display Method
                                    </label>
                                    <select
                                        value={kitchenConfig[station] || 'KDS'}
                                        onChange={(e) => setKitchenConfig({
                                            ...kitchenConfig,
                                            [station]: e.target.value as 'KDS' | 'Printer'
                                        })}
                                        className="w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg p-2"
                                    >
                                        <option value="KDS">Kitchen Display System (KDS)</option>
                                        <option value="Printer">Thermal Printer</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                        Printer URL/IP Address
                                    </label>
                                    <input
                                        type="text"
                                        value={kitchenPrinters[station] || ''}
                                        onChange={(e) => setKitchenPrinters({
                                            ...kitchenPrinters,
                                            [station]: e.target.value
                                        })}
                                        placeholder="192.168.1.101"
                                        disabled={kitchenConfig[station] === 'KDS'}
                                        className="w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg p-2 disabled:opacity-50"
                                    />
                                </div>
                            </div>
                            
                            {kitchenConfig[station] === 'Printer' && kitchenPrinters[station] && (
                                <div className="mt-3">
                                    <button
                                        onClick={() => handleTestPrinter('kitchen', kitchenPrinters[station]!, station)}
                                        disabled={testingPrinter === `kitchen-${station}`}
                                        className="bg-[var(--accent-secondary)] hover:bg-[var(--accent-secondary-hover)] disabled:bg-[var(--disabled)] text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors"
                                    >
                                        {testingPrinter === `kitchen-${station}` ? <Spinner /> : '🖨️ Test Printer'}
                                    </button>
                                </div>
                            )}
                        </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Setup Instructions */}
            <div className="bg-blue-500 bg-opacity-10 border border-blue-500 rounded-lg p-4">
                <h4 className="font-semibold text-blue-500 mb-2">📋 Setup Instructions</h4>
                <ul className="text-sm text-[var(--text-tertiary)] space-y-2">
                    <li><strong>Network Printers:</strong> Enter the IP address (e.g., 192.168.1.100). Ensure printer is on same network.</li>
                    <li><strong>USB Printers:</strong> Requires desktop app bridge or Electron. Enter device path.</li>
                    <li><strong>ESC/POS Compatible:</strong> Printers must support ESC/POS commands (most thermal printers do).</li>
                    <li><strong>Cash Drawer:</strong> Connect cash drawer to receipt printer's RJ11/RJ12 port.</li>
                    <li><strong>Test First:</strong> Always test printers after configuration to ensure connectivity.</li>
                    <li><strong>KDS Mode:</strong> Orders appear on screen instead of printing (saves paper, better for busy kitchens).</li>
                </ul>
            </div>
            
            {/* Troubleshooting */}
            <div className="bg-yellow-500 bg-opacity-10 border border-yellow-500 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-600 mb-2">⚠️ Troubleshooting</h4>
                <ul className="text-sm text-[var(--text-tertiary)] space-y-2">
                    <li><strong>Printer not responding:</strong> Check IP address, network connection, and printer power.</li>
                    <li><strong>Garbled text:</strong> Printer may not support ESC/POS. Check printer specifications.</li>
                    <li><strong>Cash drawer not opening:</strong> Verify drawer is connected to printer and pin configuration.</li>
                    <li><strong>Browser printing:</strong> For web deployment, consider using QZ Tray or similar print bridge.</li>
                    <li><strong>CORS errors:</strong> Ensure printer web interface allows cross-origin requests.</li>
                </ul>
            </div>
            
            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:bg-[var(--disabled)] text-[var(--accent-primary-text)] font-bold py-3 px-6 rounded-lg transition-colors"
                >
                    {isLoading ? <Spinner /> : '💾 Save Printer Settings'}
                </button>
            </div>

            {/* Add Custom Station Modal */}
            {showStationModal && (
                <StationModal
                    onClose={() => setShowStationModal(false)}
                    onAdd={handleAddCustomStation}
                    existingStations={allStations}
                />
            )}
        </div>
    );
};

const StationModal: React.FC<{
    onClose: () => void;
    onAdd: (name: string) => void;
    existingStations: string[];
}> = ({ onClose, onAdd, existingStations }) => {
    const [stationName, setStationName] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = stationName.trim();
        
        if (!trimmed) {
            setError('Station name is required');
            return;
        }
        
        if (existingStations.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
            setError('A station with this name already exists');
            return;
        }
        
        onAdd(trimmed);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Add Custom Kitchen Station">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        Station Name
                    </label>
                    <input
                        type="text"
                        value={stationName}
                        onChange={(e) => {
                            setStationName(e.target.value);
                            setError('');
                        }}
                        placeholder="e.g., Grill Station, Salad Bar, etc."
                        className="w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                        autoFocus
                    />
                    {error && (
                        <p className="mt-2 text-sm text-red-400">{error}</p>
                    )}
                </div>
                
                <div className="bg-[var(--background-tertiary)] p-3 rounded-lg">
                    <p className="text-xs text-[var(--text-secondary)]">
                        💡 <strong>Tip:</strong> Custom stations allow you to organize your kitchen workflow better. 
                        Examples: "Grill Station", "Fryer", "Cold Station", "Salad Bar", "Expediting Station"
                    </p>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-[var(--background-tertiary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--background-interactive)] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-[var(--accent-primary)] text-[var(--accent-primary-text)] rounded-lg hover:opacity-90 transition-opacity font-semibold"
                    >
                        Add Station
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default PrinterSettings;
