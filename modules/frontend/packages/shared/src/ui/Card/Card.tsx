import React, { type ElementType, type HTMLAttributes } from "react";
import { cx } from "../classNames";
import styles from "./Card.module.css";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  variant?: "default" | "outlined" | "raised";
}

export function Card({
  as: Component = "section",
  variant = "default",
  className,
  ...props
}: CardProps) {
  return <Component {...props} className={cx(styles, "card", variant, className)} />;
}
