// @ts-nocheck — template overlay; this line is stripped when `pnpm flavor apply` copies the file into place
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

export function ThemeProvider({
  children,
  storageKey = "cen-starter-theme",
}: {
  children: ReactNode;
  storageKey?: string;
}) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme | null) ?? "system",
  );
  const [systemDark, setSystemDark] = useState(prefersDark);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    const dark = resolvedTheme === "dark";
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    // Carbon theme zones — tokens must live on <html> so <body> styles see them.
    root.classList.toggle("cds--g90", dark);
    root.classList.toggle("cds--g10", !dark);
  }, [resolvedTheme]);

  const setTheme = (next: Theme) => {
    localStorage.setItem(storageKey, next);
    setThemeState(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
