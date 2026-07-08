import {cn} from '../../utils';
import React from 'react';
import {tv, type VariantProps} from 'tailwind-variants';
import {Text, type TextVariantType} from '../Text';
import { Icon } from '../Icon';

const checkboxStyles = tv({
  slots: {
    container: 'inline-flex items-center gap-2',
    base: 'border relative',
    icon: ' absolute left-1/2 text-primary top-1/2 -translate-x-1/2 -translate-y-1/2',
    line: 'w-[10px] h-[2px] bg-primary rounded-sm absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
    label: '',
  },
  variants: {
    size: {
      sm: {
        base: 'size-4 rounded-xs',
        icon: 'size-[10px]',
        line: 'w-[10px] h-[2px]'
      },
      md: {
        base: 'size-5 rounded-[6px]',
        icon: 'size-3',
        line: 'w-3 h-[2px]'
      },
    },
    state: {
      unchecked: {
        base: 'border-disabled hover:border-primary',
      },
      checked: {
        base: 'border-primary',
      },
      indeterminate: {
        base: 'border-primary',
      },
    },
    disabled: {
      true: {
        base: 'cursor-not-allowed border-disabled bg-bg-card text-disabled hover:border-disabled',
        icon: 'text-disabled',
        line: 'bg-disabled',
      },
      false: {
        base: 'cursor-pointer'
      },
    },
  },
  defaultVariants: {
    size: 'sm',
    state: 'unchecked',
    disabled: false,
  },
});
type CheckboxVariants = VariantProps<typeof checkboxStyles>;

const checkBoxLabelVariant: Record<NonNullable<CheckboxVariants['size']>, TextVariantType> = {
    md: 'body1',
    sm: 'caption'
}

interface CheckboxProps {
  checked?: boolean;
  indeterminate?: boolean;
  size?: CheckboxVariants['size'];
  label?: string | React.ReactNode;
  className?: string,
  labelClassName?: string;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  iconColor?: string;
  checkedBorderColor?: string;
}

export const Checkbox: React.FC<CheckboxProps> = props => {
  const {
    checked = false,
    indeterminate = false,
    size = 'sm',
    disabled = false,
    className,
    labelClassName,
    label,
    onCheckedChange,
    iconColor,
    checkedBorderColor,
    ...rest
  } = props;

  const currentState: NonNullable<CheckboxVariants['state']> = indeterminate ? 'indeterminate' : checked ? 'checked' : 'unchecked';
  const {container, base, icon, line, label: labelStyle} = checkboxStyles({size, state: currentState, disabled});

  const handleClick = () => {
    if (!disabled) {
      const nextCheckedValue = indeterminate ? true : !checked;
      onCheckedChange?.(nextCheckedValue);
    }
  };

  const checkedStyle = currentState === 'checked' && checkedBorderColor
    ? {borderColor: checkedBorderColor}
    : undefined;
  const checkedIconStyle = currentState === 'checked' && iconColor
    ? {color: iconColor}
    : undefined;

  return (
    <div className={container()}>
      <button
        type="button"
        role="checkbox"
        aria-checked={indeterminate ? 'mixed' : checked}
        disabled={disabled}
        className={cn(base(), className)}
        style={checkedStyle}
        onClick={handleClick}
        {...rest}
      >
        {currentState === 'checked' && (
          <Icon strokeWidth={3} name="tick" className={icon()} style={checkedIconStyle} />
        )}
        {currentState === 'indeterminate' && (
          <div className={line()} />
        )}
      </button>
      {label && (
        <Text variant={checkBoxLabelVariant[size]} className={cn(labelStyle(), labelClassName)}>
          {label}
        </Text>
      )}
    </div>
  );
};
