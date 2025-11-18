import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { Customer, CustomerAddress, Order } from '../../types';
import { formatCurrency, formatTimestamp } from '../../utils/helpers';
import Spinner from '../common/Spinner';
import Modal from '../common/Modal';

const CustomerManagement: React.FC = () => {
    const { api } = useAppContext();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showOrderHistory, setShowOrderHistory] = useState(false);
    const [orderHistory, setOrderHistory] = useState<Order[]>([]);
    const [formData, setFormData] = useState<Partial<Customer>>({});

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        setIsLoading(true);
        const data = await api.getCustomers();
        setCustomers(data);
        setIsLoading(false);
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.trim()) {
            setIsLoading(true);
            const results = await api.searchCustomers(query);
            setCustomers(results);
            setIsLoading(false);
        } else {
            loadCustomers();
        }
    };

    const handleViewCustomer = async (customer: Customer) => {
        setSelectedCustomer(customer);
        setShowOrderHistory(true);
        const history = await api.getCustomerOrderHistory(customer.id);
        setOrderHistory(history);
    };

    const handleEditCustomer = (customer: Customer) => {
        setSelectedCustomer(customer);
        setFormData(customer);
        setIsEditing(true);
    };

    const handleNewCustomer = () => {
        setSelectedCustomer(null);
        setFormData({
            name: '',
            phone: '',
            email: '',
            addresses: [],
            tags: [],
            notes: '',
            totalOrders: 0,
            totalSpent: 0
        });
        setIsEditing(true);
    };

    const handleSaveCustomer = async () => {
        if (!formData.name || !formData.phone) {
            alert('Name and phone are required');
            return;
        }

        await api.saveCustomer(formData as Omit<Customer, 'tenantId' | 'createdAt' | 'updatedAt'>);
        setIsEditing(false);
        setSelectedCustomer(null);
        loadCustomers();
    };

    const handleDeleteCustomer = async (customerId: string) => {
        if (confirm('Are you sure you want to delete this customer?')) {
            await api.deleteCustomer(customerId);
            loadCustomers();
        }
    };

    const handleAddAddress = () => {
        const addresses = formData.addresses || [];
        setFormData({
            ...formData,
            addresses: [
                ...addresses,
                {
                    id: `addr_${Date.now()}`,
                    label: '',
                    address: '',
                    isDefault: addresses.length === 0
                }
            ]
        });
    };

    const handleUpdateAddress = (index: number, field: keyof CustomerAddress, value: any) => {
        const addresses = [...(formData.addresses || [])];
        addresses[index] = { ...addresses[index], [field]: value };
        setFormData({ ...formData, addresses });
    };

    const handleRemoveAddress = (index: number) => {
        const addresses = [...(formData.addresses || [])];
        addresses.splice(index, 1);
        setFormData({ ...formData, addresses });
    };

    const filteredCustomers = customers;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">Customer Management</h2>
                <button
                    onClick={handleNewCustomer}
                    className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--accent-primary-text)] font-bold py-2 px-4 rounded-lg"
                >
                    + Add Customer
                </button>
            </div>

            {/* Search */}
            <div className="bg-[var(--background-secondary)] p-4 rounded-lg">
                <input
                    type="text"
                    placeholder="Search by name, phone, or email..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg p-3 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                />
            </div>

            {/* Customer List */}
            <div className="bg-[var(--background-secondary)] rounded-lg shadow-lg overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center items-center p-12">
                        <Spinner />
                    </div>
                ) : filteredCustomers.length === 0 ? (
                    <div className="text-center py-12 text-[var(--text-secondary)]">
                        {searchQuery ? 'No customers found' : 'No customers yet. Add your first customer!'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[var(--border-color)]">
                            <thead className="bg-[var(--background-primary)]">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Phone</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Orders</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Total Spent</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Last Order</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Tags</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                                {filteredCustomers.map((customer) => (
                                    <tr key={customer.id} className="hover:bg-[var(--background-primary)] transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-[var(--text-primary)] font-medium">
                                            {customer.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-[var(--text-tertiary)]">
                                            {customer.phone}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-[var(--text-tertiary)]">
                                            {customer.email || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-[var(--text-tertiary)]">
                                            {customer.totalOrders}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-[var(--text-primary)] font-semibold">
                                            {formatCurrency(customer.totalSpent)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-[var(--text-tertiary)] text-sm">
                                            {customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-wrap gap-1">
                                                {customer.tags?.map((tag, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="inline-block bg-[var(--accent-primary)] bg-opacity-20 text-[var(--accent-primary)] text-xs px-2 py-1 rounded"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                                            <button
                                                onClick={() => handleViewCustomer(customer)}
                                                className="text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] font-medium"
                                            >
                                                View
                                            </button>
                                            <button
                                                onClick={() => handleEditCustomer(customer)}
                                                className="text-[var(--accent-secondary)] hover:text-[var(--accent-secondary-hover)] font-medium"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCustomer(customer.id)}
                                                className="text-red-500 hover:text-red-700 font-medium"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit/Add Customer Modal */}
            {isEditing && (
                <Modal isOpen={isEditing} onClose={() => setIsEditing(false)} title={selectedCustomer ? 'Edit Customer' : 'Add Customer'}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Name *</label>
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg p-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Phone *</label>
                                <input
                                    type="tel"
                                    value={formData.phone || ''}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg p-2"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Email</label>
                            <input
                                type="email"
                                value={formData.email || ''}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg p-2"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Addresses</label>
                            {formData.addresses?.map((address, index) => (
                                <div key={address.id} className="mb-3 p-3 border border-[var(--border-color)] rounded-lg">
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        <input
                                            type="text"
                                            placeholder="Label (e.g., Home, Office)"
                                            value={address.label}
                                            onChange={(e) => handleUpdateAddress(index, 'label', e.target.value)}
                                            className="bg-[var(--background-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded p-2 text-sm"
                                        />
                                        <div className="flex items-center gap-2">
                                            <label className="flex items-center text-sm text-[var(--text-tertiary)]">
                                                <input
                                                    type="checkbox"
                                                    checked={address.isDefault}
                                                    onChange={(e) => handleUpdateAddress(index, 'isDefault', e.target.checked)}
                                                    className="mr-1"
                                                />
                                                Default
                                            </label>
                                            <button
                                                onClick={() => handleRemoveAddress(index)}
                                                className="text-red-500 hover:text-red-700 text-sm ml-auto"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                    <textarea
                                        placeholder="Full address"
                                        value={address.address}
                                        onChange={(e) => handleUpdateAddress(index, 'address', e.target.value)}
                                        className="w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded p-2 text-sm"
                                        rows={2}
                                    />
                                </div>
                            ))}
                            <button
                                onClick={handleAddAddress}
                                className="text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] text-sm font-medium"
                            >
                                + Add Address
                            </button>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Tags (comma-separated)</label>
                            <input
                                type="text"
                                value={formData.tags?.join(', ') || ''}
                                onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) })}
                                placeholder="VIP, Regular, Allergies, etc."
                                className="w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg p-2"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Notes</label>
                            <textarea
                                value={formData.notes || ''}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Any special notes about this customer..."
                                className="w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg p-2"
                                rows={3}
                            />
                        </div>

                        <div className="flex gap-2 justify-end pt-4">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="bg-[var(--background-tertiary)] hover:bg-[var(--background-primary)] text-[var(--text-primary)] font-bold py-2 px-4 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveCustomer}
                                className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--accent-primary-text)] font-bold py-2 px-4 rounded-lg"
                            >
                                Save Customer
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Order History Modal */}
            {showOrderHistory && selectedCustomer && (
                <Modal isOpen={showOrderHistory} onClose={() => setShowOrderHistory(false)} title={`Order History - ${selectedCustomer.name}`}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="bg-[var(--background-tertiary)] p-3 rounded-lg">
                                <p className="text-xs text-[var(--text-secondary)]">Total Orders</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">{selectedCustomer.totalOrders}</p>
                            </div>
                            <div className="bg-[var(--background-tertiary)] p-3 rounded-lg">
                                <p className="text-xs text-[var(--text-secondary)]">Total Spent</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(selectedCustomer.totalSpent)}</p>
                            </div>
                            <div className="bg-[var(--background-tertiary)] p-3 rounded-lg">
                                <p className="text-xs text-[var(--text-secondary)]">Avg Order Value</p>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">
                                    {formatCurrency(selectedCustomer.totalOrders > 0 ? selectedCustomer.totalSpent / selectedCustomer.totalOrders : 0)}
                                </p>
                            </div>
                        </div>

                        {orderHistory.length === 0 ? (
                            <p className="text-center text-[var(--text-secondary)] py-8">No order history available</p>
                        ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {orderHistory.map((order) => (
                                    <div key={order.id} className="bg-[var(--background-tertiary)] p-4 rounded-lg">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="font-semibold text-[var(--text-primary)]">Order #{order.orderNumber}</p>
                                                <p className="text-xs text-[var(--text-secondary)]">{formatTimestamp(order.createdAt)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-[var(--text-primary)]">{formatCurrency(order.totalAmount)}</p>
                                                <span className="text-xs px-2 py-1 rounded bg-green-500 bg-opacity-20 text-green-500">
                                                    {order.type}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-sm text-[var(--text-tertiary)]">
                                            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default CustomerManagement;
