import type { Config } from "tailwindcss";
// We can't directly import the TypeScript file in the Tailwind config,
// so we'll import the JS file that exports the theme colors
// @ts-ignore: Import without type checking
const themePlugin = require("./src/lib/theme/tailwind-theme-plugin");

const config: Config = {
  darkMode: 'class',
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        // Use the colors from our theme plugin
        light: themePlugin.themeColors.light,
        dark: themePlugin.themeColors.dark,
        brand: {
          // Use a flattened structure that works better with Tailwind
          primary: themePlugin.themeColors.brand.primary.light,
          primaryDark: themePlugin.themeColors.brand.primary.dark,
          primaryDarker: themePlugin.themeColors.brand.primary.darker,
          
          secondary: themePlugin.themeColors.brand.secondary.light,
          secondaryDark: themePlugin.themeColors.brand.secondary.dark,
          secondaryDarker: themePlugin.themeColors.brand.secondary.darker,
          
          success: themePlugin.themeColors.brand.success.light,
          successDark: themePlugin.themeColors.brand.success.dark,
          successDarker: themePlugin.themeColors.brand.success.darker,
          
          warning: themePlugin.themeColors.brand.warning.light,
          warningDark: themePlugin.themeColors.brand.warning.dark,
          warningDarker: themePlugin.themeColors.brand.warning.darker,
          
          error: themePlugin.themeColors.brand.error.light,
          errorDark: themePlugin.themeColors.brand.error.dark,
          errorDarker: themePlugin.themeColors.brand.error.darker,
          
          // Additional Nord colors
          purple: themePlugin.themeColors.brand.purple,
          orange: themePlugin.themeColors.brand.orange,
        }
      },
      gradients: {
        // Light theme
        lightBanner: "linear-gradient(to right, #3B82F6, #6366F1)", // Tailwind-like banner
        
        // Dark theme
        darkBanner: "linear-gradient(to right, #436F99, #419CB1)" // Nord-themed banner
      }
    },
  },
  plugins: [themePlugin],
};
export default config;
