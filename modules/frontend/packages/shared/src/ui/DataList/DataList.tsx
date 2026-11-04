import React, { type HTMLAttributes } from "react";
import { cx } from "../classNames";
import styles from "./DataList.module.css";

export function DataList({ className, ...props }: HTMLAttributes<HTMLUListElement>) {
  return <ul {...props} className={cx(styles, "list", className)} />;
}

export function DataRow({ className, ...props }: HTMLAttributes<HTMLLIElement>) {
  return <li {...props} className={cx(styles, "row", className)} />;
}
