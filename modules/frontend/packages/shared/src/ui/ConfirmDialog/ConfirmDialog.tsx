import React, { useId, useRef, useState } from "react";
import { Button } from "../Button";
import { AlertIcon } from "../icons";
import { Modal } from "../Modal";
import styles from "./ConfirmDialog.module.css";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  tone = "default",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const isBusy = busy || pending;

  async function submitConfirmation() {
    setActionError(undefined);
    setPending(true);
    try {
      await onConfirm();
      onCancel();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Não foi possível concluir a ação.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      closeOnBackdrop={!isBusy}
      closeOnEscape={!isBusy}
      describedBy={`${id}-description`}
      initialFocusRef={tone === "danger" ? cancelRef : confirmRef}
      labelledBy={`${id}-title`}
      onClose={onCancel}
      open={open}
      role="alertdialog"
    >
      <header className={styles.header}>
        {tone === "danger" && (
          <span aria-hidden="true" className={styles.dangerIcon}>
            <AlertIcon size={20} />
          </span>
        )}
        <div>
          <p className={styles.eyebrow}>Confirmação necessária</p>
          <h2 className={styles.title} id={`${id}-title`}>
            {title}
          </h2>
        </div>
      </header>
      <p className={styles.description} id={`${id}-description`}>
        {description}
      </p>
      {actionError && (
        <p className={styles.error} role="alert">
          <AlertIcon size={16} />
          {actionError}
        </p>
      )}
      <div className={styles.actions}>
        <Button disabled={isBusy} onClick={onCancel} ref={cancelRef} variant="secondary">
          {cancelLabel}
        </Button>
        <Button
          disabled={isBusy}
          loading={isBusy}
          onClick={() => void submitConfirmation()}
          ref={confirmRef}
          variant={tone === "danger" ? "danger" : "primary"}
        >
          {isBusy ? "Salvando..." : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
