
import { useRef, useState, useEffect, useCallback } from 'react';
import { triggerHaptic } from '../utils/haptics';

const PULL_THRESHOLD = 80; // Pixels to trigger refresh
const MAX_PULL_DISTANCE = 150; // Maximum pixels the UI can be pulled down
const RESISTANCE_FACTOR = 0.4; // Dampening factor (move finger 10px -> UI moves 4px)

const usePullToRefresh = (onRefresh: () => void, disabled: boolean = false) => {
    const pullToRefreshRef = useRef<HTMLElement>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullStart, setPullStart] = useState<number | null>(null);
    const [pullDistance, setPullDistance] = useState(0);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        if (disabled) return;
        const element = pullToRefreshRef.current;
        // Only start the pull gesture if the user is at the very top of the scrollable area
        if (element && element.scrollTop === 0) {
            setPullStart(e.touches[0].clientY);
        }
    }, [disabled]);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (disabled || pullStart === null) return;

        const touchY = e.touches[0].clientY;
        const rawDistance = touchY - pullStart;
        const element = pullToRefreshRef.current;

        // Only register pull distance if pulling down from the top
        if (element && rawDistance > 0 && element.scrollTop === 0) {
            // Prevent the default browser scroll behavior when we are handling the pull
            if (e.cancelable) e.preventDefault();
            
            // Apply resistance and cap the distance
            const dampenedDistance = rawDistance * RESISTANCE_FACTOR;
            const finalDistance = Math.min(dampenedDistance, MAX_PULL_DISTANCE);
            
            setPullDistance(finalDistance);
        } else {
            // If user pushes back up past the start point, reset
            if (pullDistance > 0) setPullDistance(0);
        }
    }, [pullStart, disabled, pullDistance]);

    const handleTouchEnd = useCallback(async () => {
        if (disabled) return;
        if (pullDistance > PULL_THRESHOLD) {
            setIsRefreshing(true);
            try {
                // Await the refresh action passed to the hook
                await onRefresh();
                triggerHaptic('light');
            } finally {
                // Ensure refreshing state is turned off even if the refresh fails
                setIsRefreshing(false);
            }
        }
        // Reset state after every touch end
        setPullStart(null);
        setPullDistance(0);
    }, [pullDistance, onRefresh, disabled]);

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
