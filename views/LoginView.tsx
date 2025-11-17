import React, { useState, useEffect } from 'react';
import { Tenant, Outlet, User } from '../types';
import { useAppContext } from '../hooks/useAppContext';
import Spinner from '../components/common/Spinner';

export default function LoginView() {
    const { tenants, getOutletsForTenant, getUsersForOutlet, login } = useAppContext();
    const [step, setStep] = useState(1); // 1: Tenant, 2: Outlet, 3: User
    
    const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
    const [outlets, setOutlets] = useState<Outlet[]>([]);
    
    const [selectedOutletId, setSelectedOutletId] = useState<string | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (selectedTenantId) {
            setIsLoading(true);
            getOutletsForTenant(selectedTenantId).then(data => {
                setOutlets(data);
                setIsLoading(false);
                setStep(2);
            });
        }
    }, [selectedTenantId, getOutletsForTenant]);

    useEffect(() => {
        if (selectedOutletId) {
            setIsLoading(true);
            getUsersForOutlet(selectedOutletId).then(data => {
                setUsers(data);
                setIsLoading(false);
                setStep(3);
            });
        }
    }, [selectedOutletId, getUsersForOutlet]);

    const handlePinInput = (digit: string) => {
        setError('');
        if (pin.length < 4) {
            setPin(pin + digit);
        }
    };
    
    const handleDeletePin = () => {
        setError('');
        setPin(pin.slice(0, -1));
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserId) {
            setError('Please select a user.');
            return;
        }
        if (pin.length !== 4) {
            setError('PIN must be 4 digits.');
            return;
        }
        setError('');
        setIsLoading(true);
        try {
            await login(selectedUserId, pin);
        } catch (err: any) {
            setError(err.message || 'Invalid PIN.');
            setPin('');
            setIsLoading(false);
        }
    };

    const renderStep = () => {
        if (isLoading && step < 3) return <div className="h-48 flex items-center justify-center"><Spinner /></div>;
        
        switch (step) {
            case 1:
                return (
                    <div>
                        <h2 className="text-xl font-semibold text-center text-[var(--text-primary)] mb-4">Select Restaurant</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {tenants.map(tenant => (
                                <button key={tenant.id} onClick={() => setSelectedTenantId(tenant.id)} className="p-4 bg-[var(--background-tertiary)] rounded-lg hover:bg-[var(--accent-primary)] transition-colors">
                                    {tenant.name}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            case 2:
                 return (
                    <div>
                        <button onClick={() => setStep(1)} className="text-sm text-[var(--accent-primary)] mb-2">&larr; Back to Restaurants</button>
                        <h2 className="text-xl font-semibold text-center text-[var(--text-primary)] mb-4">Select Outlet</h2>
                        <div className="flex flex-col space-y-3">
                            {outlets.map(outlet => (
                                <button key={outlet.id} onClick={() => setSelectedOutletId(outlet.id)} className="w-full p-3 bg-[var(--background-tertiary)] rounded-lg hover:bg-[var(--accent-primary)] transition-colors">
                                    {outlet.name}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            case 3:
                return (
                     <div>
                        <button onClick={() => setStep(2)} className="text-sm text-[var(--accent-primary)] mb-2">&larr; Back to Outlets</button>
                        <h2 className="text-xl font-semibold text-center text-[var(--text-primary)] mb-4">Select User & Enter PIN</h2>
                        <div className="grid grid-cols-3 gap-3 mb-4">
                             {users.map(user => (
                                <button key={user.id} onClick={() => { setSelectedUserId(user.id); setPin(''); setError(''); }} className={`p-3 rounded-lg text-sm transition-colors ${selectedUserId === user.id ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--background-tertiary)] hover:bg-[var(--background-interactive)]'}`}>
                                    <p className="font-semibold">{user.name}</p>
                                    <p className={`text-xs ${selectedUserId === user.id ? 'text-gray-200' : 'text-[var(--text-secondary)]'}`}>{user.role}</p>
                                </button>
                            ))}
                        </div>
                        {selectedUserId && (
                             <form onSubmit={handleLogin}>
                                <div className="flex justify-center items-center space-x-3 my-4">
                                    {Array(4).fill(0).map((_, i) => (
                                        <div key={i} className={`w-10 h-12 rounded-lg transition-colors ${pin.length > i ? 'bg-[var(--accent-primary)]' : 'bg-[var(--background-tertiary)]'}`}></div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {[1,2,3,4,5,6,7,8,9, '0'].map(d => 
                                        <button type="button" key={d} onClick={() => handlePinInput(d.toString())} className="p-4 text-xl font-bold bg-[var(--background-tertiary)] rounded-lg hover:bg-[var(--background-interactive)] transition-colors">{d}</button>
                                    )}
                                    <button type="button" onClick={handleDeletePin} className="p-4 text-xl font-bold bg-[var(--background-tertiary)] rounded-lg hover:bg-[var(--background-interactive)] transition-colors flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 002.828 0L21 12M3 12l6.414-6.414a2 2 0 012.828 0L21 12" /></svg>
                                    </button>
                                </div>
                                <button type="submit" disabled={isLoading} className="w-full mt-4 bg-[var(--positive)] hover:bg-[var(--positive-hover)] text-[var(--accent-primary-text)] font-bold py-3 rounded-lg transition-colors flex items-center justify-center disabled:bg-[var(--disabled)]">
                                    {isLoading ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div> : 'Login'}
                                </button>
                            </form>
                        )}
                    </div>
                );
            default: return null;
        }
    }

    return (
        <div className="min-h-screen bg-[var(--background-primary)] flex items-center justify-center p-4">
            <div className="bg-[var(--background-secondary)] p-8 rounded-lg shadow-lg w-full max-w-md">
                <div className="flex flex-col items-center mb-6">
                    <svg className="w-12 h-12 text-[var(--accent-primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)] mt-2">Gemini POS</h1>
                </div>
                {error && <p className="text-[var(--negative)] text-center mb-4 text-sm font-semibold">{error}</p>}
                {renderStep()}
            </div>
        </div>
    );
};
