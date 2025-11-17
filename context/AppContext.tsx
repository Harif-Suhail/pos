import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Tenant, Outlet, User, Order, MenuItem, FloorPlanObject, Shift, InventoryItem, StockMovement, UserRole } from '../types';
import { api as mockApi, MockApi } from '../api/mockApi';

export type Theme = 'dark' | 'light';
export type ToastType = 'success' | 'error' | 'info' | 'warning';
export interface ToastMessage {
    id: number;
    message: string;
    type: ToastType;
}

export interface AppContextType {
    // State
    tenants: Tenant[];
    currentTenant: Tenant | null;
    currentOutlet: Outlet | null;
    allOutlets: Outlet[];
    currentUser: User | null;
    activeOrders: Order[];
    completedOrders: Order[];
    menuItems: MenuItem[];
    menuCategories: string[];
    inventory: InventoryItem[];
    stockMovements: StockMovement[];
    floorPlan: FloorPlanObject[];
    currentShift: Shift | null;
    isOnline: boolean;
    theme: Theme;
    toasts: ToastMessage[];

    // Modals
    isShiftModalOpen: boolean;
    
    // UI
    currentView: 'pos' | 'kds' | 'reports' | 'inventory' | 'settings';

    // API & Actions
    api: MockApi;
    getOutletsForTenant: (tenantId: string) => Promise<Outlet[]>;
    getUsersForOutlet: (outletId: string) => Promise<User[]>;
    login: (userId: string, pin: string) => Promise<void>;
    logout: () => void;
    syncData: () => Promise<void>;
    initializeQRSession: (outletId: string) => Promise<void>;
    setCurrentView: (view: AppContextType['currentView']) => void;
    setShiftModalOpen: (isOpen: boolean) => void;
    setIsOnline: (isOnline: boolean) => void;
    toggleTheme: () => void;
    addToast: (message: string, type?: ToastType) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Authentication State
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
    const [currentOutlet, setCurrentOutlet] = useState<Outlet | null>(null);
    const [allOutlets, setAllOutlets] = useState<Outlet[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    // Data State
    const [activeOrders, setActiveOrders] = useState<Order[]>([]);
    const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
    const [floorPlan, setFloorPlan] = useState<FloorPlanObject[]>([]);
    const [currentShift, setCurrentShift] = useState<Shift | null>(null);

    // UI State
    const [currentView, setCurrentView] = useState<AppContextType['currentView']>('pos');
    const [isShiftModalOpen, setShiftModalOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'dark');
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = (message: string, type: ToastType = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    };

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
    };

    const syncData = useCallback(async () => {
        if (!currentOutlet || !currentTenant) return;
        // console.log("Syncing data for outlet:", currentOutlet.id);

        // For staff, sync everything
        if (currentUser) {
            // Refetch tenant and outlet to get latest settings
            const [refreshedTenant, refreshedOutlet, orders, menu, plan, shift, inv, movements] = await Promise.all([
                mockApi.getTenantById(currentTenant.id),
                mockApi.getOutletById(currentOutlet.id),
                mockApi.getActiveOrders(),
                mockApi.getMenu(),
                mockApi.getFloorPlan(),
                mockApi.getCurrentShift(),
                mockApi.getInventory(),
                mockApi.getStockMovements()
            ]);

            if (refreshedTenant) setCurrentTenant(refreshedTenant);
            if (refreshedOutlet) setCurrentOutlet(refreshedOutlet);

            setActiveOrders(orders);
            setMenuItems(menu);
            setFloorPlan(plan);
            setCurrentShift(shift);
            setInventory(inv);
            setStockMovements(movements);
        } else { // For QR session, only sync menu and tables
             const [menu, plan] = await Promise.all([
                mockApi.getMenu(),
                mockApi.getFloorPlan(),
            ]);
            setMenuItems(menu);
            setFloorPlan(plan);
        }
    }, [currentOutlet, currentTenant, currentUser]);

    const api = useMemo(() => {
       mockApi.setIsOnline(isOnline, addToast);
       return mockApi;
    }, [isOnline, addToast]);

    useEffect(() => {
        api.onStateChange(syncData);
    }, [api, syncData]);


    useEffect(() => {
        api.getTenants().then(setTenants);
    }, [api]);

    useEffect(() => {
        if (currentTenant) {
            api.getOutlets(currentTenant.id).then(outlets => {
                setAllOutlets(outlets);
                // Also refresh current outlet object in case it was updated (e.g. floor plan)
                if (currentOutlet) {
                    const updatedOutlet = outlets.find(o => o.id === currentOutlet.id);
                    if (updatedOutlet) {
                        setCurrentOutlet(updatedOutlet);
                    }
                }
            });
        } else {
            setAllOutlets([]);
        }
    }, [currentTenant, api, currentOutlet?.id]);

    
    useEffect(() => {
        if (currentOutlet && isOnline) {
            syncData();
        }
    }, [currentOutlet, isOnline, syncData]);

    const getOutletsForTenant = (tenantId: string) => api.getOutlets(tenantId);
    const getUsersForOutlet = (outletId: string) => api.getUsers(outletId);
    
    const initializeQRSession = async (outletId: string) => {
        console.log("Initializing QR Session for outlet:", outletId);
        // Reset any existing session
        logout();

        const outlet = await api.getOutletById(outletId);
        if (!outlet) throw new Error("Outlet not found for QR session");
        
        const tenant = await api.getTenantById(outlet.tenantId);
        if (!tenant) throw new Error("Tenant not found for QR session");

        // Set a public, non-authenticated context
        api.setPublicContext(tenant.id, outlet.id);
        setCurrentTenant(tenant);
        setCurrentOutlet(outlet);
        // syncData will be called by the useEffect watching currentOutlet
    };

    const login = async (userId: string, pin: string) => {
        const { user, tenant, outlet } = await api.login(userId, pin);
        setCurrentUser(user);
        setCurrentTenant(tenant);
        setCurrentOutlet(outlet);

        // After successful login, the api object has auth context.
        // If we are online, process any actions that were queued from a previous session.
        if (isOnline) {
            api.syncPendingOrders();
            api.processQueue();
        }
        
        const defaultViews: Record<UserRole, AppContextType['currentView']> = {
            BrandAdmin: 'reports',
            OutletManager: 'reports',
            Accountant: 'reports',
            Cashier: 'pos',
            KitchenStaff: 'kds',
        };
        setCurrentView(defaultViews[user.role] || 'pos');
    };

    const logout = () => {
        api.logout();
        setCurrentUser(null);
        setCurrentTenant(null);
        setCurrentOutlet(null);
        setActiveOrders([]);
        setCompletedOrders([]);
        setMenuItems([]);
        setFloorPlan([]);
        setInventory([]);
        setStockMovements([]);
    };

    const menuCategories = useMemo(() => {
        const categories = new Set(menuItems.map(item => item.category));
        return Array.from(categories);
    }, [menuItems]);

    const value: AppContextType = {
        tenants,
        currentTenant,
        currentOutlet,
        allOutlets,
        currentUser,
        activeOrders,
        completedOrders,
        menuItems,
        menuCategories,
        inventory,
        stockMovements,
        floorPlan,
        currentShift,
        isOnline,
        theme,
        toasts,
        isShiftModalOpen,
        currentView,
        api,
        getOutletsForTenant,
        getUsersForOutlet,
        login,
        logout,
        syncData,
        initializeQRSession,
        setCurrentView,
        setShiftModalOpen,
        setIsOnline,
        toggleTheme,
        addToast,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};