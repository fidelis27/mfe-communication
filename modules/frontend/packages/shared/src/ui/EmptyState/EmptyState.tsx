import React, { type ReactNode } from "react";
import { cx } from "../classNames";
import styles from "./EmptyState.module.css";

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <section className={cx(styles, "empty", className)}>
      <h2 className={styles.title}>{title}</h2>
      {description && <div className={styles.description}>{description}</div>}
      {action && <div className={styles.action}>{action}</div>}
    </section>
  );
}
