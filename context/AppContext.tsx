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
    isSuperAdminAuthenticated: boolean; // SuperAdmin authentication state
    activeOrders: Order[];
    completedOrders: Order[];
    parkedOrders: Order[]; // Held/parked orders
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
    currentView: 'pos' | 'kds' | 'reports' | 'inventory' | 'settings' | 'admin';

    // API & Actions
    api: MockApi;
    getOutletsForTenant: (tenantId: string) => Promise<Outlet[]>;
    getUsersForOutlet: (outletId: string) => Promise<User[]>;
    login: (userId: string, pin: string) => Promise<void>;
    loginSuperAdmin: (username: string, password: string) => Promise<void>;
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
    const [isSuperAdminAuthenticated, setIsSuperAdminAuthenticated] = useState<boolean>(
        () => localStorage.getItem('superadmin_auth') === 'true'
    );

    // Data State
    const [activeOrders, setActiveOrders] = useState<Order[]>([]);
    const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
    const [parkedOrders, setParkedOrders] = useState<Order[]>([]); // Held/parked orders
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

    const addToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
    }, []);

    const syncData = useCallback(async () => {
        if (!currentOutlet || !currentTenant) return;
        // console.log("Syncing data for outlet:", currentOutlet.id);

        // For staff, sync everything
        if (currentUser) {
            // Refetch tenant and outlet to get latest settings
            const [refreshedTenant, refreshedOutlet, orders, parked, menu, plan, shift, inv, movements] = await Promise.all([
                mockApi.getTenantById(currentTenant.id),
                mockApi.getOutletById(currentOutlet.id),
                mockApi.getActiveOrders(),
                mockApi.getParkedOrders(),
                mockApi.getMenu(),
                mockApi.getFloorPlan(),
                mockApi.getCurrentShift(),
                mockApi.getInventory(),
                mockApi.getStockMovements()
            ]);

            if (refreshedTenant) setCurrentTenant(refreshedTenant);
            if (refreshedOutlet) setCurrentOutlet(refreshedOutlet);

            setActiveOrders(orders);
            setParkedOrders(parked);
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
    }, [currentOutlet?.id, currentTenant?.id, currentUser?.id]); // Only depend on IDs to avoid infinite loops

    const api = useMemo(() => {
       mockApi.setIsOnline(isOnline, addToast);
       return mockApi;
    }, [isOnline]);

    useEffect(() => {
        api.onStateChange(syncData);
    }, [api, syncData]);


    useEffect(() => {
        api.getTenants().then(setTenants);
    }, [api]);

    // Listen for tenant updates across tabs/windows
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'db_tenants' && currentTenant) {
                // Tenant data changed, refresh current tenant
                api.getTenantById(currentTenant.id).then(refreshedTenant => {
                    if (refreshedTenant) {
                        setCurrentTenant(refreshedTenant);
                        console.log('Tenant updated from external change:', refreshedTenant);
                    }
                });
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [api, currentTenant?.id]);

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
    }, [currentTenant?.id, api, currentOutlet?.id]); // Use IDs to avoid unnecessary re-runs

    
    // Only sync when outlet/online status changes, not on every render
    useEffect(() => {
        if (currentOutlet && isOnline) {
            syncData();
        }
    }, [currentOutlet?.id, isOnline, syncData]); // Use ID to avoid infinite loops

    const getOutletsForTenant = useCallback((tenantId: string) => api.getOutlets(tenantId), [api]);
    const getUsersForOutlet = useCallback((outletId: string) => api.getUsers(outletId), [api]);
    
    const initializeQRSession = useCallback(async (outletId: string) => {
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
    }, [api]);

    const login = useCallback(async (userId: string, pin: string) => {
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
            SuperAdmin: 'admin',
            BrandAdmin: 'reports',
            OutletManager: 'reports',
            Accountant: 'reports',
            Cashier: 'pos',
            Waiter: 'pos',
            KitchenStaff: 'kds',
        };
        setCurrentView(defaultViews[user.role] || 'pos');
    }, [api, isOnline]);

    const loginSuperAdmin = useCallback(async (username: string, password: string) => {
        const result = await api.loginSuperAdmin(username, password);
        if (result) {
            setIsSuperAdminAuthenticated(true);
            localStorage.setItem('superadmin_auth', 'true');
            setCurrentView('admin');
            addToast('Welcome, Super Admin!', 'success');
        }
    }, [api]);

    const logout = useCallback(() => {
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
        setCurrentShift(null);
        setCurrentView('pos');
        
        // Also clear SuperAdmin authentication
        setIsSuperAdminAuthenticated(false);
        localStorage.removeItem('superadmin_auth');
    }, [api]);

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
        isSuperAdminAuthenticated,
        activeOrders,
        completedOrders,
        parkedOrders,
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
        loginSuperAdmin,
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