import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Order, OrderItem, KotStatus, KitchenStation } from '../types';
import { useAppContext } from '../hooks/useAppContext';
import { formatTimestamp } from '../utils/helpers';

const OrderItemTicket: React.FC<{ 
    item: OrderItem; 
    order: Order; 
    onStatusChange: (orderId: string, uniqueItemId: string, status: KotStatus) => void; 
}> = ({ item, order, onStatusChange }) => {
    const [isAnimating, setIsAnimating] = useState(false);

    const nextAction = (): { status: KotStatus; label: string; color: string } | null => {
        switch (item.kotStatus) {
            case 'NEW': return { status: 'PREPARING', label: 'Start Preparing', color: 'bg-blue-600 hover:bg-blue-700' };
            case 'PREPARING': return { status: 'READY', label: 'Mark Ready', color: 'bg-green-600 hover:bg-green-700' };
            default: return null;
        }
    };
    
    const action = nextAction();
    
    const timeSince = (timestamp: number) => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        const minutes = Math.floor(seconds / 60);
        if (minutes > 60) return `${Math.floor(minutes/60)}h ${minutes%60}m ago`;
        return `${minutes}m ago`;
    };

    const getOrderTitle = () => {
        if (order.type === 'Dine-In' && order.table) return `Table ${order.table}`;
        return `${order.type} #${order.orderNumber}`;
    };

    const getUrgencyColor = () => {
        const minutes = Math.floor((Date.now() - order.createdAt) / 60000);
        if (minutes > 20) return 'border-l-4 border-red-500 bg-red-900/10';
        if (minutes > 10) return 'border-l-4 border-orange-500 bg-orange-900/10';
        return 'border-l-4 border-green-500';
    };

    const handleAction = () => {
        if (!action) return;
        setIsAnimating(true);
        setTimeout(() => {
            onStatusChange(order.id, item.uniqueId, action.status);
        }, 200);
    };

    return (
        <div className={`bg-[var(--background-secondary)] rounded-lg p-4 shadow-lg flex flex-col transition-all duration-200 ${getUrgencyColor()} ${isAnimating ? 'scale-95 opacity-50' : 'scale-100'}`}>
            <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                    <h3 className="font-bold text-lg text-[var(--text-primary)]">{getOrderTitle()}</h3>
                    <span className="text-xs text-[var(--text-secondary)]">{timeSince(order.createdAt)}</span>
                </div>
                {order.type === 'Delivery' && (
                    <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full">Delivery</span>
                )}
                {order.type === 'Pickup' && (
                    <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">Pickup</span>
                )}
            </div>
            
            <div className="flex-grow my-3 border-t border-b border-[var(--border-color)] py-3">
                <p className="text-[var(--text-primary)] text-xl mb-2">
                    <span className="font-bold text-2xl text-[var(--accent-primary)]">{item.quantity}×</span> {item.name}
                </p>
                <div className="text-sm text-[var(--text-secondary)] space-y-1 pl-4">
                    {item.variant && (
                        <div className="flex items-center">
                            <span className="text-xs mr-1">○</span> 
                            <span className="font-medium">{item.variant.name}</span>
                        </div>
                    )}
                    {item.selectedModifiers?.map(mod => (
                        <div key={mod.id} className="flex items-center">
                            <span className="text-xs mr-1">+</span> 
                            <span>{mod.name}</span>
                        </div>
                    ))}
                </div>
                {item.notes && (
                    <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-600/30 rounded">
                        <p className="text-sm text-yellow-200 font-medium">
                            📝 {item.notes}
                        </p>
                    </div>
                )}
            </div>
            
            {action && (
                <button
                    onClick={handleAction}
                    className={`w-full mt-2 ${action.color} text-white font-bold py-3 rounded-lg transition-all transform active:scale-95 shadow-lg`}
                >
                    {action.label}
                </button>
            )}
        </div>
    );
};

const KDSColumn: React.FC<{ 
    title: string; 
    tickets: {order: Order, item: OrderItem}[]; 
    color: string;
    onStatusChange: (orderId: string, uniqueItemId: string, status: KotStatus) => void; 
}> = ({ title, tickets, color, onStatusChange }) => (
    <div className="bg-[var(--background-primary)] rounded-lg flex flex-col w-1/3 min-w-0">
        <div className={`${color} text-white text-xl font-bold text-center py-3 rounded-t-lg shadow-md`}>
            {title}
            <span className="ml-2 px-3 py-1 bg-white/20 rounded-full text-sm">{tickets.length}</span>
        </div>
        <div className="flex-grow space-y-3 overflow-y-auto p-3 scroll-smooth">
            {tickets.map(({order, item}) => 
                <OrderItemTicket key={item.uniqueId} order={order} item={item} onStatusChange={onStatusChange} />
            )}
            {tickets.length === 0 && (
                <div className="flex flex-col items-center justify-center pt-20 text-[var(--text-secondary)]">
                    <svg className="w-16 h-16 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-lg">All Clear!</p>
                </div>
            )}
        </div>
    </div>
);

export default function KDSView() {
    const { activeOrders, api, currentOutlet } = useAppContext();
    const [selectedStation, setSelectedStation] = useState<KitchenStation>('Main Kitchen');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [showStationManager, setShowStationManager] = useState(false);
    const [lastOrderCount, setLastOrderCount] = useState(0);

    // Get available stations - default stations + custom stations
    const availableStations: string[] = useMemo(() => {
        const defaults: KitchenStation[] = ['Main Kitchen', 'Bar', 'Desserts'];
        if (currentOutlet) {
            const customStations = localStorage.getItem(`custom_stations_${currentOutlet.id}`);
            if (customStations) {
                try {
                    const parsed = JSON.parse(customStations);
                    return [...defaults, ...parsed];
                } catch (e) {
                    return defaults;
                }
            }
        }
        return defaults;
    }, [currentOutlet]);

    // Auto-refresh every 5 seconds
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => {
            // Trigger a subtle refresh by forcing re-render
        }, 5000);
        return () => clearInterval(interval);
    }, [autoRefresh]);

    // Sound notification for new orders
    useEffect(() => {
        const newCount = tickets.filter(t => t.item.kotStatus === 'NEW').length;
        if (newCount > lastOrderCount && lastOrderCount > 0) {
            // Play notification sound
            const audio = new Audio('/sounds/notification.mp3');
            audio.play().catch(() => {/* ignore if no sound file */});
        }
        setLastOrderCount(newCount);
    }, [activeOrders, selectedStation]);

    const handleStatusChange = useCallback((orderId: string, uniqueItemId: string, status: KotStatus) => {
        api.updateKotStatus(orderId, uniqueItemId, status);
    }, [api]);

    const tickets = useMemo(() => {
        const allTickets: {order: Order, item: OrderItem}[] = [];
        activeOrders.forEach(order => {
            order.items.forEach(item => {
                if (item.station === selectedStation) {
                    allTickets.push({order, item});
                }
            });
        });
        // Sort by order creation time (oldest first)
        return allTickets.sort((a, b) => a.order.createdAt - b.order.createdAt);
    }, [activeOrders, selectedStation]);

    const newTickets = tickets.filter(t => t.item.kotStatus === 'NEW');
    const preparingTickets = tickets.filter(t => t.item.kotStatus === 'PREPARING');
    const readyTickets = tickets.filter(t => t.item.kotStatus === 'READY');

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header with controls */}
            <div className="p-4 flex-shrink-0 bg-[var(--background-secondary)] shadow-lg">
                <div className="flex items-center justify-between gap-4">
                    {/* Station Tabs */}
                    <div className="flex-1 bg-[var(--background-tertiary)] rounded-lg p-1 inline-flex">
                        {availableStations.map(station => {
                            const stationTickets = activeOrders.reduce((count, order) => 
                                count + order.items.filter(item => item.station === station && item.kotStatus !== 'READY').length, 0
                            );
                            return (
                                <button 
                                    key={station}
                                    onClick={() => setSelectedStation(station)} 
                                    className={`px-6 py-3 text-sm font-medium rounded-md transition-all relative ${
                                        selectedStation === station 
                                            ? 'bg-[var(--accent-primary)] text-[var(--accent-primary-text)] shadow-lg scale-105' 
                                            : 'text-[var(--text-tertiary)] hover:bg-[var(--background-interactive)]'
                                    }`}
                                >
                                    {station}
                                    {stationTickets > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                            {stationTickets}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Control buttons */}
                    <div className="flex items-center gap-2">
                        {/* Auto-refresh toggle */}
                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`p-2 rounded-lg transition-colors ${autoRefresh ? 'bg-green-600 text-white' : 'bg-[var(--background-tertiary)] text-[var(--text-secondary)]'}`}
                            title="Auto-refresh"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>

                        {/* Fullscreen toggle */}
                        <button
                            onClick={toggleFullscreen}
                            className="p-2 rounded-lg bg-[var(--background-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--background-interactive)] transition-colors"
                            title="Toggle Fullscreen"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isFullscreen ? "M6 18L18 6M6 6l12 12" : "M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"} />
                            </svg>
                        </button>

                        {/* Settings/Station Manager */}
                        <button
                            onClick={() => setShowStationManager(!showStationManager)}
                            className="p-2 rounded-lg bg-[var(--background-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--background-interactive)] transition-colors"
                            title="Station Settings"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main KDS Board */}
            <main className="flex-grow flex p-4 gap-4 overflow-hidden">
                <KDSColumn 
                    title="New Orders" 
                    tickets={newTickets} 
                    color="bg-gradient-to-r from-red-600 to-red-700"
                    onStatusChange={handleStatusChange} 
                />
                <KDSColumn 
                    title="Preparing" 
                    tickets={preparingTickets} 
                    color="bg-gradient-to-r from-blue-600 to-blue-700"
                    onStatusChange={handleStatusChange} 
                />
                <KDSColumn 
                    title="Ready for Pickup" 
                    tickets={readyTickets} 
                    color="bg-gradient-to-r from-green-600 to-green-700"
                    onStatusChange={handleStatusChange} 
                />
            </main>

            {/* Station Manager Modal */}
            {showStationManager && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--background-secondary)] rounded-lg max-w-2xl w-full p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Kitchen Stations</h2>
                            <button
                                onClick={() => setShowStationManager(false)}
                                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <p className="text-[var(--text-secondary)]">
                                Kitchen stations can be managed in <strong>Settings → Outlet Settings</strong>.
                            </p>
                            <div className="bg-[var(--background-tertiary)] rounded-lg p-4">
                                <h3 className="font-semibold text-[var(--text-primary)] mb-3">Current Stations:</h3>
                                <div className="space-y-2">
                                    {availableStations.map(station => (
                                        <div key={station} className="flex items-center justify-between p-3 bg-[var(--background-primary)] rounded">
                                            <span className="text-[var(--text-primary)]">{station}</span>
                                            <span className="text-sm text-[var(--text-secondary)]">
                                                {activeOrders.reduce((count, order) => 
                                                    count + order.items.filter(item => item.station === station).length, 0
                                                )} items assigned
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}