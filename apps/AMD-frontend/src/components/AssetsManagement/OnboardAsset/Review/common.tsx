import {Icon, Text, Tooltip} from '@/ui-kits';
import { cn } from '@/utils';

export interface EditableSectionChildrenProps {
  isEditing: boolean;
  onCancelEdit?: () => void;
}

/**
 * ===============================================================
 * Key Value Display
 * ===============================================================
 * Renders a label-value pair in a horizontal layout.
 *
 * @param label - The label or key (e.g. "Name", "Capacity")
 * @param value - The formatted value to display
 */
interface KeyValueDisplayProps {
  label: string;
  value: string;
  className?: string;
}
export function KeyValueDisplay(props: KeyValueDisplayProps) {
  const {label, value, className} = props;
  return (
    <div className={cn('flex min-w-0 items-start gap-2', className)}>
      <Text variant="14R" className="shrink-0 text-text-primary! text-nowrap">
        {label} :
      </Text>
      <Text
        variant="free"
        className="min-w-0 flex-1 wrap-break-word whitespace-normal font-InterSemiBold text-caption text-text-primary">
        {value}
      </Text>
    </div>
  );
}


/**
 * ===============================================================
 * Section Frame component
 * ===============================================================
 * Wrapper component for displaying a section with optional edit mode
 *
 * @param title - Title displayed at the top of the section
 * @param editable - Enables edit functionality and shows edit button when true
 * @param children - Render function that receives editing state and actions
 *
 * children params:
 * @param isEditing - Indicates whether the section is currently in edit mode
 * @param onCancelEdit - Callback to exit edit mode and switch back to view mode
 */


export interface EditableSectionProps {
  title: string;
  isEditing?: boolean; // whether the section is in edit mode, default is false (view mode)
  onEdit?: () => void; // callback when edit button is clicked
  onCancel?: () => void; // callback when cancel button is clicked
  editable?: boolean;
  showEditAction?: boolean;
  editDisabledReason?: string;
  headerContent?: React.ReactNode;
  children: (props: EditableSectionChildrenProps) => React.ReactNode;
}

export function SectionFrame(props: EditableSectionProps) {
  const {
    title,
    editable = false,
    showEditAction = editable,
    editDisabledReason,
    children,
    isEditing = false,
    onCancel,
    onEdit,
    headerContent,
  } = props;

  return (
    <div className="w-full rounded-lg border border-border shadow-md shadow-border/40 transform-gpu">
      <div className="rounded-t-lg bg-linear-to-r py-4 pl-6 pr-4 flex justify-between from-primary-tint-2 to-[#C6ECE8]">
        <Text variant="free" className="font-SpaceGroteskBold! text-[22px]">
          {title}
        </Text>
        {showEditAction && !isEditing && (
          <span className="relative group z-10 translate-x-1 overflow-visible">
            {editDisabledReason ? (
              <Tooltip
                message={editDisabledReason}
                position="top"
                className="-translate-y-1 left-1/2 max-w-52 whitespace-normal wrap-break-word px-2 -translate-x-[56%]"
                arrowClassName="w-3 h-3 -mt-1.5 left-1/2 -translate-x-1/2"
              />
            ) : null}
            <button
              disabled={!editable}
              onClick={() => onEdit?.()}
              className={cn(
                'bg-white size-8 flex justify-center items-center rounded-sm',
                editable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
              )}>
              <Icon name="pencil" />
            </button>
          </span>
        )}
        {headerContent}
      </div>
      <div className="px-6 py-6">{children({isEditing, onCancelEdit: onCancel})}</div>
    </div>
  );
}
