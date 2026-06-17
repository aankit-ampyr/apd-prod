
import { useEffect, useState } from "react";

export function useIsTruncated(
  textRef: React.RefObject<HTMLParagraphElement | null> ,
  containerRef?: React.RefObject<HTMLDivElement | null>
) {
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const el = textRef?.current;
    const container = containerRef?.current;

    if (!el) return;

    const checkTruncation = () => {
      // If container provided → compare against it
      if (container) {
        const isOverflowingX = el.scrollWidth > container.clientWidth;
        const isOverflowingY = el.scrollHeight > container.clientHeight;
        setIsTruncated(isOverflowingX || isOverflowingY);
      } else {
        // fallback → compare element itself
        const isOverflowingX = el.scrollWidth > el.clientWidth;
        const isOverflowingY = el.scrollHeight > el.clientHeight;
        setIsTruncated(isOverflowingX || isOverflowingY);
      }
    };

    checkTruncation();

    const resizeObserver = new ResizeObserver(checkTruncation);
    const mutationObserver = new MutationObserver(checkTruncation);

    resizeObserver.observe(el);
    if (container) resizeObserver.observe(container);

    mutationObserver.observe(el, {
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [textRef, containerRef]);

  return isTruncated;
}