import React from "react";
import { cx } from "../classNames";
import styles from "./Skeleton.module.css";

export interface SkeletonProps {
  label?: string;
  variant?: "text" | "card";
  className?: string;
}

export function Skeleton({ label = "Carregando", variant = "text", className }: SkeletonProps) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      className={cx(styles, "skeleton", variant, className)}
      role="status"
    >
      <span className={styles.srOnly}>{label}</span>
      <span aria-hidden="true" className={styles.shape} />
    </div>
  );
}
