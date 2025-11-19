import React, { memo, useRef, useEffect, useState } from 'react';
import { MenuItem } from '../types';
import { useCurrency } from '../hooks/useCurrency';

interface VirtualMenuGridProps {
    items: MenuItem[];
    onSelectItem: (item: MenuItem) => void;
    threshold?: number; // Number of items before enabling virtualization
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
            <img src={item.image} alt={item.name} className="w-full h-32 object-cover" loading="lazy" />
            <div className="p-4">
                <h3 className="font-semibold text-[var(--text-primary)] truncate">{item.name}</h3>
                <p className="text-[var(--text-secondary)] mt-1">{formatCurrency(item.basePrice)}</p>
            </div>
        </button>
    );
});

MenuItemCard.displayName = 'MenuItemCard';

/**
 * Smart menu grid that automatically enables virtualization for large lists
 * For smaller lists, renders normally for better UX
 */
const VirtualMenuGrid: React.FC<VirtualMenuGridProps> = memo(({ items, onSelectItem, threshold = 50 }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: threshold });
    const shouldVirtualize = items.length > threshold;

    useEffect(() => {
        if (!shouldVirtualize || !containerRef.current) return;

        const container = containerRef.current;
        const handleScroll = () => {
            const scrollTop = container.scrollTop;
            const containerHeight = container.clientHeight;
            const itemHeight = 240; // Approximate height of menu item card
            const columns = Math.floor(container.clientWidth / 200); // Approximate card width
            const itemsPerRow = Math.max(1, columns);

            const startRow = Math.floor(scrollTop / itemHeight);
            const endRow = Math.ceil((scrollTop + containerHeight) / itemHeight);
            const overscan = 2; // Render 2 extra rows above and below

            const start = Math.max(0, (startRow - overscan) * itemsPerRow);
            const end = Math.min(items.length, (endRow + overscan) * itemsPerRow);

            setVisibleRange({ start, end });
        };

        // Initial calculation
        handleScroll();

        container.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleScroll, { passive: true });

        return () => {
            container.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, [items.length, shouldVirtualize]);

    if (!shouldVirtualize) {
        // Render all items normally for small lists
        return (
            <div className="flex-grow bg-[var(--background-primary)] mt-4 p-1 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {items.map(item => (
                        <MenuItemCard key={item.id} item={item} onSelectItem={onSelectItem} />
                    ))}
                </div>
            </div>
        );
    }

    // Virtualized rendering for large lists
    const visibleItems = items.slice(visibleRange.start, visibleRange.end);
    const totalRows = Math.ceil(items.length / 4); // Assuming 4 columns average
    const totalHeight = totalRows * 240; // Approximate row height

    return (
        <div 
            ref={containerRef}
            className="flex-grow bg-[var(--background-primary)] mt-4 p-1 overflow-y-auto"
        >
            <div style={{ height: totalHeight, position: 'relative' }}>
                <div 
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    style={{
                        position: 'absolute',
                        top: Math.floor(visibleRange.start / 4) * 240,
                        left: 0,
                        right: 0,
                    }}
                >
                    {visibleItems.map(item => (
                        <MenuItemCard key={item.id} item={item} onSelectItem={onSelectItem} />
                    ))}
                </div>
            </div>
        </div>
    );
});

VirtualMenuGrid.displayName = 'VirtualMenuGrid';

export default VirtualMenuGrid;
