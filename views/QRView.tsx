import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { OrderItem, MenuItem, Variant } from '../types';
import { useAppContext } from '../hooks/useAppContext';

// Components
import CategoryTabs from '../components/CategoryTabs';
import MenuGrid from '../components/MenuGrid';
import QROrderSummary from '../components/qr/QROrderSummary';
import VariantSelectionModal from '../components/menu/VariantSelectionModal';
import Spinner from '../components/common/Spinner';

interface QRViewProps {
    tableId: string;
}

export default function QRView({ tableId }: QRViewProps) {
    const { 
        currentTenant,
        currentOutlet,
        menuItems,
        menuCategories,
        api,
    } = useAppContext();

    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [cartItems, setCartItems] = useState<OrderItem[]>([]);
    const [itemForVariants, setItemForVariants] = useState<MenuItem | null>(null);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [orderPlaced, setOrderPlaced] = useState(false);

    useEffect(() => {
        if (menuCategories.length > 0 && !selectedCategory) {
            setSelectedCategory(menuCategories[0]);
        }
    }, [menuCategories, selectedCategory]);

    const handleSelectItem = (item: MenuItem) => {
        if (item.variants && item.variants.length > 0) {
            setItemForVariants(item);
        } else {
            addItemToCart(item);
        }
    };

    const addItemToCart = (item: MenuItem, variant?: Variant) => {
        const price = variant?.price ?? item.basePrice;
        
        // Check if a similar item already exists (same ID and variant)
        const existingItem = cartItems.find(cartItem => cartItem.itemId === item.id && cartItem.variant?.id === variant?.id);
        
        if (existingItem) {
            // If it exists, just increase the quantity
            updateCartQuantity(existingItem.uniqueId, existingItem.quantity + 1);
        } else {
            // Otherwise, add a new item
            const newOrderItem: OrderItem = {
                uniqueId: `item_${Date.now()}`,
                itemId: item.id,
                name: item.name,
                quantity: 1,
                price: price,
                variant: variant,
                kotStatus: 'NEW',
                station: item.station,
            };
            setCartItems(prev => [...prev, newOrderItem]);
        }
    };

    const handleAddItemWithVariant = (item: MenuItem, variant: Variant) => {
        addItemToCart(item, variant);
        setItemForVariants(null);
    };

    const updateCartQuantity = (uniqueId: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            // Remove item if quantity is 0 or less
            setCartItems(prev => prev.filter(item => item.uniqueId !== uniqueId));
        } else {
            setCartItems(prev => prev.map(item => item.uniqueId === uniqueId ? { ...item, quantity: newQuantity } : item));
        }
    };
    
    const handlePlaceOrder = async () => {
        if (cartItems.length === 0) return;

        setIsPlacingOrder(true);
        try {
            const newOrder = await api.createOrder({ type: 'QR', table: tableId });
            // In a real app with a real backend, you'd send all items at once.
            // With this mock API, we add them one by one.
            for (const item of cartItems) {
                // We need to create a new object without the client-side `uniqueId`
                const itemData = { 
                    itemId: item.itemId, 
                    variantId: item.variant?.id 
                };
                
                // We also need to add it `quantity` times
                for (let i = 0; i < item.quantity; i++) {
                    await api.addItemToOrder(newOrder.id, itemData);
                }
            }
            setOrderPlaced(true);
        } catch (error) {
            console.error("Failed to place order:", error);
            alert("Sorry, there was an issue placing your order. Please try again or notify a staff member.");
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const filteredMenuItems = useMemo(() =>
        menuItems.filter(item => item.category === selectedCategory),
        [selectedCategory, menuItems]
    );

    if (!currentTenant || !currentOutlet) {
        return <div className="min-h-screen flex items-center justify-center">Loading Menu...</div>;
    }
    
    if (orderPlaced) {
        return (
            <div className="min-h-screen bg-[var(--background-primary)] flex flex-col items-center justify-center text-center p-4">
                 <svg className="w-24 h-24 text-[var(--positive)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h1 className="text-4xl font-bold text-[var(--text-primary)] mt-6">Order Sent!</h1>
                <p className="text-lg text-[var(--text-secondary)] mt-2">
                    Your order has been sent to the kitchen for approval. A staff member will be with you shortly.
                </p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[var(--background-primary)]">
            <header className="bg-[var(--background-secondary)] shadow-md p-4 sticky top-0 z-10">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Welcome to {currentTenant.name}</h1>
                <p className="text-md text-[var(--text-secondary)]">Ordering for Table <span className="font-bold">{tableId}</span></p>
            </header>
            <main className="grid grid-cols-1 md:grid-cols-[1fr_400px] p-4 gap-4">
                <div className="flex flex-col">
                    <CategoryTabs selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
                    <MenuGrid items={filteredMenuItems} onSelectItem={handleSelectItem} />
                </div>
                <aside>
                    <QROrderSummary 
                        items={cartItems} 
                        onUpdateQuantity={updateCartQuantity}
                        onPlaceOrder={handlePlaceOrder}
                        isPlacingOrder={isPlacingOrder}
                    />
                </aside>
            </main>
            <VariantSelectionModal 
                isOpen={!!itemForVariants} 
                onClose={() => setItemForVariants(null)} 
                item={itemForVariants} 
                onSelectVariant={handleAddItemWithVariant} 
            />
        </div>
    );
}