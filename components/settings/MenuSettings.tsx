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

const MenuSettings: React.FC = () => {
    const { menuItems, menuCategories, api, syncData, inventory, addToast } = useAppContext();
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
                const headers = lines[0].split(',').map(h => h.trim());
                const requiredHeaders = ['name', 'category', 'basePrice', 'station'];
                if (!requiredHeaders.every(h => headers.includes(h))) {
                    throw new Error(`CSV must contain headers: ${requiredHeaders.join(', ')}`);
                }

                const itemsToImport: Omit<MenuItem, 'id' | 'tenantId'>[] = lines.slice(1).map(line => {
                    const values = line.split(',');
                    const entry: any = {};
                    headers.forEach((header, i) => entry[header] = values[i]);

                    return {
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
                });

                if(window.confirm(`Found ${itemsToImport.length} items to import. Proceed?`)) {
                    setIsLoading(true);
                    await api.bulkSaveMenuItems(itemsToImport);
                    await syncData();
                    addToast(`${itemsToImport.length} items imported successfully!`, 'success');
                }
            } catch (error: any) {
                addToast(`Import failed: ${error.message}`, 'error');
            } finally {
                setIsLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };
    
    return (
        <div className="bg-[var(--background-secondary)] p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Menu Management</h2>
                <div className="flex items-center gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".csv" />
                    <button onClick={() => fileInputRef.current?.click()} className="bg-[var(--background-interactive)] hover:bg-[var(--border-color)] text-[var(--text-primary)] font-bold py-2 px-4 rounded-lg text-sm">
                        Import from CSV
                    </button>
                     <button onClick={() => setIsInfoModalOpen(true)} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">?</button>
                    <button onClick={handleAddNew} className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--accent-primary-text)] font-bold py-2 px-4 rounded-lg">
                        Add New Item
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--border-color)]">
                     <thead className="bg-[var(--background-secondary)]">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Item</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Price</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                        {menuItems.map(item => (
                            <tr key={item.id}>
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