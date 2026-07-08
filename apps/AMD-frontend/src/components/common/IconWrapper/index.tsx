import {IconTypes} from '@/interface';
import {Icon} from '@/ui-kits';
import {cn} from '@/utils';

interface IconWrapperProps {
  icon: IconTypes;
  className?: string;
  iconClassName?: string;
  style?: React.CSSProperties;
  iconColor?: string;
}
export function IconWrapper(props: IconWrapperProps) {
  const {icon, className = '', iconClassName = '', iconColor, style} = props;
  return (
    <div
      style={style}
      className={cn('size-10 flex justify-center items-center rounded-md aspect-square bg-aqua', className)}>
      <Icon name={icon} className={cn('text-text-primary! size-5', iconClassName)} color={iconColor} />
    </div>
  );
}
