import { tr } from "@/i18n/core";
import Button from "@/components/ui/button/Button";
import type { ReactNode } from "react";
import { Modal } from "./index";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: ReactNode;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button for destructive actions. */
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = tr("common.confirm"),
  cancelLabel = tr("common.cancel"),
  destructive = false,
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false} className="m-4 max-w-md p-6 sm:p-8">
      <div role="alertdialog" aria-modal="true">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h3>
        {message && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{message}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? "danger" : "primary"} size="sm" onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
