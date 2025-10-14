import { useRef, useState, useEffect, useCallback } from 'react';

const PULL_THRESHOLD = 80; // Pixels to pull down before refresh is triggered

const usePullToRefresh = (onRefresh: () => void) => {
    const pullToRefreshRef = useRef<HTMLElement>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullStart, setPullStart] = useState<number | null>(null);
    const [pullDistance, setPullDistance] = useState(0);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        if (window.scrollY === 0) {
            setPullStart(e.touches[0].clientY);
        }
    }, []);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (pullStart === null) return;

        const touchY = e.touches[0].clientY;
        const distance = touchY - pullStart;

        if (distance > 0 && window.scrollY === 0) {
            e.preventDefault();
            setPullDistance(distance);
        }
    }, [pullStart]);

    const handleTouchEnd = useCallback(async () => {
        if (pullDistance > PULL_THRESHOLD) {
            setIsRefreshing(true);
            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
            }
        }
        setPullStart(null);
        setPullDistance(0);
    }, [pullDistance, onRefresh]);

    useEffect(() => {
        const element = pullToRefreshRef.current;
        if (!element) return;

        element.addEventListener('touchstart', handleTouchStart, { passive: false });
        element.addEventListener('touchmove', handleTouchMove, { passive: false });
        element.addEventListener('touchend', handleTouchEnd);

        return () => {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchmove', handleTouchMove);
            element.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
    
    // Add visual indicator for pull-to-refresh
    useEffect(() => {
        const element = pullToRefreshRef.current;
        if (!element) return;
        
        if (isRefreshing) {
            element.style.transform = `translateY(50px)`;
            element.style.transition = 'transform 0.3s';
        } else if (pullStart !== null) {
            element.style.transform = `translateY(${pullDistance / 2}px)`;
            element.style.transition = 'none';
        } else {
            element.style.transform = 'translateY(0px)';
            element.style.transition = 'transform 0.3s';
        }
        
    }, [isRefreshing, pullDistance, pullStart]);

    return { pullToRefreshRef, isRefreshing };
};

export default usePullToRefresh;
