import React, { type HTMLAttributes } from "react";
import { cx } from "../classNames";
import styles from "./StatusBadge.module.css";

export type StatusTone = "success" | "warning" | "danger" | "neutral";

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
}

export function StatusBadge({ tone = "neutral", className, ...props }: StatusBadgeProps) {
  return <span {...props} className={cx(styles, "badge", tone, className)} />;
}
