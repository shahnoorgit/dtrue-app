import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook that adds a grace delay before showing loading state.
 * This prevents flickering when content loads quickly (< 100ms).
 * 
 * @param isLoading - The actual loading state
 * @param delay - Grace period in milliseconds (default: 100ms)
 * @returns boolean - Whether to show loading indicator
 */
export const useDelayedLoading = (isLoading: boolean, delay: number = 150): boolean => {
  const [showLoading, setShowLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading) {
      // Start timer to show loading state after delay
      timeoutRef.current = setTimeout(() => {
        setShowLoading(true);
      }, delay);
    } else {
      // Clear timeout and hide loading immediately when done
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setShowLoading(false);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isLoading, delay]);

  return showLoading;
};

