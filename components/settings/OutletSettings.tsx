import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { Outlet, DayOfWeek, Tax, KitchenStation } from '../../types';
import Spinner from '../common/Spinner';

const DAYS_OF_WEEK: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const KITCHEN_STATIONS: KitchenStation[] = ['Main Kitchen', 'Bar', 'Desserts'];

const OutletSettings: React.FC = () => {
    const { currentOutlet, api, syncData, addToast } = useAppContext();
    const [settings, setSettings] = useState<Outlet['settings'] | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (currentOutlet) {
            setSettings(JSON.parse(JSON.stringify(currentOutlet.settings)));
        }
    }, [currentOutlet]);

    const handleSave = async () => {
        if (!currentOutlet || !settings) return;
        setIsLoading(true);
        try {
            await api.updateOutletSettings(currentOutlet.id, settings);
            await syncData();
            addToast("Settings saved successfully!", 'success');
        } catch(e: any) {
            addToast(`Error saving settings: ${e.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!settings) {
        return <div className="flex justify-center items-center p-8"><Spinner /></div>;
    }

    const handleFieldChange = (section: keyof Outlet['settings'], field: string, value: any, index?: number) => {
        setSettings(prev => {
            if (!prev) return null;
            const newSettings = JSON.parse(JSON.stringify(prev)); // Deep copy

            if (index !== undefined && Array.isArray((newSettings as any)[section])) {
                (newSettings as any)[section][index] = { ...(newSettings as any)[section][index], [field]: value };
            } else if (typeof (newSettings as any)[section] === 'object' && (newSettings as any)[section] !== null) {
                (newSettings as any)[section] = { ...(newSettings as any)[section], [field]: value };
            }
            return newSettings;
        });
    };
    
    const addTax = () => {
        const newTax: Tax = { id: `tax_${Date.now()}`, name: '', rate: 0, isInclusive: false };
        setSettings(prev => prev ? ({...prev, taxes: [...prev.taxes, newTax]}) : null);
    }
    const removeTax = (id: string) => {
        setSettings(prev => prev ? ({...prev, taxes: prev.taxes.filter(t => t.id !== id)}) : null);
    }

    return (
        <div className="bg-[var(--background-secondary)] p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
            <style>{`
                .input-style { background-color: var(--background-tertiary); border: 1px solid var(--border-color); border-radius: 0.375rem; padding: 0.5rem 0.75rem; color: var(--text-primary); transition: border-color 0.2s, box-shadow 0.2s; }
                .input-style:focus { outline: none; border-color: var(--accent-primary); box-shadow: 0 0 0 1px var(--accent-primary); }
                .input-style:disabled { opacity: 0.5; cursor: not-allowed; }
                .checkbox-style { height: 1rem; width: 1rem; border-radius: 0.25rem; border-color: var(--border-color); background-color: var(--background-tertiary); color: var(--accent-primary); }
                .checkbox-style:focus { ring: var(--accent-primary); }
            `}</style>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Outlet Settings: {currentOutlet?.name}</h2>
            <div className="space-y-8">
                
                <SettingsSection title="Opening Hours">
                    <p className="text-sm text-[var(--text-secondary)] -mt-2 mb-4">Set the hours your outlet is open for business.</p>
                    {DAYS_OF_WEEK.map((day, index) => {
                        const daySetting = settings.openingHours.find(h => h.day === day) || { day, open: '09:00', close: '22:00', isClosed: true };
                        const dayIndex = settings.openingHours.findIndex(h => h.day === day);
                        return (
                             <div key={day} className="grid grid-cols-[1fr_2fr_1fr] items-center gap-4 py-2">
                                <label className="font-medium text-[var(--text-tertiary)]">{day}</label>
                                <div className="flex items-center gap-2">
                                    <input type="time" value={daySetting.open} disabled={daySetting.isClosed} onChange={e => handleFieldChange('openingHours', 'open', e.target.value, dayIndex)} className="input-style w-full" />
                                    <span className="text-[var(--text-tertiary)]">to</span>
                                    <input type="time" value={daySetting.close} disabled={daySetting.isClosed} onChange={e => handleFieldChange('openingHours', 'close', e.target.value, dayIndex)} className="input-style w-full" />
                                </div>
                                <label className="flex items-center space-x-2 text-sm justify-self-end">
                                    <input type="checkbox" checked={daySetting.isClosed} onChange={e => handleFieldChange('openingHours', 'isClosed', e.target.checked, dayIndex)} className="checkbox-style" />
                                    <span>Closed</span>
                                </label>
                            </div>
                        )
                    })}
                </SettingsSection>

                <SettingsSection title="Taxes & Service Charge">
                    {settings.taxes.map((tax, index) => (
                        <div key={tax.id} className="grid grid-cols-[3fr_1fr_auto] items-center gap-2 pb-2">
                            <input type="text" placeholder="Tax Name (e.g., VAT)" value={tax.name} onChange={e => handleFieldChange('taxes', 'name', e.target.value, index)} className="input-style" />
                            <input type="number" placeholder="Rate %" value={tax.rate} onChange={e => handleFieldChange('taxes', 'rate', parseFloat(e.target.value) || 0, index)} className="input-style" />
                            <button onClick={() => removeTax(tax.id)} className="text-[var(--negative)] hover:opacity-75 p-2 rounded-full" aria-label="Remove tax">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            </button>
                        </div>
                    ))}
                    <button onClick={addTax} className="text-sm font-semibold text-[var(--accent-primary)] hover:opacity-80">+ Add Tax Rule</button>
                    <hr className="my-4 border-[var(--border-color)]"/>
                    <div className="flex items-center gap-4">
                        <label className="flex items-center space-x-2">
                             <input type="checkbox" checked={settings.serviceCharge.isEnabled} onChange={e => handleFieldChange('serviceCharge', 'isEnabled', e.target.checked)} className="checkbox-style" />
                             <span>Enable Service Charge</span>
                        </label>
                         {settings.serviceCharge.isEnabled && (
                            <input type="number" value={settings.serviceCharge.rate} onChange={e => handleFieldChange('serviceCharge', 'rate', parseFloat(e.target.value) || 0)} className="input-style w-24" placeholder="Rate %"/>
                         )}
                    </div>
                </SettingsSection>

                <SettingsSection title="Hardware & Kitchen Configuration">
                     <div className="mb-6">
                        <label className="block text-sm font-medium text-[var(--text-tertiary)] mb-1">Receipt Printer IP Address / URL</label>
                        <input type="text" value={settings.printerSettings.receiptPrinterUrl || ''} onChange={e => handleFieldChange('printerSettings', 'receiptPrinterUrl', e.target.value)} className="input-style w-full" placeholder="e.g., 192.168.1.100"/>
                    </div>
                    <h4 className="text-md font-bold text-[var(--text-primary)] mb-2">Kitchen Stations</h4>
                    <div className="space-y-2">
                        {KITCHEN_STATIONS.map(station => (
                            <div key={station} className="grid grid-cols-[1fr_2fr_2fr] items-center gap-4 py-2 border-t border-[var(--border-color)]">
                                <span className="font-medium text-[var(--text-tertiary)]">{station}</span>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name={`${station}-config`} value="KDS" checked={!settings.kitchenConfig[station] || settings.kitchenConfig[station] === 'KDS'} onChange={() => setSettings(p => p ? ({ ...p, kitchenConfig: { ...p.kitchenConfig, [station]: 'KDS' } }) : null)} className="text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"/><span>KDS</span></label>
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name={`${station}-config`} value="Printer" checked={settings.kitchenConfig[station] === 'Printer'} onChange={() => setSettings(p => p ? ({ ...p, kitchenConfig: { ...p.kitchenConfig, [station]: 'Printer' } }) : null)} className="text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"/><span>Printer</span></label>
                                </div>
                                <div>
                                    {settings.kitchenConfig[station] === 'Printer' && (
                                        <input type="text" placeholder="IP Address or URL" value={settings.printerSettings.kitchenPrinters[station] || ''} onChange={e => setSettings(p => p ? ({...p, printerSettings: {...p.printerSettings, kitchenPrinters: {...p.printerSettings.kitchenPrinters, [station]: e.target.value}}}) : null)} className="input-style w-full" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </SettingsSection>

                <div className="pt-4 flex justify-end">
                    <button onClick={handleSave} disabled={isLoading} className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:bg-[var(--disabled)] text-[var(--accent-primary-text)] font-bold py-2 px-4 rounded-lg flex items-center">
                         {isLoading && <Spinner />}
                        {isLoading ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const SettingsSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="border-t border-[var(--border-color)] pt-6">
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">{title}</h3>
        <div>{children}</div>
    </div>
);

export default OutletSettings;