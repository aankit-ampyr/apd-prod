import {cn} from '../../utils';
import React from 'react';
import {tv, type VariantProps} from 'tailwind-variants';
import {Text} from '../Text';

const toggleStyles = tv({
  slots: {
    container: 'flex items-center gap-2',
    base: 'rounded-pill relative outline-none focus:ring-2 focus:ring-primary-tint-1/10 p-[2px] cursor-pointer disabled:cursor-disabled disabled:opacity-40 disabled:cursor-not-allowed',
    thumb: 'absolute top-1/2 -translate-y-1/2 rounded-full bg-white transition-all duration-200',
    label: 'text-secondary',
  },
  variants: {
    size: {
      sm: {
        base: 'w-9 h-5',
        thumb: 'size-4',
      },
      md: {
        base: 'w-[44px] h-6',
        thumb: 'size-5',
      },
    },
    state: {
      on: {
        base: 'bg-primary',
        thumb: 'right-[2px]',
      },
      off: {
        base: 'bg-disabled',
        thumb: 'left-[2px]',
      },
    },
  },
  defaultVariants: {
    size: 'md',
    state: 'off',
  },
});
type ToggleVariants = VariantProps<typeof toggleStyles>;

interface ToggleProps {
  size?: ToggleVariants['size'];
  value: boolean;
  onToggle: (value: boolean) => void;
  className?: string;
  thumbClassName?: string;
  disabled?: boolean;
  label?: string;
  labelClassName?: string;
  onFocus?: React.FocusEventHandler<HTMLButtonElement>;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
}

export const Toggle: React.FC<ToggleProps> = (props: ToggleProps) => {
  const {size, value, onToggle, className, thumbClassName, disabled = false, label, labelClassName, onBlur, onFocus} = props;

  const {base, thumb, container, label: labelStyle} = toggleStyles({size, state: value ? 'on' : 'off'});

  const handleToggle = () => {
    onToggle(!value);
  };
  return (
    <div className={container()}>
      <button onFocus={onFocus} onBlur={onBlur} className={cn(base(), className)} onClick={handleToggle} disabled={disabled}>
        <span className={cn(thumb(), thumbClassName)} />
      </button>
      {label && <Text className={cn(labelStyle(), labelClassName)} variant="caption">{label}</Text>}
    </div>
  );
};
