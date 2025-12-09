// src/theme.js
import { createTheme } from "@mui/material/styles";

// ===== DARK THEME =====
export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#4e9eff",
    },
    background: {
      default: "#0b0f19",
      paper: "#111827",
    },
    text: {
      primary: "#ffffff",
      secondary: "#cbd5e1",
    },
  },
});

// ===== LIGHT THEME =====
export const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#3b82f6",
    },
    background: {
      default: "#ffffff",
      paper: "#f9fafb",
    },
    text: {
      primary: "#1f2937",
      secondary: "#4b5563",
    },
  },
});

// DEFAULT EXPORT (Dark theme by default)
const theme = darkTheme;
export default theme;
