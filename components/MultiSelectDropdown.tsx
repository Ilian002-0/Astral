

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface MultiSelectDropdownProps {
    options: string[];
    selectedOptions: string[];
    onChange: (selected: string[]) => void;
    placeholder: string;
    title: string;
    itemNamePlural: string;
    emptyMessage?: string; // New optional prop for empty state
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({ options, selectedOptions, onChange, placeholder, title, itemNamePlural, emptyMessage }) => {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredOptions = useMemo(() => {
        return options.filter(option => option.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [options, searchTerm]);

    const handleToggleOption = (option: string) => {
        const newSelected = selectedOptions.includes(option)
            ? selectedOptions.filter(item => item !== option)
            : [...selectedOptions, option];
        onChange(newSelected);
    };
    
    const handleSelectAll = () => onChange(options);
    const handleClearAll = () => onChange([]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const displayLabel = useMemo(() => {
        const selectedCount = selectedOptions.length;
        const totalCount = options.length;

        if (selectedCount === 0) {
            return placeholder;
        }
        if (selectedCount === totalCount && totalCount > 0) {
            return `All ${itemNamePlural} selected`;
        }
        if (selectedCount <= 2) {
            return selectedOptions.join(', ');
        }
        return `${selectedCount} ${itemNamePlural} selected`;
    }, [selectedOptions, options.length, placeholder, itemNamePlural]);

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-300 mb-2">{title}</label>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-2xl shadow-md transition-colors"
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <span className="truncate">{displayLabel}</span>
                <svg className={`w-5 h-5 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>
            {isOpen && (
                <div className="absolute left-0 mt-2 w-full bg-gray-800 border border-gray-700 rounded-2xl shadow-lg z-20 overflow-hidden">
                    {options.length === 0 && emptyMessage ? (
                        <div className="p-4 text-center">
                            <p className="text-sm text-gray-400">{emptyMessage}</p>
                        </div>
                    ) : (
                        <>
                            <div className="p-2">
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-3 py-2 bg-[#0c0b1e] border border-gray-600 rounded-2xl text-white focus:ring-cyan-500 focus:border-cyan-500 transition mb-2"
                                />
                            </div>
                            <div className="flex justify-between px-3 py-1 border-b border-t border-gray-700">
                                <button onClick={handleSelectAll} className="text-xs text-cyan-400 hover:text-cyan-300">{t('analysis.select_all')}</button>
                                <button onClick={handleClearAll} className="text-xs text-red-400 hover:text-red-300">{t('analysis.clear_all')}</button>
                            </div>
                            <ul className="py-1 max-h-60 overflow-y-auto">
                                {filteredOptions.map(option => (
                                    <li key={option}>
                                        <label className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedOptions.includes(option)}
                                                onChange={() => handleToggleOption(option)}
                                                className="form-checkbox h-4 w-4 bg-gray-900 border-gray-600 rounded text-cyan-500 focus:ring-cyan-600"
                                            />
                                            <span className="ml-3 truncate">{option}</span>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

export default MultiSelectDropdown;
