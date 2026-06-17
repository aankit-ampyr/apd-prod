import { RefObject, useEffect, useState } from "react";

interface ElementSize {
  width: number;
  height: number;
}

export function useContainerDimentions<T extends HTMLElement>(
  ref: RefObject<T | null>,
  config?: {
    method: "offset" | "client" | "contentRect";
  },
): ElementSize {
  const [size, setSize] = useState<ElementSize>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    const method = config?.method ?? "contentRect";

    const getDimensions = (entry?: ResizeObserverEntry): ElementSize => {
      switch (method) {
        case "client":
          return {
            width: element.clientWidth,
            height: element.clientHeight,
          };

        case "contentRect":
          return {
            width: entry?.contentRect.width ?? 0,
            height: entry?.contentRect.height ?? 0,
          };

        case "offset":
        default:
          return {
            width: element.offsetWidth,
            height: element.offsetHeight,
          };
      }
    };

    const updateSize = (entry?: ResizeObserverEntry) => {
      const nextSize = getDimensions(entry);

      setSize((prev) => {
        if (prev.width === nextSize.width && prev.height === nextSize.height) {
          return prev;
        }

        return nextSize;
      });
    };

    updateSize();

    const observer = new ResizeObserver(([entry]) => {
      updateSize(entry);
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, config?.method]);

  return size;
}
