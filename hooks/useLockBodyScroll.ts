import { useEffect } from 'react';

/**
 * A custom hook to lock body scroll when a component (like a modal) is active.
 * @param {boolean} isLocked - Whether the body scroll should be locked.
 */
function useLockBodyScroll(isLocked: boolean): void {
  useEffect(() => {
    if (isLocked) {
      // Get the original body overflow style
      const originalStyle = window.getComputedStyle(document.body).overflow;
      // Prevent scrolling on mount
      document.body.style.overflow = 'hidden';

      // Re-enable scrolling when component unmounts
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
    // No cleanup needed if not locked
    return;
  }, [isLocked]);
}

export default useLockBodyScroll;