
import { useRef, useState, useEffect, useCallback } from 'react';

const PULL_THRESHOLD = 80; // Pixels to pull down before refresh is triggered

const usePullToRefresh = (onRefresh: () => void) => {
    const pullToRefreshRef = useRef<HTMLElement>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullStart, setPullStart] = useState<number | null>(null);
    const [pullDistance, setPullDistance] = useState(0);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        const element = pullToRefreshRef.current;
        // Only start the pull gesture if the user is at the very top of the scrollable area
        if (element && element.scrollTop === 0) {
            setPullStart(e.touches[0].clientY);
        }
    }, []);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (pullStart === null) return;

        const touchY = e.touches[0].clientY;
        const distance = touchY - pullStart;
        const element = pullToRefreshRef.current;

        // Only register pull distance if pulling down from the top
        if (element && distance > 0 && element.scrollTop === 0) {
            // Prevent the default browser scroll behavior when we are handling the pull
            e.preventDefault();
            setPullDistance(distance);
        }
    }, [pullStart]);

    const handleTouchEnd = useCallback(async () => {
        if (pullDistance > PULL_THRESHOLD) {
            setIsRefreshing(true);
            try {
                // Await the refresh action passed to the hook
                await onRefresh();
            } finally {
                // Ensure refreshing state is turned off even if the refresh fails
                setIsRefreshing(false);
            }
        }
        // Reset state after every touch end
        setPullStart(null);
        setPullDistance(0);
    }, [pullDistance, onRefresh]);

    useEffect(() => {
        const element = pullToRefreshRef.current;
        if (!element) return;

        // Use { passive: false } for touchmove to allow preventDefault()
        element.addEventListener('touchstart', handleTouchStart, { passive: true });
        element.addEventListener('touchmove', handleTouchMove, { passive: false });
        element.addEventListener('touchend', handleTouchEnd);

        return () => {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchmove', handleTouchMove);
            element.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
    
    // The hook now returns the distance so the component can control the UI
    return { pullToRefreshRef, isRefreshing, pullDistance };
};

export default usePullToRefresh;