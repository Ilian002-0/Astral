
import React, { useEffect, useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import useLockBodyScroll from '../hooks/useLockBodyScroll';

interface StrategyActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
    strategyName: string;
    originRect?: DOMRect | null;
}

const StrategyActionModal: React.FC<StrategyActionModalProps> = ({ isOpen, onClose, onEdit, onDelete, strategyName, originRect }) => {
    const { t } = useLanguage();
    useLockBodyScroll(isOpen);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        let timeoutId: number;
        if (isOpen) {
            // Slight delay to ensure mount before transition
            timeoutId = window.setTimeout(() => setIsVisible(true), 10);
        } else {
            setIsVisible(false);
        }
        return () => clearTimeout(timeoutId);
    }, [isOpen]);

    const handleClose = () => {
        setIsVisible(false);
        // Wait for animation to finish (matches duration-300)
        setTimeout(onClose, 300);
    };

    const transformStyle = useMemo(() => {
        if (!originRect || typeof window === 'undefined') return {};

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const originX = originRect.left + originRect.width / 2;
        const originY = originRect.top + originRect.height / 2;
        const deltaX = originX - centerX;
        const deltaY = originY - centerY;

        return {
            transformOrigin: `calc(50% + ${deltaX}px) calc(50% + ${deltaY}px)`
        };
    }, [originRect]);

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isVisible ? '' : 'pointer-events-none'}`}>
            <div 
                className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                onClick={handleClose}
            ></div>

            <div 
                className={`relative w-full max-w-sm p-6 bg-[#16152c] border border-gray-700/50 rounded-3xl shadow-2xl transition-all duration-300 cubic-bezier(0.34, 1.56, 0.64, 1) ${isVisible ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} 
                onClick={e => e.stopPropagation()}
                style={transformStyle}
            >
                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-white truncate">{strategyName}</h2>
                    <p className="text-gray-400 text-sm mt-1">{t('strategy.actions_subtitle')}</p>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={() => { onEdit(); handleClose(); }}
                        className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-2xl transition-colors shadow-sm"
                    >
                        {t('strategy.edit_strategy')}
                    </button>
                    <button
                        onClick={() => { onDelete(); handleClose(); }}
                        className="w-full py-3 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/30 font-bold rounded-2xl transition-colors"
                    >
                        {t('strategy.delete_strategy')}
                    </button>
                </div>
                 <div className="text-center mt-6">
                     <button onClick={handleClose} className="text-gray-500 hover:text-white text-sm transition-colors">{t('common.cancel')}</button>
                 </div>
            </div>
        </div>
    );
};
export default StrategyActionModal;
