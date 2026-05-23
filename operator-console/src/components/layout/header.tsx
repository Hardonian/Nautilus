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
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <button 
            onClick={() => setHighContrast(!highContrast)}
            style={{ padding: "0.25rem 0.5rem", borderRadius: "4px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text)", cursor: "pointer", fontSize: "0.75rem" }}
            aria-pressed={highContrast}
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
