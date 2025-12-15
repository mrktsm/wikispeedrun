import { useState, useEffect } from "react";
import "./WikiThemeToggle.css";

interface WikiThemeToggleProps {
  onThemeChange?: (isDark: boolean) => void;
}

const WikiThemeToggle = ({ onThemeChange }: WikiThemeToggleProps) => {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem("wiki-theme");
    return saved === "dark";
  });

  useEffect(() => {
    // Apply theme to document
    if (isDark) {
      document.documentElement.classList.add("wiki-dark-mode");
    } else {
      document.documentElement.classList.remove("wiki-dark-mode");
    }

    // Save preference
    localStorage.setItem("wiki-theme", isDark ? "dark" : "light");

    // Notify parent
    if (onThemeChange) {
      onThemeChange(isDark);
    }
  }, [isDark, onThemeChange]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <button
      className={`wiki-theme-toggle ${isDark ? "dark" : "light"}`}
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <div className="toggle-track">
        <div className="toggle-thumb">
          {isDark ? (
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="toggle-icon"
            >
              <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1-8.313-12.454z" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="toggle-icon"
            >
              <circle cx="12" cy="12" r="4" />
              <path
                d="M12 2v2m0 16v2M4 12H2m20 0h-2m-2.93-7.07l-1.41 1.41m-9.32 9.32l-1.41 1.41m0-12.14l1.41 1.41m9.32 9.32l1.41 1.41"
                strokeWidth="2"
                stroke="currentColor"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>
      </div>
      <span className="toggle-label">{isDark ? "Dark" : "Light"}</span>
    </button>
  );
};

export default WikiThemeToggle;
