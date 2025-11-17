import React from 'react';

interface GeminiSuggestionModalProps {
    isOpen: boolean;
    onClose: () => void;
    suggestion: string;
    isLoading: boolean;
    error: string;
}

const GeminiSuggestionModal: React.FC<GeminiSuggestionModalProps> = ({ isOpen, onClose, suggestion, isLoading, error }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" aria-modal="true" role="dialog" onClick={onClose}>
            <div className="bg-[var(--background-secondary)] rounded-lg shadow-xl p-6 w-full max-w-md m-4 text-[var(--text-primary)] relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close suggestion modal">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <div className="flex items-center mb-4">
                     <div className="p-2 bg-blue-500/20 rounded-full">
                        <svg className="w-6 h-6 text-[var(--accent-secondary)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" /></svg>
                     </div>
                     <h2 className="text-2xl font-bold ml-3">Gemini Suggestion</h2>
                </div>
                
                <div className="min-h-[100px] flex items-center justify-center">
                    {isLoading && (
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-primary)]"></div>
                    )}
                    {error && <p className="text-[var(--negative)] text-center">{error}</p>}
                    {!isLoading && !error && <p className="text-lg text-[var(--text-tertiary)] text-center leading-relaxed">"{suggestion}"</p>}
                </div>
            </div>
        </div>
    );
};

export default GeminiSuggestionModal;