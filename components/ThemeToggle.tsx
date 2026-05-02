"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const themeKey = "wnk-theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem(themeKey) === "dark" ? "dark" : "light";
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(themeKey, next);
    document.documentElement.dataset.theme = next;
  }

  return (
    <button className="theme-toggle" onClick={toggleTheme} type="button">
      {theme === "dark" ? <Sun aria-hidden="true" size={15} /> : <Moon aria-hidden="true" size={15} />}
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
