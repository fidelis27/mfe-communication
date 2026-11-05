import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cx } from "../classNames";
import styles from "./Button.module.css";

export type ButtonVariant =
  "primary" | "secondary" | "ghost" | "danger" | "danger-secondary" | "link";
export type ButtonSize = "sm" | "md" | "lg";

type ButtonBaseProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
};

export type ButtonProps = ButtonBaseProps &
  (
    | { iconOnly: true; "aria-label": string; children?: never }
    | { iconOnly?: false; "aria-label"?: string; children: ReactNode }
  );

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    iconOnly = false,
    leadingIcon,
    trailingIcon,
    fullWidth = false,
    className,
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      className={cx(
        styles,
        "button",
        variant.replace(/-(\w)/, (_match, letter: string) => letter.toUpperCase()),
        `size${size[0]?.toUpperCase()}${size.slice(1)}`,
        iconOnly && "iconOnly",
        fullWidth && "fullWidth",
        loading && "loading",
        className,
      )}
      data-ui="shared-button"
      disabled={disabled || loading}
      ref={ref}
    >
      <span className={styles.content}>
        {leadingIcon && <span className={styles.icon}>{leadingIcon}</span>}
        {!iconOnly && children}
        {trailingIcon && <span className={styles.icon}>{trailingIcon}</span>}
      </span>
      {loading && <span aria-hidden="true" className={styles.spinner} />}
    </button>
  );
});
