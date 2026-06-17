import { useEffect, useRef, useCallback } from "react";
import { sessionIdleTimeout } from "../../constants";

type UseInactivityTimerProps = {
  timeout?: number; // in ms
  onInactivity: () => void;
  enabled?: boolean;
};

export const useInactivityTimer = ({
  timeout = sessionIdleTimeout,
  onInactivity,
  enabled = true,
}: UseInactivityTimerProps) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      onInactivity();
    }, timeout);
  }, [timeout, onInactivity]);

  useEffect(() => {
    if (!enabled) return;

    const events = [
      "mousemove",
      "mousedown",
      "click",
      "scroll",
      "keydown",
      "touchstart",
    ];

    const handleActivity = () => {
      resetTimer();
    };

    events.forEach((event) =>
      window.addEventListener(event, handleActivity, { passive: true })
    );

    // Start timer initially
    resetTimer();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      events.forEach((event) =>
        window.removeEventListener(event, handleActivity)
      );
    };
  }, [enabled, resetTimer]);

  return {
    resetTimer, // optional manual reset
  };
};