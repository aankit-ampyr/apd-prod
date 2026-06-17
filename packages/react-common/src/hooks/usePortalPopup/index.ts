import { useState, useRef, useEffect } from "react";
import type { PopupRect } from "../../interface";

interface UsePortalPopupProps {
  isOpen: boolean;
  usePortal?: boolean;
  offset?: number;
  advancedPositioning?: boolean;
}

export const usePortalPopup = ({
  isOpen,
  usePortal = false,
  offset = 10,
  advancedPositioning = false,
}: UsePortalPopupProps) => {
  const triggerRef = useRef<HTMLElement | null>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);

  const [rect, setRect] = useState<PopupRect | null>(null);

  const measure = () => {
    if (!triggerRef.current) return;

    if (advancedPositioning && portalRef.current) {
      if (!triggerRef.current) return;

      const trigger = triggerRef.current.getBoundingClientRect();
      const portal = portalRef.current?.getBoundingClientRect();

      if (!portal) {
        // ⛔ don't calculate advanced positioning yet
        setRect({
          top: trigger.bottom + offset,
          left: trigger.left,
          width: trigger.width,
          height: trigger.height,
        });
        return;
      }

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const popupWidth = portal?.width ?? 300;
      const popupHeight = portal?.height ?? 350;

      let top = trigger.bottom + offset;
      let left = trigger.left;

      // 🔽 Flip vertically
      if (top + popupHeight > viewportHeight) {
        top = trigger.top - popupHeight - offset;
      }

      // Try RIGHT alignment if overflow
      if (left + popupWidth > viewportWidth) {
        left = trigger.right - popupWidth;
      }

      // Final clamp (safe guard)
      if (left < 8) left = 8;
      if (left + popupWidth > viewportWidth) {
        left = viewportWidth - popupWidth - 8;
      }

      if (top < 8) top = 8;

      setRect({ top, left, width: trigger.width, height: trigger.height });
    } else {
      const r = triggerRef.current.getBoundingClientRect();

      setRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      });
    }
  };
  useEffect(() => {
    if (!usePortal || !isOpen) return;

    let rafId: number;

    const measureWhenReady = () => {
      const portalEl = portalRef.current;

      if (portalEl) {
        const rect = portalEl.getBoundingClientRect();

        // ✅ only measure when portal has real size
        if (rect.width > 0 && rect.height > 0) {
          measure();
          return;
        }
      }

      // ⏳ try again next frame
      rafId = requestAnimationFrame(measureWhenReady);
    };

    // initial trigger-based measure (optional, keeps your behavior)
    measure();

    rafId = requestAnimationFrame(measureWhenReady);

    return () => cancelAnimationFrame(rafId);
  }, [isOpen, usePortal]);

  useEffect(() => {
    if (!portalRef.current) return;

    const observer = new ResizeObserver(() => {
      measure();
    });

    observer.observe(portalRef.current);

    return () => observer.disconnect();
  }, [isOpen]);

  useEffect(() => {
    if (!usePortal || !isOpen) return;

    const handlePositionUpdate = () => measure();
    window.addEventListener("scroll", handlePositionUpdate, true);
    window.addEventListener("resize", handlePositionUpdate);

    return () => {
      window.removeEventListener("scroll", handlePositionUpdate, true);
      window.removeEventListener("resize", handlePositionUpdate);
    };
  }, [isOpen, usePortal, measure]);

  const style =
    rect && usePortal
      ? {
        position: "fixed" as const,
        top: rect.top + rect.height + offset,
        left: rect.left,
        width: rect.width,
      }
      : undefined;

  return {
    triggerRef,
    portalRef,
    rect,
    style,
  };
};
