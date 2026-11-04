import React, { type InputHTMLAttributes } from "react";
import { cx } from "../classNames";
import styles from "./SearchInput.module.css";

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  id: string;
  label: string;
}

export function SearchInput({ id, label, className, ...props }: SearchInputProps) {
  return (
    <div className={cx(styles, "search", className)}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input {...props} className={styles.input} id={id} type="search" />
    </div>
  );
}
