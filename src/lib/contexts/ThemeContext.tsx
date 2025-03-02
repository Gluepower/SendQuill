"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark"; // The actual theme after system preference is resolved
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");
  
  // Check for user's preferred theme on initial load
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme;
    if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
      setTheme(savedTheme);
      console.log("Loaded saved theme from localStorage:", savedTheme);
    } else {
      console.log("No saved theme found, using default");
    }
  }, []);

  // Handle system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    // Function to update the resolved theme based on current settings
    const updateResolvedTheme = () => {
      if (theme === "system") {
        setResolvedTheme(mediaQuery.matches ? "dark" : "light");
        console.log("System preference detected:", mediaQuery.matches ? "dark" : "light");
      } else {
        setResolvedTheme(theme as "light" | "dark");
        console.log("Using user preference:", theme);
      }
    };
    
    // Initial update
    updateResolvedTheme();
    
    // Listen for changes to system preferences
    const handleChange = () => {
      if (theme === "system") {
        updateResolvedTheme();
      }
    };
    
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  // Update the HTML attribute when resolvedTheme changes
  useEffect(() => {
    console.log("Updating HTML class to:", resolvedTheme);
    if (resolvedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [resolvedTheme]);

  // Save theme preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("theme", theme);
    console.log("Saved theme to localStorage:", theme);
  }, [theme]);

  // Provide a more robust setTheme function
  const handleSetTheme = (newTheme: Theme) => {
    console.log("Theme changed from", theme, "to", newTheme);
    setTheme(newTheme);
    
    // Immediately update resolvedTheme for instant feedback
    if (newTheme !== "system") {
      setResolvedTheme(newTheme as "light" | "dark");
    } else {
      // If setting to system, check system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setResolvedTheme(prefersDark ? "dark" : "light");
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
} 