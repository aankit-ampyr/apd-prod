import {useEffect, useRef} from 'react';
import {Blocker, useBlocker} from 'react-router-dom';

export function useUnsavedChangesNavigationBlocker(shouldBlock: boolean, onBlock: (blocker: Blocker) => void) {
  const blocker = useBlocker(shouldBlock);
  const onBlockRef = useRef(onBlock);

  useEffect(() => {
    onBlockRef.current = onBlock;
  }, [onBlock]);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      onBlockRef.current(blocker);
    }
  }, [blocker, blocker.state]);

  return blocker;
}
