import { useEffect, useRef, useState } from "react";

type TooltipState<T> = {
  x: number;
  y: number;
  data: T;
} | null;

type TooltipPosition = {
  x: number;
  y: number;
};

export function useChartTooltip<T>(
  containerRef: React.RefObject<HTMLElement> | null,
) {
  const [tooltip, setTooltip] = useState<TooltipState<T>>(null);
  const frameRef = useRef<number | null>(null);

  const handleMouseMove = (
    e: React.MouseEvent,
    data: T,
    position?: TooltipPosition,
  ) => {
    if (!containerRef?.current) return;
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      const rect = containerRef.current.getBoundingClientRect();

      if (!rect) return;

      setTooltip({
        x: position?.x ?? (e.clientX - rect.left),
        y: position?.y ?? (e.clientY - rect.top),
        data,
      });
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };
  useEffect(() => {
    const handleGlobalLeave = () => setTooltip(null);

    window.addEventListener("mouseleave", handleGlobalLeave);
    return () => window.removeEventListener("mouseleave", handleGlobalLeave);
  }, []);

  return {
    tooltip,
    handleMouseMove,
    handleMouseLeave,
  };
}
