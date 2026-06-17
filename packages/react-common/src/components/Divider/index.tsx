import { cn } from '../../utils';
import {HTMLProps} from 'react';

interface DividerProps extends HTMLProps<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  style?: React.CSSProperties;
};

export function Divider({style, className, orientation = 'horizontal', ...props }: DividerProps) {
  return (
    <div
      style={style}
      className={cn(
        'bg-bg-card',
        orientation === 'horizontal' ? 'h-px w-full' : 'w-px self-stretch',
        className

      )}
      {...props}
    />
  );
}