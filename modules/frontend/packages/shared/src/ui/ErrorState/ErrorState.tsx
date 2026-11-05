import React, { type ReactNode } from "react";
import { Button } from "../Button";
import { cx } from "../classNames";
import { EmptyState, type EmptyStateProps } from "../EmptyState";
import { AlertIcon } from "../icons";
import styles from "./ErrorState.module.css";

export interface ErrorStateProps extends Omit<EmptyStateProps, "action"> {
  onRetry: () => void;
  retryLabel?: string;
  action?: ReactNode;
}

export function ErrorState({
  onRetry,
  retryLabel = "Tentar novamente",
  action,
  ...props
}: ErrorStateProps) {
  return (
    <EmptyState
      {...props}
      action={
        action ?? (
          <Button onClick={onRetry} variant="secondary">
            {retryLabel}
          </Button>
        )
      }
      icon={<AlertIcon size={20} />}
      iconTone="danger"
      className={cx(styles, "errorState")}
    />
  );
}
