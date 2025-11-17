import React from 'react';
import { useAppContext } from '../hooks/useAppContext';

interface CategoryTabsProps {
    selectedCategory: string;
    onSelectCategory: (category: string) => void;
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({ selectedCategory, onSelectCategory }) => {
    const { menuCategories } = useAppContext();
    
    return (
        <nav className="flex-shrink-0 space-x-2 p-2 bg-[var(--background-secondary)] rounded-lg overflow-x-auto">
            {menuCategories.map(category => (
                <button
                    key={category}
                    onClick={() => onSelectCategory(category)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 whitespace-nowrap ${
                        selectedCategory === category
                            ? 'bg-[var(--accent-primary)] text-[var(--accent-primary-text)] shadow'
                            : 'text-[var(--text-tertiary)] hover:bg-[var(--background-tertiary)] hover:text-[var(--text-primary)]'
                    }`}
                    aria-pressed={selectedCategory === category}
                >
                    {category}
                </button>
            ))}
        </nav>
    );
};

export default CategoryTabs;