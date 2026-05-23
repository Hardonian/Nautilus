import React, { useState, useEffect } from "react";
import styles from "./header.module.css";

export function Header() {
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    if (highContrast) {
      document.documentElement.setAttribute("data-theme", "high-contrast");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [highContrast]);

  return (
    <header className={styles.header} role="banner">
      <div className={styles.content}>
        <h1 className={styles.title}>NemoClaw Operator Console</h1>
        <div className={styles.actions}>
          <button
            onClick={() => setHighContrast(!highContrast)}
            className={styles.themeToggle}
            aria-pressed={highContrast ? "true" : "false"}
            aria-label="Toggle high contrast mode"
          >
            {highContrast ? "Default Theme" : "High Contrast"}
          </button>
          <span className={styles.readOnlyBadge} role="status" aria-label="Read-only mode">
            Read-Only
          </span>
        </div>
      </div>
    </header>
  );
}
