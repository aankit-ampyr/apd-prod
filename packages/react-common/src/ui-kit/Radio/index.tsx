import {cn} from '../../utils';
import React from 'react';
import {tv, type VariantProps} from 'tailwind-variants';
import {Text, type TextVariantType} from '../Text';

const radioStyles = tv({
  slots: {
    container: 'inline-flex items-center gap-2',
    base: 'relative inline-flex items-center justify-center rounded-full border outline-none transition-colors',
    dot: 'rounded-full transition-colors',
    label: '',
  },
  variants: {
    size: {
      sm: {
        base: 'size-3.5',
        dot: 'size-1.5',
      },
      md: {
        base: 'size-4',
        dot: 'size-2',
      },
    },
    checked: {
      true: {
        base: 'border-primary',
        dot: 'bg-primary',
      },
      false: {
        base: 'border-disabled hover:border-primary',
        dot: 'bg-transparent',
      },
    },
    disabled: {
      true: {
        base: 'cursor-not-allowed  bg-bg-card',
        // Do not override dot color when disabled; keep as per checked state
        label: 'text-disabled',
      },
      false: {
        base: 'cursor-pointer',
      },
    },
  },
  compoundVariants: [
    {
      checked: false,
      disabled: true,
      class: {
        dot: 'bg-transparent',
      },
    },
  ],
  defaultVariants: {
    size: 'sm',
    checked: false,
    disabled: false,
  },
});

type RadioVariants = VariantProps<typeof radioStyles>;

const radioLabelVariant: Record<NonNullable<RadioVariants['size']>, TextVariantType> = {
  md: 'body1',
  sm: 'caption',
};

interface RadioProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean;
  size?: RadioVariants['size'];
  label?: string;
  className?: string;
  labelClassName?: string;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Radio: React.FC<RadioProps> = props => {
  const {
    checked = false,
    size = 'sm',
    label,
    className,
    labelClassName,
    disabled = false,
    onCheckedChange,
    onClick,
    ...rest
  } = props;

  const {container, base, dot, label: labelStyle} = radioStyles({size, checked, disabled});

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      onCheckedChange?.(true);
    }
    onClick?.(event);
  };

  return (
    <div className={container()}>
      <button
        type="button"
        role="radio"
        aria-checked={checked}
        disabled={disabled}
        className={cn(base(), className)}
        onClick={handleClick}
        {...rest}
      >
        {checked ? <span className={dot()} /> : null}
      </button>
      {label ? (
        <Text variant={radioLabelVariant[size]} className={cn(labelStyle(), labelClassName)}>
          {label}
        </Text>
      ) : null}
    </div>
  );
};
