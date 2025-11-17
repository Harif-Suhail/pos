import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { MenuItem, KitchenStation, Variant, ModifierGroup, ModifierOption, RecipeComponent } from '../../types';
import Modal from '../common/Modal';
import Spinner from '../common/Spinner';
import InputDialog from '../common/InputDialog';
import { formatCurrency } from '../../utils/helpers';

const KITCHEN_STATIONS: KitchenStation[] = ['Main Kitchen', 'Bar', 'Desserts'];

const CSV_FORMAT_INFO = `Required columns: name, category, basePrice, station.
Optional columns: description, image, stock.
Example: "Margherita Pizza","Pizzas",12.50,"Main Kitchen","Classic pizza","img_url.png",50`;

// CSV Parser utility - handles quoted fields with commas
const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"' && inQuotes && nextChar === '"') {
            current += '"';
            i++;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
};

interface CSVImportRow {
    lineNumber: number;
    data: any;
    item?: Omit<MenuItem, 'id' | 'tenantId'>;
    errors: string[];
    warnings: string[];
}

const MenuSettings: React.FC = () => {
    const { menuItems, menuCategories, api, syncData, inventory, addToast } = useAppContext();
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // New state for Priority 1 features
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [csvPreviewData, setCsvPreviewData] = useState<CSVImportRow[] | null>(null);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

    const handleEdit = (item: MenuItem) => {
        setEditingItem(JSON.parse(JSON.stringify(item))); // Deep copy to avoid mutation
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setEditingItem({
            name: '',
            description: '',
            category: menuCategories[0] || '',
            basePrice: 0,
            image: '',
            station: 'Main Kitchen',
            variants: [],
            modifierGroups: [],
            recipe: [],
            stock: undefined,
        });
        setIsModalOpen(true);
    };

    const handleSave = async (itemToSave: Partial<MenuItem>) => {
        setIsLoading(true);
        try {
            await api.saveMenuItem(itemToSave as MenuItem);
            await syncData();
            addToast(`Menu item "${itemToSave.name}" saved successfully!`, 'success');
            setIsModalOpen(false);
            setEditingItem(null);
        } catch(e: any) {
            addToast(`Error: ${e.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDelete = async (itemId: string) => {
        if (window.confirm("Are you sure you want to delete this menu item?")) {
            setIsLoading(true);
            try {
                await api.deleteMenuItem(itemId);
                await syncData();
                addToast('Menu item deleted.', 'success');
            } catch (e: any) {
                addToast(`Error: ${e.message}`, 'error');
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            try {
                const lines = text.split('\n').filter(line => line.trim() !== '');
                if (lines.length < 2) {
                    throw new Error('CSV file must contain at least a header row and one data row.');
                }
                
                const headerLine = lines[0];
                const headers = parseCSVLine(headerLine).map(h => h.trim().replace(/^"|"$/g, ''));
                const requiredHeaders = ['name', 'category', 'basePrice', 'station'];
                
                const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
                if (missingHeaders.length > 0) {
                    throw new Error(`CSV must contain headers: ${missingHeaders.join(', ')}`);
                }

                // Parse and validate each row
                const previewRows: CSVImportRow[] = lines.slice(1).map((line, idx) => {
                    const values = parseCSVLine(line);
                    const entry: any = {};
                    const errors: string[] = [];
                    const warnings: string[] = [];
                    
                    headers.forEach((header, i) => {
                        entry[header] = values[i] ? values[i].replace(/^"|"$/g, '') : '';
                    });

                    // Validation
                    if (!entry.name || !entry.name.trim()) {
                        errors.push('Name is required');
                    }
                    if (!entry.category || !entry.category.trim()) {
                        errors.push('Category is required');
                    }
                    if (!entry.basePrice || isNaN(parseFloat(entry.basePrice))) {
                        errors.push('Valid base price is required');
                    } else if (parseFloat(entry.basePrice) < 0) {
                        errors.push('Price cannot be negative');
                    }
                    if (!entry.station || !entry.station.trim()) {
                        errors.push('Station is required');
                    } else if (!KITCHEN_STATIONS.includes(entry.station as KitchenStation)) {
                        errors.push(`Invalid station. Must be one of: ${KITCHEN_STATIONS.join(', ')}`);
                    }
                    
                    if (entry.stock && isNaN(parseInt(entry.stock, 10))) {
                        warnings.push('Invalid stock value, will be ignored');
                    }

                    let item: Omit<MenuItem, 'id' | 'tenantId'> | undefined;
                    if (errors.length === 0) {
                        item = {
                            name: entry.name,
                            category: entry.category,
                            basePrice: parseFloat(entry.basePrice),
                            station: entry.station as KitchenStation,
                            description: entry.description || '',
                            image: entry.image || '',
                            stock: entry.stock ? parseInt(entry.stock, 10) : undefined,
                            variants: [],
                            modifierGroups: [],
                            recipe: []
                        };
                    }

                    return {
                        lineNumber: idx + 2,
                        data: entry,
                        item,
                        errors,
                        warnings
                    };
                });

                setCsvPreviewData(previewRows);
                setIsPreviewModalOpen(true);
            } catch (error: any) {
                addToast(`Import failed: ${error.message}`, 'error');
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleConfirmImport = async () => {
        if (!csvPreviewData) return;
        
        const validItems = csvPreviewData
            .filter(row => row.errors.length === 0 && row.item)
            .map(row => row.item!);

        if (validItems.length === 0) {
            addToast('No valid items to import', 'error');
            return;
        }

        setIsLoading(true);
        try {
            await api.bulkSaveMenuItems(validItems);
            await syncData();
            addToast(`${validItems.length} items imported successfully!`, 'success');
            setIsPreviewModalOpen(false);
            setCsvPreviewData(null);
        } catch (error: any) {
            addToast(`Import failed: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Export to CSV
    const handleExportCSV = () => {
        const headers = ['name', 'category', 'basePrice', 'station', 'description', 'image', 'stock'];
        const csvContent = [
            headers.join(','),
            ...menuItems.map(item => {
                const row = [
                    `"${item.name.replace(/"/g, '""')}"`,
                    `"${item.category.replace(/"/g, '""')}"`,
                    item.basePrice,
                    `"${item.station}"`,
                    `"${(item.description || '').replace(/"/g, '""')}"`,
                    `"${(item.image || '').replace(/"/g, '""')}"`,
                    item.stock !== undefined ? item.stock : ''
                ];
                return row.join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `menu_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addToast('Menu exported successfully!', 'success');
    };

    // Bulk actions
    const handleSelectAll = () => {
        if (selectedItems.size === filteredItems.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(filteredItems.map(item => item.id)));
        }
    };

    const handleSelectItem = (itemId: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
        } else {
            newSelected.add(itemId);
        }
        setSelectedItems(newSelected);
    };

    const handleBulkDelete = async () => {
        if (selectedItems.size === 0) return;
        
        if (window.confirm(`Are you sure you want to delete ${selectedItems.size} items?`)) {
            setIsLoading(true);
            try {
                for (const itemId of Array.from(selectedItems)) {
                    await api.deleteMenuItem(itemId as string);
                }
                await syncData();
                addToast(`${selectedItems.size} items deleted successfully!`, 'success');
                setSelectedItems(new Set());
            } catch (e: any) {
                addToast(`Error: ${e.message}`, 'error');
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleBulkUpdateCategory = async (newCategory: string) => {
        if (selectedItems.size === 0 || !newCategory) return;
        
        setIsLoading(true);
        try {
            for (const itemId of Array.from(selectedItems)) {
                const item = menuItems.find(i => i.id === itemId);
                if (item) {
                    await api.saveMenuItem({ ...item, category: newCategory });
                }
            }
            await syncData();
            addToast(`${selectedItems.size} items updated successfully!`, 'success');
            setSelectedItems(new Set());
        } catch (e: any) {
            addToast(`Error: ${e.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Filter and search
    const filteredItems = menuItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });
    
    return (
        <div className="bg-[var(--background-secondary)] p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Menu Management</h2>
                <div className="flex items-center gap-2 flex-wrap">
                    <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".csv" />
                    <button onClick={handleExportCSV} className="bg-[var(--background-interactive)] hover:bg-[var(--border-color)] text-[var(--text-primary)] font-bold py-2 px-4 rounded-lg text-sm flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export CSV
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="bg-[var(--background-interactive)] hover:bg-[var(--border-color)] text-[var(--text-primary)] font-bold py-2 px-4 rounded-lg text-sm flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Import CSV
                    </button>
                    <button onClick={() => setIsInfoModalOpen(true)} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] w-8 h-8 flex items-center justify-center rounded-full border border-[var(--border-color)]">?</button>
                    <button onClick={handleAddNew} className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--accent-primary-text)] font-bold py-2 px-4 rounded-lg">
                        Add New Item
                    </button>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="mb-4 flex gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                    <input
                        type="text"
                        placeholder="Search menu items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[var(--background-tertiary)] rounded-lg p-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
                    />
                </div>
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-[var(--background-tertiary)] rounded-lg p-2 text-[var(--text-primary)]"
                >
                    <option value="all">All Categories</option>
                    {menuCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
                {selectedItems.size > 0 && (
                    <div className="flex gap-2">
                        <button
                            onClick={handleBulkDelete}
                            className="bg-[var(--negative)] hover:opacity-80 text-white font-bold py-2 px-4 rounded-lg text-sm"
                        >
                            Delete ({selectedItems.size})
                        </button>
                        <select
                            onChange={(e) => {
                                if (e.target.value) {
                                    handleBulkUpdateCategory(e.target.value);
                                    e.target.value = '';
                                }
                            }}
                            className="bg-[var(--background-interactive)] hover:bg-[var(--border-color)] text-[var(--text-primary)] rounded-lg px-3 text-sm"
                        >
                            <option value="">Change Category...</option>
                            {menuCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Results count */}
            <div className="mb-2 text-sm text-[var(--text-secondary)]">
                Showing {filteredItems.length} of {menuItems.length} items
                {selectedItems.size > 0 && ` · ${selectedItems.size} selected`}
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--border-color)]">
                     <thead className="bg-[var(--background-secondary)]">
                        <tr>
                            <th className="px-6 py-3 text-left">
                                <input
                                    type="checkbox"
                                    checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                                    onChange={handleSelectAll}
                                    className="rounded"
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Item</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Price</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                        {filteredItems.map(item => (
                            <tr key={item.id} className={selectedItems.has(item.id) ? 'bg-[var(--accent-primary)]/10' : ''}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        checked={selectedItems.has(item.id)}
                                        onChange={() => handleSelectItem(item.id)}
                                        className="rounded"
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-[var(--text-primary)] font-medium">{item.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-[var(--text-tertiary)]">{item.category}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-[var(--text-tertiary)]">
                                    {item.variants && item.variants.length > 0 ? `${formatCurrency(item.variants[0].price)}+` : formatCurrency(item.basePrice)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                    <button onClick={() => handleEdit(item)} className="text-[var(--accent-primary)] hover:opacity-80">Edit</button>
                                    <button onClick={() => handleDelete(item.id)} className="text-[var(--negative)] hover:opacity-80">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {filteredItems.length === 0 && (
                <div className="text-center py-8 text-[var(--text-secondary)]">
                    {searchQuery || categoryFilter !== 'all' ? 'No items match your filters' : 'No menu items yet'}
                </div>
            )}
            
             {isLoading && <div className="pt-4 flex justify-center"><Spinner /></div>}

            {isModalOpen && editingItem && (
                <MenuItemEditModal
                    item={editingItem}
                    categories={menuCategories}
                    inventory={inventory}
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                />
            )}
            
            {isInfoModalOpen && (
                 <InputDialog
                    isOpen={isInfoModalOpen}
                    onClose={() => setIsInfoModalOpen(false)}
                    title="CSV Import Format"
                    message={CSV_FORMAT_INFO}
                    inputType="readonly"
                    initialValue={CSV_FORMAT_INFO.split('\n')[1]}
                    onConfirm={() => setIsInfoModalOpen(false)}
                />
            )}

            {/* CSV Preview Modal */}
            {isPreviewModalOpen && csvPreviewData && (
                <Modal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} title="CSV Import Preview" size="4xl">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-[var(--background-tertiary)] rounded-lg">
                            <div>
                                <p className="text-sm text-[var(--text-primary)]">
                                    <span className="font-bold">{csvPreviewData.filter(r => r.errors.length === 0).length}</span> valid items, 
                                    <span className="font-bold text-[var(--negative)] ml-1">{csvPreviewData.filter(r => r.errors.length > 0).length}</span> with errors
                                </p>
                            </div>
                        </div>
                        
                        <div className="max-h-[60vh] overflow-y-auto">
                            <table className="min-w-full divide-y divide-[var(--border-color)] text-sm">
                                <thead className="bg-[var(--background-secondary)] sticky top-0">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">Line</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">Name</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">Category</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">Price</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">Station</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-color)]">
                                    {csvPreviewData.map((row, idx) => (
                                        <tr key={idx} className={row.errors.length > 0 ? 'bg-red-500/10' : row.warnings.length > 0 ? 'bg-yellow-500/10' : ''}>
                                            <td className="px-3 py-2 text-[var(--text-tertiary)]">{row.lineNumber}</td>
                                            <td className="px-3 py-2 text-[var(--text-primary)]">{row.data.name || '-'}</td>
                                            <td className="px-3 py-2 text-[var(--text-tertiary)]">{row.data.category || '-'}</td>
                                            <td className="px-3 py-2 text-[var(--text-tertiary)]">{row.data.basePrice || '-'}</td>
                                            <td className="px-3 py-2 text-[var(--text-tertiary)]">{row.data.station || '-'}</td>
                                            <td className="px-3 py-2">
                                                {row.errors.length > 0 ? (
                                                    <div>
                                                        <span className="text-[var(--negative)] font-medium">Error</span>
                                                        <ul className="text-xs mt-1 list-disc list-inside">
                                                            {row.errors.map((err, i) => <li key={i}>{err}</li>)}
                                                        </ul>
                                                    </div>
                                                ) : row.warnings.length > 0 ? (
                                                    <div>
                                                        <span className="text-yellow-500 font-medium">Warning</span>
                                                        <ul className="text-xs mt-1 list-disc list-inside">
                                                            {row.warnings.map((warn, i) => <li key={i}>{warn}</li>)}
                                                        </ul>
                                                    </div>
                                                ) : (
                                                    <span className="text-green-500 font-medium">✓ Valid</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-color)]">
                            <button 
                                onClick={() => {
                                    setIsPreviewModalOpen(false);
                                    setCsvPreviewData(null);
                                }} 
                                className="bg-[var(--background-interactive)] hover:bg-[var(--border-color)] text-[var(--text-primary)] font-bold py-2 px-4 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleConfirmImport}
                                disabled={csvPreviewData.filter(r => r.errors.length === 0).length === 0 || isLoading}
                                className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--accent-primary-text)] font-bold py-2 px-4 rounded-lg disabled:bg-[var(--disabled)] disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                                Import {csvPreviewData.filter(r => r.errors.length === 0).length} Valid Items
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

interface MenuItemEditModalProps {
    item: Partial<MenuItem>;
    categories: string[];
    inventory: any[];
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: Partial<MenuItem>) => void;
}

type Tab = 'basic' | 'pricing' | 'modifiers' | 'stock';

const MenuItemEditModal: React.FC<MenuItemEditModalProps> = ({ item, categories, inventory, isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<MenuItem>>(item);
    const [activeTab, setActiveTab] = useState<Tab>('basic');
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [newCategory, setNewCategory] = useState('');
    const [errors, setErrors] = useState<Record<string, any>>({});
    const [isSaving, setIsSaving] = useState(false);

    const TABS: { id: Tab; label: string }[] = [
        { id: 'basic', label: 'Basic Info' },
        { id: 'pricing', label: 'Pricing & Variants' },
        { id: 'modifiers', label: 'Add-ons & Modifiers' },
        { id: 'stock', label: 'Stock & Recipe' },
    ];

    const validate = useCallback(() => {
        const newErrors: Record<string, any> = {};
        // Basic Info
        if (!formData.name?.trim()) newErrors.name = 'Item name is required.';
        if (!formData.category?.trim()) newErrors.category = 'Category is required.';
        // Pricing
        const hasVariants = formData.variants && formData.variants.length > 0;
        if (!hasVariants && (formData.basePrice === undefined || formData.basePrice < 0)) {
            newErrors.basePrice = 'A valid base price is required.';
        }
        if (hasVariants) {
            const variantErrors: string[] = [];
            formData.variants?.forEach((v, i) => {
                if (!v.name.trim()) variantErrors[i] = 'Variant name is required.';
                if (v.price < 0) variantErrors[i] = (variantErrors[i] || '') + ' Price must be valid.';
            });
            if (variantErrors.length > 0) newErrors.variants = variantErrors;
        }
        // Stock
        if (formData.stock !== undefined && formData.stock < 0) {
            newErrors.stock = 'Stock count cannot be negative.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData]);

    useEffect(() => {
        validate();
    }, [formData, validate]);

    const handleFieldChange = (field: keyof MenuItem, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (e.target.value === '__CREATE_NEW__') {
            setIsCreatingCategory(true);
        } else {
            setIsCreatingCategory(false);
            handleFieldChange('category', e.target.value);
        }
    };
    
    const handleCreateCategory = () => {
        if (newCategory.trim() && !categories.includes(newCategory.trim())) {
            handleFieldChange('category', newCategory.trim());
            setIsCreatingCategory(false);
            setNewCategory('');
        }
    };

    const handleSaveClick = async () => {
        if (validate()) {
            let itemToSave = { ...formData };
            if (itemToSave.variants && itemToSave.variants.length > 0) {
                itemToSave.basePrice = itemToSave.variants[0].price;
            }
            setIsSaving(true);
            await onSave(itemToSave);
            setIsSaving(false);
        }
    };
    const hasErrors = Object.keys(errors).length > 0;
    const errorTabs = TABS.filter(tab => {
        if (tab.id === 'basic') return errors.name || errors.category;
        if (tab.id === 'pricing') return errors.basePrice || errors.variants;
        if (tab.id === 'stock') return errors.stock;
        return false;
    }).map(t => t.label);

    const renderTabContent = () => {
        switch (activeTab) {
            case 'basic': return (
                <div className="space-y-4">
                    <div>
                        <input type="text" name="name" value={formData.name} onChange={e => handleFieldChange('name', e.target.value)} placeholder="Item Name" className="w-full bg-[var(--background-tertiary)] rounded p-2"/>
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                    </div>
                    <textarea name="description" value={formData.description} onChange={e => handleFieldChange('description', e.target.value)} placeholder="Description" className="w-full bg-[var(--background-tertiary)] rounded p-2 min-h-[80px]"/>
                    <input type="text" name="image" value={formData.image} onChange={e => handleFieldChange('image', e.target.value)} placeholder="Image URL" className="w-full bg-[var(--background-tertiary)] rounded p-2"/>
                    <div>
                        <select name="category" value={isCreatingCategory ? '__CREATE_NEW__' : formData.category} onChange={handleCategoryChange} className="w-full bg-[var(--background-tertiary)] rounded p-2">
                             {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                             {formData.category && !categories.includes(formData.category) && <option value={formData.category}>{formData.category}</option>}
                             <option value="__CREATE_NEW__">-- Create New Category --</option>
                        </select>
                        {isCreatingCategory && (
                            <div className="flex mt-2">
                                <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="New Category Name" className="flex-grow bg-[var(--background-primary)] rounded-l p-2 border border-[var(--border-color)]"/>
                                <button onClick={handleCreateCategory} className="bg-[var(--accent-primary)] text-white px-4 rounded-r">Save</button>
                            </div>
                        )}
                        {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
                    </div>
                    <select name="station" value={formData.station} onChange={e => handleFieldChange('station', e.target.value)} className="w-full bg-[var(--background-tertiary)] rounded p-2">
                        {KITCHEN_STATIONS.map(station => <option key={station} value={station}>{station}</option>)}
                    </select>
                </div>
            );
            case 'pricing': return (
                <div>
                     <label className="flex items-center space-x-2">
                        <input type="checkbox" checked={!!(formData.variants && formData.variants.length > 0)} onChange={e => {
                            if (e.target.checked) handleFieldChange('variants', [{id: `v_${Date.now()}`, name: 'Regular', price: formData.basePrice || 0}]);
                            else handleFieldChange('variants', []);
                        }} />
                        <span>This item has multiple sizes/variants</span>
                    </label>
                    {(!formData.variants || formData.variants.length === 0) ? (
                         <div className="mt-4">
                            <label>Base Price</label>
                            <input type="number" value={formData.basePrice} onChange={e => handleFieldChange('basePrice', parseFloat(e.target.value))} className="w-full bg-[var(--background-tertiary)] rounded p-2"/>
                            {errors.basePrice && <p className="text-xs text-red-500 mt-1">{errors.basePrice}</p>}
                         </div>
                    ) : (
                        <div className="mt-4 space-y-2">
                            {formData.variants?.map((variant, index) => (
                                <div key={variant.id} className="p-2 rounded-md bg-black/10">
                                    <div className="flex items-center gap-2">
                                        <input type="text" value={variant.name} placeholder="Variant Name" onChange={e => {
                                            const newVariants = [...formData.variants!];
                                            newVariants[index].name = e.target.value;
                                            handleFieldChange('variants', newVariants);
                                        }} className="w-full bg-[var(--background-primary)] p-2 border border-[var(--border-color)] rounded"/>
                                        <input type="number" value={variant.price} placeholder="Price" onChange={e => {
                                            const newVariants = [...formData.variants!];
                                            newVariants[index].price = parseFloat(e.target.value) || 0;
                                            handleFieldChange('variants', newVariants);
                                        }} className="w-1/3 bg-[var(--background-primary)] p-2 border border-[var(--border-color)] rounded"/>
                                        <button onClick={() => handleFieldChange('variants', formData.variants?.filter(v => v.id !== variant.id))} className="text-[var(--negative)] p-2">&times;</button>
                                    </div>
                                    {errors.variants?.[index] && <p className="text-xs text-red-500 mt-1 pl-1">{errors.variants[index]}</p>}
                                </div>
                            ))}
                            <button onClick={() => handleFieldChange('variants', [...(formData.variants || []), { id: `v_${Date.now()}`, name: '', price: 0 }])} className="text-sm text-[var(--accent-primary)]">+ Add Variant</button>
                        </div>
                    )}
                </div>
            );
            case 'modifiers': return (
                 <div className="space-y-4">
                    {formData.modifierGroups?.map((group, gIndex) => (
                        <div key={group.id} className="bg-[var(--background-primary)] p-3 rounded-lg border border-[var(--border-color)]">
                             <div className="flex items-center gap-2 mb-2">
                                <input value={group.name} onChange={e => {
                                    const newGroups = [...formData.modifierGroups!];
                                    newGroups[gIndex].name = e.target.value;
                                    handleFieldChange('modifierGroups', newGroups);
                                }} placeholder="Group Name (e.g., Toppings)" className="w-full bg-[var(--background-tertiary)] p-2 rounded"/>
                                <button onClick={() => handleFieldChange('modifierGroups', formData.modifierGroups?.filter(g => g.id !== group.id))} className="text-[var(--negative)] p-2">&times;</button>
                            </div>
                            <div className="flex items-center gap-2 text-sm mb-2">
                                <input type="number" value={group.minSelection} placeholder="Min" onChange={e => {
                                    const newGroups = [...formData.modifierGroups!];
                                    newGroups[gIndex].minSelection = parseInt(e.target.value, 10) || 0;
                                    handleFieldChange('modifierGroups', newGroups);
                                }} className="w-1/2 bg-[var(--background-tertiary)] p-1 rounded" />
                                <input type="number" value={group.maxSelection} placeholder="Max" onChange={e => {
                                    const newGroups = [...formData.modifierGroups!];
                                    newGroups[gIndex].maxSelection = parseInt(e.target.value, 10) || 1;
                                    handleFieldChange('modifierGroups', newGroups);
                                }} className="w-1/2 bg-[var(--background-tertiary)] p-1 rounded" />
                            </div>
                            <div className="space-y-1 pl-4">
                                {group.options.map((opt, oIndex) => (
                                    <div key={opt.id} className="flex items-center gap-2">
                                        <input value={opt.name} onChange={e => {
                                             const newGroups = [...formData.modifierGroups!];
                                             newGroups[gIndex].options[oIndex].name = e.target.value;
                                             handleFieldChange('modifierGroups', newGroups);
                                        }} placeholder="Option Name" className="w-full bg-[var(--background-tertiary)] p-1 text-sm rounded"/>
                                         <input type="number" value={opt.price} onChange={e => {
                                             const newGroups = [...formData.modifierGroups!];
                                             newGroups[gIndex].options[oIndex].price = parseFloat(e.target.value) || 0;
                                             handleFieldChange('modifierGroups', newGroups);
                                        }} placeholder="Price" className="w-1/3 bg-[var(--background-tertiary)] p-1 text-sm rounded"/>
                                        <button onClick={() => {
                                            const newGroups = [...formData.modifierGroups!];
                                            newGroups[gIndex].options = newGroups[gIndex].options.filter(o => o.id !== opt.id);
                                            handleFieldChange('modifierGroups', newGroups);
                                        }} className="text-[var(--negative)] p-1">&times;</button>
                                    </div>
                                ))}
                                <button onClick={() => {
                                    const newGroups = [...formData.modifierGroups!];
                                    newGroups[gIndex].options.push({ id: `o_${Date.now()}`, name: '', price: 0 });
                                    handleFieldChange('modifierGroups', newGroups);
                                }} className="text-xs text-[var(--accent-primary)]">+ Add Option</button>
                            </div>
                        </div>
                    ))}
                    <button onClick={() => handleFieldChange('modifierGroups', [...(formData.modifierGroups || []), { id: `g_${Date.now()}`, name: '', minSelection: 1, maxSelection: 1, options: [] }])} className="text-sm text-[var(--accent-primary)]">+ Add Modifier Group</button>
                 </div>
            );
            case 'stock': 
                const stockType = formData.recipe && formData.recipe.length > 0 ? 'recipe' : 'simple';
                return (
                    <div>
                        <div className="flex gap-4 mb-4">
                             <label><input type="radio" name="stockType" value="simple" checked={stockType === 'simple'} onChange={() => handleFieldChange('recipe', [])} /> Simple Stock Count</label>
                             <label><input type="radio" name="stockType" value="recipe" checked={stockType === 'recipe'} onChange={() => handleFieldChange('stock', undefined)} /> Recipe-based Stock</label>
                        </div>
                        {stockType === 'simple' ? (
                             <div>
                                <label>Stock Count</label>
                                <input type="number" value={formData.stock === undefined ? '' : formData.stock} onChange={e => handleFieldChange('stock', e.target.value === '' ? undefined : parseInt(e.target.value, 10))} className="w-full bg-[var(--background-tertiary)] p-2 rounded" />
                                {errors.stock && <p className="text-xs text-red-500 mt-1">{errors.stock}</p>}
                             </div>
                        ) : (
                            <div className="space-y-2">
                                {formData.recipe?.map((comp, index) => (
                                    <div key={comp.inventoryItemId} className="flex items-center gap-2">
                                        <span className="flex-grow bg-[var(--background-primary)] p-2 rounded border border-[var(--border-color)]">
                                            {inventory.find(i => i.id === comp.inventoryItemId)?.name}
                                        </span>
                                        <input type="number" value={comp.quantity} onChange={e => {
                                            const newRecipe = [...formData.recipe!];
                                            newRecipe[index].quantity = parseFloat(e.target.value) || 0;
                                            handleFieldChange('recipe', newRecipe);
                                        }} className="w-1/4 bg-[var(--background-primary)] p-2 rounded border border-[var(--border-color)]" />
                                        <span>{inventory.find(i => i.id === comp.inventoryItemId)?.unit}</span>
                                        <button onClick={() => handleFieldChange('recipe', formData.recipe?.filter(r => r.inventoryItemId !== comp.inventoryItemId))} className="text-[var(--negative)] p-2">&times;</button>
                                    </div>
                                ))}
                                <div className="flex gap-2">
                                    <select className="flex-grow bg-[var(--background-tertiary)] p-2 rounded" onChange={e => {
                                        if (e.target.value && !formData.recipe?.some(r => r.inventoryItemId === e.target.value)) {
                                             handleFieldChange('recipe', [...(formData.recipe || []), { inventoryItemId: e.target.value, quantity: 1 }])
                                        }
                                    }} value="">
                                        <option value="">-- Add an ingredient --</option>
                                        {inventory.map(invItem => (
                                            <option key={invItem.id} value={invItem.id}>{invItem.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                );
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={formData.id ? 'Edit Menu Item' : 'Add New Item'} size="3xl">
             <div className="flex flex-col max-h-[75vh]">
                <div className="border-b border-[var(--border-color)] mb-4">
                    <nav className="-mb-px flex space-x-4">
                        {TABS.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]' : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]'}`}>
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="flex-grow overflow-y-auto pr-2">
                    {renderTabContent()}
                </div>
                <div className="flex justify-between items-center pt-6 mt-auto border-t border-[var(--border-color)]">
                     {hasErrors ? (
                        <div className="text-xs text-red-500">
                           Please fix errors on tabs: {errorTabs.join(', ')}
                        </div>
                    ) : <div></div>}
                    <div className="flex justify-end space-x-2">
                        <button onClick={onClose} className="bg-[var(--background-interactive)] hover:bg-[var(--border-color)] text-[var(--text-primary)] font-bold py-2 px-4 rounded-lg">Cancel</button>
                        <button onClick={handleSaveClick} disabled={hasErrors || isSaving} className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--accent-primary-text)] font-bold py-2 px-4 rounded-lg disabled:bg-[var(--disabled)] flex items-center">
                            {isSaving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    )
}

export default MenuSettings;