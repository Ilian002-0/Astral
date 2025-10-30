// A simple haptic feedback utility

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

const hapticPatterns: Record<HapticType, number | number[]> = {
    light: 10,
    medium: 40,
    heavy: 70,
    success: [20, 50, 20],
    warning: [50, 30, 80],
    error: [80, 50, 80]
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
