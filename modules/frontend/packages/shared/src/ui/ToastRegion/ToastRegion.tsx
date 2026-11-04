import React from "react";
import { Button } from "../Button";
import { cx } from "../classNames";
import styles from "./ToastRegion.module.css";

export interface ToastNotice {
  id: string | number;
  kind: "success" | "error" | "info";
  message: string;
}

export interface ToastRegionProps {
  notices: readonly ToastNotice[];
  onDismiss: (id: ToastNotice["id"]) => void;
  label?: string;
}

export function ToastRegion({ notices, onDismiss, label = "Notificações" }: ToastRegionProps) {
  if (!notices.length) return null;

  return (
    <div aria-label={label} aria-live="polite" className={styles.region} role="region">
      {notices.map((notice) => (
        <div
          className={cx(styles, "toast", notice.kind)}
          key={notice.id}
          role={notice.kind === "error" ? "alert" : "status"}
        >
          <p>{notice.message}</p>
          <Button
            aria-label={`Dispensar notificação: ${notice.message}`}
            className={styles.dismiss}
            onClick={() => onDismiss(notice.id)}
            variant="secondary"
          >
            Dispensar
          </Button>
        </div>
      ))}
    </div>
  );
}
