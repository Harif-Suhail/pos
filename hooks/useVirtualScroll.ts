import { useState, useEffect, useRef, useMemo, CSSProperties, RefObject } from 'react';

interface VirtualScrollOptions {
    itemHeight: number;
    containerHeight: number;
    overscan?: number;
}

interface VirtualScrollResult<T> {
    virtualItems: Array<{
        index: number;
        item: T;
        style: CSSProperties;
    }>;
    totalHeight: number;
    containerRef: RefObject<HTMLDivElement>;
}

/**
 * Custom hook for virtual scrolling
 * Only renders visible items + overscan buffer for performance
 * 
 * @param items - Array of items to virtualize
 * @param options - Configuration for virtual scrolling
 * @returns Virtual scroll data and container ref
 */
export function useVirtualScroll<T>(
    items: T[],
    options: VirtualScrollOptions
): VirtualScrollResult<T> {
    const { itemHeight, containerHeight, overscan = 3 } = options;
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleScroll = () => {
            setScrollTop(container.scrollTop);
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    const virtualItems = useMemo(() => {
        const totalItems = items.length;
        const visibleCount = Math.ceil(containerHeight / itemHeight);
        const startIndex = Math.floor(scrollTop / itemHeight);
        const endIndex = Math.min(startIndex + visibleCount, totalItems);

        // Add overscan items before and after visible range
        const overscanStart = Math.max(0, startIndex - overscan);
        const overscanEnd = Math.min(totalItems, endIndex + overscan);

        const virtualItems = [];
        for (let i = overscanStart; i < overscanEnd; i++) {
            virtualItems.push({
                index: i,
                item: items[i],
                style: {
                    position: 'absolute' as const,
                    top: i * itemHeight,
                    height: itemHeight,
                    left: 0,
                    right: 0,
                }
            });
        }

        return virtualItems;
    }, [items, scrollTop, itemHeight, containerHeight, overscan]);

    const totalHeight = items.length * itemHeight;

    return {
        virtualItems,
        totalHeight,
        containerRef,
    };
}
