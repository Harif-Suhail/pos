import React, { useState, useEffect } from 'react';
import { OrderItem } from '../types';

interface NotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: OrderItem | null;
    onSave: (uniqueId: string, notes: string) => void;
}

const NotesModal: React.FC<NotesModalProps> = ({ isOpen, onClose, item, onSave }) => {
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (item) {
            setNotes(item.notes || '');
        }
    }, [item]);

    if (!isOpen || !item) return null;

    const handleSave = () => {
        onSave(item.uniqueId, notes);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" aria-modal="true" role="dialog" onClick={onClose}>
            <div className="bg-[var(--background-secondary)] rounded-lg shadow-xl p-6 w-full max-w-md m-4 text-[var(--text-primary)]" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4">Add Note for {item.name}</h2>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm rounded-lg focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] block p-3 min-h-[100px]"
                    placeholder="e.g., No onions, extra spicy..."
                    autoFocus
                />
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-[var(--background-interactive)] hover:bg-[var(--border-color)] text-[var(--text-primary)] font-bold transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--accent-primary-text)] font-bold transition-colors">
                        Save Note
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotesModal;