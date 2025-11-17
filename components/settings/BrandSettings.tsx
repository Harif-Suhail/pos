import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import Spinner from '../common/Spinner';

const BrandSettings: React.FC = () => {
    const { currentTenant, api, addToast, syncData } = useAppContext();
    const [logoUrl, setLogoUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (currentTenant) {
            setLogoUrl(currentTenant.logoUrl || '');
        }
    }, [currentTenant]);

    const handleSave = async () => {
        if (!currentTenant) return;
        setIsLoading(true);
        try {
            await api.updateTenant({ ...currentTenant, logoUrl });
            await syncData(); // Refresh context
            addToast('Brand settings saved successfully!', 'success');
        } catch (e: any) {
            addToast(`Error: ${e.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (!currentTenant) {
        return <div className="p-4"><Spinner /></div>;
    }

    return (
        <div className="bg-[var(--background-secondary)] p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Brand Customization</h2>
            
            <div className="space-y-4">
                <div>
                    <label htmlFor="logoUrl" className="block text-sm font-medium text-[var(--text-tertiary)] mb-1">
                        Logo URL
                    </label>
                    <input
                        id="logoUrl"
                        type="text"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="https://example.com/logo.png"
                        className="w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg p-2.5"
                    />
                    <p className="text-xs text-[var(--text-secondary)] mt-1">This logo will appear on receipts.</p>
                </div>
                
                {logoUrl && (
                    <div>
                        <h4 className="text-sm font-medium text-[var(--text-tertiary)] mb-2">Logo Preview:</h4>
                        <div className="p-4 border border-dashed border-[var(--border-color)] rounded-lg flex justify-center items-center bg-[var(--background-primary)]">
                             <img src={logoUrl} alt="Logo Preview" className="max-w-full h-24 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        </div>
                    </div>
                )}
            </div>

            <div className="pt-6 flex justify-end">
                <button 
                    onClick={handleSave} 
                    disabled={isLoading} 
                    className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:bg-[var(--disabled)] text-[var(--accent-primary-text)] font-bold py-2 px-4 rounded-lg flex items-center"
                >
                    {isLoading && <Spinner />}
                    {isLoading ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
        </div>
    );
};

export default BrandSettings;