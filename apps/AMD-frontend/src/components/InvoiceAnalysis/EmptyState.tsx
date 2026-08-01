import {Icon, Text} from '@/ui-kits';
import {IconName} from '@lazarus/react-common';
import {cn} from '@/utils';

interface EmptyStateProps {
  icon?: IconName;
  imageSrc?: string;
  title: string;
  subtitle: string;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  iconClassName?: string;
}

export function EmptyState({
  icon,
  imageSrc,
  title,
  subtitle,
  className,
  titleClassName,
  subtitleClassName,
  iconClassName,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center flex-col mx-auto mt-[80px]',
        'w-[736px] h-[229px] gap-[12px]',
        className,
      )}>
      {icon ? (
        <Icon name={icon} className={cn('w-[95px] h-[95px]', iconClassName)} />
      ) : imageSrc ? (
        <img src={imageSrc} alt="Empty state" className={cn('w-[95px] h-[95px]', iconClassName)} />
      ) : null}

      <Text
        variant="free"
        className={cn(
          'font-InterMedium text-center',
          'text-[22px] font-medium leading-[38px] tracking-[-0.5px] text-[var(--Secondary-Text,#4B5563)]!',
          titleClassName,
        )}>
        {title}
      </Text>

      <Text
        variant="free"
        className={cn(
          'font-InterRegular text-center',
          'text-[18px] font-normal leading-[30px] tracking-[-0.5px] text-[var(--Secondary-Text,#4B5563)]!',
          subtitleClassName,
        )}>
        {subtitle}
      </Text>
    </div>
  );
}
