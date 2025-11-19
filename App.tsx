import React, { useEffect, useState } from 'react';
import { useAppContext } from './hooks/useAppContext';

// View Components
import LoginView from './views/LoginView';
import SuperAdminLoginView from './views/SuperAdminLoginView';
import POSView from './views/POSView';
import KDSView from './views/KDSView';
import ReportsView from './views/ReportsView';
import Header from './components/Header';
import InventoryView from './views/InventoryView';
import SettingsView from './views/SettingsView';
import QRView from './views/QRView';
import AdminPortalView from './views/AdminPortalView';
import Spinner from './components/common/Spinner';
import ToastContainer from './components/common/Toast';


export default function App() {
    const { currentUser, isSuperAdminAuthenticated, currentView, initializeQRSession, toasts } = useAppContext();
    const [qrTableId, setQrTableId] = useState<string | null>(null);
    const [isQrSessionLoading, setIsQrSessionLoading] = useState(true);
    const [isAdminRoute, setIsAdminRoute] = useState(false);

    useEffect(() => {
        // Check if we're on the /admin route
        const path = window.location.pathname;
        setIsAdminRoute(path === '/admin' || path.startsWith('/admin/'));
        
        const urlParams = new URLSearchParams(window.location.search);
        const table = urlParams.get('table');
        const outlet = urlParams.get('outlet');

        if (table && outlet) {
            setQrTableId(table);
            initializeQRSession(outlet).finally(() => {
                setIsQrSessionLoading(false);
            });
        } else {
            setIsQrSessionLoading(false);
        }
    }, [initializeQRSession]);

    if (isQrSessionLoading) {
        return (
            <div className="min-h-screen bg-[var(--background-primary)] flex items-center justify-center">
                <Spinner />
            </div>
        );
    }
    
    if (qrTableId) {
        return <QRView tableId={qrTableId} />;
    }

    // Handle /admin route separately
    if (isAdminRoute) {
        if (!isSuperAdminAuthenticated) {
            return (
                <>
                    <SuperAdminLoginView />
                    <ToastContainer toasts={toasts} />
                </>
            );
        }
        
        // SuperAdmin is authenticated, show admin portal
        return (
            <div className="min-h-screen bg-[var(--background-primary)] flex flex-col max-h-screen">
                <Header />
                <AdminPortalView />
                <ToastContainer toasts={toasts} />
            </div>
        );
    }

    // Regular restaurant login flow
    if (!currentUser) {
        return (
            <>
                <LoginView />
                <ToastContainer toasts={toasts} />
            </>
        );
    }

    const renderView = () => {
        switch (currentView) {
            case 'pos':
                return <POSView />;
            case 'kds':
                return <KDSView />;
            case 'reports':
                return <ReportsView />;
            case 'inventory':
                return <InventoryView />;
            case 'settings':
                 return <SettingsView />;
            case 'admin':
                return <AdminPortalView />;
            default:
                // Default view is now handled in AppContext based on role
                return <POSView />;
        }
    }

    return (
        <div className="min-h-screen bg-[var(--background-primary)] flex flex-col max-h-screen">
            <Header />
            {renderView()}
            <ToastContainer toasts={toasts} />
        </div>
    );
}
