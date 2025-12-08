
import React, { useState, useRef, useEffect } from 'react';

interface AccountSelectorProps {
  accountNames: string[];
  currentAccount: string | null;
  onSelectAccount: (accountName: string) => void;
  onAddAccount: () => void;
}

const AccountSelector: React.FC<AccountSelectorProps> = ({ accountNames, currentAccount, onSelectAccount, onAddAccount }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (name: string) => {
    onSelectAccount(name);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-48 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-2xl shadow-md transition-colors"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="truncate">{currentAccount || 'Select Account'}</span>
        <svg className={`w-5 h-5 ml-2 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} xmlns="http://www.w.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-2xl shadow-lg z-10 animate-fade-in-fast overflow-hidden">
          <ul className="py-1">
            {accountNames.map(name => (
              <li key={name}>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); handleSelect(name); }}
                  className={`block px-4 py-2 text-sm ${name === currentAccount ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                >
                  {name}
                </a>
              </li>
            ))}
            <li>
              <hr className="border-gray-600 my-1" />
            </li>
            <li>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); onAddAccount(); setIsOpen(false); }}
                className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
              >
                <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add/Update Account
              </a>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default AccountSelector;
