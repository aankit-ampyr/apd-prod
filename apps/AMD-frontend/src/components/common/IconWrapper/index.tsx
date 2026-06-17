import {IconTypes} from '@/interface';
import {Icon} from '@/ui-kits';
import { cn } from '@/utils';

interface IconWrapperProps {
  icon: IconTypes;
  className?: string;
}
export function IconWrapper(props: IconWrapperProps) {
  const {icon, className=''} = props;
  return (
    <div className={cn('size-10 flex justify-center items-center rounded-md aspect-square bg-aqua', className)}>
      <Icon name={icon} className='text-text-primary! size-5'/>
    </div>
  );
}
