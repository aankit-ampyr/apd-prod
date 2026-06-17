import { type RefObject, useEffect, useRef } from 'react';

export function useClickOutside<T extends HTMLElement>(
  onClickOutside: (e?: any) => void,
  ignoreRef?: RefObject<HTMLElement | null>,
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (!ref.current) return;
      if (ref.current.contains(target)) return;
      if (ignoreRef?.current?.contains(target)) return;
      onClickOutside(event);
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClickOutside, ignoreRef]);

  return ref;
}