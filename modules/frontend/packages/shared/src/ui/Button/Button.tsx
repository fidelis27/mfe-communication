import React, { forwardRef, type ButtonHTMLAttributes } from "react";
import { cx } from "../classNames";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", loading = false, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      className={cx(styles, "button", variant, className)}
      data-ui="shared-button"
      disabled={disabled || loading}
      ref={ref}
    >
      {loading && <span aria-hidden="true" className={styles.spinner} />}
      {children}
    </button>
  );
});
