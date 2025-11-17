import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { User, UserRole, Outlet } from '../../types';
import Modal from '../common/Modal';
import Spinner from '../common/Spinner';

const UserSettings: React.FC = () => {
    const { currentUser, allOutlets, api, addToast } = useAppContext();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        const data = await api.getAllUsersForTenant();
        setUsers(data);
        setIsLoading(false);
    }, [api]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setEditingUser({ name: '', pin: '', role: 'Cashier', assignedOutletIds: currentUser?.role === 'BrandAdmin' ? [] : [currentUser!.assignedOutletIds[0]] });
        setIsModalOpen(true);
    };

    const handleSave = async (userToSave: Partial<User>) => {
        setIsLoading(true);
        try {
            await api.saveUser(userToSave as User);
            addToast(`User "${userToSave.name}" saved successfully!`, 'success');
            setIsModalOpen(false);
            setEditingUser(null);
            await fetchUsers(); // Refetch to show changes
        } catch (error: any) {
            addToast(`Error saving user: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDelete = async (userId: string) => {
        if (window.confirm("Are you sure you want to delete this user?")) {
            setIsLoading(true);
            try {
                await api.deleteUser(userId);
                addToast('User deleted successfully.', 'success');
                await fetchUsers();
            } catch (error: any) {
                addToast(`Error deleting user: ${error.message}`, 'error');
            } finally {
                setIsLoading(false);
            }
        }
    };

    if (isLoading && !isModalOpen) {
        return <div className="flex justify-center p-8"><Spinner /></div>;
    }
    
    return (
        <div className="bg-[var(--background-secondary)] p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">User Management</h2>
                <button onClick={handleAddNew} className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--accent-primary-text)] font-bold py-2 px-4 rounded-lg">
                    Add New User
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--border-color)]">
                    <thead className="bg-[var(--background-secondary)]">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Outlets</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                        {users.map(user => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-[var(--text-primary)]">{user.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-[var(--text-tertiary)]">{user.role}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-[var(--text-tertiary)]">
                                    {user.assignedOutletIds.map(id => allOutlets.find(o => o.id === id)?.name).join(', ')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                    <button onClick={() => handleEdit(user)} className="text-[var(--accent-primary)] hover:opacity-80">Edit</button>
                                    <button onClick={() => handleDelete(user.id)} className="text-[var(--negative)] hover:opacity-80">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && editingUser && (
                <UserEditModal
                    user={editingUser}
                    allOutlets={allOutlets}
                    currentUser={currentUser}
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

interface UserEditModalProps {
    user: Partial<User>;
    allOutlets: Outlet[];
    currentUser: User | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (user: Partial<User>) => void;
}

const UserEditModal: React.FC<UserEditModalProps> = ({ user, allOutlets, currentUser, isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState(user);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    const validate = useCallback(() => {
        const newErrors: Record<string, string> = {};
        if (!formData.name?.trim()) {
            newErrors.name = 'Name is required.';
        }
        if (!formData.pin || !/^\d{4}$/.test(formData.pin)) {
            newErrors.pin = 'PIN must be exactly 4 digits.';
        }
        if (!formData.assignedOutletIds || formData.assignedOutletIds.length === 0) {
            newErrors.outlets = 'User must be assigned to at least one outlet.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData]);

    useEffect(() => {
        validate();
    }, [formData, validate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleOutletChange = (outletId: string) => {
        const currentAssigned = formData.assignedOutletIds || [];
        const newAssigned = currentAssigned.includes(outletId)
            ? currentAssigned.filter(id => id !== outletId)
            : [...currentAssigned, outletId];
        setFormData({ ...formData, assignedOutletIds: newAssigned });
    };

    const handleSaveClick = async () => {
        if (validate()) {
            setIsSaving(true);
            await onSave(formData);
            setIsSaving(false);
        }
    };
    
    const canChangeRole = currentUser?.role === 'BrandAdmin';
    const hasErrors = Object.keys(errors).length > 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={formData.id ? 'Edit User' : 'Add New User'}>
            <div className="space-y-4">
                <div>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Full Name" className="w-full bg-[var(--background-tertiary)] rounded p-2"/>
                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div>
                    <input type="text" name="pin" value={formData.pin} onChange={handleChange} placeholder="4-Digit PIN" maxLength={4} className="w-full bg-[var(--background-tertiary)] rounded p-2"/>
                    {errors.pin && <p className="text-xs text-red-500 mt-1">{errors.pin}</p>}
                </div>
                <div>
                    <select name="role" value={formData.role} onChange={handleChange} disabled={!canChangeRole} className="w-full bg-[var(--background-tertiary)] rounded p-2 disabled:opacity-50">
                        <option value="Cashier">Cashier</option>
                        <option value="KitchenStaff">Kitchen Staff</option>
                        <option value="OutletManager">Outlet Manager</option>
                        {canChangeRole && <option value="BrandAdmin">Brand Admin</option>}
                    </select>
                </div>
                <div>
                    <h4 className="text-sm font-bold mb-2 text-[var(--text-tertiary)]">Assigned Outlets</h4>
                    <div className="space-y-2">
                        {allOutlets.map(outlet => (
                            <label key={outlet.id} className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={formData.assignedOutletIds?.includes(outlet.id)}
                                    onChange={() => handleOutletChange(outlet.id)}
                                    className="rounded bg-[var(--background-interactive)] border-[var(--border-color)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                                    disabled={!canChangeRole && formData.assignedOutletIds?.length === 1 && formData.assignedOutletIds.includes(outlet.id)}
                                />
                                <span>{outlet.name}</span>
                            </label>
                        ))}
                    </div>
                    {errors.outlets && <p className="text-xs text-red-500 mt-1">{errors.outlets}</p>}
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                    <button onClick={onClose} className="bg-[var(--background-interactive)] hover:bg-[var(--border-color)] text-[var(--text-primary)] font-bold py-2 px-4 rounded-lg">Cancel</button>
                    <button onClick={handleSaveClick} disabled={hasErrors || isSaving} className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--accent-primary-text)] font-bold py-2 px-4 rounded-lg disabled:bg-[var(--disabled)] flex items-center">
                        {isSaving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default UserSettings;
