import { useState, useEffect, useRef } from "react";

/**
 * A custom hook that debounces state updates
 * @param {any} initialValue - The initial state value
 * @param {number} delay - The debounce delay in milliseconds (default: 500)
 * @returns {[any, Function, any]} - [debouncedValue, setValue, immediateValue]
 */
export function useDebounceState<T>(
  initialValue: T,
  delay = 500,
): [T, (value: T) => void, T] {
  const [immediateValue, setImmediateValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set up new timeout
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(immediateValue);
    }, delay);

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [immediateValue, delay]);

  return [debouncedValue, setImmediateValue, immediateValue];
}
