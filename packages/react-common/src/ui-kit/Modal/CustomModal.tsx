import { cn } from '../../utils/common.utils';
import { type PropsWithChildren, useRef, useEffect, type MouseEvent } from 'react';

/**
 * CustomModal component
 * @param {object} props - Modal props
 * @param {boolean} props.open - Controls modal visibility
 * @param {() => void} [props.onClose] - Callback for closing modal
 * @param {string} [props.className] - Additional class names
 * @param {number} props.maxWidth - Maximum width of modal
 * @param {React.ReactNode} props.children - Modal content
 */
export interface CustomModalProps extends PropsWithChildren {
  open: boolean;
  onClose?: () => void;
  className?: string;
  maxWidth: number;
}

export const CustomModal: React.FC<CustomModalProps> = ({
  children,
  open,
  onClose,
  className,
  maxWidth,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current) {
      onClose?.();
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/25"
      onClick={handleBackdropClick}
      data-testid="custom-modal-backdrop"
    >
      <div
        style={{ maxWidth: `min(calc(100% - 1.5rem), ${maxWidth}px)` }}
        className={cn(
          'bg-white overflow-visible w-full m-auto py-6 px-8 rounded-xl box-border',
          className,
        )}
        data-testid="custom-modal-content"
      >
        {children}
      </div>
    </div>
  );
};

interface ModalProps extends PropsWithChildren {
  open: boolean;
  onClose?: () => void;
  className?: string;
  maxWidth: number;
}
export const Modal: React.FC<ModalProps> = props => {
  const {children, open, onClose, className, maxWidth} = props;
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();

      // Blur whatever the browser auto-focused inside the dialog
      const focused = dialogRef.current?.querySelector<HTMLElement>(':focus');
      focused?.blur();
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    // Close modal when clicking on the backdrop (the dialog element itself)
    if (e.target === dialogRef.current) {
      onClose?.();
    }
  };

  return (
    <dialog
      autoFocus={false}
      style={{display: open ? undefined : 'none', maxWidth: `min(calc(100% - 1.5rem), ${maxWidth}px)`}}
      className={cn(
        `bg-white overflow-visible w-full m-auto py-6 px-8 rounded-xl box-border backdrop:bg-black/25`,
        className,
      )}
      ref={dialogRef}
      onClick={handleBackdropClick}>
      {children}
    </dialog>
  );
};