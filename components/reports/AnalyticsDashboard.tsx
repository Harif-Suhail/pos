import React, { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { Order } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface AnalyticsDashboardProps {
  orders: Order[];
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ orders }) => {
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;

  const filteredOrders = useMemo(() => {
    if (!startDate || !endDate) return orders;
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });
  }, [orders, startDate, endDate]);

  const salesOverTime = useMemo(() => {
    const sales: { [key: string]: number } = {};
    filteredOrders.forEach(order => {
      const date = new Date(order.createdAt).toLocaleDateString();
      sales[date] = (sales[date] || 0) + order.totalAmount;
    });
    return Object.entries(sales).sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());
  }, [filteredOrders]);

  const salesByStaff = useMemo(() => {
    const sales: { [key: string]: number } = {};
    filteredOrders.forEach(order => {
      const staffName = order.createdBy?.name || 'Unassigned';
      sales[staffName] = (sales[staffName] || 0) + order.totalAmount;
    });
    return Object.entries(sales).sort(([, a], [, b]) => b - a);
  }, [filteredOrders]);

  const salesByCategory = useMemo(() => {
    const sales: { [key: string]: number } = {};
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        sales[item.category] = (sales[item.category] || 0) + item.price * item.quantity;
      });
    });
    return Object.entries(sales).sort(([, a], [, b]) => b - a);
  }, [filteredOrders]);

  const peakHours = useMemo(() => {
    const hours: { [key: number]: number } = {};
    for (let i = 0; i < 24; i++) hours[i] = 0;
    filteredOrders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      hours[hour]++;
    });
    return Object.entries(hours);
  }, [filteredOrders]);

  const totalRevenue = useMemo(() => filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0), [filteredOrders]);
  const totalOrders = filteredOrders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        font: {
          size: 16,
        }
      },
    },
  };

  return (
    <div className="p-6 bg-[var(--background-primary)] text-[var(--text-primary)]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <div className="flex items-center gap-4">
            <p className="text-sm font-medium">Filter by Date:</p>
            <DatePicker
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={(update) => setDateRange(update)}
                isClearable={true}
                className="bg-[var(--background-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-md p-2 text-sm"
                wrapperClassName="date-picker-wrapper"
            />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[var(--background-secondary)] p-5 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-[var(--text-secondary)]">Total Revenue</h3>
          <p className="text-3xl font-bold text-[var(--accent-primary)]">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-[var(--background-secondary)] p-5 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-[var(--text-secondary)]">Total Orders</h3>
          <p className="text-3xl font-bold text-[var(--accent-primary)]">{totalOrders}</p>
        </div>
        <div className="bg-[var(--background-secondary)] p-5 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-[var(--text-secondary)]">Average Order Value</h3>
          <p className="text-3xl font-bold text-[var(--accent-primary)]">{formatCurrency(averageOrderValue)}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[var(--background-secondary)] p-5 rounded-lg shadow h-96">
          <Line 
            options={{...chartOptions, plugins: {...chartOptions.plugins, title: {...chartOptions.plugins.title, text: 'Sales Over Time'}}}}
            data={{
              labels: salesOverTime.map(([date]) => date),
              datasets: [{
                label: 'Sales',
                data: salesOverTime.map(([, amount]) => amount),
                borderColor: 'rgb(99, 102, 241)',
                backgroundColor: 'rgba(99, 102, 241, 0.5)',
              }]
            }} 
          />
        </div>
        <div className="bg-[var(--background-secondary)] p-5 rounded-lg shadow h-96">
          <Bar 
            options={{...chartOptions, plugins: {...chartOptions.plugins, title: {...chartOptions.plugins.title, text: 'Peak Business Hours'}}}}
            data={{
              labels: peakHours.map(([hour]) => `${hour}:00`),
              datasets: [{
                label: 'Number of Orders',
                data: peakHours.map(([, count]) => count),
                backgroundColor: 'rgba(234, 179, 8, 0.6)',
              }]
            }} 
          />
        </div>
        <div className="bg-[var(--background-secondary)] p-5 rounded-lg shadow h-96">
          <Bar 
            options={{...chartOptions, indexAxis: 'y' as const, plugins: {...chartOptions.plugins, title: {...chartOptions.plugins.title, text: 'Top Performing Staff'}}}}
            data={{
              labels: salesByStaff.map(([name]) => name),
              datasets: [{
                label: 'Total Sales',
                data: salesByStaff.map(([, amount]) => amount),
                backgroundColor: 'rgba(52, 211, 153, 0.6)',
              }]
            }} 
          />
        </div>
        <div className="bg-[var(--background-secondary)] p-5 rounded-lg shadow h-96 flex justify-center items-center">
          <Pie 
            options={{...chartOptions, plugins: {...chartOptions.plugins, title: {...chartOptions.plugins.title, text: 'Sales by Category'}}}}
            data={{
              labels: salesByCategory.map(([name]) => name),
              datasets: [{
                label: 'Sales',
                data: salesByCategory.map(([, amount]) => amount),
                backgroundColor: [
                  'rgba(255, 99, 132, 0.6)',
                  'rgba(54, 162, 235, 0.6)',
                  'rgba(255, 206, 86, 0.6)',
                  'rgba(75, 192, 192, 0.6)',
                  'rgba(153, 102, 255, 0.6)',
                  'rgba(255, 159, 64, 0.6)',
                ],
              }]
            }} 
          />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
