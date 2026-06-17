import React from 'react';
import {Text} from '../Text';
import {Icon, type IconTypes} from '../Icon';
import {tv, type VariantProps} from 'tailwind-variants';

/**
 * Toast Viriants
 */
const toastStyles = tv({
  slots: {
    base: 'p-3 rounded-md w-fit gap-2 flex items-center border border-transparent',
    iconContainer: 'size-4 rounded-xs flex items-center justify-center flex-shrink-0',
    text: 'font-InterMedium! text-caption! grow whitespace-nowrap',
    closeIcon: 'size-3 cursor-pointer',
  },
  variants: {
    type: {
      default: {
        base: 'bg-white border-[#FBFBFB] shadow-lg shadow-secondary/7',
        iconContainer: 'bg-secondary',
        text: '',
        closeIcon: 'text-secondary',
      },
      info: {
        base: 'border-blue bg-[#EDF2FD]',
        iconContainer: 'bg-blue',
        closeIcon: 'text-blue',
      },
      success: {
        base: 'border-success bg-[#E5FCF1]',
        iconContainer: 'bg-success',
        closeIcon: 'text-success',
      },
      error: {
        base: 'border-error bg-[#FDECEC]',
        iconContainer: 'bg-error',
        closeIcon: 'text-error',
      },
    },
  },
  defaultVariants: {
    type: 'default',
  },
});
type ToastVariants = VariantProps<typeof toastStyles>;
export type ToastType = NonNullable<ToastVariants['type']>;

/**
 * toast icons variants
 */
const toastIcons: Record<ToastType, IconTypes> = {
  default: 'info',
  error: 'exclamation',
  info: 'info',
  success: 'tick',
};
/**
 * Toast Component
 */
interface ToastProps {
  title: string;
  type: ToastType;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = props => {
  const {title, type = 'default', onDismiss} = props;
  const {base, iconContainer, text, closeIcon} = toastStyles({type});

  const iconName = toastIcons[type];

  return (
    <div className={base()}>
      <div className={iconContainer()}>
        <Icon name={iconName} className="text-white size-2.5" />
      </div>
      <Text className={text()}>{title}</Text>
      <Icon name="cross" className={closeIcon()} onClick={onDismiss} />
    </div>
  );
};
