import React, { useState, useEffect } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { Outlet, Order, Shift } from '../types';
import Spinner from '../components/common/Spinner';
import AnalyticsDashboard from '../components/reports/AnalyticsDashboard';
import SalesReports from '../components/reports/SalesReports';
import PaymentReports from '../components/reports/PaymentReports';
import StaffPerformanceReports from '../components/reports/StaffPerformanceReports';
import InventoryReports from '../components/reports/InventoryReports';
import ShiftReport from '../components/reports/ShiftReport';
import DailySummaryReport from '../components/reports/DailySummaryReport';

type ReportTab = 'daily-summary' | 'dashboard' | 'sales' | 'payments' | 'staff' | 'inventory' | 'shifts';

export default function ReportsView() {
    const { currentUser, currentOutlet, allOutlets, api } = useAppContext();
    const [activeTab, setActiveTab] = useState<ReportTab>('daily-summary');
    const [isLoading, setIsLoading] = useState(true);
    const [reportData, setReportData] = useState<Order[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    
    const [selectedOutlet, setSelectedOutlet] = useState<Outlet | 'all' | null>(
        currentUser?.role === 'BrandAdmin' ? 'all' : currentOutlet
    );

    useEffect(() => {
        const fetchReportData = async () => {
            if (!selectedOutlet) return;
            setIsLoading(true);
            const outletId = selectedOutlet === 'all' ? 'all' : selectedOutlet.id;
            const [orders, shiftData] = await Promise.all([
                api.getCompletedOrders(outletId),
                api.getShifts(outletId)
            ]);
            setReportData(orders);
            setShifts(shiftData);
            // Set the most recent shift as default
            if (shiftData.length > 0) {
                setSelectedShift(shiftData[shiftData.length - 1]);
            }
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
            case 'daily-summary':
                // Filter data for selected date
                const startOfDay = new Date(selectedDate);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(selectedDate);
                endOfDay.setHours(23, 59, 59, 999);
                
                const dailyData = reportData.filter(order => {
                    const orderDate = new Date(order.createdAt);
                    return orderDate >= startOfDay && orderDate <= endOfDay;
                });
                
                return (
                    <div className="space-y-4">
                        <div className="bg-[var(--background-secondary)] p-4 rounded-lg">
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Select Date:
                            </label>
                            <input
                                type="date"
                                value={selectedDate.toISOString().split('T')[0]}
                                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                                max={new Date().toISOString().split('T')[0]}
                                className="bg-[var(--background-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm rounded-lg focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] block w-full md:w-auto p-2.5"
                            />
                        </div>
                        <DailySummaryReport reportData={dailyData} selectedDate={selectedDate} />
                    </div>
                );
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
            case 'shifts':
                return (
                    <div className="space-y-6">
                        {shifts.length > 0 ? (
                            <>
                                <div className="bg-[var(--background-secondary)] p-4 rounded-lg">
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                        Select Shift:
                                    </label>
                                    <select
                                        value={selectedShift?.id || ''}
                                        onChange={(e) => {
                                            const shift = shifts.find(s => s.id === e.target.value);
                                            setSelectedShift(shift || null);
                                        }}
                                        className="bg-[var(--background-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm rounded-lg focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] block w-full p-2.5"
                                    >
                                        {shifts.map(shift => (
                                            <option key={shift.id} value={shift.id}>
                                                {new Date(shift.startTime).toLocaleDateString()} - {new Date(shift.startTime).toLocaleTimeString()}
                                                {shift.endTime ? ` to ${new Date(shift.endTime).toLocaleTimeString()}` : ' (In Progress)'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {selectedShift && <ShiftReport shift={selectedShift} orders={reportData} />}
                            </>
                        ) : (
                            <p className="text-[var(--text-secondary)] text-center py-8">No shift data available.</p>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    const tabs: { id: ReportTab; label: string; icon?: string; }[] = [
        { id: 'daily-summary', label: '📋 Daily Summary', icon: '📋' },
        { id: 'dashboard', label: 'Analytics Dashboard' },
        { id: 'sales', label: 'Sales Details' },
        { id: 'payments', label: 'Payments' },
        { id: 'staff', label: 'Staff Performance' },
        { id: 'inventory', label: 'Inventory' },
        { id: 'shifts', label: 'Shift Reports' },
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
