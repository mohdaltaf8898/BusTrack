"use client";

import type { ReactNode } from "react";
import { BottomSheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * Modal dialog. On phones it is a bottom sheet that can be swiped away; from
 * the `sm` breakpoint up it is a centred panel that scales in. Scroll lock,
 * Escape handling and focus restoration come from the shared sheet.
 */
export function Dialog({ open, onClose, title, description, children, footer, className }: DialogProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={footer}
      className={className}
      presentation="auto"
      closeLabel="Close dialog"
    >
      {children}
    </BottomSheet>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
