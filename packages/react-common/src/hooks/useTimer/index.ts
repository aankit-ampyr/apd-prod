import {useState, useEffect, useRef} from 'react';

interface UseSecondsTimerInterface {
  refferenceTimeStamp: string | null;
  timerLimit: number;
  onTimerEnd?: () => void;
}
export function useSecondsTimer(args: UseSecondsTimerInterface) {
  const {refferenceTimeStamp, timerLimit, onTimerEnd} = args;
  const [timerState, setTimerState] = useState<number>(0);
  const hasCalledCallback = useRef(false); // Prevent multiple calls

  useEffect(() => {
    const updateTimer = () => {
      if (refferenceTimeStamp) {
        const timeElapsed = Math.floor(
          (Date.now() - new Date(refferenceTimeStamp).getTime()) / 1000,
        );
        const newRemainingTime = Math.max(timerLimit - timeElapsed, 0);
        setTimerState(newRemainingTime);

        // Call callback only once when timer reaches 0
        if (newRemainingTime === 0 && !hasCalledCallback.current && onTimerEnd) {
          hasCalledCallback.current = true;
          onTimerEnd();
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [refferenceTimeStamp, timerLimit, onTimerEnd]);

  return timerState;
}
