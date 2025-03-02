// Theme colors - single source of truth
export const themeColors = {
  // Light Theme (Tailwind-Like Palette)
  light: {
    bg: "#F9FAFB",         // Body background
    card: "#FFFFFF",       // Panel/card background
    border: "#E5E7EB",     // Borders/dividers
    text: "#111827",       // Primary text
    muted: "#6B7280",      // Secondary text
  },
  // Dark Theme (Nord-Inspired Palette)
  dark: {
    // Polar Night (dark backgrounds)
    bg: "#2E3440",         // Main app background
    card: "#3B4252",       // Secondary background / panels
    accent: "#434C5E",     // Dividers / Borders
    // Snow Storm (light/neutral foregrounds)
    text: "#D8DEE9",       // Primary text
    muted: "#E5E9F0",      // Secondary text / muted
    bright: "#ECEFF4",     // Highlighted text
  },
  // Brand Colors with separate light/dark variants
  brand: {
    primary: {
      light: "#3B82F6",     // Blue-500 from Tailwind
      dark: "#88C0D0",      // Nord "Frost" blue
      darker: "#419CB1",    // Darker version for large areas
    },
    secondary: {
      light: "#6366F1",     // Indigo-500 from Tailwind
      dark: "#81A1C1",      // Nord "Frost" variant
      darker: "#436F99",    // Darker version for large areas
    },
    success: {
      light: "#10B981",     // Green-500
      dark: "#A3BE8C",      // Nord "Aurora" green
      darker: "#7A9468",    // Darker version for large areas
    },
    warning: {
      light: "#F59E0B",     // Yellow-500
      dark: "#EBCB8B",      // Nord "Aurora" yellow
      darker: "#BFA767",    // Darker version for large areas
    },
    error: {
      light: "#EF4444",     // Red-500
      dark: "#BF616A",      // Nord "Aurora" red
      darker: "#9A4D53",    // Darker version for large areas
    },
    // Additional Nord colors
    purple: "#B48EAD",      // Nord "Aurora" purple
    orange: "#D08770",      // Nord "Aurora" orange
  },
  // Gradients
  gradient: {
    banner: {
      light: "linear-gradient(to right, #2563EB, #4F46E5)", // Darker blue to indigo for better contrast
      dark: "linear-gradient(to right, #1E3A8A, #1E40AF)"   // Darker blue theme for dark mode
    }
  }
};

// Function to generate CSS variables from theme colors
export function generateCssVariables() {
  return {
    // Light theme variables (default)
    ':root': {
      '--color-bg-body': themeColors.light.bg,
      '--color-bg-panel': themeColors.light.card,
      '--color-border': themeColors.light.border,
      '--color-text-primary': themeColors.light.text,
      '--color-text-secondary': themeColors.light.muted,
      '--color-accent-primary': themeColors.brand.primary.light,
      '--color-accent-secondary': themeColors.brand.secondary.light,
      '--color-success': themeColors.brand.success.light,
      '--color-warning': themeColors.brand.warning.light,
      '--color-error': themeColors.brand.error.light,
    },
    // Dark theme overrides
    '.dark': {
      '--color-bg-body': themeColors.dark.bg,
      '--color-bg-panel': themeColors.dark.card,
      '--color-border': themeColors.dark.accent,
      '--color-text-primary': themeColors.dark.text,
      '--color-text-secondary': themeColors.dark.muted,
      '--color-text-bright': themeColors.dark.bright,
      '--color-accent-primary': themeColors.brand.primary.dark,
      '--color-accent-secondary': themeColors.brand.secondary.dark,
      '--color-success': themeColors.brand.success.dark,
      '--color-warning': themeColors.brand.warning.dark,
      '--color-error': themeColors.brand.error.dark,
      '--color-accent-primary-dark': themeColors.brand.primary.darker,
      '--color-accent-secondary-dark': themeColors.brand.secondary.darker,
      '--color-success-dark': themeColors.brand.success.darker,
      '--color-warning-dark': themeColors.brand.warning.darker,
      '--color-error-dark': themeColors.brand.error.darker,
    }
  };
} 