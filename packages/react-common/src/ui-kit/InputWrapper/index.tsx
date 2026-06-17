import React, {type PropsWithChildren} from 'react';
import {tv, type VariantProps} from 'tailwind-variants';
import {cn} from '../../utils';

const inputWrapperStyles = tv({
  base: 'border rounded-sm border-border outline-none',
  variants: {
    state: {
      default: 'border-border',
      disabled: 'bg-gray-50',
      error: 'border-error ring-error-tint-1/10',
    },
    focus: {
      default: 'border-primary-tint-1 ring-3 ring-primary-tint-1/10',
      error: 'ring-3 ring-error-tint-1/10',
      none: '',
      filter: 'border-secondary!'
    },
  },
});

interface InputWrapperProps extends PropsWithChildren {
  state: NonNullable<VariantProps<typeof inputWrapperStyles>['state']>;
  focus: boolean;
  className?: string;
  isFilter?: boolean;
}
export const InputWrapper: React.FC<InputWrapperProps> = props => {
  const {children, state, focus, isFilter, className} = props;
  const focusValue = (() => {
    // if not focused 
    if (!focus) return 'none';

    // else if focused and filter enabled
    if (isFilter){
      return 'filter';
    }
    // else if focused and error is there
    if (state === 'error'){
      return 'error';
    }

    // return default focus
    return 'default';
    
  })();
  const base = inputWrapperStyles({state, focus: focusValue});
  return (
    <div className={cn(base, isFilter ? "h-9 flex items-center" : "", className)}>
      {children}
    </div>
  );
};
