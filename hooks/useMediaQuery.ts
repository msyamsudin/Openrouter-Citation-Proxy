import { useState, useEffect } from 'react';

/**
 * Custom hook to track the state of a media query.
 * @param query The media query string (e.g., '(max-width: 768px)')
 * @returns boolean indicating if the query matches
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(() => {
        // Initial check
        if (typeof window !== 'undefined') {
            return window.matchMedia(query).matches;
        }
        return false;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia(query);
        
        // Update function
        const handler = (event: MediaQueryListEvent) => {
            setMatches(event.matches);
        };

        // Modern browsers
        mediaQuery.addEventListener('change', handler);
        
        // Initial sync (in case it changed between initialization and effect)
        setMatches(mediaQuery.matches);

        // Cleanup
        return () => {
            mediaQuery.removeEventListener('change', handler);
        };
    }, [query]);

    return matches;
}
