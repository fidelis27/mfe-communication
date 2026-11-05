import React, { type ElementType, type HTMLAttributes, type ReactNode } from "react";
import { cx } from "../classNames";
import styles from "./Card.module.css";

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  as?: ElementType;
  variant?: "default" | "outlined" | "raised";
  title?: ReactNode;
  action?: ReactNode;
  headingLevel?: "h2" | "h3";
}

export function Card({
  as: Component = "section",
  variant = "default",
  title,
  action,
  headingLevel: Heading = "h2",
  className,
  children,
  ...props
}: CardProps) {
  return (
    <Component {...props} className={cx(styles, "card", variant, className)}>
      {(title || action) && (
        <header className={styles.header}>
          {title && <Heading className={styles.title}>{title}</Heading>}
          {action && <div className={styles.action}>{action}</div>}
        </header>
      )}
      {children}
    </Component>
  );
}
