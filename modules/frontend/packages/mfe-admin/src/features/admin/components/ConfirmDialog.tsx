import React from "react";
import type { ConfirmDialogState } from "../types";

export function ConfirmDialog({
  dialog,
  busy,
  onCancel,
}: {
  dialog: ConfirmDialogState;
  busy: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="confirm-backdrop">
      <section
        aria-describedby="confirm-description"
        aria-labelledby="confirm-title"
        aria-modal="true"
        className="confirm-dialog"
        role="alertdialog"
      >
        <p className="eyebrow">Confirmação necessária</p>
        <h2 id="confirm-title">{dialog.title}</h2>
        <p id="confirm-description">{dialog.description}</p>
        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button
            type="button"
            className={dialog.tone === "danger" ? "danger-button" : undefined}
            onClick={() => void dialog.onConfirm()}
            disabled={busy}
          >
            {busy ? "Salvando..." : dialog.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
