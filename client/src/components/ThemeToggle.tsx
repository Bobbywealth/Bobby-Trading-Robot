import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

const STORAGE_KEY = "trading-robot-theme";

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme === "dark" ? "dark" : "light";
  localStorage.setItem(STORAGE_KEY, theme);
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = getPreferredTheme();
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };

  const iconCommon = "absolute transition-all duration-200";

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className={cn(
        "h-10 w-10 rounded-full border-border/60 bg-card/80 backdrop-blur-md shadow-lg",
        "hover:border-primary/60 hover:text-primary",
        className,
      )}
      aria-label="Toggle theme"
      data-testid="button-theme-toggle"
    >
      <Sun
        className={cn(
          iconCommon,
          theme === "light" ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-45 scale-0",
        )}
      />
      <Moon
        className={cn(
          iconCommon,
          theme === "dark" ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-45 scale-0",
        )}
      />
      {!mounted && <span className="sr-only">Toggle theme</span>}
    </Button>
  );
}


