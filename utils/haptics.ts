// A simple haptic feedback utility

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

const hapticPatterns: Record<HapticType, number | number[]> = {
    light: 10,
    medium: 40,
    heavy: 70,
    // Simplified patterns for broader Android compatibility
    success: 50,
    warning: [50, 30],
    error: [80, 50]
};


export const triggerHaptic = (type: HapticType = 'light') => {
    if (typeof window !== 'undefined' && window.navigator && 'vibrate' in window.navigator) {
        try {
            window.navigator.vibrate(hapticPatterns[type]);
        } catch (e) {
            console.warn("Haptic feedback failed.", e);
        }
    }
};