// src/theme.js
import { createTheme } from "@mui/material/styles";

export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#4e9eff" },
    background: { default: "#0b1117", paper: "#0f1724" },
    text: { primary: "#ffffff", secondary: "#9CA3AF" },
  },
});

export const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#3b82f6" },
    background: { default: "#ffffff", paper: "#f8fafc" },
    text: { primary: "#111827", secondary: "#6b7280" },
  },
});

// default export
export default darkTheme;
