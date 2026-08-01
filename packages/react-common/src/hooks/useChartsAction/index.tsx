import { useContext, useEffect, useRef, useState } from "react";
import { downloadChart } from "../../utils";
import { SCREEN_WRAPPER_ID } from "../../constants";
import { useScreenOverride } from "../useScreenOverride";
import { ScreenOverrideContext } from "../../context";

/**
 * ===============================================================
 * useChartsAction Hook
 * ===============================================================
 * useChartsAction Hook arguments
 * @param downloadFileName - The download file name
 * @param fullScreenTargetContainer - id of the container
 * @param replaceContentOnFullScreen - boolean flag to replace children of the target container while rendering the chart in full screen mode
 */
interface UseChartsActionArgs {
  downloadFileName?: string;
  fullScreenTargetContainer?: string;
  replaceContentOnFullScreen?: boolean;
}

export function useChartsAction(args: UseChartsActionArgs) {
  const {
    downloadFileName,
    fullScreenTargetContainer = SCREEN_WRAPPER_ID,
    replaceContentOnFullScreen = false,
  } = args;

  const chartRef = useRef<HTMLDivElement | null>(null);
  const originalContentRef = useRef<HTMLElement[]>([]);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const screenOverride = useContext(ScreenOverrideContext);
  const setFullscreenExitHandler = screenOverride?.setFullscreenExitHandler;

  function handleDownLoad(e?: any) {
    downloadChart(chartRef, downloadFileName);
  }

  function onMaximize() {
    const container = document.getElementById(fullScreenTargetContainer);
    if (!container || !chartRef.current) return;

    if (replaceContentOnFullScreen) {
      // Save existing children
      originalContentRef.current = Array.from(
        container.children,
      ) as HTMLElement[];

      // Clear container
      container.innerHTML = "";

      // Append chart
      container.appendChild(chartRef.current);
    } else {
      // Ensure container can position children
      const computedStyle = window.getComputedStyle(container);
      if (computedStyle.position === "static") {
        container.style.position = "relative";
      }
    }

    setIsFullScreen(true);
  }
  function onMinimize() {
    if (replaceContentOnFullScreen) {
      const container = document.getElementById(fullScreenTargetContainer);
      if (!container || !chartRef.current) return;

      // Remove chart
      if (container.contains(chartRef.current)) {
        container.removeChild(chartRef.current);
      }

      // Restore original content
      originalContentRef.current.forEach((el) => {
        container.appendChild(el);
      });
    }
    setIsFullScreen(false);
  }

  useEffect(() => {
    if (!setFullscreenExitHandler) return;

    setFullscreenExitHandler(isFullScreen ? () => onMinimize() : null);

    return () => {
      setFullscreenExitHandler(null);
    };
  }, [isFullScreen, setFullscreenExitHandler]);

  /**
   * Style to apply on chart wrapper
   */
  const fullScreenStyle: React.CSSProperties = isFullScreen
    ? {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 999,
        background: "#fff", // optional (prevents overlap artifacts)
        padding: "16px", // optional spacing
        boxSizing: "border-box",
      }
    : {};

  return {
    chartRef,
    handleDownLoad,
    isFullScreen,
    onMaximize,
    onMinimize,
    fullScreenStyle,
  };
}


interface UseChartsActionArgsV2 {
  downloadFileName: string;
  renderFullScreen?: () => React.ReactNode;
}

function getScrollParent(element: HTMLElement | null): HTMLElement | null {
  let current = element?.parentElement ?? null;

  while (current) {
    const styles = window.getComputedStyle(current);
    const hasScrollableOverflow = /(auto|scroll)/.test(
      `${styles.overflow}${styles.overflowY}${styles.overflowX}`,
    );

    if (hasScrollableOverflow && current.scrollHeight > current.clientHeight) {
      return current;
    }

    current = current.parentElement;
  }

  return document.scrollingElement instanceof HTMLElement
    ? document.scrollingElement
    : null;
}

function scrollToTop(element: HTMLElement | null, behavior: ScrollBehavior) {
  if (!element) return;

  element.scrollTo({
    top: 0,
    behavior,
  });
}

export function useChartsActionV2(args: UseChartsActionArgsV2) {
  const { downloadFileName, renderFullScreen } = args;

  const chartRef = useRef<HTMLDivElement | null>(null);
  const { show, hide } = useScreenOverride();
  const sourceScrollParentRef = useRef<HTMLElement | null>(null);
  const sourceScrollTopRef = useRef<number | null>(null);

  function handleDownLoad() {
    downloadChart(chartRef, downloadFileName);
  }

  function restoreSourceScrollPosition() {
    const scrollParent = sourceScrollParentRef.current;
    const savedScrollTop = sourceScrollTopRef.current;

    if (!scrollParent || savedScrollTop == null) return;

    scrollParent.scrollTo({
      top: savedScrollTop,
      behavior: "auto",
    });
  }

  function onMaximize() {
    const chartElement = chartRef.current;
    const scrollParent = getScrollParent(chartElement);

    if (chartElement && scrollParent) {
      const parentTop = scrollParent.getBoundingClientRect().top;
      const chartTop = chartElement.getBoundingClientRect().top;
      const chartScrollTop = scrollParent.scrollTop + (chartTop - parentTop);

      sourceScrollParentRef.current = scrollParent;
      sourceScrollTopRef.current = scrollParent.scrollTop;

      scrollParent.scrollTo({
        top: chartScrollTop,
        behavior: "auto",
      });
    }

    requestAnimationFrame(() => {
      show(renderFullScreen?.(), {
        onHide: () => {
          requestAnimationFrame(() => {
            restoreSourceScrollPosition();
          });
        },
      });

      requestAnimationFrame(() => {
        const overrideChartElement = chartRef.current;
        const overrideScrollParent = getScrollParent(overrideChartElement);

        scrollToTop(overrideScrollParent, "auto");

        if (
          document.scrollingElement instanceof HTMLElement &&
          document.scrollingElement !== overrideScrollParent
        ) {
          scrollToTop(document.scrollingElement, "auto");
        }
      });
    });
  }

  function onMinimize() {
    restoreSourceScrollPosition();
    hide();
  }

  return {
    chartRef,
    handleDownLoad,
    onMaximize,
    onMinimize,
  };
}
