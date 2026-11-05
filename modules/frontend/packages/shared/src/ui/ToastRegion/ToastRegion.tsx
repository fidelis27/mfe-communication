import React from "react";
import { Button } from "../Button";
import { cx } from "../classNames";
import { AlertIcon, CheckIcon, CloseIcon, InfoIcon } from "../icons";
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
          <span aria-hidden="true" className={styles.icon}>
            {notice.kind === "success" ? (
              <CheckIcon size={18} />
            ) : notice.kind === "error" ? (
              <AlertIcon size={18} />
            ) : (
              <InfoIcon size={18} />
            )}
          </span>
          <p>{notice.message}</p>
          <Button
            aria-label={`Dispensar notificação: ${notice.message}`}
            className={styles.dismiss}
            iconOnly
            leadingIcon={<CloseIcon />}
            onClick={() => onDismiss(notice.id)}
            size="sm"
            variant="ghost"
          />
        </div>
      ))}
    </div>
  );
}
