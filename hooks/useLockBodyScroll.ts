
import { useEffect } from 'react';

/**
 * A custom hook to lock body scroll when a component (like a modal) is active.
 * Enhanced to handle the specific app layout where scrolling occurs in <main>.
 * @param {boolean} isLocked - Whether the body scroll should be locked.
 */
function useLockBodyScroll(isLocked: boolean): void {
  useEffect(() => {
    if (isLocked) {
      // 1. Lock Body (Standard)
      const originalBodyOverflow = window.getComputedStyle(document.body).overflow;
      // 2. Lock Main Container (App specific)
      const mainElement = document.querySelector('main');
      const originalMainOverflow = mainElement ? window.getComputedStyle(mainElement).overflowY : '';

      document.body.style.overflow = 'hidden';
      if (mainElement) {
          mainElement.style.overflowY = 'hidden';
      }

      // Re-enable scrolling when component unmounts
      return () => {
        document.body.style.overflow = originalBodyOverflow;
        if (mainElement) {
            mainElement.style.overflowY = originalMainOverflow;
        }
      };
    }
    return;
  }, [isLocked]);
}

export default useLockBodyScroll;
