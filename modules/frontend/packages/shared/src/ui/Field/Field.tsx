import React, {
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cx } from "../classNames";
import styles from "./Field.module.css";

interface FieldSharedProps {
  id: string;
  label: string;
  help?: string;
  error?: string;
  className?: string;
}

type InputFieldProps = FieldSharedProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & { as?: "input" };
type SelectFieldProps = FieldSharedProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & { as: "select" };
type TextareaFieldProps = FieldSharedProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & { as: "textarea" };

export type FieldProps = InputFieldProps | SelectFieldProps | TextareaFieldProps;

export function Field(props: FieldProps) {
  if (props.as === "select") {
    const { id, label, help, error, className, ...controlProps } = props;
    return (
      <FieldContent className={className} error={error} help={help} id={id} label={label}>
        <select {...controlProps} {...getDescriptionProps(id, help, error)} />
      </FieldContent>
    );
  }

  if (props.as === "textarea") {
    const { id, label, help, error, className, ...controlProps } = props;
    return (
      <FieldContent className={className} error={error} help={help} id={id} label={label}>
        <textarea {...controlProps} {...getDescriptionProps(id, help, error)} />
      </FieldContent>
    );
  }

  const { id, label, help, error, className, ...controlProps } = props;
  return (
    <FieldContent className={className} error={error} help={help} id={id} label={label}>
      <input {...controlProps} {...getDescriptionProps(id, help, error)} />
    </FieldContent>
  );
}

function getDescriptionProps(id: string, help?: string, error?: string) {
  const descriptionId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return {
    id,
    "aria-describedby": [descriptionId, errorId].filter(Boolean).join(" ") || undefined,
    "aria-invalid": error ? true : undefined,
    className: styles.control,
  };
}

function FieldContent({
  id,
  label,
  help,
  error,
  className,
  children,
}: FieldSharedProps & { children: React.ReactNode }) {
  const descriptionId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cx(styles, "field", className)}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {children}
      {help && (
        <span className={styles.help} id={descriptionId}>
          {help}
        </span>
      )}
      {error && (
        <span className={styles.error} id={errorId}>
          {error}
        </span>
      )}
    </div>
  );
}
