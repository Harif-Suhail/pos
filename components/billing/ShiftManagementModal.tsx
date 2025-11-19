import React, { useState } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import Modal from '../common/Modal';
import { useCurrency } from '../../hooks/useCurrency';
import Spinner from '../common/Spinner';

const ShiftManagementModal: React.FC = () => {
    const { currentShift, api, setShiftModalOpen, syncData, addToast } = useAppContext();
    const { formatCurrency } = useCurrency();
    const [openingCash, setOpeningCash] = useState('');
    const [closingCash, setClosingCash] = useState('');
    const [cashTransAmount, setCashTransAmount] = useState('');
    const [cashTransReason, setCashTransReason] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleStartShift = async () => {
        const amount = parseFloat(openingCash);
        if (isNaN(amount) || amount < 0) {
            setError("Please enter a valid opening cash amount.");
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            await api.startShift(amount);
            await syncData();
            addToast('Shift started successfully!', 'success');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleEndShift = async () => {
        const amount = parseFloat(closingCash);
        if (isNaN(amount) || amount < 0) {
            setError("Please enter a valid closing cash amount.");
            return;
        }
        
        // Calculate variance
        const variance = amount - currentShift!.expectedCash;
        const varianceMessage = variance === 0 
            ? "Cash matches perfectly! ✓" 
            : variance > 0 
                ? `Cash OVER by ${formatCurrency(Math.abs(variance))}` 
                : `Cash SHORT by ${formatCurrency(Math.abs(variance))}`;
        
        const confirmMessage = `Closing Cash: ${formatCurrency(amount)}\nExpected Cash: ${formatCurrency(currentShift!.expectedCash)}\n\n${varianceMessage}\n\nAre you sure you want to end your shift? This cannot be undone.`;
        
        if (!window.confirm(confirmMessage)) {
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            await api.endShift(amount);
            await syncData();
            addToast('Shift ended successfully!', 'success');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCashTransaction = async (type: 'CASH_IN' | 'CASH_OUT') => {
        const amount = parseFloat(cashTransAmount);
        if (isNaN(amount) || amount <= 0) {
            setError("Please enter a valid positive amount.");
            return;
        }
        if (!cashTransReason.trim()) {
            setError("A reason is required for cash transactions.");
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            await api.addCashTransaction(type, amount, cashTransReason);
            await syncData();
            addToast('Cash transaction recorded.', 'success');
            setCashTransAmount('');
            setCashTransReason('');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Modal isOpen={true} onClose={() => setShiftModalOpen(false)} title="Shift Management">
            
            {error && <p className="text-[var(--negative)] mb-2 bg-red-500/10 p-2 rounded-md text-sm">{error}</p>}

            {!currentShift ? (
                // Start Shift View
                <div>
                    <p className="mb-4 text-[var(--text-tertiary)]">No active shift. Please enter your opening cash float to begin.</p>
                    <input
                        type="number"
                        value={openingCash}
                        onChange={(e) => setOpeningCash(e.target.value)}
                        placeholder="Opening Cash Amount"
                        className="w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg p-2.5 mb-3"
                    />
                    <button onClick={handleStartShift} disabled={isLoading} className="w-full bg-[var(--positive)] hover:bg-[var(--positive-hover)] text-[var(--accent-primary-text)] font-bold py-2.5 rounded-lg flex items-center justify-center disabled:bg-[var(--disabled)]">
                        {isLoading ? <Spinner/> : 'Start Shift'}
                    </button>
                </div>
            ) : (
                // Active Shift View
                <div>
                    <div className="bg-[var(--background-tertiary)] p-4 rounded-lg mb-4 space-y-2">
                        <h4 className="font-semibold text-[var(--accent-primary)] mb-3">Cash Breakdown</h4>
                        
                        <div className="flex justify-between text-sm">
                            <span className="text-[var(--text-secondary)]">Opening Cash:</span>
                            <span className="font-semibold">{formatCurrency(currentShift.openingCash)}</span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                            <span className="text-[var(--text-secondary)]">Cash Sales:</span>
                            <span className="font-semibold text-[var(--positive)]">+{formatCurrency(currentShift.cashPayments)}</span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                            <span className="text-[var(--text-secondary)]">Cash Refunds:</span>
                            <span className="font-semibold text-[var(--negative)]">-{formatCurrency(currentShift.cashRefunds)}</span>
                        </div>
                        
                        {/* Cash In Transactions */}
                        {currentShift.transactions.filter(t => t.type === 'CASH_IN').length > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-[var(--text-secondary)]">Cash In:</span>
                                <span className="font-semibold text-[var(--positive)]">
                                    +{formatCurrency(currentShift.transactions.filter(t => t.type === 'CASH_IN').reduce((sum, t) => sum + t.amount, 0))}
                                </span>
                            </div>
                        )}
                        
                        {/* Cash Out Transactions */}
                        {currentShift.transactions.filter(t => t.type === 'CASH_OUT').length > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-[var(--text-secondary)]">Cash Out:</span>
                                <span className="font-semibold text-[var(--negative)]">
                                    -{formatCurrency(currentShift.transactions.filter(t => t.type === 'CASH_OUT').reduce((sum, t) => sum + t.amount, 0))}
                                </span>
                            </div>
                        )}
                        
                        <div className="border-t border-[var(--border-color)] pt-2 mt-2"></div>
                        
                        <div className="flex justify-between">
                            <span className="font-semibold">Expected in Drawer:</span>
                            <span className="font-bold text-lg text-[var(--accent-primary)]">{formatCurrency(currentShift.expectedCash)}</span>
                        </div>
                    </div>

                    {/* Transaction History */}
                    {currentShift.transactions.length > 0 && (
                        <div className="bg-[var(--background-tertiary)] p-4 rounded-lg mb-4">
                            <h4 className="font-semibold mb-3">Transaction History</h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {currentShift.transactions.map((transaction, index) => (
                                    <div key={index} className="flex justify-between items-start text-sm border-b border-[var(--border-color)] pb-2">
                                        <div className="flex-1">
                                            <div className={`font-semibold ${transaction.type === 'CASH_IN' ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                                                {transaction.type === 'CASH_IN' ? '+ Cash In' : '- Cash Out'}
                                            </div>
                                            <div className="text-[var(--text-tertiary)] text-xs">{transaction.reason}</div>
                                            <div className="text-[var(--text-tertiary)] text-xs">
                                                {new Date(transaction.timestamp).toLocaleString()}
                                            </div>
                                        </div>
                                        <div className={`font-bold ${transaction.type === 'CASH_IN' ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                                            {formatCurrency(transaction.amount)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="border-t border-b border-[var(--border-color)] py-4 my-4">
                        <h4 className="font-semibold mb-2">Cash In / Out</h4>
                        <input type="number" value={cashTransAmount} onChange={e => setCashTransAmount(e.target.value)} placeholder="Amount" className="w-full bg-[var(--background-primary)] rounded-lg p-2 mb-2"/>
                        <input type="text" value={cashTransReason} onChange={e => setCashTransReason(e.target.value)} placeholder="Reason" className="w-full bg-[var(--background-primary)] rounded-lg p-2 mb-2"/>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => handleCashTransaction('CASH_IN')} disabled={isLoading} className="bg-[var(--accent-secondary)] hover:bg-[var(--accent-secondary-hover)] disabled:bg-[var(--disabled)] p-2 rounded-lg text-[var(--accent-primary-text)]">Cash In</button>
                            <button onClick={() => handleCashTransaction('CASH_OUT')} disabled={isLoading} className="bg-[var(--warning)] hover:bg-[var(--warning-hover)] disabled:bg-[var(--disabled)] p-2 rounded-lg text-[var(--accent-primary-text)]">Cash Out</button>
                        </div>
                    </div>

                    <div>
                         <h4 className="font-semibold mb-2">End Shift</h4>
                        <input
                            type="number"
                            value={closingCash}
                            onChange={(e) => setClosingCash(e.target.value)}
                            placeholder="Closing Cash Amount (Count physical cash)"
                            className="w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg p-2.5 mb-3"
                        />
                        
                        {/* Variance Preview */}
                        {closingCash && !isNaN(parseFloat(closingCash)) && (
                            <div className="bg-[var(--background-tertiary)] p-3 rounded-lg mb-3 border-2 border-[var(--border-color)]">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-[var(--text-secondary)]">Expected:</span>
                                    <span className="font-semibold">{formatCurrency(currentShift.expectedCash)}</span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-[var(--text-secondary)]">Actual Count:</span>
                                    <span className="font-semibold">{formatCurrency(parseFloat(closingCash))}</span>
                                </div>
                                <div className="border-t border-[var(--border-color)] pt-2 mt-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold">Variance:</span>
                                        <span className={`font-bold text-lg ${
                                            parseFloat(closingCash) === currentShift.expectedCash 
                                                ? 'text-[var(--positive)]' 
                                                : parseFloat(closingCash) > currentShift.expectedCash 
                                                    ? 'text-[var(--warning)]' 
                                                    : 'text-[var(--negative)]'
                                        }`}>
                                            {parseFloat(closingCash) === currentShift.expectedCash 
                                                ? '✓ Perfect Match' 
                                                : (parseFloat(closingCash) > currentShift.expectedCash ? '+' : '') + 
                                                  formatCurrency(parseFloat(closingCash) - currentShift.expectedCash)
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <button onClick={handleEndShift} disabled={isLoading} className="w-full bg-[var(--negative)] hover:bg-[var(--negative-hover)] text-[var(--accent-primary-text)] font-bold py-2.5 rounded-lg flex items-center justify-center disabled:bg-[var(--disabled)]">
                           {isLoading ? <Spinner/> : 'End Shift & Print Report'}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default ShiftManagementModal;
