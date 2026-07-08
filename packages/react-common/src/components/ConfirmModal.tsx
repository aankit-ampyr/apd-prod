import React, { useEffect } from "react";
import { Button, Modal, Text } from "../ui-kit";
import { cn } from "../utils";
import {
  type ConfirmModalClassNames,
  type ConfirmModalStyles,
  type ConfirmRenderFn,
  type ConfirmRenderProps,
} from "../context/ConfirmContext";

type ConfirmModalProps = {
  open: boolean;
  title?: React.ReactNode;
  message?: React.ReactNode;
  confirmText?: React.ReactNode;
  cancelText?: React.ReactNode;
  classNames?: ConfirmModalClassNames;
  styles?: ConfirmModalStyles;
  render?: ConfirmRenderFn;
  onConfirm: () => void;
  onCancel: () => void;
};

const DefaultConfirmBody = ({
  title,
  message,
  confirmText,
  cancelText,
  classNames,
  styles,
  confirm,
  cancel,
}: {
  title?: React.ReactNode;
  message?: React.ReactNode;
  confirmText?: React.ReactNode;
  cancelText?: React.ReactNode;
  classNames?: ConfirmModalClassNames;
  styles?: ConfirmModalStyles;
  confirm: () => void;
  cancel: () => void;
}) => (
  <Modal open onClose={cancel} maxWidth={640} className={cn("w-auto min-w-100", classNames?.modal)}>
    <div style={styles?.modal}>
      <div className="relative mb-4">
        {title ? (
          <Text
            variant="h3"
            className={cn("font-InterBold!", classNames?.title)}
            style={styles?.title}
          >
            {title}
          </Text>
        ) : null}
      </div>
      <div className="flex flex-col gap-6">
        {message ? (
          <Text
            variant="largeBody"
            className={cn("leading-[30px]", classNames?.message)}
            style={styles?.message}
          >
            {message}
          </Text>
        ) : null}
        <div className={cn("mt-1 flex justify-end gap-3", classNames?.footer)} style={styles?.footer}>
          <Button
            variant="secondary"
            onClick={cancel}
            className={cn("min-w-28 justify-center", classNames?.cancelButton)}
            textClassName={cn("text-[#1B988B]!", classNames?.cancelButton)}
            style={styles?.cancelButton}
          >
            {cancelText ?? "Cancel"}
          </Button>
          <Button
            onClick={confirm}
            className={cn("min-w-28 justify-center", classNames?.confirmButton)}
            textClassName={classNames?.confirmButton}
            style={styles?.confirmButton}
          >
            {confirmText ?? "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  </Modal>
);

export const ConfirmModal = ({
  open,
  title,
  message,
  confirmText,
  cancelText,
  classNames,
  styles,
  render,
  onConfirm,
  onCancel,
}: ConfirmModalProps) => {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const renderProps: ConfirmRenderProps = {
    onConfirm,
    onCancel,
  };

  const content = render
    ? render(renderProps)
    : (
      <DefaultConfirmBody
        title={title}
        message={message}
        confirmText={confirmText}
        cancelText={cancelText}
        classNames={classNames}
        styles={styles}
        confirm={onConfirm}
        cancel={onCancel}
      />
    );

  return content;
};
