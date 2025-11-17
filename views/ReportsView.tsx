import React, { useState, useEffect } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { Outlet, Order } from '../types';
import Spinner from '../components/common/Spinner';
import AnalyticsDashboard from '../components/reports/AnalyticsDashboard';
import SalesReports from '../components/reports/SalesReports';
import PaymentReports from '../components/reports/PaymentReports';
import StaffPerformanceReports from '../components/reports/StaffPerformanceReports';
import InventoryReports from '../components/reports/InventoryReports';

type ReportTab = 'dashboard' | 'sales' | 'payments' | 'staff' | 'inventory';

export default function ReportsView() {
    const { currentUser, currentOutlet, allOutlets, api } = useAppContext();
    const [activeTab, setActiveTab] = useState<ReportTab>('dashboard');
    const [isLoading, setIsLoading] = useState(true);
    const [reportData, setReportData] = useState<Order[]>([]);
    
    const [selectedOutlet, setSelectedOutlet] = useState<Outlet | 'all' | null>(
        currentUser?.role === 'BrandAdmin' ? 'all' : currentOutlet
    );

    useEffect(() => {
        const fetchReportData = async () => {
            if (!selectedOutlet) return;
            setIsLoading(true);
            const outletId = selectedOutlet === 'all' ? 'all' : selectedOutlet.id;
            const data = await api.getCompletedOrders(outletId);
            setReportData(data);
            setIsLoading(false);
        };
        fetchReportData();
    }, [selectedOutlet, api]);

    const handleOutletChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { value } = e.target;
        if (value === 'all') {
            setSelectedOutlet('all');
        } else {
            setSelectedOutlet(allOutlets.find(o => o.id === value) || null);
        }
    };
    
    const renderContent = () => {
        if (isLoading) {
            return <div className="flex-grow flex items-center justify-center"><Spinner /></div>;
        }

        const outletId = selectedOutlet === 'all' ? 'all' : selectedOutlet!.id;

        switch (activeTab) {
            case 'dashboard':
                return <AnalyticsDashboard orders={reportData} />;
            case 'sales':
                return <SalesReports reportData={reportData} />;
            case 'payments':
                return <PaymentReports reportData={reportData} />;
            case 'staff':
                return <StaffPerformanceReports reportData={reportData} />;
            case 'inventory':
                return <InventoryReports selectedOutletId={outletId} />;
            default:
                return null;
        }
    };

    const tabs: { id: ReportTab; label: string; }[] = [
        { id: 'dashboard', label: 'Analytics Dashboard' },
        { id: 'sales', label: 'Sales Details' },
        { id: 'payments', label: 'Payments' },
        { id: 'staff', label: 'Staff Performance' },
        { id: 'inventory', label: 'Inventory' },
    ];
    
    return (
        <main className="flex-grow p-6 flex flex-col bg-[var(--background-primary)]">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">Reports & Analytics</h1>
                {currentUser?.role === 'BrandAdmin' && (
                    <select
                        value={selectedOutlet === 'all' ? 'all' : selectedOutlet?.id}
                        onChange={handleOutletChange}
                        className="bg-[var(--background-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm rounded-lg focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] block p-2.5"
                    >
                        <option value="all">All Outlets (Brand View)</option>
                        {allOutlets.map(outlet => (
                            <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
                        ))}
                    </select>
                )}
            </div>
            
            <div className="flex-shrink-0 mb-6 border-b border-[var(--border-color)]">
                <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm transition-colors
                                ${activeTab === tab.id
                                    ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)]'
                                }
                            `}
                            aria-current={activeTab === tab.id ? 'page' : undefined}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="flex-grow overflow-y-auto">
                {renderContent()}
            </div>
        </main>
    );
}
