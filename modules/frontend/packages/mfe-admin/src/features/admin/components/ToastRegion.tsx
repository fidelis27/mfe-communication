import React from "react";
import type { Notice } from "../types";

export function ToastRegion({
  notices,
  onDismiss,
}: {
  notices: Notice[];
  onDismiss: (id: number) => void;
}) {
  if (!notices.length) return null;

  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      {notices.map((notice) => (
        <section
          className={notice.kind === "error" ? "toast error" : "toast"}
          key={notice.id}
          role={notice.kind === "success" ? "status" : "alert"}
        >
          <p>{notice.message}</p>
          <button type="button" className="toast-dismiss" onClick={() => onDismiss(notice.id)}>
            Dispensar
          </button>
        </section>
      ))}
    </div>
  );
}
