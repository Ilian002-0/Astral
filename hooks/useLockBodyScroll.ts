
import { useEffect } from 'react';

// Global counter to handle nested/stacked modals correctly and prevent scroll locking bugs.
// This ensures that if multiple components request a lock (e.g. overlapping modals),
// the scroll is only unlocked when the last one releases it.
let lockCount = 0;

/**
 * A custom hook to lock body scroll when a component (like a modal) is active.
 * Enhanced to handle the specific app layout where scrolling occurs in <main>.
 * @param {boolean} isLocked - Whether the body scroll should be locked.
 */
function useLockBodyScroll(isLocked: boolean): void {
  useEffect(() => {
    if (isLocked) {
      lockCount++;
      const mainElement = document.querySelector('main');
      
      // Lock body (Standard)
      document.body.style.overflow = 'hidden';
      
      // Lock Main Container (App specific)
      // We apply this directly to the main element which handles the app's scrolling
      if (mainElement) {
          mainElement.style.overflowY = 'hidden';
      }

      return () => {
        lockCount--;
        
        // Safety check to ensure we don't go negative in weird edge cases
        if (lockCount < 0) lockCount = 0;

        if (lockCount === 0) {
            // Only unlock if no other components are requesting a lock (count is 0)
            document.body.style.removeProperty('overflow');
            if (mainElement) {
                // Removing the inline style allows the CSS class (overflow-y-auto) to take over
                mainElement.style.removeProperty('overflow-y');
            }
        }
      };
    }
    return;
  }, [isLocked]);
}

export default useLockBodyScroll;
