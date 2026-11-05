import React, { type ReactNode } from "react";
import { cx } from "../classNames";
import { InfoIcon } from "../icons";
import styles from "./EmptyState.module.css";

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  iconTone?: "brand" | "danger";
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  icon = <InfoIcon size={20} />,
  iconTone = "brand",
  className,
}: EmptyStateProps) {
  return (
    <section className={cx(styles, "empty", className)}>
      {icon && (
        <span
          aria-hidden="true"
          className={cx(styles, "icon", iconTone === "danger" && "iconDanger")}
        >
          {icon}
        </span>
      )}
      <h2 className={styles.title}>{title}</h2>
      {description && <div className={styles.description}>{description}</div>}
      {action && <div className={styles.action}>{action}</div>}
    </section>
  );
}
