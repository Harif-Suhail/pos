import React, { memo } from 'react';
import { MenuItem } from '../types';
import { useCurrency } from '../hooks/useCurrency';

interface MenuGridProps {
    items: MenuItem[];
    onSelectItem: (item: MenuItem) => void;
}

const MenuItemCard: React.FC<{ item: MenuItem; onSelectItem: (item: MenuItem) => void }> = memo(({ item, onSelectItem }) => {
    const { formatCurrency } = useCurrency();
    const isOutOfStock = item.stock !== undefined && item.stock <= 0;
    const isUnavailable = item.available === false;
    const isDisabled = isOutOfStock || isUnavailable;

    return (
        <button 
            onClick={() => onSelectItem(item)} 
            className={`relative bg-[var(--background-secondary)] rounded-lg shadow-lg overflow-hidden text-left transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-75 ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'transform hover:-translate-y-1'}`}
            aria-label={`Add ${item.name} to order`}
            disabled={isDisabled}
        >
            {isOutOfStock && (
                <div className="absolute top-2 right-2 bg-[var(--negative)] text-[var(--accent-primary-text)] text-xs font-bold px-2 py-1 rounded-full z-10">
                    Out of Stock
                </div>
            )}
            {isUnavailable && !isOutOfStock && (
                <div className="absolute top-2 right-2 bg-orange-600 text-white text-xs font-bold px-2 py-1 rounded-full z-10">
                    Unavailable
                </div>
            )}
            <img src={item.image} alt={item.name} className="w-full h-32 object-cover" />
            <div className="p-4">
                <h3 className="font-semibold text-[var(--text-primary)] truncate">{item.name}</h3>
                <p className="text-[var(--text-secondary)] mt-1">{formatCurrency(item.basePrice)}</p>
            </div>
        </button>
    );
});

MenuItemCard.displayName = 'MenuItemCard';

const MenuGrid: React.FC<MenuGridProps> = memo(({ items, onSelectItem }) => {
    return (
        <div className="flex-grow bg-[var(--background-primary)] mt-4 p-1 overflow-y-auto">
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map(item => (
                    <MenuItemCard key={item.id} item={item} onSelectItem={onSelectItem} />
                ))}
            </div>
        </div>
    );
});

MenuGrid.displayName = 'MenuGrid';

export default MenuGrid;