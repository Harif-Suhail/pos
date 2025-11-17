import React, { useState, useMemo } from 'react';
import { Order, OrderItem, KotStatus, KitchenStation } from '../types';
import { useAppContext } from '../hooks/useAppContext';
import { formatTimestamp } from '../utils/helpers';

const KITCHEN_STATIONS: KitchenStation[] = ['Main Kitchen', 'Bar', 'Desserts'];

const OrderItemTicket: React.FC<{ item: OrderItem; order: Order; onStatusChange: (orderId: string, uniqueItemId: string, status: KotStatus) => void; }> = ({ item, order, onStatusChange }) => {

    const nextAction = (): { status: KotStatus; label: string } | null => {
        switch (item.kotStatus) {
            case 'NEW': return { status: 'PREPARING', label: 'Start Preparing' };
            case 'PREPARING': return { status: 'READY', label: 'Mark as Ready' };
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
    }

    return (
        <div className="bg-[var(--background-secondary)] rounded-lg p-4 shadow-md flex flex-col h-full">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg text-[var(--text-primary)]">{getOrderTitle()}</h3>
                <span className="text-xs text-[var(--text-secondary)]">{timeSince(order.createdAt)}</span>
            </div>
            <div className="flex-grow my-2 border-t border-b border-[var(--border-color)] py-2">
                <p className="text-[var(--text-primary)] text-lg"><span className="font-bold text-xl">{item.quantity}x</span> {item.name}</p>
                 <div className="text-xs text-[var(--text-tertiary)] pl-4">
                    {item.variant && <div>- {item.variant.name}</div>}
                    {item.selectedModifiers?.map(mod => <div key={mod.id}>+ {mod.name}</div>)}
                </div>
                {item.notes && <p className="text-sm text-[var(--info-text)] ml-4 mt-1">&rdsh; {item.notes}</p>}
            </div>
             {action && (
                <button
                    onClick={() => onStatusChange(order.id, item.uniqueId, action.status)}
                    className="w-full mt-2 bg-[var(--positive)] hover:bg-[var(--positive-hover)] text-[var(--accent-primary-text)] font-bold py-2 rounded-lg transition-colors"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
};


const KDSColumn: React.FC<{ title: string; tickets: {order: Order, item: OrderItem}[]; onStatusChange: (orderId: string, uniqueItemId: string, status: KotStatus) => void; }> = ({ title, tickets, onStatusChange }) => (
    <div className="bg-[var(--background-primary)] rounded-lg flex flex-col p-2 w-1/3">
        <h2 className="text-xl font-bold text-center text-[var(--text-primary)] mb-4 sticky top-0 bg-[var(--background-primary)] py-2">{title} ({tickets.length})</h2>
        <div className="flex-grow space-y-4 overflow-y-auto px-2">
            {tickets.map(({order, item}) => 
                <OrderItemTicket key={item.uniqueId} order={order} item={item} onStatusChange={onStatusChange} />
            )}
            {tickets.length === 0 && <p className="text-[var(--text-secondary)] text-center pt-10">No tickets here.</p>}
        </div>
    </div>
);

export default function KDSView() {
    const { activeOrders, api } = useAppContext();
    const [selectedStation, setSelectedStation] = useState<KitchenStation>('Main Kitchen');

    const handleStatusChange = (orderId: string, uniqueItemId: string, status: KotStatus) => {
        api.updateKotStatus(orderId, uniqueItemId, status);
    };

    const tickets = useMemo(() => {
        const allTickets: {order: Order, item: OrderItem}[] = [];
        activeOrders.forEach(order => {
            order.items.forEach(item => {
                if (item.station === selectedStation) {
                    allTickets.push({order, item});
                }
            });
        });
        return allTickets;
    }, [activeOrders, selectedStation]);

    const newTickets = tickets.filter(t => t.item.kotStatus === 'NEW');
    const preparingTickets = tickets.filter(t => t.item.kotStatus === 'PREPARING');
    const readyTickets = tickets.filter(t => t.item.kotStatus === 'READY');

    return (
        <div className="flex flex-col flex-grow">
            <div className="p-4 flex-shrink-0">
                <div className="bg-[var(--background-secondary)] p-2 rounded-lg">
                    <div className="bg-[var(--background-tertiary)] rounded-md inline-flex">
                        {KITCHEN_STATIONS.map(station => (
                            <button 
                                key={station}
                                onClick={() => setSelectedStation(station)} 
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${selectedStation === station ? 'bg-[var(--accent-primary)] text-[var(--accent-primary-text)]' : 'text-[var(--text-tertiary)] hover:bg-[var(--background-interactive)]'}`}
                            >
                                {station}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <main className="flex-grow flex p-4 pt-0 gap-4 overflow-hidden">
                <KDSColumn title="New" tickets={newTickets} onStatusChange={handleStatusChange} />
                <KDSColumn title="Preparing" tickets={preparingTickets} onStatusChange={handleStatusChange} />
                <KDSColumn title="Ready for Pickup" tickets={readyTickets} onStatusChange={handleStatusChange} />
            </main>
        </div>
    );
}