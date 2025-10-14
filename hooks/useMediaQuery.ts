import { useState, useEffect } from 'react';

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    
    const mediaQueryList = window.matchMedia(query);
    const documentChangeHandler = () => setMatches(mediaQueryList.matches);

    try {
      mediaQueryList.addEventListener('change', documentChangeHandler);
    } catch (e) {
      // Fallback for older browsers
      mediaQueryList.addListener(documentChangeHandler);
    }

    // Set initial state
    setMatches(mediaQueryList.matches);

    return () => {
      try {
        mediaQueryList.removeEventListener('change', documentChangeHandler);
      } catch (e) {
        // Fallback for older browsers
        mediaQueryList.removeListener(documentChangeHandler);
      }
    };
  }, [query]);

  return matches;
}

export default useMediaQuery;
