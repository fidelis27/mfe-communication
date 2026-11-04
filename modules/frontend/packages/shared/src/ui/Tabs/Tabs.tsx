import React, { type KeyboardEvent, type ReactNode, useRef } from "react";
import { cx } from "../classNames";
import styles from "./Tabs.module.css";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  id: string;
  label: string;
  items: readonly TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ id, label, items, value, onChange, className }: TabsProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeTab = items.find((item) => item.id === value) ?? items[0];

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + direction + items.length) % items.length;
    const next = items[nextIndex];
    if (!next) return;
    onChange(next.id);
    tabRefs.current[nextIndex]?.focus();
  }

  if (!activeTab) return null;

  return (
    <div className={cx(styles, "tabs", className)}>
      <div aria-label={label} className={styles.list} role="tablist">
        {items.map((item, index) => (
          <button
            aria-controls={`${id}-panel-${item.id}`}
            aria-selected={item.id === activeTab.id}
            className={cx(styles, "tab", item.id === activeTab.id && "active")}
            id={`${id}-tab-${item.id}`}
            key={item.id}
            onClick={() => onChange(item.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            role="tab"
            tabIndex={item.id === activeTab.id ? 0 : -1}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        aria-labelledby={`${id}-tab-${activeTab.id}`}
        className={styles.panel}
        id={`${id}-panel-${activeTab.id}`}
        role="tabpanel"
        tabIndex={0}
      >
        {activeTab.content}
      </div>
    </div>
  );
}
