import {cn} from '../../utils/common.utils';
import {forwardRef, type PropsWithChildren, HTMLProps} from 'react';
import {useWindowDimensions} from '../../hooks';
import {TABLET_SCREEN_BREAKPOINT} from '../../constants';

export const TextVariants = {
  // space grotesk headings
  h1: 'text-h1 leading-h1 font-InterBold',
  h2: 'text-h2 leading-h2 font-InterSemiBold',
  h3: 'text-h3 leading-h3 font-InterSemiBold',
  h4: 'text-h4 leading-h4 font-InterSemiBold',

  // inter headings
  subtitle1: 'text-subtitle-1 leading-subtitle-1 font-InterRegular',
  subtitle2: 'text-subtitle-2 leading-subtitle-2 font-InterRegular',
  largeBody: 'text-large-body leading-large-body font-InterMedium',
  body1: 'text-body-1 leading-body font-InterRegular',
  body2: 'text-body-2 leading-body font-InterMedium',
  caption: 'text-caption leading-caption font-InterRegular',
  caption2: 'text-caption leading-caption font-InterMedium',
  small: 'text-small leading-small font-InterRegular',

  // space grotesk buttons
  btnLarge: 'text-btn-large leading-btn-large font-InterSemiBold',
  btnMedium: 'text-btn-medium leading-btn-medium font-InterSemiBold',
  btnSmall: 'text-btn-small leading-btn-small font-InterSemiBold',

  // special variants
  '16B': 'text-body-1 leading-body font-InterBold',
  '16SB': 'text-body-1 leading-body font-InterSemiBold',
  '16M': 'text-body-1 leading-body font-InterMedium',
  '16R': 'text-body-1 leading-body font-InterRegular',

  '14L': 'text-caption leading-caption font-InterLight',
  '14R': 'text-caption leading-caption font-InterRegular',
  '14M': 'text-caption leading-caption font-InterMedium',
  '14SB': 'text-caption leading-caption font-InterSemiBold',
  '14B': 'text-caption leading-caption font-InterBold',

  '18R': 'text-large-body leading-large-body font-InterRegular',
  '18M': 'text-large-body leading-large-body font-InterMedium',
  '18SB': 'text-large-body leading-large-body font-InterSemiBold',
  '18B': 'text-large-body leading-large-body font-InterBold',

  '12R': 'text-small leading-small font-InterRegular',
  '12M': 'text-small leading-small font-InterMedium',
  '12SB': 'text-small leading-small font-InterSemiBold',

  // otp out of variants
  free: '',
};

export type TextVariantType = keyof typeof TextVariants;

interface TextProps extends PropsWithChildren<HTMLProps<HTMLParagraphElement>> {
  className?: string;
  variant?: keyof typeof TextVariants;
}

export const Text = forwardRef<HTMLParagraphElement, TextProps>((props, ref) => {
  const {children, className, variant = 'body1', style, ...rest} = props;
  const {width} = useWindowDimensions();
  const isTablet = width <= TABLET_SCREEN_BREAKPOINT;

  let appliedVariantClass = TextVariants[variant];
  if (isTablet && variant === 'h1') {
    appliedVariantClass = 'text-h2 leading-h2 font-InterBold';
  }

  return (
    <p
      ref={ref}
      style={{
        color: 'var(--color-text-primary)',
        ...style,
      }}
      className={cn(className, appliedVariantClass)}
      {...rest}>
      {children}
    </p>
  );
});
